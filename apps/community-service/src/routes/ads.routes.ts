// /apps/community-service/src/routes/ads.routes.ts
import { Router } from 'express';
import { Ad } from '../models/Ad.model';
import { AdZoneConfig } from '../models/AdZoneConfig.model';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Admin-Check Middleware
const adminMiddleware = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Nur Admins können Werbung verwalten' });
  }
  next();
};

/**
 * GET /api/community/ads/stats
 * Buchungs-Statistiken aller Ads (Admin)
 */
router.get('/stats', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const ads = await Ad.find().sort({ createdAt: -1 }).lean();
    const now = new Date();

    const stats = ads.map((ad) => {
      const ctr = ad.impressions > 0
        ? Math.round((ad.clicks / ad.impressions) * 10000) / 100
        : 0;
      const estimatedRevenue = ad.cpm && ad.impressions > 0
        ? Math.round((ad.cpm * ad.impressions / 1000) * 100) / 100
        : null;
      const bookingStatus = !ad.startDate && !ad.endDate
        ? 'unbefristet'
        : ad.startDate && ad.startDate > now
        ? 'geplant'
        : ad.endDate && ad.endDate < now
        ? 'abgelaufen'
        : 'aktiv';

      return {
        _id: ad._id,
        type: ad.type,
        title: ad.title,
        isActive: ad.isActive,
        clientName: ad.clientName,
        clientEmail: ad.clientEmail,
        startDate: ad.startDate,
        endDate: ad.endDate,
        budget: ad.budget,
        cpm: ad.cpm,
        impressions: ad.impressions,
        clicks: ad.clicks,
        ctr,
        estimatedRevenue,
        bookingStatus,
        createdAt: ad.createdAt,
      };
    });

    const totals = {
      impressions: ads.reduce((s, a) => s + (a.impressions || 0), 0),
      clicks: ads.reduce((s, a) => s + (a.clicks || 0), 0),
      budget: ads.reduce((s, a) => s + (a.budget || 0), 0),
      activeBookings: stats.filter((s) => s.bookingStatus === 'aktiv').length,
      scheduledBookings: stats.filter((s) => s.bookingStatus === 'geplant').length,
    };

    res.json({ ads: stats, totals });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/community/ads/:id/impression
 * Impression tracken (öffentlich)
 */
router.post('/:id/impression', async (req, res, next) => {
  try {
    await Ad.findByIdAndUpdate(req.params.id, { $inc: { impressions: 1 } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/community/ads/:id/click
 * Klick tracken (öffentlich)
 */
router.post('/:id/click', async (req, res, next) => {
  try {
    await Ad.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/community/ads
 * Alle aktiven Ads (öffentlich) — berücksichtigt Start/Endtermin
 */
router.get('/', async (req, res, next) => {
  try {
    const type = req.query.type as string;
    const now = new Date();
    const query: any = {
      isActive: true,
      $and: [
        { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
      ],
    };
    if (type && ['rectangle', 'square'].includes(type)) {
      query.type = type;
    }

    const ads = await Ad.find(query).sort({ order: 1, createdAt: 1 }).lean();
    res.json({ ads });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/community/ads/all
 * Alle Ads inkl. inaktive (Admin)
 */
router.get('/all', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const type = req.query.type as string;
    const query: any = {};
    if (type && ['rectangle', 'square'].includes(type)) {
      query.type = type;
    }

    const ads = await Ad.find(query).sort({ type: 1, order: 1 }).lean();
    res.json({ ads });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/community/ads/zones
 * Zonen-Konfiguration (öffentlich, für Layout-Rendering)
 */
const DEFAULT_ZONES = [
  { id: 'content-top', adType: 'rectangle', width: 0, height: 90, isActive: true },
  { id: 'sidebar-bottom', adType: 'square', width: 0, height: 250, isActive: true },
];

router.get('/zones', async (req, res, next) => {
  try {
    const config = await AdZoneConfig.findOne().lean();
    res.json({
      zones: config?.zones ?? DEFAULT_ZONES,
      sidebarWidth: (config as any)?.sidebarWidth ?? 256,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/community/ads/zones
 * Zonen-Konfiguration speichern (Admin)
 */
router.put('/zones', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { zones, sidebarWidth } = req.body;
    if (!Array.isArray(zones)) {
      return res.status(400).json({ error: 'zones muss ein Array sein' });
    }
    const update: any = { zones };
    if (typeof sidebarWidth === 'number' && sidebarWidth >= 180 && sidebarWidth <= 400) {
      update.sidebarWidth = sidebarWidth;
    }
    const config = await AdZoneConfig.findOneAndUpdate(
      {},
      update,
      { upsert: true, new: true }
    );
    res.json({ zones: config.zones, sidebarWidth: (config as any).sidebarWidth ?? 256 });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/community/ads
 * Neue Ad erstellen (Admin)
 */
router.post('/', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { type, title, imageUrl, link, linkTarget, altText, isActive, order,
            clientName, clientEmail, startDate, endDate, budget, cpm } = req.body;

    if (!type || !title || !imageUrl || !link) {
      return res.status(400).json({ error: 'type, title, imageUrl und link sind erforderlich' });
    }

    if (!['rectangle', 'square'].includes(type)) {
      return res.status(400).json({ error: 'type muss "rectangle" oder "square" sein' });
    }

    const ad = new Ad({
      type,
      title,
      imageUrl,
      link,
      linkTarget: linkTarget || '_blank',
      altText: altText || title,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0,
      clientName: clientName || undefined,
      clientEmail: clientEmail || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      budget: budget || undefined,
      cpm: cpm || undefined,
    });

    await ad.save();
    res.status(201).json({ ad });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/community/ads/:id
 * Ad aktualisieren (Admin)
 */
router.put('/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { type, title, imageUrl, link, linkTarget, altText, isActive, order,
            clientName, clientEmail, startDate, endDate, budget, cpm } = req.body;
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { $set: {
        type, title, imageUrl, link, linkTarget, altText, isActive, order,
        clientName: clientName || undefined,
        clientEmail: clientEmail || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        budget: budget || undefined,
        cpm: cpm || undefined,
      }},
      { new: true }
    );

    if (!ad) {
      return res.status(404).json({ error: 'Werbeanzeige nicht gefunden' });
    }

    res.json({ ad });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/community/ads/:id
 * Ad löschen (Admin)
 */
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const ad = await Ad.findByIdAndDelete(req.params.id);

    if (!ad) {
      return res.status(404).json({ error: 'Werbeanzeige nicht gefunden' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
