import { Grow } from '../models/Grow.model';
import { redis } from '../config/redis';

export class FeedService {
  async getPublicFeed(options: {
    limit: number;
    skip: number;
    sortBy: string;
    userId?: string;
  }): Promise<{ grows: any[]; total: number }> {
    const cacheKey = `feed:public:${options.sortBy}:${options.limit}:${options.skip}`;
    
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    let sort: any = {};
    
    switch (options.sortBy) {
      case 'recent':
        sort = { createdAt: -1 };
        break;
      case 'trending':
        sort = { viewCount: -1, createdAt: -1 };
        break;
      case 'top':
        sort = { likeCount: -1, createdAt: -1 };
        break;
    }
    
    const [grows, total] = await Promise.all([
      Grow.find({ 
        isPublic: true,
        deletedAt: { $exists: false }
      })
        .sort(sort)
        .skip(options.skip)
        .limit(options.limit)
        .select('-userId')
        .lean(),
      Grow.countDocuments({ 
        isPublic: true,
        deletedAt: { $exists: false }
      })
    ]);
    
    const result = { grows, total };
    
    await redis.setEx(cacheKey, 120, JSON.stringify(result));
    
    return result;
  }
  
  async getFollowingFeed(options: {
    userId: string;
    limit: number;
    skip: number;
  }): Promise<{ grows: any[]; total: number }> {
    const followedUserIds: string[] = [];
    
    if (followedUserIds.length === 0) {
      return { grows: [], total: 0 };
    }
    
    const [grows, total] = await Promise.all([
      Grow.find({
        userId: { $in: followedUserIds },
        isPublic: true,
        deletedAt: { $exists: false }
      })
        .sort({ createdAt: -1 })
        .skip(options.skip)
        .limit(options.limit)
        .lean(),
      Grow.countDocuments({
        userId: { $in: followedUserIds },
        isPublic: true,
        deletedAt: { $exists: false }
      })
    ]);
    
    return { grows, total };
  }
  
  async getStrainFeed(options: {
    strainId: string;
    limit: number;
    skip: number;
    userId?: string;
  }): Promise<{ grows: any[]; total: number }> {
    const [grows, total] = await Promise.all([
      Grow.find({
        strainId: options.strainId,
        isPublic: true,
        deletedAt: { $exists: false }
      })
        .sort({ createdAt: -1 })
        .skip(options.skip)
        .limit(options.limit)
        .lean(),
      Grow.countDocuments({
        strainId: options.strainId,
        isPublic: true,
        deletedAt: { $exists: false }
      })
    ]);
    
    return { grows, total };
  }
  
  async getHarvestFeed(options: {
    limit: number;
    skip: number;
    userId?: string;
  }): Promise<{ grows: any[]; total: number }> {
    const [grows, total] = await Promise.all([
      Grow.find({
        status: 'harvested',
        yieldDry: { $exists: true, $gt: 0 },
        isPublic: true,
        deletedAt: { $exists: false }
      })
        .sort({ efficiency: -1, harvestDate: -1 })
        .skip(options.skip)
        .limit(options.limit)
        .lean(),
      Grow.countDocuments({
        status: 'harvested',
        yieldDry: { $exists: true },
        isPublic: true,
        deletedAt: { $exists: false }
      })
    ]);
    
    return { grows, total };
  }
}

export const feedService = new FeedService();
