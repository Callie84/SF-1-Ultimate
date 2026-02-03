// /apps/auth-service/src/routes/analytics.routes.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { jwtService } from '../services/jwt.service';

const router = Router();
const prisma = new PrismaClient();

/**
 * Middleware: Admin Auth Check
 */
const adminAuthMiddleware = async (req: Request, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwtService.verifyAccessToken(token);

    if (!decoded || decoded.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * GET /api/auth/analytics
 * User Analytics (nur Admin)
 */
router.get('/', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(startOfToday);
    startOfMonth.setDate(startOfMonth.getDate() - 30);

    // Parallele Abfragen
    const [
      totalUsers,
      usersToday,
      usersThisWeek,
      usersThisMonth,
      activeUsers,
      verifiedUsers,
      bannedUsers,
      roleDistribution,
      registrationTrend
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { createdAt: { gte: startOfToday }}
      }),
      prisma.user.count({
        where: { createdAt: { gte: startOfWeek }}
      }),
      prisma.user.count({
        where: { createdAt: { gte: startOfMonth }}
      }),
      prisma.user.count({
        where: { isActive: true }
      }),
      prisma.user.count({
        where: { isVerified: true }
      }),
      prisma.user.count({
        where: { isBanned: true }
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: true
      }),
      // Registrierungs-Trend (letzte 30 Tage)
      prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM "User"
        WHERE "createdAt" >= ${startOfMonth}
        GROUP BY DATE("createdAt")
        ORDER BY date
      `
    ]);

    res.json({
      users: {
        total: totalUsers,
        today: usersToday,
        thisWeek: usersThisWeek,
        thisMonth: usersThisMonth,
        active: activeUsers,
        verified: verifiedUsers,
        banned: bannedUsers
      },
      roleDistribution: roleDistribution.map(r => ({
        role: r.role,
        count: r._count
      })),
      registrationTrend: registrationTrend.map(r => ({
        date: r.date,
        count: Number(r.count)
      }))
    });

  } catch (error) {
    console.error('[Auth Analytics] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
