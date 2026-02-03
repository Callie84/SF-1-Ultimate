// /apps/community-service/src/routes/follows.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { followService } from '../services/follow.service';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

/**
 * POST /api/community/follows/:userId
 * Follow a user
 */
router.post('/:userId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const followerId = req.user!.id;
    const { userId: followingId } = req.params;

    const follow = await followService.follow(followerId, followingId);

    res.status(201).json({
      success: true,
      follow
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/community/follows/:userId
 * Unfollow a user
 */
router.delete('/:userId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const followerId = req.user!.id;
    const { userId: followingId } = req.params;

    await followService.unfollow(followerId, followingId);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/community/follows/check/:userId
 * Check if current user is following a user
 */
router.get('/check/:userId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const followerId = req.user!.id;
    const { userId: followingId } = req.params;

    const isFollowing = await followService.isFollowing(followerId, followingId);

    res.json({ isFollowing });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/community/follows/check-multiple
 * Check follow status for multiple users
 */
router.post('/check-multiple', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const followerId = req.user!.id;
    const { userIds } = req.body;

    if (!Array.isArray(userIds)) {
      return res.status(400).json({ error: 'userIds must be an array' });
    }

    const status = await followService.checkMultipleFollowStatus(followerId, userIds);

    res.json({ status });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/community/follows/stats/:userId
 * Get follow stats for a user
 */
router.get('/stats/:userId', optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;

    const stats = await followService.getStats(userId);

    // Also check if current user is following this user
    let isFollowing = false;
    if (currentUserId && currentUserId !== userId) {
      isFollowing = await followService.isFollowing(currentUserId, userId);
    }

    res.json({
      ...stats,
      isFollowing
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/community/follows/followers/:userId
 * Get followers of a user
 */
router.get('/followers/:userId', optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const result = await followService.getFollowers(userId, { skip, limit });

    res.json({
      followers: result.followers,
      total: result.total,
      hasMore: skip + result.followers.length < result.total
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/community/follows/following/:userId
 * Get users that a user is following
 */
router.get('/following/:userId', optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const result = await followService.getFollowing(userId, { skip, limit });

    res.json({
      following: result.following,
      total: result.total,
      hasMore: skip + result.following.length < result.total
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/community/follows/suggestions
 * Get suggested users to follow
 */
router.get('/suggestions', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

    const suggestions = await followService.getSuggestedUsers(userId, limit);

    res.json({ suggestions });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/community/follows/mutual/:userId
 * Get mutual followers with another user
 */
router.get('/mutual/:userId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!.id;
    const { userId: otherUserId } = req.params;

    const mutualFollowers = await followService.getMutualFollowers(currentUserId, otherUserId);

    res.json({ mutualFollowers });
  } catch (error) {
    next(error);
  }
});

export default router;
