/**
 * SF-1 Ultimate - Journal Service Internal Routes
 * =================================================
 * Session 71: DSGVO — Datenexport & Account-Löschung
 * Gesichert via X-Internal-Secret Header
 */

import { Router, Request, Response } from 'express';
import { Grow } from '../models/Grow.model';
import { Entry } from '../models/Entry.model';
import { FeedingPlan } from '../models/FeedingPlan.model';

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
 * GET /api/journal/internal/user-data/:userId
 * Exportiert alle Journal-Daten eines Users (Grows, Entries, FeedingPlans)
 */
router.get('/user-data/:userId', async (req: Request, res: Response) => {
  if (!checkInternalSecret(req, res)) return;

  try {
    const { userId } = req.params;
    const [grows, feedingPlans] = await Promise.all([
      Grow.find({ userId }).lean(),
      FeedingPlan.find({ userId }).lean(),
    ]);

    // Entries für alle Grows
    const growIds = grows.map((g: any) => g._id.toString());
    const entries = growIds.length > 0
      ? await Entry.find({ growId: { $in: growIds } }).lean()
      : [];

    res.json({ grows, entries, feedingPlans });
  } catch (error) {
    res.status(500).json({ error: 'Export fehlgeschlagen' });
  }
});

/**
 * DELETE /api/journal/internal/user-data/:userId
 * Löscht alle Journal-Daten eines Users (DSGVO-Löschung)
 */
router.delete('/user-data/:userId', async (req: Request, res: Response) => {
  if (!checkInternalSecret(req, res)) return;

  try {
    const { userId } = req.params;

    const grows = await Grow.find({ userId }).select('_id').lean();
    const growIds = grows.map((g: any) => g._id);

    await Promise.all([
      Entry.deleteMany({ growId: { $in: growIds } }),
      Grow.deleteMany({ userId }),
      FeedingPlan.deleteMany({ userId }),
    ]);

    res.json({ success: true, deletedGrows: growIds.length });
  } catch (error) {
    res.status(500).json({ error: 'Löschung fehlgeschlagen' });
  }
});

export default router;
