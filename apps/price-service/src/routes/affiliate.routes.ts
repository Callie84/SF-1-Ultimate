// Price Service - Affiliate Tracking Routes
import { Router, Request, Response, NextFunction } from 'express';
import { AffiliateClick } from '../models/AffiliateClick.model';
import { logger } from '../utils/logger';

const router = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = (req.headers['x-user-role'] as string)?.toUpperCase();
  if (role === 'ADMIN') return next();

  const auth = req.headers.authorization as string;
  if (auth?.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const payload: any = jwt.verify(auth.slice(7), process.env.JWT_SECRET || '');
      if (payload?.role?.toUpperCase() === 'ADMIN') return next();
    } catch {}
  }
  return res.status(403).json({ error: 'Admin-Zugriff erforderlich' });
}

/**
 * GET /api/prices/affiliate/redirect
 * Klick erfassen + weiterleiten
 * Query: to (URL, required), seedbank (name), strain (id oder slug), strainName
 */
router.get('/redirect', async (req: Request, res: Response) => {
  const { to, seedbank, strain, strainName } = req.query as Record<string, string>;

  if (!to) {
    return res.status(400).json({ error: 'Parameter "to" erforderlich' });
  }

  // URL validieren
  let targetUrl: string;
  try {
    const parsed = new URL(to);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Ungültige URL' });
    }
    targetUrl = parsed.toString();
  } catch {
    return res.status(400).json({ error: 'Ungültige URL' });
  }

  // Klick asynchron in MongoDB speichern (non-blocking)
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
  const userAgent = (req.headers['user-agent'] || '').slice(0, 200);

  AffiliateClick.create({
    seedbank: seedbank || 'unknown',
    strainId: strain || undefined,
    strainSlug: strain || undefined,
    strainName: strainName || undefined,
    targetUrl,
    ip: ip.slice(0, 45),
    userAgent,
  }).catch((err) => {
    logger.warn('[Affiliate] Klick konnte nicht gespeichert werden:', err.message);
  });

  return res.redirect(302, targetUrl);
});

/**
 * GET /api/prices/affiliate/stats
 * Admin: aggregierte Klick-Statistiken
 * Query: period (7d | 30d | 90d, default 30d)
 */
router.get('/stats', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const periodStr = (req.query.period as string) || '30d';
    const days = periodStr === '7d' ? 7 : periodStr === '90d' ? 90 : 30;

    const since = new Date();
    since.setDate(since.getDate() - days);

    const [total, clicksPerDay, topSeedbanks, topStrains] = await Promise.all([
      // Gesamtklicks im Zeitraum
      AffiliateClick.countDocuments({ createdAt: { $gte: since } }),

      // Klicks pro Tag
      AffiliateClick.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Top 5 Seedbanks
      AffiliateClick.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$seedbank', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),

      // Top 5 Strains
      AffiliateClick.aggregate([
        { $match: { createdAt: { $gte: since }, strainName: { $exists: true, $ne: null } } },
        { $group: { _id: '$strainSlug', name: { $first: '$strainName' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Lückenlose Tagesliste auffüllen
    const dayMap: Record<string, number> = {};
    for (const d of clicksPerDay) dayMap[d._id] = d.count;

    const daysList: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      daysList.push({ date: dateStr, count: dayMap[dateStr] || 0 });
    }

    res.json({
      period: periodStr,
      total,
      clicksPerDay: daysList,
      topSeedbanks: topSeedbanks.map((s) => ({ seedbank: s._id, count: s.count })),
      topStrains: topStrains.map((s) => ({ slug: s._id, name: s.name, count: s.count })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
