import { Router } from 'express';
import { z } from 'zod';
import { growService } from '../services/grow.service';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { Grow } from '../models/Grow.model';
import { Photo } from '../models/Photo.model';
import { Entry } from '../models/Entry.model';
import { indexGrow, deleteGrowFromIndex } from '../services/search-client';
import { invalidateCache } from '../utils/cache';

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
  growAreaM2: z.number().min(0).max(1000).optional(),
  tentSize: z.string().max(50).optional(),
  medium: z.string().max(100).optional(),
  potSize: z.string().max(50).optional(),
  nutrients: z.array(z.string()).optional(),
  isPublic: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
  motherGrowId: z.string().optional(),
});

const updateGrowSchema = createGrowSchema.partial();

const harvestSchema = z.object({
  harvestDate: z.string().datetime(),
  yieldWet: z.number().min(0).optional(),
  yieldDry: z.number().min(0).optional(),
  growAreaM2: z.number().min(0).max(1000).optional(),
  quality: z.number().min(1).max(5).optional()
});

router.post('/',
  authMiddleware,
  validate(createGrowSchema),
  async (req, res, next) => {
    try {
      const grow = await growService.create(req.user!.id, req.body);
      res.status(201).json({ grow });
      invalidateCache('cache:feed:*').catch(() => {});
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
          { $match: { userId, deletedAt: null, isPermanentlyDeleted: { $ne: true } } },
          { $facet: {
            total: [{ $count: 'count' }],
            active: [{ $match: { status: { $in: ['germination', 'vegetative', 'flowering', 'drying', 'curing'] } } }, { $count: 'count' }],
            harvested: [{ $match: { status: 'harvested' } }, { $count: 'count' }],
            byEnvironment: [{ $group: { _id: '$environment', count: { $sum: 1 } } }],
            byType: [{ $group: { _id: '$type', count: { $sum: 1 } } }],
          }},
        ]),
        Grow.aggregate([
          { $match: { userId, deletedAt: null, status: 'harvested', yieldDry: { $gt: 0 }, isPermanentlyDeleted: { $ne: true } } },
          { $group: {
            _id: null,
            totalYieldDry: { $sum: '$yieldDry' },
            avgYieldDry: { $avg: '$yieldDry' },
            maxYieldDry: { $max: '$yieldDry' },
            avgEfficiency: { $avg: '$efficiency' },
            maxEfficiency: { $max: '$efficiency' },
            avgYieldPerM2: { $avg: '$yieldPerM2' },
            maxYieldPerM2: { $max: '$yieldPerM2' },
            avgQuality: { $avg: '$quality' },
            avgDuration: { $avg: '$duration' },
            count: { $sum: 1 },
          }},
        ]),
        Grow.find({ userId, deletedAt: null, status: 'harvested', yieldDry: { $gt: 0 }, isPermanentlyDeleted: { $ne: true } })
          .sort({ yieldDry: -1 })
          .limit(5)
          .select('strainName yieldDry yieldWet efficiency yieldPerM2 growAreaM2 quality harvestDate environment lightWattage')
          .lean(),
        Grow.aggregate([
          { $match: { userId, deletedAt: null, isPermanentlyDeleted: { $ne: true } } },
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
          avgEfficiency: h.avgEfficiency ? Math.round(h.avgEfficiency * 100) / 100 : null,
          maxEfficiency: h.maxEfficiency ? Math.round(h.maxEfficiency * 100) / 100 : null,
          avgYieldPerM2: h.avgYieldPerM2 ? Math.round(h.avgYieldPerM2 * 10) / 10 : null,
          maxYieldPerM2: h.maxYieldPerM2 ? Math.round(h.maxYieldPerM2 * 10) / 10 : null,
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

/**
 * GET /api/journal/grows/public
 * Öffentliche Grows (Alias für /api/journal/feed)
 * Muss VOR /:id stehen!
 */
router.get('/public',
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const { feedService } = await import('../services/feed.service');
      const { limit, skip, sortBy, status, environment } = req.query;
      const result = await feedService.getPublicFeed({
        limit: parseInt(limit as string) || 20,
        skip: parseInt(skip as string) || 0,
        sortBy: (sortBy as string) || 'recent',
        status: status as string,
        environment: environment as string,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/journal/grows/admin/deleted
 * Admin: gelöschte Grows auflisten (muss VOR /:id stehen!)
 */
router.get('/admin/deleted',
  authMiddleware,
  async (req, res, next) => {
    try {
      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Nicht berechtigt' });
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await growService.getDeleted(page, limit);
      res.json({ ...result, page, totalPages: Math.ceil(result.total / limit) });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/journal/grows/:id/restore
 * Grow wiederherstellen (Owner oder Admin)
 */
router.patch('/:id/restore',
  authMiddleware,
  async (req, res, next) => {
    try {
      const grow = await growService.restore(req.params.id, req.user!.id);
      res.json({ success: true, grow });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/journal/grows/:id/purge
 * Grow dauerhaft ausblenden (Admin only)
 */
router.patch('/:id/purge',
  authMiddleware,
  async (req, res, next) => {
    try {
      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Nicht berechtigt' });
      }
      await growService.purge(req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/journal/grows/:id/timelapse
 * Alle Fotos eines Grows zeitlich sortiert (für Zeitraffer)
 * Öffentlich zugänglich wenn Grow öffentlich, sonst Auth erforderlich
 */
router.get('/:id/timelapse',
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const grow = await growService.getById(req.params.id, req.user?.id);
      if (!grow) return res.status(404).json({ error: 'Grow not found' });

      // Zugriffscheck: privater Grow nur für Besitzer
      if (!(grow as any).isPublic && (grow as any).userId !== req.user?.id) {
        return res.status(403).json({ error: 'Kein Zugriff auf diesen Grow' });
      }

      // 1) Fotos aus Journal-Einträgen (via Photo-Collection)

      const entries = await (Entry as any).find({ growId: req.params.id })
        .select('_id date')
        .sort({ date: 1 })
        .lean();

      const entryDateMap: Record<string, Date> = {};
      for (const e of entries) entryDateMap[e._id.toString()] = e.date;

      const entryPhotos = await Photo.find({ growId: req.params.id })
        .select('url thumbnailUrl mediumUrl caption entryId takenAt createdAt order')
        .sort({ createdAt: 1 })
        .lean();

      const frames = entryPhotos.map((p) => ({
        url: p.mediumUrl || p.url,
        thumbnailUrl: p.thumbnailUrl || p.url,
        caption: p.caption || '',
        date: p.takenAt || entryDateMap[p.entryId?.toString()] || p.createdAt,
        source: 'entry' as const,
      }));

      // 2) Fotos aus Grow-Galerie
      const growPhotos = ((grow as any).photos || []).map((p: any) => ({
        url: p.thumbnailUrl || p.url,
        thumbnailUrl: p.thumbnailUrl || p.url,
        caption: p.caption || '',
        date: p.uploadedAt,
        source: 'gallery' as const,
      }));

      // Kombinieren + nach Datum sortieren
      const allFrames = [...frames, ...growPhotos].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      res.json({
        growId: req.params.id,
        strainName: (grow as any).strainName,
        frameCount: allFrames.length,
        frames: allFrames,
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

// GET /api/journal/grows/:id/clones — Klone eines Grows
router.get('/:id/clones',
  authMiddleware,
  async (req, res, next) => {
    try {
      const clones = await Grow.find({
        motherGrowId: req.params.id,
        userId: req.user!.id,
        deletedAt: null, isPermanentlyDeleted: { $ne: true },
      }).sort({ createdAt: -1 }).lean();
      res.json({ clones });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/grows/:id/photos
 * Foto zur Grow-Galerie hinzufügen (URL nach Upload via media-service)
 */
router.post('/:id/photos',
  authMiddleware,
  validate(z.object({
    url: z.string().url(),
    thumbnailUrl: z.string().url().optional(),
    caption: z.string().max(200).optional()
  })),
  async (req, res, next) => {
    try {
      const grow = await Grow.findOne({ _id: req.params.id, userId: req.user!.id });
      if (!grow) return res.status(404).json({ error: 'Grow nicht gefunden' });
      if (grow.photos.length >= 20) return res.status(400).json({ error: 'Maximal 20 Fotos pro Grow' });
      grow.photos.push({
        url: req.body.url,
        thumbnailUrl: req.body.thumbnailUrl,
        caption: req.body.caption,
        uploadedAt: new Date()
      } as any);
      await grow.save();
      res.status(201).json({ photo: grow.photos[grow.photos.length - 1] });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/grows/:id/photos/:photoId
 * Foto aus Grow-Galerie entfernen
 */
router.delete('/:id/photos/:photoId',
  authMiddleware,
  async (req, res, next) => {
    try {
      const grow = await Grow.findOne({ _id: req.params.id, userId: req.user!.id });
      if (!grow) return res.status(404).json({ error: 'Grow nicht gefunden' });
      grow.photos = grow.photos.filter((p: any) => p._id?.toString() !== req.params.photoId) as any;
      await grow.save();
      res.json({ message: 'Foto gelöscht' });
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
