// Seedfinder Enrichment Service v2
// Nutzt neue seedfinder.eu URL-Struktur + Firecrawl für Cloudflare-Bypass
// Deutsche Flavor-Tags via DE_FLAVOR_VOCABULARY

import * as cheerio from 'cheerio';
import { Seed } from '../models/Seed.model';
import { firecrawlService } from './firecrawl.service';
import { extractFlavorsFromText } from '../config/flavor-vocabulary.de';
import { logger } from '../utils/logger';

export interface SeedfinderStrainData {
  flavors?: string[];
  effects?: string[];
  thc?: number;
  cbd?: number;
}

export class SeedfinderEnrichmentService {
  private readonly baseUrl = 'https://seedfinder.eu';
  private readonly rateLimitMs = 3000;
  private lastRequestTime = 0;

  /**
   * Generiert Seedfinder-URL aus Name und Breeder
   * "Northern Lights" + "Sensi Seeds" → /de/strain-info/northern-lights/sensi-seeds/
   */
  buildStrainUrl(name: string, breeder: string): string {
    const nameSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const breederSlug = breeder.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `${this.baseUrl}/de/strain-info/${nameSlug}/${breederSlug}/`;
  }

  /**
   * Scrappe eine Seedfinder-Seite via Firecrawl
   */
  async fetchStrainPage(url: string): Promise<string | null> {
    await this.respectRateLimit();

    if (!firecrawlService.isEnabled()) {
      logger.warn('[SeedfinderV2] Firecrawl nicht verfügbar — Enrichment übersprungen');
      return null;
    }

    return firecrawlService.scrapeWithJsRendering(url);
  }

  /**
   * Parst Strain-Daten aus Seedfinder HTML
   */
  parseStrainPage(html: string): SeedfinderStrainData {
    const data: SeedfinderStrainData = {};
    const $ = cheerio.load(html);
    const pageText = $('body').text();

    // Flavors via DE-Vocabulary aus Seitentext
    const flavors = extractFlavorsFromText(pageText);
    if (flavors.length > 0) {
      data.flavors = flavors;
    }

    // THC %
    const thcMatch = pageText.match(/(\d+(?:[.,]\d+)?)\s*%\s*THC/i)
      || pageText.match(/THC[:\s]+(\d+(?:[.,]\d+)?)/i);
    if (thcMatch) {
      const val = parseFloat(thcMatch[1].replace(',', '.'));
      if (val > 0 && val <= 35) data.thc = val;
    }

    // CBD %
    const cbdMatch = pageText.match(/(\d+(?:[.,]\d+)?)\s*%\s*CBD/i)
      || pageText.match(/CBD[:\s]+(\d+(?:[.,]\d+)?)/i);
    if (cbdMatch) {
      const val = parseFloat(cbdMatch[1].replace(',', '.'));
      if (val >= 0 && val <= 30) data.cbd = val;
    }

    // Effects
    const effectKeywords: [string, string][] = [
      ['entspannend', 'relaxing'],
      ['aufheiternd', 'uplifting'],
      ['energetisch', 'energetic'],
      ['kreativ', 'creative'],
      ['glücklich', 'happy'],
      ['fokussiert', 'focused'],
      ['schläfrig', 'sleepy'],
      ['euphorisch', 'euphoric'],
    ];
    const textLower = pageText.toLowerCase();
    const effects = effectKeywords
      .filter(([de, en]) => textLower.includes(de) || textLower.includes(en))
      .map(([de]) => de)
      .slice(0, 5);
    if (effects.length > 0) data.effects = effects;

    return data;
  }

  /**
   * Reichert einen einzelnen Seed an
   */
  async enrichSeed(seedId: string, seedName: string, breeder: string): Promise<boolean> {
    const url = this.buildStrainUrl(seedName, breeder);
    logger.debug(`[SeedfinderV2] Scraping: ${url}`);

    const html = await this.fetchStrainPage(url);
    if (!html) return false;

    const strainData = this.parseStrainPage(html);

    if (!strainData.flavors && !strainData.thc && !strainData.cbd) {
      logger.debug(`[SeedfinderV2] Keine Daten für "${seedName}"`);
      return false;
    }

    const updateData: any = { flavorSource: 'seedfinder' };
    if (strainData.flavors?.length) updateData.flavors = strainData.flavors;
    if (strainData.effects?.length) updateData.effects = strainData.effects;
    if (strainData.thc !== undefined) updateData.thc = strainData.thc;
    if (strainData.cbd !== undefined) updateData.cbd = strainData.cbd;

    await Seed.updateOne({ _id: seedId }, { $set: updateData });
    logger.debug(`[SeedfinderV2] "${seedName}" angereichert — Flavors: ${strainData.flavors?.join(', ')}`);
    return true;
  }

  /**
   * Batch-Enrichment mit Prioritäts-Queue:
   * 1. Seeds ohne Flavors
   * 2. Seeds mit flavorSource 'crawl'
   */
  async enrichAllMissingFlavors(batchSize = 200): Promise<number> {
    const priority1 = await Seed.find({
      $or: [
        { flavors: { $exists: false } },
        { flavors: { $size: 0 } },
      ],
      flavorSource: { $nin: ['seedfinder', 'manual'] },
    }).select('_id name breeder').limit(batchSize).lean();

    const remaining = batchSize - priority1.length;
    const priority2 = remaining > 0
      ? await Seed.find({ flavorSource: 'crawl' })
          .select('_id name breeder')
          .limit(remaining)
          .lean()
      : [];

    const seeds = [...priority1, ...priority2];

    if (seeds.length === 0) {
      logger.info('[SeedfinderV2] Alle Seeds mit Seedfinder-Daten versorgt');
      return 0;
    }

    logger.info(`[SeedfinderV2] Batch: ${priority1.length} ohne Flavors + ${priority2.length} crawl-Upgrade (${seeds.length} gesamt)`);

    let enriched = 0;
    for (const seed of seeds) {
      const ok = await this.enrichSeed(String(seed._id), seed.name, seed.breeder || '');
      if (ok) enriched++;
    }

    logger.info(`[SeedfinderV2] Fertig — ${enriched}/${seeds.length} angereichert`);
    return enriched;
  }

  private async respectRateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.rateLimitMs) {
      await new Promise(r => setTimeout(r, this.rateLimitMs - elapsed));
    }
    this.lastRequestTime = Date.now();
  }
}

export const seedfinderEnrichment = new SeedfinderEnrichmentService();
