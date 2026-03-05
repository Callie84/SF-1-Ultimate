// /apps/community-service/src/services/gamification-hooks.ts
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export class GamificationHooks {
  /**
   * Event an Gamification-Service senden
   */
  private async publishEvent(type: string, data: any): Promise<void> {
    const event = {
      type,
      data,
      timestamp: Date.now()
    };
    
    try {
      await redis.lPush('queue:gamification', JSON.stringify(event));
      logger.debug(`[Gamification] Event published: ${type}`);
    } catch (error) {
      logger.error('[Gamification] Failed to publish event:', error);
    }
  }
  
  /**
   * Thread erstellt
   */
  async onThreadCreated(userId: string, threadId: string): Promise<void> {
    await this.publishEvent('thread:created', { userId, threadId });
    // → +10 XP
  }
  
  /**
   * Reply erstellt
   */
  async onReplyCreated(userId: string, replyId: string): Promise<void> {
    await this.publishEvent('reply:created', { userId, replyId });
    // → +5 XP
  }
  
  /**
   * Best Answer erhalten
   */
  async onBestAnswerReceived(userId: string, replyId: string): Promise<void> {
    await this.publishEvent('best_answer:received', { userId, replyId });
    // → +50 XP + "Helpful" Badge
  }
  
  /**
   * Upvote erhalten
   */
  async onUpvoteReceived(userId: string, targetId: string, targetType: string): Promise<void> {
    await this.publishEvent('upvote:received', { userId, targetId, targetType });
    // → +2 XP
  }
  
  /**
   * Reputation Milestone erreicht
   */
  async onReputationMilestone(userId: string, reputation: number): Promise<void> {
    await this.publishEvent('reputation:milestone', { userId, reputation });
    // → Badge bei 100, 500, 1000, 5000 Reputation
  }
}

export const gamificationHooks = new GamificationHooks();
