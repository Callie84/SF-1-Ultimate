// Seedfinder Enrichment Service
// Lädt Flavors/Effects/THC/CBD von seedfinder.eu nach für Seeds ohne Daten

import axios from 'axios';
import * as cheerio from 'cheerio';
import { Seed } from '../models/Seed.model';
import { logger } from '../utils/logger';

export interface SeedfinderStrainData {
  flavors?: string[];
  effects?: string[];
  thc?: number;
  cbd?: number;
  type?: 'feminized' | 'autoflower' | 'regular';
}

export class SeedfinderEnrichmentService {
  private readonly baseUrl = 'https://en.seedfinder.eu';
  private readonly searchUrl = `${this.baseUrl}/search/extended/`;
  private readonly rateLimitMs = 2000; // 2s zwischen Requests (respektvoll)
  private lastRequestTime = 0;

  /**
   * Search for a strain on Seedfinder
   */
  async searchStrain(strainName: string): Promise<SeedfinderStrainData | null> {
    await this.respectRateLimit();

    try {
      const params = new URLSearchParams({
        str: strainName,
        breedere: '',
        num: '10',
      });

      const url = `${this.searchUrl}?${params.toString()}`;
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      const $ = cheerio.load(response.data);
      const data = this.parseStrainData($);

      if (data && Object.keys(data).length > 0) {
        logger.debug(`[SeedfinderEnrichment] "${strainName}" gefunden — Flavors: ${data.flavors?.join(', ')}`);
        return data;
      }

      return null;
    } catch (error: any) {
      logger.debug(
        `[SeedfinderEnrichment] Fehler bei "${strainName}": ${error.message}`
      );
      return null;
    }
  }

  /**
   * Parse strain data from Seedfinder HTML
   */
  private parseStrainData($: cheerio.CheerioAPI): SeedfinderStrainData {
    const data: SeedfinderStrainData = {};

    // Extrahiere den ersten Strain-Link + dessen Seite (vereinfacht: nehme vom Listing)
    const strainElement = $('div.strain-box, div.result, article').first();

    // Flavors — kommagetrennt oder in Tags
    const flavorText = strainElement
      .find('span:contains("Flavors"), span:contains("Taste"), .flavors, .taste')
      .text();

    if (flavorText) {
      const flavors = flavorText
        .replace(/flavors?|taste|:/gi, '')
        .split(/[,;|]/)
        .map(f => f.trim())
        .filter(f => f.length > 1 && f.length < 20);

      if (flavors.length > 0) {
        data.flavors = [...new Set(flavors)].slice(0, 5);
      }
    }

    // Fallback: Suche nach spezifischen Flavor-Keywords
    if (!data.flavors) {
      const flavorKeywords = [
        'fruity',
        'earthy',
        'sweet',
        'citrus',
        'pine',
        'diesel',
        'skunk',
        'spicy',
        'herbal',
        'woody',
        'tropical',
        'berry',
        'floral',
        'minty',
      ];
      const foundFlavors: string[] = [];

      flavorKeywords.forEach(keyword => {
        if ($('*:contains(' + keyword + ')').length > 0) {
          foundFlavors.push(keyword);
        }
      });

      if (foundFlavors.length > 0) {
        data.flavors = foundFlavors.slice(0, 5);
      }
    }

    // THC % — Pattern: "THC: 18%", "THC 18-22%", "up to 22% THC"
    const thcMatch =
      strainElement.html()?.match(/THC[:\s]+(?:up to |max |bis |zu )?(\d+(?:[.,]\d+)?)\s*%/i) ||
      strainElement.text().match(/THC[:\s]+(?:up to |max |bis |zu )?(\d+(?:[.,]\d+)?)\s*%/i);

    if (thcMatch) {
      data.thc = parseFloat(thcMatch[1].replace(',', '.'));
    }

    // CBD % — Pattern: "CBD: 5%", "CBD 1-3%"
    const cbdMatch =
      strainElement.html()?.match(/CBD[:\s]+(?:up to |max |bis |zu )?(\d+(?:[.,]\d+)?)\s*%/i) ||
      strainElement.text().match(/CBD[:\s]+(?:up to |max |bis |zu )?(\d+(?:[.,]\d+)?)\s*%/i);

    if (cbdMatch) {
      data.cbd = parseFloat(cbdMatch[1].replace(',', '.'));
    }

    // Effects — suche nach bekannten Keywords
    const effectKeywords = [
      'relaxing',
      'uplifting',
      'energetic',
      'creative',
      'happy',
      'focused',
      'sleepy',
      'euphoric',
      'calm',
      'stress-relief',
      'pain-relief',
      'lazy',
      'motivated',
    ];
    const foundEffects: string[] = [];

    effectKeywords.forEach(effect => {
      if ($('*:contains(' + effect + ')').length > 0) {
        foundEffects.push(effect);
      }
    });

    if (foundEffects.length > 0) {
      data.effects = foundEffects.slice(0, 5);
    }

    return data;
  }

  /**
   * Enrich a single seed with Seedfinder data
   */
  async enrichSeed(seedId: string, seedName: string): Promise<boolean> {
    try {
      const strainData = await this.searchStrain(seedName);

      if (!strainData) {
        return false;
      }

      // Update seed in database
      const updateData: any = {};

      if (strainData.flavors && strainData.flavors.length > 0) {
        updateData.flavors = strainData.flavors;
      }

      if (strainData.effects && strainData.effects.length > 0) {
        updateData.effects = strainData.effects;
      }

      if (strainData.thc !== undefined) {
        updateData.thc = strainData.thc;
      }

      if (strainData.cbd !== undefined) {
        updateData.cbd = strainData.cbd;
      }

      if (Object.keys(updateData).length > 0) {
        await Seed.updateOne({ _id: seedId }, { $set: updateData });
        logger.debug(`[SeedfinderEnrichment] "${seedName}" angereichert`);
        return true;
      }

      return false;
    } catch (error: any) {
      logger.error(`[SeedfinderEnrichment] Fehler bei "${seedName}":`, error.message);
      return false;
    }
  }

  /**
   * Enrich all seeds that are missing flavor data
   * Runs in batches (max 50 per run) to avoid overwhelming Seedfinder
   */
  async enrichAllMissingFlavors(batchSize: number = 50): Promise<number> {
    try {
      const seedsWithoutFlavors = await Seed.find({
        $or: [
          { flavors: { $exists: false } },
          { flavors: { $eq: [] } },
          { flavors: { $size: 0 } },
        ],
      })
        .select('_id name')
        .limit(batchSize)
        .lean();

      if (seedsWithoutFlavors.length === 0) {
        logger.info('[SeedfinderEnrichment] Alle Seeds haben Flavors — nichts zu tun');
        return 0;
      }

      logger.info(
        `[SeedfinderEnrichment] Starte Anreicherung von ${seedsWithoutFlavors.length} Seeds...`
      );

      let enrichedCount = 0;

      for (const seed of seedsWithoutFlavors) {
        const success = await this.enrichSeed(seed._id, seed.name);
        if (success) {
          enrichedCount++;
        }
      }

      logger.info(
        `[SeedfinderEnrichment] Fertig — ${enrichedCount}/${seedsWithoutFlavors.length} angereichert`
      );

      return enrichedCount;
    } catch (error: any) {
      logger.error('[SeedfinderEnrichment] Batch-Fehler:', error.message);
      return 0;
    }
  }

  /**
   * Respect rate limit between requests
   */
  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.rateLimitMs) {
      const delay = this.rateLimitMs - elapsed;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }
}

export const seedfinderEnrichment = new SeedfinderEnrichmentService();
