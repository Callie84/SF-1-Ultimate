import { Router } from 'express';
import { z } from 'zod';
import { entryService } from '../services/entry.service';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const createEntrySchema = z.object({
  week: z.number().min(1).max(52),
  day: z.number().min(1).max(7).optional(),
  title: z.string().min(1).max(200),
  notes: z.string().max(5000).optional(),
  height: z.number().min(0).optional(),
  ph: z.number().min(0).max(14).optional(),
  ec: z.number().min(0).optional(),
  ppm: z.number().min(0).optional(),
  temperature: z.number().optional(),
  humidity: z.number().min(0).max(100).optional(),
  watered: z.boolean().optional(),
  fed: z.boolean().optional(),
  defoliated: z.boolean().optional(),
  trained: z.boolean().optional()
});

const updateEntrySchema = createEntrySchema.partial();

router.post('/:growId/entries',
  authMiddleware,
  validate(createEntrySchema),
  async (req, res, next) => {
    try {
      const entry = await entryService.create({
        growId: req.params.growId,
        userId: req.user!.id,
        ...req.body
      });
      
      res.status(201).json({ entry });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:growId/entries',
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const entries = await entryService.getByGrow(
        req.params.growId,
        req.user?.id
      );
      
      res.json({ entries });
    } catch (error) {
      next(error);
    }
  }
);

router.patch('/entries/:id',
  authMiddleware,
  validate(updateEntrySchema),
  async (req, res, next) => {
    try {
      const entry = await entryService.update(
        req.params.id,
        req.user!.id,
        req.body
      );
      
      res.json({ entry });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/entries/:id',
  authMiddleware,
  async (req, res, next) => {
    try {
      await entryService.delete(req.params.id, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
