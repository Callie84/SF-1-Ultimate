// Price Service - Price Routes
import { Router } from 'express';
import { withCache } from '../middleware/cache.middleware';
import { priceService } from '../services/price.service';
import { logger } from '../utils/logger';
import { redis } from '../config/redis';
import { Price } from '../models/Price.model';

const router = Router();

/**
 * GET /api/prices/click
 * Track affiliate click and redirect to shop URL
 * Query params: url (required), seed (optional), bank (optional)
 */
router.get('/click', async (req, res) => {
  const { url, seed, bank } = req.query as Record<string, string>;

  if (!url) {
    return res.status(400).json({ error: 'url parameter required' });
  }

  // Validate URL (must start with http/https)
  let targetUrl: string;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    targetUrl = parsed.toString();
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Track click in Redis (fire-and-forget)
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const clickKey = `clicks:${today}:${seed || 'unknown'}:${bank || 'unknown'}`;
    const totalKey = `clicks:total:${seed || 'unknown'}:${bank || 'unknown'}`;
    await redis.incr(clickKey);
    await redis.expire(clickKey, 30 * 24 * 60 * 60); // 30 Tage
    await redis.incr(totalKey);
    logger.debug(`[Click] seed=${seed} bank=${bank} url=${targetUrl}`);
  } catch (err) {
    logger.warn('[Click] Redis tracking failed:', err);
    // Don't block the redirect if Redis fails
  }

  return res.redirect(302, targetUrl);
});

/**
 * GET /api/prices/clicks/stats
 * Get click statistics (admin)
 */
