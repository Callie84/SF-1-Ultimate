// /apps/community-service/src/routes/analytics.routes.ts
import { Router } from 'express';
import { Thread } from '../models/Thread.model';
import { Reply } from '../models/Reply.model';
import { Category } from '../models/Category.model';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/community/analytics
 * Community Analytics (nur Admin)
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
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      const startOfMonth = new Date(startOfToday);
      startOfMonth.setDate(startOfMonth.getDate() - 30);

      // Parallele Abfragen für Performance
      const [
        threadStats,
        replyStats,
        topThreads,
        trends,
        categoryStats
      ] = await Promise.all([
        // Thread Stats
        Thread.aggregate([
          {
            $facet: {
              total: [
                { $match: { isDeleted: false } },
                { $count: 'count' }
              ],
              today: [
                { $match: { isDeleted: false, createdAt: { $gte: startOfToday } } },
                { $count: 'count' }
              ],
              thisWeek: [
                { $match: { isDeleted: false, createdAt: { $gte: startOfWeek } } },
                { $count: 'count' }
              ],
              totalViews: [
                { $match: { isDeleted: false } },
                { $group: { _id: null, total: { $sum: '$viewCount' } } }
              ],
              avgEngagement: [
                { $match: { isDeleted: false } },
                { $group: {
                  _id: null,
                  avgViews: { $avg: '$viewCount' },
                  avgReplies: { $avg: '$replyCount' },
                  avgUpvotes: { $avg: '$upvoteCount' }
                }}
              ]
            }
          }
        ]),

        // Reply Stats
        Reply.aggregate([
          {
            $facet: {
              total: [
                { $match: { isDeleted: false } },
                { $count: 'count' }
              ],
              today: [
                { $match: { isDeleted: false, createdAt: { $gte: startOfToday } } },
                { $count: 'count' }
              ],
              bestAnswers: [
                { $match: { isBestAnswer: true } },
                { $count: 'count' }
              ]
            }
          }
        ]),

        // Top Threads (nach Engagement)
        Thread.aggregate([
          { $match: { isDeleted: false } },
          {
            $addFields: {
              engagementScore: {
                $add: [
                  '$viewCount',
                  { $multiply: ['$replyCount', 5] },
                  { $multiply: ['$upvoteCount', 3] }
                ]
              }
            }
          },
          { $sort: { engagementScore: -1 } },
          { $limit: 10 },
          {
            $project: {
              title: 1,
              viewCount: 1,
              replyCount: 1,
              upvoteCount: 1,
              engagementScore: 1,
              createdAt: 1,
              categoryId: 1
            }
          }
        ]),

        // Trends (letzte 30 Tage)
        Thread.aggregate([
          {
            $match: {
              isDeleted: false,
              createdAt: { $gte: startOfMonth }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              threads: { $sum: 1 },
              views: { $sum: '$viewCount' },
              replies: { $sum: '$replyCount' }
            }
          },
          { $sort: { _id: 1 } }
        ]),

        // Category Stats
        Category.find({ isActive: true })
          .select('name slug threadCount postCount')
          .sort({ threadCount: -1 })
          .limit(10)
          .lean()
      ]);

      // Daten formatieren
      const stats = threadStats[0];
      const replies = replyStats[0];

      res.json({
        threads: {
          total: stats.total[0]?.count || 0,
          today: stats.today[0]?.count || 0,
          thisWeek: stats.thisWeek[0]?.count || 0,
          totalViews: stats.totalViews[0]?.total || 0,
          avgViews: Math.round(stats.avgEngagement[0]?.avgViews || 0),
          avgReplies: Math.round((stats.avgEngagement[0]?.avgReplies || 0) * 10) / 10,
          avgUpvotes: Math.round((stats.avgEngagement[0]?.avgUpvotes || 0) * 10) / 10
        },
        replies: {
          total: replies.total[0]?.count || 0,
          today: replies.today[0]?.count || 0,
          bestAnswers: replies.bestAnswers[0]?.count || 0
        },
        topThreads,
        trends,
        categories: categoryStats
      });

    } catch (error) {
      logger.error('[Analytics] Error:', error);
      next(error);
    }
  }
);

export default router;
