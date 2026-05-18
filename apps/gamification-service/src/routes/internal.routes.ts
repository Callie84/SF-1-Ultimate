/**
 * SF-1 Ultimate - Gamification Service Internal Routes
 * ======================================================
 * Session 71: DSGVO — Datenexport & Account-Löschung
 * Gesichert via X-Internal-Secret Header
 */

import { Router, Request, Response } from 'express';
import { UserProfile } from '../models/UserProfile.model';
import { Event } from '../models/Event.model';

const router = Router();

function checkInternalSecret(req: Request, res: Response): boolean {
  const secret = req.headers['x-internal-secret'];
  if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

/**
 * GET /api/gamification/internal/user-data/:userId
 * Exportiert Gamification-Daten (Punkte, Badges, Events)
 */
router.get('/user-data/:userId', async (req: Request, res: Response) => {
  if (!checkInternalSecret(req, res)) return;

  try {
    const { userId } = req.params;
    const [profile, events] = await Promise.all([
      UserProfile.findOne({ userId }).lean(),
      Event.find({ userId }).lean(),
    ]);
    res.json({ profile, events });
  } catch (error) {
    res.status(500).json({ error: 'Export fehlgeschlagen' });
  }
});

/**
 * DELETE /api/gamification/internal/user-data/:userId
 * Löscht alle Gamification-Daten eines Users
 */
router.delete('/user-data/:userId', async (req: Request, res: Response) => {
  if (!checkInternalSecret(req, res)) return;

  try {
    const { userId } = req.params;
    await Promise.all([
      UserProfile.deleteOne({ userId }),
      Event.deleteMany({ userId }),
    ]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Löschung fehlgeschlagen' });
  }
});

export default router;