router.get('/clicks/stats', async (req, res, next) => {
  try {
    const keys = await redis.keys('clicks:total:*');
    const stats: Record<string, number> = {};
    for (const key of keys) {
      const val = await redis.get(key);
      const label = key.replace('clicks:total:', '');
      stats[label] = parseInt(val || '0', 10);
    }
    const sorted = Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);
    res.json({ clicks: Object.fromEntries(sorted), total: keys.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prices/today
 * Get today's prices (cached)
 */
router.get('/today', withCache('today', 6*3600), async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const skip = parseInt(req.query.skip as string) || 0;
    
    const result = await priceService.getTodaysPrices({ limit, skip });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prices/search
 * Search seeds with prices
 */
router.get('/search', withCache('search:${req.query.q}', 4*3600), async (req, res, next) => {
  try {
    const query = req.query.q as string;

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const type = req.query.type as string;
    const breeder = req.query.breeder as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;

    const result = await priceService.searchSeeds(query, { type, breeder, limit, skip });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prices/browse
 * Browse all seeds with prices (for initial page load)
 */
router.get('/browse', async (req, res, next) => {
  try {
    const type = req.query.type as string;
    const breeder = req.query.breeder as string;
    const sort = (req.query.sort as string) || 'price';
    const limit = parseInt(req.query.limit as string) || 24;
    const skip = parseInt(req.query.skip as string) || 0;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
    const inStock = req.query.inStock === 'true' ? true : undefined;

    const result = await priceService.browseSeeds({ type, breeder, sort, limit, skip, minPrice, maxPrice, inStock });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prices/seedbanks
 * Aggregiert alle Seedbanks mit Seed-Anzahl und Bestpreis
 */
router.get('/seedbanks', async (req, res, next) => {
  try {
    const cacheKey = 'seedbanks:overview';
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const agg = await Price.aggregate([
      { $match: { inStock: true, validUntil: { $gte: new Date() } } },
      {
        $group: {
          _id: '$seedbankSlug',
          name: { $first: '$seedbank' },
          bestPrice: { $min: '$price' },
          currency: { $first: '$currency' },
          seedIds: { $addToSet: '$seedId' },
        },
      },
      {
        $project: {
          _id: 0,
          slug: '$_id',
          name: 1,
          bestPrice: 1,
          currency: 1,
          seedCount: { $size: '$seedIds' },
        },
      },
      { $sort: { name: 1 } },
    ]);

    const result = { seedbanks: agg };
    await redis.set(cacheKey, JSON.stringify(result), { EX: 5 * 60 });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prices/seedbanks/:slug/seeds
 * Alle Seeds (mit Preisen) einer bestimmten Seedbank
 */
router.get('/seedbanks/:slug/seeds', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const cacheKey = `seedbanks:seeds:${slug}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const prices = await Price.find({
      seedbankSlug: slug,
      inStock: true,
      validUntil: { $gte: new Date() },
    })
      .sort({ price: 1 })
      .lean();

    // Gruppiere nach seedSlug — günstigstes Angebot pro Seed
    const seedMap = new Map<string, {
      seedSlug: string;
      seedName: string;
      type: string;
      packSize: string;
      price: number;
      currency: string;
      url: string;
      inStock: boolean;
    }>();

    for (const p of prices) {
      if (!seedMap.has(p.seedSlug)) {
        seedMap.set(p.seedSlug, {
          seedSlug: p.seedSlug,
          seedName: p.seedSlug
            .split('-')
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
          type: '',
          packSize: p.packSize,
          price: p.price,
          currency: p.currency,
          url: p.affiliateUrl || p.url,
          inStock: p.inStock,
        });
      }
    }

    const seeds = Array.from(seedMap.values()).sort((a, b) => a.price - b.price);
    const result = { seeds, total: seeds.length };
    await redis.set(cacheKey, JSON.stringify(result), { EX: 5 * 60 });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prices/seed/:slug
 * Get all prices for a specific seed
 */
router.get('/seed/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    const prices = await priceService.getPricesForSeed(slug);
    
    // Increment view count
    await priceService.incrementViewCount(slug);
    
    res.json({ prices });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prices/compare
 * Compare prices across multiple seeds
 */
router.get('/compare', async (req, res, next) => {
  try {
    const slugs = (req.query.slugs as string)?.split(',') || [];
    
    if (slugs.length === 0 || slugs.length > 10) {
      return res.status(400).json({ error: 'Provide 1-10 seed slugs' });
    }
    
    const comparisons = await priceService.comparePrices(slugs);
    
    res.json({ comparisons });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prices/history/:seedSlug
 * Get price history for a seed over time
 * Query: days=7|30|90 (default 30), packSize (optional filter)
 */
router.get('/history/:seedSlug', async (req, res, next) => {
  try {
    const { seedSlug } = req.params;
    const days = req.query.days === 'all' ? 0 : (parseInt(req.query.days as string) || 30);
    const packSizeFilter = req.query.packSize as string | undefined;

    const cacheKey = `price-history:${seedSlug}:${days}:${packSizeFilter || ''}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const filter: Record<string, unknown> = { seedSlug };
    if (days > 0) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      filter.scrapedAt = { $gte: since };
    }
    if (packSizeFilter) {
      filter.packSize = packSizeFilter;
    }

    const entries = await Price
      .find(filter, 'seedbank packSize price currency scrapedAt')
      .sort({ scrapedAt: 1 })
      .limit(2000)
      .lean();

    // Group by seedbank+packSize to get distinct series
    const seriesMap: Record<string, { date: string; price: number }[]> = {};
    for (const e of entries) {
      const key = `${e.seedbank} (${e.packSize})`;
      if (!seriesMap[key]) seriesMap[key] = [];
      seriesMap[key].push({
        date: (e.scrapedAt as Date).toISOString().slice(0, 10),
        price: e.price,
      });
    }

    // Aggregate: take min price per (key, day)
    const aggregated: Record<string, Record<string, number>> = {};
    for (const [key, points] of Object.entries(seriesMap)) {
      aggregated[key] = {};
      for (const p of points) {
        if (aggregated[key][p.date] === undefined || p.price < aggregated[key][p.date]) {
          aggregated[key][p.date] = p.price;
        }
      }
    }

    // Get all unique dates sorted
    const allDates = [...new Set(entries.map((e) => (e.scrapedAt as Date).toISOString().slice(0, 10)))].sort();

    // Build chart-ready series
    const series = Object.entries(aggregated).map(([name, byDate]) => ({
      name,
      data: allDates.map((d) => ({
        date: d,
        price: byDate[d] ?? null,
      })),
    }));

    // Available pack sizes for filter
    const packSizes = [...new Set(entries.map((e) => e.packSize))].sort();

    const result = { series, dates: allDates, packSizes };
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 60 * 30); // 30min cache
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prices/trending
 * Get trending seeds (most viewed)
 */
router.get('/trending', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    
    const seeds = await priceService.getTrendingSeeds(limit);
    
    res.json({ seeds });
  } catch (error) {
    next(error);
  }
});

export default router;
