// /apps/gamification-service/src/routes/profile.routes.ts
import { Router } from 'express';
import { profileService } from '../services/profile.service';
import { achievementService } from '../services/achievement.service';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

/**
 * GET /api/gamification/profile/leaderboard
 * Global Leaderboard - MUSS VOR /:userId stehen!
 */
router.get('/leaderboard',
  async (req, res, next) => {
    try {
      const metric = (req.query.metric as string) || 'xp';
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

      if (!['xp', 'reputation', 'level'].includes(metric)) {
        return res.status(400).json({ error: 'Invalid metric' });
      }

      const topUsers = await profileService.getTopUsers({
        metric: metric as any,
        limit
      });

      res.json({
        metric,
        users: topUsers,
        count: topUsers.length
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/gamification/profile/:userId
 * User-Profil abrufen
 */
router.get('/:userId',
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const profile = await profileService.getProfile(req.params.userId);
      
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      
      // Achievements mit Fortschritt
      const achievements = await achievementService.getAllAchievements(req.params.userId);
      
      res.json({
        profile,
        achievements: {
          unlocked: achievements.filter(a => a.unlocked),
          locked: achievements.filter(a => !a.unlocked),
          total: achievements.length,
          unlockedCount: achievements.filter(a => a.unlocked).length
        }
      });
      
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/gamification/profile/:userId/summary
 * Kompaktes Profil (für UI)
 */
router.get('/:userId/summary',
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const profile = await profileService.getProfile(req.params.userId);
      
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      
      res.json({
        userId: profile.userId,
        level: profile.level,
        xp: profile.xp,
        xpToNextLevel: profile.xpToNextLevel,
        reputation: profile.reputation,
        badgeCount: profile.badges.length,
        achievementCount: profile.achievements.length,
        globalRank: profile.globalRank
      });
      
    } catch (error) {
      next(error);
    }
  }
);

export default router;
