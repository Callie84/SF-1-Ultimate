import { Grow } from '../models/Grow.model';
import { redis } from '../config/redis';
import http from 'http';

const COMMUNITY_URL = process.env.COMMUNITY_SERVICE_URL || 'http://community-service:3005';

async function getFollowedUserIds(userId: string): Promise<string[]> {
  return new Promise((resolve) => {
    const path = `/api/community/follows/following/${userId}?limit=500`;
    http.get({ hostname: 'community-service', port: 3005, path },
      (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            // following is array of userId strings
            resolve(Array.isArray(json.following) ? json.following.filter((f: any) => typeof f === 'string') : []);
          } catch { resolve([]); }
        });
      }
    ).on('error', () => resolve([]));
  });
}

export class FeedService {
  async getPublicFeed(options: {
    limit: number;
    skip: number;
    sortBy: string;
    status?: string;
    environment?: string;
    userId?: string;
    filterUserId?: string;
  }): Promise<{ grows: any[]; total: number }> {
    const hasFilters = options.status || options.environment || options.filterUserId;
    const cacheKey = `feed:public:${options.sortBy}:${options.limit}:${options.skip}:${options.status || ''}:${options.environment || ''}:${options.filterUserId || ''}`;

    if (!hasFilters) {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    let sort: any = {};
    switch (options.sortBy) {
      case 'recent':  sort = { createdAt: -1 }; break;
      case 'trending': sort = { viewCount: -1, createdAt: -1 }; break;
      case 'top':     sort = { likeCount: -1, createdAt: -1 }; break;
      default:        sort = { createdAt: -1 };
    }

    const filter: any = {
      isPublic: true,
      deletedAt: { $exists: false }
    };

    if (options.status === 'active') {
      filter.status = { $in: ['germination', 'vegetative', 'flowering', 'drying', 'curing'] };
    } else if (options.status && options.status !== 'all') {
      filter.status = options.status;
    }

    if (options.environment && options.environment !== 'all') {
      filter.environment = options.environment;
    }

    if (options.filterUserId) {
      filter.userId = options.filterUserId;
    }

    const [grows, total] = await Promise.all([
      Grow.find(filter).sort(sort).skip(options.skip).limit(options.limit).lean(),
      Grow.countDocuments(filter)
    ]);

    const result = { grows, total };
    if (!hasFilters) await redis.setEx(cacheKey, 120, JSON.stringify(result));

    return result;
  }
  
  async getFollowingFeed(options: {
    userId: string;
    limit: number;
    skip: number;
  }): Promise<{ grows: any[]; total: number }> {
    const followedUserIds = await getFollowedUserIds(options.userId);

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
