// Phase 1 — Einmaliger Import aus lokalem Crawl
// Quelle: /root/SF-Brain/strain_output/strains_database.json
// Matcht gecrawlte Strains gegen DB-Seeds, extrahiert DE Flavor-Tags

import * as fs from 'fs';
import { Seed } from '../models/Seed.model';
import { extractFlavorsFromText } from '../config/flavor-vocabulary.de';
import { logger } from '../utils/logger';

const CRAWL_PATH = '/strain-data/strains_database.json';

interface CrawlStrain {
  name: string;
  breeder: string;
  taste?: string | string[];
  description?: string;
}

// Trailing suffixes stripped before matching — seedfinder crawl has base names only
const STRIP_SUFFIXES = [
  'fast version', 'feminisiert', 'feminized', 'feminised',
  'autoflowering', 'autoflower', 'automatic', 'automatisch',
  'regular', 'cbd', 'xxl', ' xl',
];

/**
 * Normalisiert einen Namen für Matching:
 * lowercase, Sonderzeichen → Spaces, bekannte Varianten-Suffixe entfernen
 */
function normalizeName(name: string): string {
  let s = name
    .toLowerCase()
    .replace(/[#()'"+]/g, '')
    .replace(/[-_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip trailing variant suffixes (repeatable — "Auto Fast Version" → base name)
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of STRIP_SUFFIXES) {
      if (s.endsWith(' ' + suffix) || s === suffix) {
        s = s.slice(0, s.length - suffix.length).trimEnd();
        changed = true;
      }
    }
  }

  return s;
}

export class CrawlFlavorImportService {
  /**
   * Lädt Crawl-Daten und baut einen schnellen Lookup auf
   */
  private async loadCrawlData(): Promise<Map<string, CrawlStrain>> {
    if (!fs.existsSync(CRAWL_PATH)) {
      throw new Error(`Crawl-Datei nicht gefunden: ${CRAWL_PATH}`);
    }

    const raw = await fs.promises.readFile(CRAWL_PATH, 'utf-8');
    const strains: CrawlStrain[] = JSON.parse(raw);

    const map = new Map<string, CrawlStrain>();
    for (const s of strains) {
      if (s.name) {
        map.set(normalizeName(s.name), s);
      }
    }

    logger.info(`[CrawlImport] ${strains.length} Crawl-Einträge geladen, ${map.size} eindeutige Namen`);
    return map;
  }

  /**
   * Extrahiert Flavor-Text aus einem Crawl-Eintrag
   */
  private getFlavorText(strain: CrawlStrain): string {
    const parts: string[] = [];

    if (strain.taste) {
      if (Array.isArray(strain.taste)) {
        parts.push(...strain.taste);
      } else {
        parts.push(strain.taste);
      }
    }

    if (strain.description) {
      parts.push(strain.description);
    }

    return parts.join(' ');
  }

  /**
   * Importiert Flavors für alle matchbaren Seeds
   * Überspringt Seeds mit flavorSource 'seedfinder' oder 'manual'
   */
  async importAll(): Promise<{ matched: number; updated: number; skipped: number }> {
    const crawlMap = await this.loadCrawlData();

    const seeds = await Seed.find({
      flavorSource: { $nin: ['seedfinder', 'manual'] },
    }).select('_id name flavorSource').lean();

    logger.info(`[CrawlImport] ${seeds.length} Seeds für Import gefunden`);

    let matched = 0;
    let updated = 0;
    let skipped = 0;

    for (const seed of seeds) {
      const normalizedSeedName = normalizeName(seed.name);
      const crawlEntry = crawlMap.get(normalizedSeedName);

      if (!crawlEntry) {
        skipped++;
        continue;
      }

      matched++;
      const flavorText = this.getFlavorText(crawlEntry);
      const flavors = extractFlavorsFromText(flavorText);

      if (flavors.length === 0) {
        skipped++;
        continue;
      }

      await Seed.updateOne(
        { _id: seed._id },
        {
          $set: { flavors, flavorSource: 'crawl', lastScraped: new Date() },
          $addToSet: { source: 'crawl' }
        }
      );
      updated++;

      if (updated % 100 === 0) {
        logger.info(`[CrawlImport] Fortschritt: ${updated} aktualisiert...`);
      }
    }

    logger.info(`[CrawlImport] Abgeschlossen — matched: ${matched}, updated: ${updated}, skipped: ${skipped}`);
    return { matched, updated, skipped };
  }
}

export const crawlFlavorImport = new CrawlFlavorImportService();
