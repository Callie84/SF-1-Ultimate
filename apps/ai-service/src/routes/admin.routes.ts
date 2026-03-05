// /apps/ai-service/src/routes/admin.routes.ts
import { Router } from 'express';
import { getDailyStats, getLastNDaysStats, getMonthlyStats } from '../utils/token-tracker';
import { logger } from '../utils/logger';

const router = Router();

// Admin-Auth: JWT Bearer oder X-User-Role Header (via Traefik)
function requireAdmin(req: any, res: any, next: any) {
  const roleHeader = req.headers['x-user-role'];
  if (roleHeader === 'ADMIN') return next();

  const auth = req.headers['authorization'];
  if (auth?.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET || '');
      if ((payload as any).role === 'ADMIN') return next();
    } catch {
      // invalid token
    }
  }

  res.status(401).json({ error: 'Admin access required' });
}

/**
 * GET /api/ai/admin/stats
 * Vollständige Monitoring-Daten
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Letzter Monat
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonth = lastMonthDate.toISOString().slice(0, 7);

    const [todayStats, last7Days, last30Days, monthStats, lastMonthStats] = await Promise.all([
      getDailyStats(today),
      getLastNDaysStats(7),
      getLastNDaysStats(30),
      getMonthlyStats(currentMonth),
      getMonthlyStats(lastMonth),
    ]);

    // Aggregierte 30-Tage Kosten/Tokens
    const last30Summary = last30Days.reduce(
      (acc, d) => ({
        requests: acc.requests + d.requests,
        inputTokens: acc.inputTokens + d.inputTokens,
        outputTokens: acc.outputTokens + d.outputTokens,
        costUsd: acc.costUsd + d.costUsd,
      }),
      { requests: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 }
    );

    res.json({
      today: todayStats,
      last7Days,
      last30Summary: {
        ...last30Summary,
        totalTokens: last30Summary.inputTokens + last30Summary.outputTokens,
      },
      currentMonth: monthStats,
      lastMonth: lastMonthStats,
    });
  } catch (error) {
    logger.error('[AI Admin] Stats failed:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
