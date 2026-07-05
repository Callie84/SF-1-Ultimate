// /apps/gamification-service/src/services/achievement.service.ts
import { Achievement, IAchievement } from '../models/Achievement.model';
import { Badge } from '../models/Badge.model';
import { profileService } from './profile.service';
import { logger } from '../utils/logger';

export class AchievementService {
  /**
   * Achievement-Check (nach Event)
   */
  async checkAchievements(userId: string, eventType: string, eventData: any): Promise<{
    unlocked: IAchievement[];
    xpAwarded: number;
    badgesAwarded: string[];
  }> {
    const profile = await profileService.getOrCreate(userId);
    
    // Alle aktiven Achievements holen
    const achievements = await Achievement.find({ isActive: true }).lean<IAchievement[]>();
    
    const unlocked: IAchievement[] = [];
    let totalXP = 0;
    const badgesAwarded: string[] = [];
    
    for (const achievement of achievements) {
      // Bereits freigeschaltet?
      if (profile.achievements.includes(achievement.id)) {
        continue;
      }
      
      // Requirement prüfen
      const meetsRequirement = this.checkRequirement(
        achievement.requirement,
        profile,
        eventType,
        eventData
      );
      
      if (meetsRequirement) {
        // Achievement freischalten
        await profileService.addAchievement(userId, achievement.id);
        
        // XP vergeben
        await profileService.addXP(userId, achievement.xpReward, `Achievement: ${achievement.name}`);
        
        // Badge vergeben
        if (achievement.badgeId) {
          await profileService.addBadge(userId, achievement.badgeId);
          badgesAwarded.push(achievement.badgeId);
          
          // Badge-Counter erhöhen
          await Badge.updateOne(
            { id: achievement.badgeId },
            { $inc: { ownersCount: 1 } }
          );
        }
        
        // Stats
        await Achievement.updateOne(
          { id: achievement.id },
          { $inc: { unlockedCount: 1 } }
        );
        
        unlocked.push(achievement);
        totalXP += achievement.xpReward;
        
        logger.info(`[Achievement] ${userId} unlocked "${achievement.name}"`);
      }
    }
    
    return {
      unlocked,
      xpAwarded: totalXP,
      badgesAwarded
    };
  }
  
  /**
   * Requirement prüfen
   */
  private checkRequirement(
    requirement: { type: string; value: number },
    profile: any,
    eventType: string,
    eventData: any
  ): boolean {
    switch (requirement.type) {
      case 'grow_count':
        return profile.totalGrows >= requirement.value;
      
      case 'harvest_count':
        return profile.totalHarvests >= requirement.value;
      
      case 'yield_total':
        return profile.totalYield >= requirement.value;
      
      case 'efficiency_best':
        return profile.bestEfficiency >= requirement.value;
      
      case 'post_count':
        return profile.totalPosts >= requirement.value;
      
      case 'reply_count':
        return profile.totalReplies >= requirement.value;
      
      case 'helpful_answer_count':
        return profile.helpfulAnswers >= requirement.value;
      
      case 'level':
        return profile.level >= requirement.value;
      
      case 'xp':
        return profile.xp >= requirement.value;
      
      case 'reputation':
        return profile.reputation >= requirement.value;
      
      case 'streak_days':
        return profile.currentStreak >= requirement.value;
      
      case 'badge_count':
        return profile.badges.length >= requirement.value;
      
      default:
        return false;
    }
  }
  
  /**
   * Alle Achievements abrufen
   */
  async getAllAchievements(userId?: string): Promise<any[]> {
    const achievements = await Achievement.find({ isActive: true }).lean<IAchievement[]>();
    
    if (!userId) {
      return achievements;
    }
    
    // Mit User-Status anreichern
    const profile = await profileService.getProfile(userId);
    
    return achievements.map(achievement => ({
      ...achievement,
      unlocked: profile?.achievements.includes(achievement.id) || false,
      progress: profile ? this.calculateProgress(achievement, profile) : 0
    }));
  }
  
  /**
   * Fortschritt berechnen
   */
  private calculateProgress(achievement: IAchievement, profile: any): number {
    const req = achievement.requirement;
    
    let current = 0;
    switch (req.type) {
      case 'grow_count': current = profile.totalGrows; break;
      case 'harvest_count': current = profile.totalHarvests; break;
      case 'yield_total': current = profile.totalYield; break;
      case 'efficiency_best': current = profile.bestEfficiency; break;
      case 'post_count': current = profile.totalPosts; break;
      case 'reply_count': current = profile.totalReplies; break;
      case 'helpful_answer_count': current = profile.helpfulAnswers; break;
      case 'level': current = profile.level; break;
      case 'xp': current = profile.xp; break;
      case 'reputation': current = profile.reputation; break;
      case 'streak_days': current = profile.currentStreak; break;
      case 'badge_count': current = profile.badges.length; break;
    }
    
    return Math.min(100, Math.round((current / req.value) * 100));
  }
  
  /**
   * Achievement erstellen (Seed)
   */
  async createAchievement(data: Partial<IAchievement>): Promise<IAchievement> {
    const achievement = new Achievement(data);
    await achievement.save();
    logger.info(`[Achievement] Created: ${achievement.name}`);
    return achievement;
  }
}

export const achievementService = new AchievementService();
