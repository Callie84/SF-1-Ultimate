import { Grow, IGrow } from '../models/Grow.model';
import { Entry } from '../models/Entry.model';
import { Photo } from '../models/Photo.model';
import { Reaction } from '../models/Reaction.model';
import { redis } from '../config/redis';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export class GrowService {
  async create(userId: string, data: Partial<IGrow>): Promise<IGrow> {
    const grow = new Grow({
      ...data,
      userId,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0
    });
    
    await grow.save();
    
    await this.publishEvent('grow:created', { userId, growId: grow._id });
    
    logger.info(`[Grow] Created ${grow._id} by user ${userId}`);
    
    return grow;
  }
  
  async getUserGrows(userId: string, options: {
    status?: string;
    limit?: number;
    skip?: number;
  } = {}): Promise<{ grows: IGrow[]; total: number }> {
    const query: any = { userId, deletedAt: { $exists: false } };
    
    if (options.status) {
      query.status = options.status;
    }
    
    const limit = Math.min(options.limit || 20, 100);
    const skip = options.skip || 0;
    
    const [grows, total] = await Promise.all([
      Grow.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Grow.countDocuments(query)
    ]);
    
    const growsWithCovers = await this.attachCoverPhotos(grows);
    
    return { grows: growsWithCovers, total };
  }
  
  async getById(growId: string, requestUserId?: string): Promise<IGrow | null> {
    const grow = await Grow.findById(growId).lean();
    
    if (!grow || grow.deletedAt) {
      return null;
    }
    
    if (!grow.isPublic && grow.userId !== requestUserId) {
      throw new AppError('FORBIDDEN', 403);
    }
    
    if (requestUserId && grow.userId !== requestUserId) {
      await Grow.updateOne(
        { _id: growId },
        { $inc: { viewCount: 1 } }
      );
    }
    
    const entries = await Entry.find({ growId })
      .sort({ week: 1, day: 1 })
      .lean();
    
    const entryIds = entries.map(e => e._id.toString());
    const photos = await Photo.find({ entryId: { $in: entryIds } })
      .sort({ order: 1 })
      .lean();
    
    const entriesWithPhotos = entries.map(entry => ({
      ...entry,
      photos: photos.filter(p => p.entryId === entry._id.toString())
    }));
    
    const reactions = await Reaction.getReactionCounts(growId);
    
    return {
      ...grow,
      entries: entriesWithPhotos,
      reactions: reactions.reduce((acc: any, r: any) => {
        acc[r._id] = r.count;
        return acc;
      }, {})
    } as any;
  }
  
  async update(growId: string, userId: string, data: Partial<IGrow>): Promise<IGrow | null> {
    const grow = await Grow.findOne({ _id: growId, userId });
    
    if (!grow) {
      throw new AppError('NOT_FOUND', 404);
    }
    
    Object.assign(grow, data);
    await grow.save();
    
    await redis.del(`grow:${growId}`);
    
    return grow;
  }
  
  async delete(growId: string, userId: string): Promise<void> {
    const grow = await Grow.findOne({ _id: growId, userId });
    
    if (!grow) {
      throw new AppError('NOT_FOUND', 404);
    }
    
    grow.deletedAt = new Date();
    await grow.save();
    
    logger.info(`[Grow] Soft-deleted ${growId}`);
  }
  
  async markHarvested(growId: string, userId: string, data: {
    harvestDate: Date;
    yieldWet?: number;
    yieldDry?: number;
    quality?: number;
  }): Promise<IGrow | null> {
    const grow = await Grow.findOne({ _id: growId, userId });
    
    if (!grow) {
      throw new AppError('NOT_FOUND', 404);
    }
    
    grow.status = 'harvested';
    grow.harvestDate = data.harvestDate;
    grow.yieldWet = data.yieldWet;
    grow.yieldDry = data.yieldDry;
    grow.quality = data.quality;
    
    await grow.save();
    
    await this.publishEvent('grow:harvested', {
      userId,
      growId,
      yieldDry: data.yieldDry,
      efficiency: grow.efficiency
    });
    
    logger.info(`[Grow] Harvested ${growId}: ${data.yieldDry}g (${grow.efficiency} g/W)`);
    
    return grow;
  }
  
  private async attachCoverPhotos(grows: any[]): Promise<any[]> {
    const growIds = grows.map(g => g._id.toString());
    
    const photos = await Photo.aggregate([
      { $match: { growId: { $in: growIds } } },
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: '$growId',
        photo: { $first: '$$ROOT' }
      }}
    ]);
    
    const photoMap = new Map(photos.map(p => [p._id, p.photo]));
    
    return grows.map(grow => ({
      ...grow,
      coverPhoto: photoMap.get(grow._id.toString()) || null
    }));
  }
  
  private async publishEvent(type: string, data: any): Promise<void> {
    await redis.lPush('queue:events', JSON.stringify({ type, data, timestamp: Date.now() }));
  }
}

export const growService = new GrowService();
