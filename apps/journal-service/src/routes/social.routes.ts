import { Router } from 'express';
import { z } from 'zod';
import { socialService } from '../services/social.service';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const reactionSchema = z.object({
  type: z.enum(['fire', 'frosty', 'jealous', 'helpful', 'impressive'])
});

const commentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().optional()
});

router.post('/:growId/react',
  authMiddleware,
  validate(reactionSchema),
  async (req, res, next) => {
    try {
      const reaction = await socialService.toggleReaction({
        userId: req.user!.id,
        growId: req.params.growId,
        type: req.body.type
      });
      
      res.json({ reaction });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:growId/react',
  authMiddleware,
  async (req, res, next) => {
    try {
      await socialService.removeReaction(
        req.user!.id,
        req.params.growId
      );
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:growId/reactions',
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const reactions = await socialService.getReactions(
        req.params.growId,
        req.user?.id
      );
      
      res.json({ reactions });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/:growId/comment',
  authMiddleware,
  validate(commentSchema),
  async (req, res, next) => {
    try {
      const comment = await socialService.addComment({
        userId: req.user!.id,
        growId: req.params.growId,
        content: req.body.content,
        parentId: req.body.parentId
      });
      
      res.status(201).json({ comment });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:growId/comments',
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const skip = parseInt(req.query.skip as string) || 0;
      
      const result = await socialService.getComments(
        req.params.growId,
        { limit, skip }
      );
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.patch('/comments/:id',
  authMiddleware,
  validate(z.object({ content: z.string().min(1).max(2000) })),
  async (req, res, next) => {
    try {
      const comment = await socialService.updateComment(
        req.params.id,
        req.user!.id,
        req.body.content
      );
      
      res.json({ comment });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/comments/:id',
  authMiddleware,
  async (req, res, next) => {
    try {
      await socialService.deleteComment(
        req.params.id,
        req.user!.id
      );
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/comments/:id/like',
  authMiddleware,
  async (req, res, next) => {
    try {
      await socialService.toggleCommentLike(
        req.params.id,
        req.user!.id
      );
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
