// /apps/gamification-service/src/services/profile.service.ts
import { UserProfile, IUserProfile } from '../models/UserProfile.model';
import { redis } from '../config/redis';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export class ProfileService {
  /**
   * Profil abrufen oder erstellen
   */
  async getOrCreate(userId: string): Promise<IUserProfile> {
    let profile = await UserProfile.findOne({ userId });
    
    if (!profile) {
      profile = new UserProfile({ userId });
      await profile.save();
      logger.info(`[Profile] Created for user ${userId}`);
    }
    
    return profile;
  }
  
  /**
   * XP hinzufügen
   */
  async addXP(userId: string, amount: number, reason?: string): Promise<{
    profile: IUserProfile;
    levelUp: boolean;
    newLevel?: number;
  }> {
    const profile = await this.getOrCreate(userId);
    
    const result = profile.addXP(amount);
    profile.updateStreak();
    
    await profile.save();
    
    // Cache invalidieren
    await redis.del(`profile:${userId}`);
    
    logger.info(`[Profile] Added ${amount} XP to ${userId} (${reason || 'unknown'})`);
    
    if (result.levelUp) {
      logger.info(`[Profile] Level up! ${userId} → Level ${result.newLevel}`);
      
      // Level-Up-Event triggern
      await this.publishEvent('level:up', {
        userId,
        newLevel: result.newLevel,
        oldLevel: result.newLevel! - 1
      });
    }
    
    return {
      profile,
      ...result
    };
  }
  
  /**
   * Badge hinzufügen
   */
  async addBadge(userId: string, badgeId: string): Promise<boolean> {
    const profile = await this.getOrCreate(userId);
    
    const added = profile.addBadge(badgeId);
    
    if (added) {
      await profile.save();
      await redis.del(`profile:${userId}`);
      
      logger.info(`[Profile] Badge ${badgeId} awarded to ${userId}`);
      
      // Badge-Event triggern
      await this.publishEvent('badge:awarded', {
        userId,
        badgeId
      });
    }
    
    return added;
  }
  
  /**
   * Achievement hinzufügen
   */
  async addAchievement(userId: string, achievementId: string): Promise<boolean> {
    const profile = await this.getOrCreate(userId);
    
    const added = profile.addAchievement(achievementId);
    
    if (added) {
      await profile.save();
      await redis.del(`profile:${userId}`);
      
      logger.info(`[Profile] Achievement ${achievementId} unlocked by ${userId}`);
      
      // Achievement-Event triggern
      await this.publishEvent('achievement:unlocked', {
        userId,
        achievementId
      });
    }
    
    return added;
  }
  
  /**
   * Stats aktualisieren
   */
  async updateStats(userId: string, updates: Partial<IUserProfile>): Promise<void> {
    await UserProfile.updateOne(
      { userId },
      { $set: updates, $inc: { __v: 1 } }
    );
    
    await redis.del(`profile:${userId}`);
  }
  
  /**
   * Reputation ändern
   */
  async addReputation(userId: string, amount: number): Promise<void> {
    await UserProfile.updateOne(
      { userId },
      { $inc: { reputation: amount } }
    );
    
    await redis.del(`profile:${userId}`);
    
    logger.info(`[Profile] Reputation ${amount > 0 ? '+' : ''}${amount} for ${userId}`);
  }
  
  /**
   * Profil mit Cache
   */
  async getProfile(userId: string): Promise<IUserProfile | null> {
    const cacheKey = `profile:${userId}`;
    
    // Cache-Check
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const profile = await UserProfile.findOne({ userId }).lean();
    
    if (profile) {
      // Cache 5 Min
      await redis.setex(cacheKey, 300, JSON.stringify(profile));
    }
    
    return profile;
  }
  
  /**
   * Top-Users (Leaderboard)
   */
  async getTopUsers(options: {
    metric: 'xp' | 'reputation' | 'level';
    limit?: number;
  }): Promise<IUserProfile[]> {
    const limit = Math.min(options.limit || 100, 500);
    
    const sort: any = {};
    sort[options.metric] = -1;
    
    return UserProfile.find({})
      .sort(sort)
      .limit(limit)
      .lean();
  }
  
  /**
   * Event publizieren
   */
  private async publishEvent(type: string, data: any): Promise<void> {
    await redis.lPush('queue:notifications', JSON.stringify({
      type,
      data,
      timestamp: Date.now()
    }));
  }
}

export const profileService = new ProfileService();
