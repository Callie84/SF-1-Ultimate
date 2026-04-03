// /apps/community-service/src/routes/moderation.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { moderationService } from '../services/moderation.service';
import { authMiddleware, moderatorMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const reportSchema = z.object({
  targetId: z.string().min(1),
  targetType: z.enum(['thread', 'reply']),
  reason: z.enum(['spam', 'abuse', 'harassment', 'illegal', 'misinformation', 'other']),
  description: z.string().max(1000).optional()
});

const reviewSchema = z.object({
  action: z.enum(['none', 'warning', 'content_removed', 'user_banned']),
  note: z.string().max(1000).optional()
});

const resolveSchema = z.object({
  action: z.enum(['dismiss', 'warn', 'delete', 'ban']),
  note: z.string().max(1000).optional()
});

const banSchema = z.object({
  reason: z.string().min(10).max(1000),
  type: z.enum(['temporary', 'permanent']),
  days: z.number().min(1).max(365).optional()
});

/**
 * POST /api/community/moderation/reports
 * Content melden (Auth required)
 */
router.post('/reports',
  authMiddleware,
  validate(reportSchema),
  async (req, res, next) => {
    try {
      const report = await moderationService.report(req.user!.id, req.body);
      res.status(201).json({ report });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/community/moderation/reports
 * Reports abrufen (Mod-Only)
 */
router.get('/reports',
  authMiddleware,
  moderatorMiddleware,
  async (req, res, next) => {
    try {
      const { status, targetType, limit, skip } = req.query;

      const result = await moderationService.getReports({
        status: status as string,
        targetType: targetType as string,
        limit: parseInt(limit as string) || 50,
        skip: parseInt(skip as string) || 0
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/community/moderation/reports/:id/resolve
 * Report bearbeiten — Frontend-kompatible Action-Namen (Mod-Only)
 */
router.post('/reports/:id/resolve',
  authMiddleware,
  moderatorMiddleware,
  validate(resolveSchema),
  async (req, res, next) => {
    try {
      const actionMap: Record<string, 'none' | 'warning' | 'content_removed' | 'user_banned'> = {
        dismiss: 'none',
        warn: 'warning',
        delete: 'content_removed',
        ban: 'user_banned'
      };

      const report = await moderationService.reviewReport(
        req.params.id,
        req.user!.id,
        {
          action: actionMap[req.body.action],
          note: req.body.note
        }
      );

      res.json({ report });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/community/moderation/reports/:id/review
 * Report bearbeiten — interne Action-Namen (Mod-Only)
 */
router.patch('/reports/:id/review',
  authMiddleware,
  moderatorMiddleware,
  validate(reviewSchema),
  async (req, res, next) => {
    try {
      const report = await moderationService.reviewReport(
        req.params.id,
        req.user!.id,
        req.body
      );

      res.json({ report });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/community/moderation/bans
 * User bannen (Mod-Only)
 */
router.post('/bans',
  authMiddleware,
  moderatorMiddleware,
  validate(z.object({
    userId: z.string().min(1),
    ...banSchema.shape
  })),
  async (req, res, next) => {
    try {
      const { userId, ...banData } = req.body;

      const ban = await moderationService.banUser(
        userId,
        req.user!.id,
        banData
      );

      res.status(201).json({ ban });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/community/moderation/bans/:userId
 * Ban aufheben (Mod-Only)
 */
router.delete('/bans/:userId',
  authMiddleware,
  moderatorMiddleware,
  async (req, res, next) => {
    try {
      await moderationService.unbanUser(req.params.userId, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/community/moderation/threads/:id/pin
 * Thread pinnen/unpinnen (Mod-Only)
 */
router.post('/threads/:id/pin',
  authMiddleware,
  moderatorMiddleware,
  async (req, res, next) => {
    try {
      const isPinned = await moderationService.togglePin(
        req.params.id,
        req.user!.id
      );

      res.json({ isPinned });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/community/moderation/threads/:id/lock
 * Thread locken/unlocken (Mod-Only)
 */
router.post('/threads/:id/lock',
  authMiddleware,
  moderatorMiddleware,
  async (req, res, next) => {
    try {
      const isLocked = await moderationService.toggleLock(
        req.params.id,
        req.user!.id
      );

      res.json({ isLocked });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/community/moderation/stats
 * Moderation-Dashboard Stats (Mod-Only)
 */
router.get('/stats',
  authMiddleware,
  moderatorMiddleware,
  async (req, res, next) => {
    try {
      const stats = await moderationService.getStats();
      res.json({ stats });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
