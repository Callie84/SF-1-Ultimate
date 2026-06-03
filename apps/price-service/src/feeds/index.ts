// Feed Registry - 19 Feed-Importer (Sessions 40 + 73 + 94 + 96)
// Hybrid-Ansatz: Feeds für Affiliate-Partner, HTML-Scraping als Fallback
// Session 94: 11 nicht-funktionale Adapter entfernt (Breeder, TLS, CSS-Fehler)
// Session 96: Linda Seeds hinzugefügt (Custom Shop mit Firecrawl-Support)
import { BaseFeed } from './base.feed';
import { ZamnesiaFeed } from './adapters/zamnesia.feed';
import { SensiSeedsFeed } from './adapters/sensi-seeds.feed';
import { RQSFeed } from './adapters/rqs.feed';
import { DutchPassionFeed } from './adapters/dutch-passion.feed';
import { SeedsmanFeed } from './adapters/seedsman.feed';
import { FastBudsFeed } from './adapters/fastbuds.feed';
import { GreenhouseFeed } from './adapters/greenhouse.feed';
import { ParadiseSeedsFeed } from './adapters/paradise-seeds.feed';
import { AnesiaSeedsFeed } from './adapters/anesia-seeds.feed';
import { MrHanfFeed } from './adapters/mr-hanf.feed';
import { BarneysFarmFeed } from './adapters/barneys-farm.feed';
import { SeedstockersFeed } from './adapters/seedstockers.feed';
import { HerbiesFeed } from './adapters/herbies.feed';
import { KannabiaFeed } from './adapters/kannabia.feed';
// Session 73: 15 neue Adapter
import { PyramidSeedsFeed } from './adapters/pyramid-seeds.feed';
import { GardenOfGreenFeed } from './adapters/garden-of-green.feed';
import { OriginalSeedsStoreFeed } from './adapters/original-seeds-store.feed';
import { BlimburnSeedsFeed } from './adapters/blimburn-seeds.feed';
// Session 96: Linda Seeds hinzugefügt
import { LindaSeedsFeed } from './adapters/linda-seeds.feed';
// MHSeedsFeed entfernt — mhseeds.de DNS-Fehler (Domain tot, Session 74)
// Session s9: 9 weitere Adapter aktiviert
import { SweetSeedsFeed } from './adapters/sweet-seeds.feed';
import { WorldOfSeedsFeed } from './adapters/world-of-seeds.feed';
import { SpliffSeedsFeed } from './adapters/spliff-seeds.feed';
import { HanfImGlueckFeed } from './adapters/hanf-im-glueck.feed';
import { CbdSeedsFeed } from './adapters/cbd-seeds.feed';
import { logger } from '../utils/logger';

// ============================================
// FEED REGISTRY
// Priorität nach Affiliate-Provision sortiert
// ============================================
export const feeds: Record<string, BaseFeed> = {
  // Tier 1: Höchste Provisionen (30%+)
  'fastbuds':          new FastBudsFeed(),         // bis 50%
  'zamnesia':          new ZamnesiaFeed(),          // bis 33%

  // Tier 2: Gute Provisionen (20-30%)
  'sensi-seeds':       new SensiSeedsFeed(),        // 20-30%
  'dutch-passion':     new DutchPassionFeed(),       // 20-30%

  // Tier 3: Solide Provisionen (15-20%)
  'seedsman':          new SeedsmanFeed(),           // 15-20% + CSV Feed!
  'royal-queen-seeds': new RQSFeed(),                // 15-20%, Cookie unbegrenzt

  // Tier 4: Weitere Affiliate-Partner
  'greenhouse-seeds':  new GreenhouseFeed(),
  'paradise-seeds':    new ParadiseSeedsFeed(),
  'anesia-seeds':      new AnesiaSeedsFeed(),
  'mr-hanf':           new MrHanfFeed(),

  // Tier 5: Neue Shops (Session 40)
  'barneys-farm':      new BarneysFarmFeed(),       // JSON-LD via Sitemap
  'seedstockers':      new SeedstockersFeed(),      // PrestaShop HTML
  'herbies-seeds':     new HerbiesFeed(),            // Custom HTML
  'kannabia':          new KannabiaFeed(),            // WooCommerce HTML

  // Tier 6: Neue Shops (Session 73 — weitere)
  'pyramid-seeds':         new PyramidSeedsFeed(),        // WooCommerce
  'garden-of-green':       new GardenOfGreenFeed(),       // WooCommerce + JSON-LD
  'original-seeds-store':  new OriginalSeedsStoreFeed(),  // Shopify API
  'blimburn-seeds':        new BlimburnSeedsFeed(),       // WooCommerce

  // Session 96: Neue Shops
  'linda-seeds':           new LindaSeedsFeed(),          // Custom Shop (Firecrawl für JS-Pricing)

  // Session s9: 9 weitere Adapter aktiviert
  'sweet-seeds':           new SweetSeedsFeed(),          // PrestaShop
  'world-of-seeds':        new WorldOfSeedsFeed(),        // PrestaShop
  'spliff-seeds':          new SpliffSeedsFeed(),         // PrestaShop
  // 'female-seeds': DISABLED — Seite im Umbau (self-signed cert + 'Please stand by') seit 2026-05
  // 'samenwahl': DISABLED — Aktiv geblockt: TLS-Fingerprinting (direkt) + Firecrawl-Timeout 408 (headless)
  // 'sumo-seeds': DISABLED — Domain tot (ENOTFOUND www.sumo-seeds.com) seit 2026-05
  // 'heavyweight-seeds': DISABLED — Kein Shop mehr, nur Infoseite (404 auf allen Kategorie-URLs) seit 2026-05
  'hanf-im-glueck':        new HanfImGlueckFeed(),        // Cloudflare + Firecrawl
  'cbd-seeds':             new CbdSeedsFeed(),            // PrestaShop
};

/**
 * Get all registered feeds
 */
export function getAllFeeds(): BaseFeed[] {
  return Object.values(feeds);
}

/**
 * Get feed by seedbank slug
 */
export function getFeed(slug: string): BaseFeed | undefined {
  return feeds[slug];
}

/**
 * Get all feed slugs
 */
export function getFeedSlugs(): string[] {
  return Object.keys(feeds);
}

/**
 * Get feed info for all registered feeds
 */
export function getFeedInfos(): Array<{ name: string; slug: string; source: string }> {
  return Object.values(feeds).map(f => f.getInfo());
}

logger.info(`[FeedRegistry] ${Object.keys(feeds).length} Feed-Importer registriert: ${Object.keys(feeds).join(', ')}`);
