// Price Service - Price Routes
import { Router } from 'express';
import { priceService } from '../services/price.service';
import { logger } from '../utils/logger';
import { redis } from '../config/redis';

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
router.get('/today', async (req, res, next) => {
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
router.get('/search', async (req, res, next) => {
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

    const result = await priceService.browseSeeds({ type, breeder, sort, limit, skip });

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
