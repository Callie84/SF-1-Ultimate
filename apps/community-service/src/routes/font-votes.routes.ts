import { Router } from 'express';
import { FontVote } from '../models/FontVote.model';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

/**
 * GET /api/community/font-votes
 * Öffentlich — Vote-Counts aller Fonts + Gesamt-Abstimmer
 */
router.get('/', async (req, res, next) => {
  try {
    const counts = await FontVote.aggregate([
      { $group: { _id: '$fontId', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const totalVoters = await FontVote.distinct('userId').then(ids => ids.length);

    const result: Record<number, number> = {};
    for (const c of counts) result[c._id] = c.count;

    res.json({ counts: result, totalVoters });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/community/font-votes/mine
 * Auth — welche Fonts hat der aktuelle User gewählt
 */
router.get('/mine', authMiddleware, async (req: any, res, next) => {
  try {
    const votes = await FontVote.find({ userId: req.user.id }).lean();
    res.json({ votedFonts: votes.map(v => v.fontId) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/community/font-votes/:fontId
 * Auth — Vote togglen (hinzufügen oder entfernen)
 */
router.post('/:fontId', authMiddleware, async (req: any, res, next) => {
  try {
    const fontId = parseInt(req.params.fontId);
    if (isNaN(fontId) || fontId < 1 || fontId > 10) {
      return res.status(400).json({ error: 'Ungültige Font-ID (1–10)' });
    }

    const existing = await FontVote.findOne({ userId: req.user.id, fontId });

    if (existing) {
      await existing.deleteOne();
      res.json({ voted: false, fontId });
    } else {
      await FontVote.create({ userId: req.user.id, fontId });
      res.json({ voted: true, fontId });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/community/font-votes/results
 * Admin — detaillierte Ergebnisse mit Rang
 */
router.get('/results', authMiddleware, async (req: any, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins' });
    }

    const counts = await FontVote.aggregate([
      { $group: { _id: '$fontId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const totalVoters = await FontVote.distinct('userId').then(ids => ids.length);
    const totalVotes = counts.reduce((s, c) => s + c.count, 0);

    res.json({ results: counts.map(c => ({ fontId: c._id, votes: c.count })), totalVoters, totalVotes });
  } catch (err) {
    next(err);
  }
});

export default router;
