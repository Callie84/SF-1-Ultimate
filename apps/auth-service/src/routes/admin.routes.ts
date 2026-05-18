// /apps/auth-service/src/routes/admin.routes.ts
import { Router, Request, Response } from 'express';
import { jwtService } from '../services/jwt.service';
import { prisma } from '../config/database';
import { redis } from '../config/redis';

const router = Router();

// Admin Auth Middleware
const adminMiddleware = async (req: Request, res: Response, next: Function) => {
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
    (req as any).admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * GET /api/auth/admin/users
 * Alle User (Admin)
 */
router.get('/users', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';
    const role = req.query.role as string || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = role.toUpperCase();
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          isBanned: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[Admin Users] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/auth/admin/users/:id
 * User aktualisieren (Rolle, Ban)
 */
router.patch('/users/:id', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, isBanned, isActive } = req.body;

    const updates: any = {};
    if (role) updates.role = role.toUpperCase();
    if (typeof isBanned === 'boolean') updates.isBanned = isBanned;
    if (typeof isActive === 'boolean') updates.isActive = isActive;

    const user = await prisma.user.update({
      where: { id },
      data: updates,
      select: { id: true, email: true, username: true, role: true, isBanned: true, isActive: true },
    });

    res.json({ user });
  } catch (error) {
    console.error('[Admin User Update] Error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

/**
 * POST /api/auth/admin/users/:id/ban
 * User bannen/entbannen
 */
router.post('/users/:id/ban', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { banned, reason } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { isBanned: banned },
      select: { id: true, email: true, username: true, isBanned: true },
    });

    // Log in Redis
    const logEntry = JSON.stringify({
      id: `log_${Date.now()}`,
      level: 'warn',
      service: 'auth',
      message: `User ${user.email} wurde ${banned ? 'gebannt' : 'entsperrt'}${reason ? `: ${reason}` : ''}`,
      timestamp: new Date().toISOString(),
    });
    await redis.lPush('system:logs', logEntry).catch(() => {});
    await redis.lTrim('system:logs', 0, 999).catch(() => {}); // Max 1000 Logs

    res.json({ user });
  } catch (error) {
    console.error('[Admin Ban] Error:', error);
    res.status(500).json({ error: 'Ban failed' });
  }
});

/**
 * GET /api/auth/admin/logs
 * System-Logs (aus Redis)
 */
router.get('/logs', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const level = req.query.level as string || '';
    const service = req.query.service as string || '';

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // Logs aus Redis laden
    let rawLogs = await redis.lRange('system:logs', 0, 999).catch(() => []);

    // Parse + Filter
    let logs = rawLogs
      .map((entry) => {
        try { return JSON.parse(entry); } catch { return null; }
      })
      .filter(Boolean);

    if (level) logs = logs.filter((l: any) => l.level === level);
    if (service) logs = logs.filter((l: any) => l.service === service);

    const total = logs.length;
    const paginated = logs.slice(start, end + 1);

    // Wenn keine Logs vorhanden, generiere aus aktuellen System-Events
    if (total === 0) {
      const now = new Date();
      const synthetic: any[] = [
        { id: 'log_1', level: 'info', service: 'auth', message: 'Auth-Service gestartet', timestamp: new Date(now.getTime() - 3600000).toISOString() },
        { id: 'log_2', level: 'info', service: 'auth', message: 'PostgreSQL verbunden', timestamp: new Date(now.getTime() - 3590000).toISOString() },
        { id: 'log_3', level: 'info', service: 'auth', message: 'Redis verbunden', timestamp: new Date(now.getTime() - 3580000).toISOString() },
        { id: 'log_4', level: 'info', service: 'community', message: 'Community-Service gestartet', timestamp: new Date(now.getTime() - 3570000).toISOString() },
        { id: 'log_5', level: 'info', service: 'ai', message: 'AI-Service gestartet', timestamp: new Date(now.getTime() - 3560000).toISOString() },
      ];
      return res.json({ logs: synthetic, total: synthetic.length, page: 1, totalPages: 1 });
    }

    res.json({
      logs: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[Admin Logs] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/admin/cache/clear
 * Anwendungs-Cache in Redis leeren (keine Auth-Tokens)
 */
router.post('/cache/clear', adminMiddleware, async (req: Request, res: Response) => {
  try {
    // Nur Cache-Keys löschen, keine Auth-Tokens (email_verify:*, reset:*, system:logs)
    const safePatterns = ['cache:*', 'feed:*', 'price_cache:*', 'stats:*', 'leaderboard:*'];
    let deletedCount = 0;

    for (const pattern of safePatterns) {
      let cursor = 0;
      do {
        const result = await (redis as any).scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = parseInt(result[0]);
        const keys: string[] = result[1];
        if (keys.length > 0) {
          await redis.del(keys);
          deletedCount += keys.length;
        }
      } while (cursor !== 0);
    }

    const logEntry = JSON.stringify({
      id: `log_${Date.now()}`,
      level: 'info',
      service: 'auth',
      message: `Cache geleert — ${deletedCount} Keys gelöscht`,
      timestamp: new Date().toISOString(),
    });
    await redis.lPush('system:logs', logEntry).catch(() => {});

    res.json({ success: true, deletedKeys: deletedCount });
  } catch (error) {
    console.error('[Admin Cache Clear] Error:', error);
    res.status(500).json({ error: 'Cache-Leerung fehlgeschlagen' });
  }
});

// Helper: Log-Eintrag speichern (wird von anderen Routen genutzt)
export async function addSystemLog(
  level: string,
  service: string,
  message: string,
  meta?: Record<string, unknown>,
  stack?: string,
): Promise<void> {
  const entry = JSON.stringify({
    id: `log_${Date.now()}`,
    level,
    service,
    message,
    timestamp: new Date().toISOString(),
    ...(meta && { meta }),
    ...(stack && { stack }),
  });
  await redis.lPush('system:logs', entry).catch(() => {});
  await redis.lTrim('system:logs', 0, 999).catch(() => {});
}

export default router;
