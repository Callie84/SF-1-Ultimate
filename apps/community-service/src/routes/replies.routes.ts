// /apps/community-service/src/routes/replies.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { replyService } from '../services/reply.service';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Validation Schemas
const createReplySchema = z.object({
  threadId: z.string().min(1),
  content: z.string().min(1).max(5000),
  parentId: z.string().optional(),
  imageUrls: z.array(z.string().url()).max(5).optional()
});

const updateReplySchema = z.object({
  content: z.string().min(1).max(5000)
});

/**
 * POST /api/community/replies
 * Neue Reply erstellen
 */
router.post('/',
  authMiddleware,
  validate(createReplySchema),
  async (req, res, next) => {
    try {
      const reply = await replyService.create(req.user!.id, req.body);
      res.status(201).json({ reply });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/community/threads/:threadId/replies
 * Alle Replies eines Threads
 */
router.get('/threads/:threadId/replies',
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const { sort, limit, skip } = req.query;
      
      const result = await replyService.getByThread(req.params.threadId, {
        sort: (sort as any) || 'best',
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
 * PATCH /api/community/replies/:id
 * Reply aktualisieren
 */
router.patch('/:id',
  authMiddleware,
  validate(updateReplySchema),
  async (req, res, next) => {
    try {
      const reply = await replyService.update(
        req.params.id,
        req.user!.id,
        req.body.content
      );
      
      res.json({ reply });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/community/replies/:id
 * Reply löschen
 */
router.delete('/:id',
  authMiddleware,
  async (req, res, next) => {
    try {
      await replyService.delete(req.params.id, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/community/replies/:id/restore
 * Reply wiederherstellen (Owner oder Admin)
 */
router.patch('/:id/restore',
  authMiddleware,
  async (req, res, next) => {
    try {
      const reply = await replyService.restore(req.params.id, req.user!.id);
      res.json({ success: true, reply });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
