import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Known seedbank slugs (from price-service feed registry)
const VALID_SLUGS = [
  'fastbuds', 'zamnesia', 'weed-seed-shop', 'sensi-seeds', 'dutch-passion',
  'seedsman', 'royal-queen-seeds', 'greenhouse-seeds', 'paradise-seeds',
  'anesia-seeds', 'mr-hanf',
];

const reviewSchema = new mongoose.Schema({
  seedbankSlug: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 1000 },
}, { timestamps: true });

reviewSchema.index({ seedbankSlug: 1, userId: 1 }, { unique: true });
reviewSchema.index({ seedbankSlug: 1, createdAt: -1 }); // Session 52
reviewSchema.index({ userId: 1, createdAt: -1 }); // Session 52

const SeedbankReview = mongoose.models.SeedbankReview || mongoose.model('SeedbankReview', reviewSchema);

/**
 * GET /api/community/seedbank-reviews
 * Durchschnittliche Bewertungen aller Seedbanks (für Listing-Seite)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await SeedbankReview.aggregate([
      {
        $group: {
          _id: '$seedbankSlug',
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    const ratings: Record<string, { avgRating: number; count: number }> = {};
    for (const s of stats) {
      ratings[s._id] = {
        avgRating: Math.round(s.avgRating * 10) / 10,
        count: s.count,
      };
    }

    res.json({ ratings });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/community/seedbank-reviews/:slug
 * Reviews für eine Seedbank
 */
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const reviews = await SeedbankReview.find({ seedbankSlug: slug })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const avgRating = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

    res.json({ reviews, count: reviews.length, avgRating });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/community/seedbank-reviews/:slug
 * Review erstellen/aktualisieren (Auth required)
 */
router.post('/:slug',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const { rating, comment, username } = req.body;

      if (!VALID_SLUGS.includes(slug)) {
        return res.status(400).json({ error: 'Unbekannte Seedbank' });
      }

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Bewertung muss zwischen 1 und 5 liegen' });
      }

      const userId = req.user!.id;

      const review = await SeedbankReview.findOneAndUpdate(
        { seedbankSlug: slug, userId },
        {
          rating: Math.round(rating),
          comment: comment?.trim() || '',
          username: username?.trim() || 'User',
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.status(201).json({ review });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/community/seedbank-reviews/:slug/my
 * Eigene Review löschen
 */
router.delete('/:slug/my',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      await SeedbankReview.deleteOne({ seedbankSlug: slug, userId: req.user!.id });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
