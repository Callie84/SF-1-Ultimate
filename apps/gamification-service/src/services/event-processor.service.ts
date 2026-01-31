// /apps/gamification-service/src/services/event-processor.service.ts
import { Event } from '../models/Event.model';
import { profileService } from './profile.service';
import { achievementService } from './achievement.service';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

// XP-Rewards pro Event-Typ
const XP_REWARDS: { [key: string]: number } = {
  'grow:created': 10,
  'grow:harvested': 50,
  'entry:created': 5,
  'photo:uploaded': 2,
  'thread:created': 10,
  'reply:created': 5,
  'best_answer:received': 50,
  'upvote:received': 2,
  'comment:added': 3,
  'reaction:given': 1
};

export class EventProcessorService {
  /**
   * Queue abarbeiten (Worker)
   */
  async processQueue(): Promise<void> {
    logger.info('[EventProcessor] Worker started');
    
    while (true) {
      try {
        // BRPOP: Blockierend bis Item verfügbar
        const item = await redis.brPop('queue:gamification', 5);
        
        if (!item) continue;
        
        const event = JSON.parse(item[1]);
        
        await this.processEvent(event);
        
      } catch (error) {
        logger.error('[EventProcessor] Error:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  
  /**
   * Event verarbeiten
   */
  async processEvent(event: {
    type: string;
    data: any;
    timestamp: number;
  }): Promise<void> {
    try {
      const { type, data } = event;
      const { userId } = data;
      
      if (!userId) {
        logger.warn(`[EventProcessor] No userId in event ${type}`);
        return;
      }
      
      // Event-Log speichern
      const eventRecord = new Event({
        userId,
        type,
        data,
        processed: false
      });
      
      // XP vergeben
      const xpReward = XP_REWARDS[type] || 0;
      if (xpReward > 0) {
        const result = await profileService.addXP(userId, xpReward, type);
        eventRecord.xpAwarded = xpReward;
        
        if (result.levelUp) {
          logger.info(`[EventProcessor] Level up! ${userId} → ${result.newLevel}`);
        }
      }
      
      // Stats aktualisieren
      await this.updateStatsForEvent(userId, type, data);
      
      // Achievement-Check
      const achievements = await achievementService.checkAchievements(userId, type, data);
      
      if (achievements.unlocked.length > 0) {
        eventRecord.achievementsUnlocked = achievements.unlocked.map(a => a.id);
        eventRecord.badgesAwarded = achievements.badgesAwarded;
        
        logger.info(`[EventProcessor] ${achievements.unlocked.length} achievements unlocked for ${userId}`);
      }
      
      // Event als processed markieren
      eventRecord.processed = true;
      eventRecord.processedAt = new Date();
      await eventRecord.save();
      
      logger.debug(`[EventProcessor] Processed ${type} for ${userId}`);
      
    } catch (error) {
      logger.error('[EventProcessor] Processing failed:', error);
    }
  }
  
  /**
   * Stats aktualisieren basierend auf Event
   */
  private async updateStatsForEvent(userId: string, type: string, data: any): Promise<void> {
    const updates: any = {};
    
    switch (type) {
      case 'grow:created':
        updates.totalGrows = 1;
        break;
      
      case 'grow:harvested':
        updates.totalHarvests = 1;
        if (data.yieldDry) {
          updates.totalYield = data.yieldDry;
        }
        if (data.efficiency) {
          const profile = await profileService.getOrCreate(userId);
          if (data.efficiency > profile.bestEfficiency) {
            updates.bestEfficiency = data.efficiency;
          }
        }
        break;
      
      case 'thread:created':
        updates.totalPosts = 1;
        break;
      
      case 'reply:created':
        updates.totalReplies = 1;
        break;
      
      case 'best_answer:received':
        updates.helpfulAnswers = 1;
        break;
    }
    
    if (Object.keys(updates).length > 0) {
      const incrementFields: any = {};
      const setFields: any = {};
      
      for (const [key, value] of Object.entries(updates)) {
        if (key === 'bestEfficiency') {
          setFields[key] = value;
        } else {
          incrementFields[key] = value;
        }
      }
      
      const updateObj: any = {};
      if (Object.keys(incrementFields).length > 0) {
        updateObj.$inc = incrementFields;
      }
      if (Object.keys(setFields).length > 0) {
        updateObj.$max = setFields;
      }
      
      await profileService.updateStats(userId, updateObj as any);
    }
  }
}

export const eventProcessorService = new EventProcessorService();
