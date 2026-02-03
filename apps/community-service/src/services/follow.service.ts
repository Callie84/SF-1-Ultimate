// /apps/community-service/src/services/follow.service.ts
import { Follow, IFollow } from '../models/Follow.model';
import { AppError } from '../utils/errors';

export interface FollowStats {
  followersCount: number;
  followingCount: number;
}

export class FollowService {
  /**
   * Follow a user
   */
  async follow(followerId: string, followingId: string): Promise<IFollow> {
    if (followerId === followingId) {
      throw new AppError('Cannot follow yourself', 400);
    }

    // Check if already following
    const existing = await Follow.findOne({ followerId, followingId });
    if (existing) {
      throw new AppError('Already following this user', 400);
    }

    const follow = await Follow.create({
      followerId,
      followingId
    });

    return follow;
  }

  /**
   * Unfollow a user
   */
  async unfollow(followerId: string, followingId: string): Promise<void> {
    const result = await Follow.deleteOne({ followerId, followingId });

    if (result.deletedCount === 0) {
      throw new AppError('Not following this user', 400);
    }
  }

  /**
   * Check if user is following another user
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await Follow.findOne({ followerId, followingId });
    return !!follow;
  }

  /**
   * Get follow stats for a user
   */
  async getStats(userId: string): Promise<FollowStats> {
    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ followingId: userId }),
      Follow.countDocuments({ followerId: userId })
    ]);

    return { followersCount, followingCount };
  }

  /**
   * Get followers of a user
   */
  async getFollowers(
    userId: string,
    options: { skip?: number; limit?: number } = {}
  ): Promise<{ followers: string[]; total: number }> {
    const { skip = 0, limit = 20 } = options;

    const [follows, total] = await Promise.all([
      Follow.find({ followingId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Follow.countDocuments({ followingId: userId })
    ]);

    return {
      followers: follows.map(f => f.followerId),
      total
    };
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(
    userId: string,
    options: { skip?: number; limit?: number } = {}
  ): Promise<{ following: string[]; total: number }> {
    const { skip = 0, limit = 20 } = options;

    const [follows, total] = await Promise.all([
      Follow.find({ followerId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Follow.countDocuments({ followerId: userId })
    ]);

    return {
      following: follows.map(f => f.followingId),
      total
    };
  }

  /**
   * Check follow status for multiple users
   */
  async checkMultipleFollowStatus(
    followerId: string,
    userIds: string[]
  ): Promise<Record<string, boolean>> {
    const follows = await Follow.find({
      followerId,
      followingId: { $in: userIds }
    }).lean();

    const followingSet = new Set(follows.map(f => f.followingId));

    const result: Record<string, boolean> = {};
    for (const userId of userIds) {
      result[userId] = followingSet.has(userId);
    }

    return result;
  }

  /**
   * Get mutual followers (users that both follow each other)
   */
  async getMutualFollowers(
    userId1: string,
    userId2: string
  ): Promise<string[]> {
    // Get users that follow userId1
    const followersOf1 = await Follow.find({ followingId: userId1 }).lean();
    const followerIds1 = new Set(followersOf1.map(f => f.followerId));

    // Get users that follow userId2
    const followersOf2 = await Follow.find({ followingId: userId2 }).lean();
    const followerIds2 = new Set(followersOf2.map(f => f.followerId));

    // Find intersection
    const mutual: string[] = [];
    for (const id of followerIds1) {
      if (followerIds2.has(id)) {
        mutual.push(id);
      }
    }

    return mutual;
  }

  /**
   * Get suggested users to follow (users that your followers also follow)
   */
  async getSuggestedUsers(
    userId: string,
    limit: number = 10
  ): Promise<string[]> {
    // Get users you follow
    const following = await Follow.find({ followerId: userId }).lean();
    const followingIds = following.map(f => f.followingId);
    followingIds.push(userId); // Exclude self

    // Find users that your followers follow, but you don't
    const suggestions = await Follow.aggregate([
      // Get your followers
      { $match: { followingId: userId } },
      // Look up who they follow
      {
        $lookup: {
          from: 'follows',
          localField: 'followerId',
          foreignField: 'followerId',
          as: 'theirFollowing'
        }
      },
      { $unwind: '$theirFollowing' },
      // Exclude users you already follow and yourself
      {
        $match: {
          'theirFollowing.followingId': { $nin: followingIds }
        }
      },
      // Group and count
      {
        $group: {
          _id: '$theirFollowing.followingId',
          count: { $sum: 1 }
        }
      },
      // Sort by popularity
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);

    return suggestions.map(s => s._id);
  }
}

export const followService = new FollowService();
