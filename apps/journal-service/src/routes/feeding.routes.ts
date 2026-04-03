import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { FeedingPlan } from '../models/FeedingPlan.model';

const router = Router();

const productSchema = z.object({
  name: z.string().min(1).max(100),
  mlPerLiter: z.number().min(0).max(1000),
  notes: z.string().max(500).optional(),
});

const scheduleEntrySchema = z.object({
  week: z.number().int().min(1).max(52),
  phase: z.enum(['seedling', 'vegetative', 'earlyFlowering', 'lateFlowering', 'flush']),
  products: z.array(productSchema).max(20),
  phTarget: z.number().min(0).max(14).optional(),
  ecTarget: z.number().min(0).max(10).optional(),
  notes: z.string().max(1000).optional(),
});

const createPlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  medium: z.string().min(1).max(50),
  schedule: z.array(scheduleEntrySchema).max(52).default([]),
  isPublic: z.boolean().default(false),
});

const updatePlanSchema = createPlanSchema.partial();

// GET /api/journal/feeding — eigene Pläne
router.get('/',
  authMiddleware,
  async (req, res, next) => {
    try {
      const plans = await FeedingPlan.find({
        userId: req.user!.id,
        deletedAt: { $exists: false },
      }).sort({ updatedAt: -1 }).lean();

      res.json({ plans });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/journal/feeding/public — öffentliche Pläne
router.get('/public',
  async (req, res, next) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = parseInt(req.query.skip as string) || 0;
      const medium = req.query.medium as string | undefined;

      const filter: any = {
        isPublic: true,
        deletedAt: { $exists: false },
      };
      if (medium) filter.medium = medium;

      const [plans, total] = await Promise.all([
        FeedingPlan.find(filter).sort({ usageCount: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
        FeedingPlan.countDocuments(filter),
      ]);

      res.json({ plans, total });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/journal/feeding/:id — einzelnen Plan
router.get('/:id',
  authMiddleware,
  async (req, res, next) => {
    try {
      const plan = await FeedingPlan.findOne({
        _id: req.params.id,
        $or: [{ userId: req.user!.id }, { isPublic: true }],
        deletedAt: { $exists: false },
      }).lean();

      if (!plan) return res.status(404).json({ error: 'Plan nicht gefunden' });
      res.json({ plan });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/journal/feeding — Plan erstellen
router.post('/',
  authMiddleware,
  validate(createPlanSchema),
  async (req, res, next) => {
    try {
      const plan = await FeedingPlan.create({
        userId: req.user!.id,
        ...req.body,
      });
      res.status(201).json({ plan });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/journal/feeding/:id — Plan aktualisieren
router.patch('/:id',
  authMiddleware,
  validate(updatePlanSchema),
  async (req, res, next) => {
    try {
      const plan = await FeedingPlan.findOneAndUpdate(
        { _id: req.params.id, userId: req.user!.id, deletedAt: { $exists: false } },
        { $set: req.body },
        { new: true }
      );
      if (!plan) return res.status(404).json({ error: 'Plan nicht gefunden' });
      res.json({ plan });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/journal/feeding/:id — Plan löschen (soft)
router.delete('/:id',
  authMiddleware,
  async (req, res, next) => {
    try {
      const plan = await FeedingPlan.findOneAndUpdate(
        { _id: req.params.id, userId: req.user!.id, deletedAt: { $exists: false } },
        { deletedAt: new Date() },
      );
      if (!plan) return res.status(404).json({ error: 'Plan nicht gefunden' });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
