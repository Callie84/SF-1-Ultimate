// Price Service - Alert Routes
import { Router } from 'express';
import { z } from 'zod';
import { alertService } from '../services/alert.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

const createAlertSchema = z.object({
  seedSlug: z.string().min(1),
  targetPrice: z.number().positive(),
  currency: z.string().optional(),
  seedbanks: z.array(z.string()).optional(),
  packSize: z.string().optional(),
  notifyOnDiscount: z.boolean().optional(),
  notifyOnRestock: z.boolean().optional()
});

/**
 * POST /api/alerts
 * Create price alert
 */
router.post('/', authMiddleware(), async (req: any, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const validation = createAlertSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const alert = await alertService.createAlert({ userId, ...validation.data });
    res.status(201).json({ alert });
    return;
  } catch (error: any) {
    if (error.message === 'Seed not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
    return;
  }
});

/**
 * GET /api/alerts
 * Get user's alerts
 */
router.get('/', authMiddleware(), async (req: any, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const activeOnly = req.query.active !== 'false';
    const alerts = await alertService.getUserAlerts(userId, activeOnly);
    res.json({ alerts });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

/**
 * PATCH /api/alerts/:id/deactivate
 * Deactivate alert
 */
router.patch('/:id/deactivate', authMiddleware(), async (req: any, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await alertService.deactivateAlert(req.params.id, userId);
    res.json({ success: true });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

/**
 * DELETE /api/alerts/:id
 * Delete alert
 */
router.delete('/:id', authMiddleware(), async (req: any, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await alertService.deleteAlert(req.params.id, userId);
    res.json({ success: true });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

export default router;
