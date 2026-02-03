// /apps/journal-service/src/routes/analytics.routes.ts
import { Router } from 'express';
import { Grow } from '../models/Grow.model';
import { Entry } from '../models/Entry.model';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/journal/analytics
 * Journal Analytics (nur Admin)
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

      const [
        growStats,
        entryStats,
        topGrows,
        trends,
        environmentStats
      ] = await Promise.all([
        // Grow Stats
        Grow.aggregate([
          {
            $facet: {
              total: [
                { $match: { deletedAt: null } },
                { $count: 'count' }
              ],
              active: [
                { $match: {
                  deletedAt: null,
                  status: { $in: ['germination', 'vegetative', 'flowering', 'drying', 'curing'] }
                }},
                { $count: 'count' }
              ],
              completed: [
                { $match: { deletedAt: null, status: 'harvested' }},
                { $count: 'count' }
              ],
              thisWeek: [
                { $match: { deletedAt: null, createdAt: { $gte: startOfWeek } }},
                { $count: 'count' }
              ],
              engagement: [
                { $match: { deletedAt: null }},
                { $group: {
                  _id: null,
                  totalViews: { $sum: '$viewCount' },
                  totalLikes: { $sum: '$likeCount' },
                  totalComments: { $sum: '$commentCount' }
                }}
              ],
              avgYield: [
                { $match: { yieldDry: { $gt: 0 } }},
                { $group: { _id: null, avg: { $avg: '$yieldDry' }}}
              ],
              avgEfficiency: [
                { $match: { efficiency: { $gt: 0 } }},
                { $group: { _id: null, avg: { $avg: '$efficiency' }}}
              ]
            }
          }
        ]),

        // Entry Stats
        Entry.aggregate([
          {
            $facet: {
              total: [{ $count: 'count' }],
              today: [
                { $match: { createdAt: { $gte: startOfToday } }},
                { $count: 'count' }
              ],
              withPhotos: [
                { $match: { photoCount: { $gt: 0 } }},
                { $count: 'count' }
              ]
            }
          }
        ]),

        // Top Grows
        Grow.aggregate([
          { $match: { deletedAt: null, isPublic: true }},
          {
            $addFields: {
              popularityScore: {
                $add: [
                  '$viewCount',
                  { $multiply: ['$likeCount', 10] },
                  { $multiply: ['$commentCount', 5] }
                ]
              }
            }
          },
          { $sort: { popularityScore: -1 }},
          { $limit: 10 },
          {
            $project: {
              strainName: 1,
              environment: 1,
              status: 1,
              viewCount: 1,
              likeCount: 1,
              commentCount: 1,
              yieldDry: 1,
              efficiency: 1,
              popularityScore: 1,
              createdAt: 1
            }
          }
        ]),

        // Trends (letzte 30 Tage)
        Grow.aggregate([
          {
            $match: {
              deletedAt: null,
              createdAt: { $gte: startOfMonth }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }},
              grows: { $sum: 1 },
              views: { $sum: '$viewCount' },
              likes: { $sum: '$likeCount' }
            }
          },
          { $sort: { _id: 1 }}
        ]),

        // Environment Stats
        Grow.aggregate([
          { $match: { deletedAt: null }},
          {
            $group: {
              _id: '$environment',
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      const stats = growStats[0];
      const entries = entryStats[0];

      res.json({
        grows: {
          total: stats.total[0]?.count || 0,
          active: stats.active[0]?.count || 0,
          completed: stats.completed[0]?.count || 0,
          thisWeek: stats.thisWeek[0]?.count || 0,
          totalViews: stats.engagement[0]?.totalViews || 0,
          totalLikes: stats.engagement[0]?.totalLikes || 0,
          totalComments: stats.engagement[0]?.totalComments || 0,
          avgYield: Math.round(stats.avgYield[0]?.avg || 0),
          avgEfficiency: Math.round((stats.avgEfficiency[0]?.avg || 0) * 100) / 100
        },
        entries: {
          total: entries.total[0]?.count || 0,
          today: entries.today[0]?.count || 0,
          withPhotos: entries.withPhotos[0]?.count || 0
        },
        topGrows,
        trends,
        byEnvironment: environmentStats.reduce((acc: Record<string, number>, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      });

    } catch (error) {
      logger.error('[Journal Analytics] Error:', error);
      next(error);
    }
  }
);

export default router;
