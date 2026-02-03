// /apps/community-service/src/routes/threads.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { threadService } from '../services/thread.service';
import { replyService } from '../services/reply.service';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Validation Schemas
const createThreadSchema = z.object({
  categoryId: z.string().min(1),
  title: z.string().min(5).max(200),
  content: z.string().min(10).max(10000),
  tags: z.array(z.string().max(30)).max(5).optional()
});

const updateThreadSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  content: z.string().min(10).max(10000).optional(),
  tags: z.array(z.string().max(30)).max(5).optional()
});

/**
 * POST /api/community/threads
 * Neuen Thread erstellen
 */
router.post('/',
  authMiddleware,
  validate(createThreadSchema),
  async (req, res, next) => {
    try {
      const thread = await threadService.create(req.user!.id, req.body);
      res.status(201).json({ thread });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/community/threads
 * Thread-Feed
 */
router.get('/',
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const { categoryId, userId, sort, limit, skip, tag } = req.query;

      const result = await threadService.getThreads({
        categoryId: categoryId as string,
        userId: userId as string,
        sort: (sort as any) || 'latest',
        limit: parseInt(limit as string) || 20,
        skip: parseInt(skip as string) || 0,
        tag: tag as string
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/community/threads/search
 * Volltext-Suche (muss VOR /:id stehen!)
 */
router.get('/search',
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const { q, categoryId, limit, skip } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Query required' });
      }

      const result = await threadService.search(q, {
        categoryId: categoryId as string,
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
 * GET /api/community/threads/:id/replies
 * Alle Replies eines Threads
 */
router.get('/:id/replies',
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const { sort, limit, skip } = req.query;

      const result = await replyService.getByThread(req.params.id, {
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
 * GET /api/community/threads/:id
 * Thread-Details
 */
router.get('/:id',
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const thread = await threadService.getById(
        req.params.id,
        req.user?.id
      );

      res.json({ thread });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/community/threads/:id
 * Thread aktualisieren
 */
router.patch('/:id',
  authMiddleware,
  validate(updateThreadSchema),
  async (req, res, next) => {
    try {
      const thread = await threadService.update(
        req.params.id,
        req.user!.id,
        req.body
      );
      
      res.json({ thread });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/community/threads/:id
 * Thread löschen
 */
router.delete('/:id',
  authMiddleware,
  async (req, res, next) => {
    try {
      await threadService.delete(req.params.id, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/community/threads/:id/solve
 * Thread als gelöst markieren (Best Answer)
 */
router.post('/:id/solve',
  authMiddleware,
  validate(z.object({ replyId: z.string() })),
  async (req, res, next) => {
    try {
      await threadService.markSolved(
        req.params.id,
        req.user!.id,
        req.body.replyId
      );
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
