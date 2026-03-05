// Feed Registry - Alle 11 Feed-Importer
// Hybrid-Ansatz: Feeds für Affiliate-Partner, HTML-Scraping als Fallback
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
import { WeedSeedShopFeed } from './adapters/weed-seed-shop.feed';
import { logger } from '../utils/logger';

// ============================================
// FEED REGISTRY
// Priorität nach Affiliate-Provision sortiert
// ============================================
export const feeds: Record<string, BaseFeed> = {
  // Tier 1: Höchste Provisionen (30%+)
  'fastbuds':          new FastBudsFeed(),         // bis 50%
  'zamnesia':          new ZamnesiaFeed(),          // bis 33%
  'weed-seed-shop':    new WeedSeedShopFeed(),      // 30% flat

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
