// /apps/community-service/src/routes/announcement.routes.ts
import { Router } from 'express';
import { Announcement } from '../models/Announcement.model';
import { authMiddleware } from '../middleware/auth';

const router = Router();

const adminMiddleware = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Nur Admins erlaubt' });
  }
  next();
};

/**
 * GET /api/community/announcement
 * Aktuelle aktive Ankündigung (public)
 */
router.get('/', async (req, res, next) => {
  try {
    const announcement = await Announcement.findOne({ isActive: true })
      .sort({ updatedAt: -1 })
      .lean();

    if (!announcement) return res.json({ announcement: null });
    res.json({ announcement });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/community/announcement
 * Ankündigung erstellen oder aktualisieren (Admin)
 */
router.put('/', authMiddleware, adminMiddleware, async (req: any, res, next) => {
  try {
    const { title, content, isActive, bumpVersion, ctaUrl, ctaLabel } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Titel und Inhalt erforderlich' });
    }

    let announcement = await Announcement.findOne();

    if (announcement) {
      announcement.title = title;
      announcement.content = content;
      announcement.isActive = isActive ?? announcement.isActive;
      announcement.ctaUrl = ctaUrl ?? undefined;
      announcement.ctaLabel = ctaLabel ?? undefined;
      if (bumpVersion) announcement.version += 1;
      await announcement.save();
    } else {
      announcement = await Announcement.create({ title, content, isActive: isActive ?? true, version: 1, ctaUrl, ctaLabel });
    }

    res.json({ announcement });
  } catch (err) {
    next(err);
  }
});

export default router;
