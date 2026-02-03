// /apps/gamification-service/src/routes/analytics.routes.ts
import { Router } from 'express';
import { UserProfile } from '../models/UserProfile.model';
import { Event } from '../models/Event.model';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/gamification/analytics
 * Gamification Analytics (nur Admin)
 */
router.get('/',
  authMiddleware,
  async (req, res, next) => {
    try {
      // Admin-Check
      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        userStats,
        levelDistribution,
        topContributors,
        activityTrends,
        eventStats
      ] = await Promise.all([
        // User Stats
        UserProfile.aggregate([
          {
            $facet: {
              total: [{ $count: 'count' }],
              active24h: [
                { $match: { lastActiveDate: { $gte: oneDayAgo } }},
                { $count: 'count' }
              ],
              active7d: [
                { $match: { lastActiveDate: { $gte: sevenDaysAgo } }},
                { $count: 'count' }
              ],
              active30d: [
                { $match: { lastActiveDate: { $gte: thirtyDaysAgo } }},
                { $count: 'count' }
              ],
              avgStats: [
                { $group: {
                  _id: null,
                  avgLevel: { $avg: '$level' },
                  avgXP: { $avg: '$xp' },
                  avgReputation: { $avg: '$reputation' },
                  avgStreak: { $avg: '$currentStreak' }
                }}
              ],
              totalXP: [
                { $group: { _id: null, total: { $sum: '$xp' }}}
              ]
            }
          }
        ]),

        // Level Distribution
        UserProfile.aggregate([
          {
            $bucket: {
              groupBy: '$level',
              boundaries: [1, 5, 10, 20, 50, 100],
              default: '100+',
              output: { count: { $sum: 1 }}
            }
          }
        ]),

        // Top Contributors
        UserProfile.aggregate([
          { $sort: { reputation: -1 }},
          { $limit: 10 },
          {
            $project: {
              userId: 1,
              level: 1,
              xp: 1,
              reputation: 1,
              totalPosts: 1,
              totalReplies: 1,
              helpfulAnswers: 1,
              currentStreak: 1
            }
          }
        ]),

        // Activity Trends (letzte 30 Tage)
        Event.aggregate([
          { $match: { createdAt: { $gte: thirtyDaysAgo } }},
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }},
              events: { $sum: 1 },
              xpAwarded: { $sum: '$xpAwarded' }
            }
          },
          { $sort: { _id: 1 }}
        ]),

        // Event Type Stats
        Event.aggregate([
          { $match: { createdAt: { $gte: thirtyDaysAgo } }},
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 },
              totalXP: { $sum: '$xpAwarded' }
            }
          },
          { $sort: { count: -1 }}
        ])
      ]);

      const stats = userStats[0];

      res.json({
        users: {
          total: stats.total[0]?.count || 0,
          active24h: stats.active24h[0]?.count || 0,
          active7d: stats.active7d[0]?.count || 0,
          active30d: stats.active30d[0]?.count || 0,
          avgLevel: Math.round((stats.avgStats[0]?.avgLevel || 0) * 10) / 10,
          avgXP: Math.round(stats.avgStats[0]?.avgXP || 0),
          avgReputation: Math.round(stats.avgStats[0]?.avgReputation || 0),
          avgStreak: Math.round((stats.avgStats[0]?.avgStreak || 0) * 10) / 10,
          totalXP: stats.totalXP[0]?.total || 0
        },
        levelDistribution: levelDistribution.map((item: any) => ({
          level: item._id === '100+' ? '100+' : `${item._id}-${item._id + 4}`,
          count: item.count
        })),
        topContributors,
        activityTrends,
        eventsByType: eventStats
      });

    } catch (error) {
      logger.error('[Gamification Analytics] Error:', error);
      next(error);
    }
  }
);

export default router;
