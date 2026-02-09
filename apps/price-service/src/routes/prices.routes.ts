// Price Service - Price Routes
import { Router } from 'express';
import { priceService } from '../services/price.service';
import { logger } from '../utils/logger';

const router = Router();

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
