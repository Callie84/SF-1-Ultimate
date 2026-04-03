/**
 * SF-1 Ultimate - Notification Service Internal Routes
 * ======================================================
 * Session 71: DSGVO — Account-Löschung
 * Gesichert via X-Internal-Secret Header
 */

import { Router, Request, Response } from 'express';
import { Notification } from '../models/Notification.model';
import { Preference } from '../models/Preference.model';
import { Device } from '../models/Device.model';

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
 * DELETE /api/notifications/internal/user-data/:userId
 * Löscht alle Notification-Daten eines Users
 */
router.delete('/user-data/:userId', async (req: Request, res: Response) => {
  if (!checkInternalSecret(req, res)) return;

  try {
    const { userId } = req.params;
    await Promise.all([
      Notification.deleteMany({ userId }),
      Preference.deleteOne({ userId }),
      Device.deleteMany({ userId }),
    ]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Löschung fehlgeschlagen' });
  }
});

export default router;
