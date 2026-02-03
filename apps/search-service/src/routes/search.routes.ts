// /apps/search-service/src/routes/search.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { searchService } from '../services/search.service';
import { indexingService } from '../services/indexing.service';
import { syncWorker } from '../workers/sync.worker';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

// ============================================
// WICHTIG: Spezifische Routen VOR parametrisierten Routen!
// ============================================

/**
 * GET /api/search/analytics
 * Search Analytics (nur Admin)
 */
router.get('/analytics',
  authMiddleware,
  async (req, res, next) => {
    try {
      // Admin-Check
      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const popularSearches = await searchService.getPopularSearches(20);

      res.json({
        popularSearches,
        totalSearches: popularSearches.reduce((sum, s) => sum + s.count, 0)
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/search/history/recent
 * Recent Searches (muss VOR /:index stehen!)
 */
router.get('/history/recent',
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const { limit } = req.query;

      // Ohne Auth: leeres Array zurückgeben
      if (!req.user) {
        return res.json({ searches: [] });
      }

      const searches = await searchService.getRecentSearches(
        req.user.id,
        parseInt(limit as string) || 10
      );

      res.json({ searches });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/search/history/recent
 * Clear Recent Searches
 */
router.delete('/history/recent',
  authMiddleware,
  async (req, res, next) => {
    try {
      await searchService.clearRecentSearches(req.user!.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/search/popular
 * Popular Searches (muss VOR /:index stehen!)
 */
router.get('/popular',
  async (req, res, next) => {
    try {
      const { limit } = req.query;

      const searches = await searchService.getPopularSearches(
        parseInt(limit as string) || 10
      );

      res.json({ searches });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Parametrisierte Routen (NACH den spezifischen!)
// ============================================

/**
 * GET /api/search
 * Universal Search (alle Indexes)
 */
router.get('/',
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const { q, limit } = req.query;

      if (!q || typeof q !== 'string' || q.length < 2) {
        return res.status(400).json({ error: 'Query must be at least 2 characters' });
      }

      const results = await searchService.searchAll(q, {
        limit: parseInt(limit as string) || 5
      });

      // Track search (wenn eingeloggt)
      if (req.user) {
        await searchService.trackSearch(req.user.id, q, 'all');
      }

      res.json(results);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/search/:index
 * Search in spezifischem Index
 */
router.get('/:index',
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const { index } = req.params;
      const { q, filter, sort, limit, offset, highlight } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Query required' });
      }
      
      const validIndexes = ['strains', 'threads', 'grows', 'users'];
      if (!validIndexes.includes(index)) {
        return res.status(400).json({ error: 'Invalid index' });
      }
      
      const results = await searchService.search({
        query: q,
        index: index.toUpperCase() as any,
        filters: filter as string,
        sort: sort ? (sort as string).split(',') : undefined,
        limit: parseInt(limit as string) || 20,
        offset: parseInt(offset as string) || 0,
        attributesToHighlight: highlight ? (highlight as string).split(',') : undefined
      });
      
      // Track search
      if (req.user) {
        await searchService.trackSearch(req.user.id, q, index);
      }
      
      res.json(results);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/search/:index/suggest
 * Autocomplete / Suggestions
 */
router.get('/:index/suggest',
  async (req, res, next) => {
    try {
      const { index } = req.params;
      const { q, limit } = req.query;
      
      if (!q || typeof q !== 'string' || q.length < 2) {
        return res.json({ suggestions: [] });
      }
      
      const validIndexes = ['strains', 'threads', 'grows', 'users'];
      if (!validIndexes.includes(index)) {
        return res.status(400).json({ error: 'Invalid index' });
      }
      
      const suggestions = await searchService.suggest(
        q,
        index.toUpperCase() as any,
        parseInt(limit as string) || 5
      );
      
      res.json({ suggestions });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/search/index/:index
 * Manuelles Indexieren (Admin)
 */
router.post('/index/:index',
  authMiddleware,
  async (req, res, next) => {
    try {
      // TODO: Admin-Check
      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      const { index } = req.params;
      const { documents } = req.body;
      
      const validIndexes = ['STRAINS', 'THREADS', 'GROWS', 'USERS'];
      if (!validIndexes.includes(index)) {
        return res.status(400).json({ error: 'Invalid index' });
      }
      
      await indexingService.indexDocuments(index as any, documents);
      
      res.json({ success: true, count: documents.length });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/search/reindex/:index
 * Index neu aufbauen (Admin)
 */
router.post('/reindex/:index',
  authMiddleware,
  async (req, res, next) => {
    try {
      // Admin-Check
      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      const { index } = req.params;
      
      switch (index) {
        case 'strains':
          await indexingService.reindexStrains();
          break;
        case 'threads':
          await indexingService.reindexThreads();
          break;
        case 'grows':
          await indexingService.reindexGrows();
          break;
        case 'all':
          await indexingService.reindexAll();
          break;
        default:
          return res.status(400).json({ error: 'Invalid index' });
      }
      
      res.json({ success: true, index });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/search/stats/:index
 * Index-Statistiken (Admin)
 */
router.get('/stats/:index',
  authMiddleware,
  async (req, res, next) => {
    try {
      // Admin-Check
      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      const { index } = req.params;
      const validIndexes = ['STRAINS', 'THREADS', 'GROWS', 'USERS'];
      
      if (!validIndexes.includes(index.toUpperCase())) {
        return res.status(400).json({ error: 'Invalid index' });
      }
      
      const stats = await indexingService.getStats(index.toUpperCase() as any);
      const queueStats = await syncWorker.getStats();
      
      res.json({ 
        index: stats,
        queue: queueStats
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
