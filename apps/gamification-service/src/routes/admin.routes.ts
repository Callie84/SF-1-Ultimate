// /apps/gamification-service/src/routes/admin.routes.ts
import { Router } from 'express';
import { Achievement } from '../models/Achievement.model';
import { Badge } from '../models/Badge.model';
import { UserProfile } from '../models/UserProfile.model';
import { logger } from '../utils/logger';

const router = Router();

// Simple admin auth middleware: Bearer JWT with role ADMIN
function requireAdmin(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  const role = req.headers['x-user-role'];
  if (role === 'ADMIN') return next();
  if (auth?.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET || '');
      if ((payload as any).role === 'ADMIN') return next();
    } catch {}
  }
  return res.status(403).json({ error: 'Forbidden' });
}

/**
 * GET /api/gamification/admin/achievements
 * All achievements with stats
 */
router.get('/achievements', requireAdmin, async (req, res) => {
  try {
    const achievements = await Achievement.find({}).sort({ category: 1, rarity: 1 }).lean();
    const totalUsers = await UserProfile.countDocuments({});
    res.json({ achievements, totalUsers });
  } catch (error: any) {
    logger.error('[Admin] Achievements Fehler:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/gamification/admin/achievements/:id/toggle
 * Toggle achievement isActive
 */
router.patch('/achievements/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const achievement = await Achievement.findOne({ id: req.params.id });
    if (!achievement) return res.status(404).json({ error: 'Achievement not found' });
    achievement.isActive = !achievement.isActive;
    await achievement.save();
    res.json({ id: achievement.id, isActive: achievement.isActive });
  } catch (error: any) {
    logger.error('[Admin] Achievement-Toggle Fehler:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/gamification/admin/badges
 * All badges with stats
 */
router.get('/badges', requireAdmin, async (req, res) => {
  try {
    const badges = await Badge.find({}).sort({ category: 1 }).lean();
    res.json({ badges });
  } catch (error: any) {
    logger.error('[Admin] Badges Fehler:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/gamification/admin/stats
 * Overview stats for admin dashboard
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [
      totalProfiles,
      totalAchievements,
      activeAchievements,
      totalBadges,
      topXPUsers,
    ] = await Promise.all([
      UserProfile.countDocuments({}),
      Achievement.countDocuments({}),
      Achievement.countDocuments({ isActive: true }),
      Badge.countDocuments({}),
      UserProfile.find({}).sort({ xp: -1 }).limit(5).select('userId username xp level').lean(),
    ]);

    const xpStats = await UserProfile.aggregate([
      { $group: { _id: null, totalXP: { $sum: '$xp' }, avgXP: { $avg: '$xp' }, maxXP: { $max: '$xp' } } },
    ]);

    res.json({
      totalProfiles,
      totalAchievements,
      activeAchievements,
      totalBadges,
      topXPUsers,
      xpStats: xpStats[0] || { totalXP: 0, avgXP: 0, maxXP: 0 },
    });
  } catch (error: any) {
    logger.error('[Admin] Gamification-Stats Fehler:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
