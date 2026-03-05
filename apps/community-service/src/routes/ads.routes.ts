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
 * GET /api/community/ads
 * Alle aktiven Ads (öffentlich)
 */
router.get('/', async (req, res, next) => {
  try {
    const type = req.query.type as string;
    const query: any = { isActive: true };
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
    res.json({ zones: config?.zones ?? DEFAULT_ZONES });
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
    const { zones } = req.body;
    if (!Array.isArray(zones)) {
      return res.status(400).json({ error: 'zones muss ein Array sein' });
    }
    const config = await AdZoneConfig.findOneAndUpdate(
      {},
      { zones },
      { upsert: true, new: true }
    );
    res.json({ zones: config.zones });
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
    const { type, title, imageUrl, link, linkTarget, altText, isActive, order } = req.body;

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
    const { type, title, imageUrl, link, linkTarget, altText, isActive, order } = req.body;
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { $set: { type, title, imageUrl, link, linkTarget, altText, isActive, order } },
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
