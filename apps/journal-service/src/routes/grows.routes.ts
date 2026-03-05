import { Router } from 'express';
import { z } from 'zod';
import { growService } from '../services/grow.service';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { Grow } from '../models/Grow.model';
import { indexGrow, deleteGrowFromIndex } from '../services/search-client';

const router = Router();

const createGrowSchema = z.object({
  strainName: z.string().min(1).max(100),
  strainId: z.string().optional(),
  breeder: z.string().max(100).optional(),
  type: z.enum(['feminized', 'autoflower', 'regular', 'clone']),
  environment: z.enum(['indoor', 'outdoor', 'greenhouse']),
  startDate: z.string().datetime(),
  lightWattage: z.number().min(0).max(10000).optional(),
  lightType: z.string().max(50).optional(),
  tentSize: z.string().max(50).optional(),
  medium: z.string().max(100).optional(),
  potSize: z.string().max(50).optional(),
  nutrients: z.array(z.string()).optional(),
  isPublic: z.boolean().default(true),
  tags: z.array(z.string()).optional()
});

const updateGrowSchema = createGrowSchema.partial();

const harvestSchema = z.object({
  harvestDate: z.string().datetime(),
  yieldWet: z.number().min(0).optional(),
  yieldDry: z.number().min(0).optional(),
  quality: z.number().min(1).max(5).optional()
});

router.post('/',
  authMiddleware,
  validate(createGrowSchema),
  async (req, res, next) => {
    try {
      const grow = await growService.create(req.user!.id, req.body);
      res.status(201).json({ grow });
      indexGrow(grow);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { status, limit, skip } = req.query;
      
      const result = await growService.getUserGrows(req.user!.id, {
        status: status as string,
        limit: parseInt(limit as string) || 20,
        skip: parseInt(skip as string) || 0
      });
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/journal/grows/stats
 * Personal harvest & grow statistics
 */
router.get('/stats',
  authMiddleware,
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const [overview, harvestStats, topYields, strainStats] = await Promise.all([
        Grow.aggregate([
          { $match: { userId, deletedAt: null } },
          { $facet: {
            total: [{ $count: 'count' }],
            active: [{ $match: { status: { $in: ['germination', 'vegetative', 'flowering', 'drying', 'curing'] } } }, { $count: 'count' }],
            harvested: [{ $match: { status: 'harvested' } }, { $count: 'count' }],
            byEnvironment: [{ $group: { _id: '$environment', count: { $sum: 1 } } }],
            byType: [{ $group: { _id: '$type', count: { $sum: 1 } } }],
          }},
        ]),
        Grow.aggregate([
          { $match: { userId, deletedAt: null, status: 'harvested', yieldDry: { $gt: 0 } } },
          { $group: {
            _id: null,
            totalYieldDry: { $sum: '$yieldDry' },
            avgYieldDry: { $avg: '$yieldDry' },
            maxYieldDry: { $max: '$yieldDry' },
            avgQuality: { $avg: '$quality' },
            avgDuration: { $avg: '$duration' },
            count: { $sum: 1 },
          }},
        ]),
        Grow.find({ userId, deletedAt: null, status: 'harvested', yieldDry: { $gt: 0 } })
          .sort({ yieldDry: -1 })
          .limit(5)
          .select('strainName yieldDry yieldWet quality harvestDate environment')
          .lean(),
        Grow.aggregate([
          { $match: { userId, deletedAt: null } },
          { $group: { _id: '$strainName', count: { $sum: 1 }, avgYield: { $avg: '$yieldDry' } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
      ]);

      const o = overview[0];
      const h = harvestStats[0] || {};

      res.json({
        total: o.total[0]?.count || 0,
        active: o.active[0]?.count || 0,
        harvested: o.harvested[0]?.count || 0,
        byEnvironment: o.byEnvironment.reduce((acc: any, e: any) => { acc[e._id || 'unknown'] = e.count; return acc; }, {}),
        byType: o.byType.reduce((acc: any, t: any) => { acc[t._id || 'unknown'] = t.count; return acc; }, {}),
        harvest: {
          count: h.count || 0,
          totalYieldDry: Math.round((h.totalYieldDry || 0) * 10) / 10,
          avgYieldDry: Math.round((h.avgYieldDry || 0) * 10) / 10,
          maxYieldDry: Math.round((h.maxYieldDry || 0) * 10) / 10,
          avgQuality: Math.round((h.avgQuality || 0) * 10) / 10,
          avgDurationDays: Math.round(h.avgDuration || 0),
        },
        topYields,
        topStrains: strainStats,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id',
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const grow = await growService.getById(req.params.id, req.user?.id);
      
      if (!grow) {
        return res.status(404).json({ error: 'Grow not found' });
      }
      
      res.json({ grow });
    } catch (error) {
      next(error);
    }
  }
);

router.patch('/:id',
  authMiddleware,
  validate(updateGrowSchema),
  async (req, res, next) => {
    try {
      const grow = await growService.update(req.params.id, req.user!.id, req.body);
      res.json({ grow });
      indexGrow(grow);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:id',
  authMiddleware,
  async (req, res, next) => {
    try {
      await growService.delete(req.params.id, req.user!.id);
      res.json({ success: true });
      deleteGrowFromIndex(req.params.id);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/:id/harvest',
  authMiddleware,
  validate(harvestSchema),
  async (req, res, next) => {
    try {
      const grow = await growService.markHarvested(
        req.params.id,
        req.user!.id,
        req.body
      );
      res.json({ grow });
      indexGrow(grow);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
