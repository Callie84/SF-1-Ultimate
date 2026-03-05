import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Strain Schema
const strainSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  type: { type: String, enum: ['indica', 'sativa', 'hybrid', 'autoflower'], default: 'hybrid' },
  genetics: String,
  description: String,
  thc: Number,
  cbd: Number,
  cbg: Number,
  terpenes: mongoose.Schema.Types.Mixed,
  totalTerpenes: Number,
  effects: [String],
  aromas: [String],
  flavors: [String],
  imageUrl: String,
  source: String,
  sourceId: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

strainSchema.index({ name: 'text', description: 'text' });
strainSchema.index({ slug: 1 }, { unique: true });
strainSchema.index({ type: 1 });
strainSchema.index({ isActive: 1 });

const Strain = mongoose.models.Strain || mongoose.model('Strain', strainSchema);

// Strain Review Schema
const reviewSchema = new mongoose.Schema({
  strainSlug: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 1000 },
}, { timestamps: true });

reviewSchema.index({ strainSlug: 1, userId: 1 }, { unique: true }); // one review per user per strain

const StrainReview = mongoose.models.StrainReview || mongoose.model('StrainReview', reviewSchema);

/**
 * GET /api/community/strains
 * Liste aller Strains (paginiert)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const type = req.query.type as string;
    const activeOnly = req.query.active !== 'false';

    const filter: any = {};
    if (activeOnly) filter.isActive = true;
    if (type && ['indica', 'sativa', 'hybrid', 'autoflower'].includes(type)) {
      filter.type = type;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [strains, total] = await Promise.all([
      Strain.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Strain.countDocuments(filter)
    ]);

    res.json({
      strains,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/community/strains/stats
 * Strain-Statistiken (Admin)
 */
router.get('/stats',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [total, byType, active, withThc, sources] = await Promise.all([
        Strain.countDocuments(),
        Strain.aggregate([
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        Strain.countDocuments({ isActive: true }),
        Strain.countDocuments({ thc: { $gt: 0 } }),
        Strain.aggregate([
          { $group: { _id: '$source', count: { $sum: 1 } } }
        ])
      ]);

      res.json({
        total,
        active,
        inactive: total - active,
        withThcData: withThc,
        byType: byType.reduce((acc: any, t) => {
          acc[t._id || 'unknown'] = t.count;
          return acc;
        }, {}),
        bySources: sources.reduce((acc: any, s) => {
          acc[s._id || 'unknown'] = s.count;
          return acc;
        }, {})
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/community/strains/:id
 * Einzelner Strain
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    let strain;
    if (mongoose.Types.ObjectId.isValid(id)) {
      strain = await Strain.findById(id).lean();
    } else {
      strain = await Strain.findOne({ slug: id }).lean();
    }

    if (!strain) {
      return res.status(404).json({ error: 'Strain not found' });
    }

    res.json(strain);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/community/strains/:slug/reviews
 * Reviews für einen Strain
 */
router.get('/:slug/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const reviews = await StrainReview.find({ strainSlug: slug })
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
 * POST /api/community/strains/:slug/reviews
 * Review erstellen (Auth required)
 */
router.post('/:slug/reviews',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const { rating, comment } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Bewertung muss zwischen 1 und 5 liegen' });
      }

      // Check strain exists
      const strain = await Strain.findOne({ slug }).lean();
      if (!strain) {
        return res.status(404).json({ error: 'Strain nicht gefunden' });
      }

      const userId = req.user?.id;
      const username = (req.body.username as string)?.trim().slice(0, 50) || 'User';

      // Upsert: update if user already reviewed this strain
      const review = await StrainReview.findOneAndUpdate(
        { strainSlug: slug, userId },
        { rating: Math.round(rating), comment: comment?.trim() || '', username },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.status(201).json({ review });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/community/strains/:slug/reviews/my
 * Eigene Review löschen (Auth required)
 */
router.delete('/:slug/reviews/my',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const userId = req.user?.id;
      await StrainReview.deleteOne({ strainSlug: slug, userId });
      res.json({ message: 'Review gelöscht' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/community/strains
 * Neuen Strain erstellen (Admin)
 */
router.post('/',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, type, genetics, description, thc, cbd, effects, aromas, imageUrl } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const slug = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const existing = await Strain.findOne({ slug });
      if (existing) {
        return res.status(400).json({ error: 'Strain with this name already exists' });
      }

      const strain = new Strain({
        name,
        slug,
        type: type || 'hybrid',
        genetics,
        description,
        thc: thc ? parseFloat(thc) : null,
        cbd: cbd ? parseFloat(cbd) : null,
        effects: effects || [],
        aromas: aromas || [],
        flavors: aromas || [],
        imageUrl,
        source: 'manual',
        isActive: true
      });

      await strain.save();
      logger.info(`[Strains] Created: ${strain.name} by user ${req.user?.id}`);

      res.status(201).json(strain);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/community/strains/:id
 * Strain aktualisieren (Admin)
 */
router.put('/:id',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid strain ID' });
      }

      // Slug aktualisieren wenn Name geändert
      if (updates.name) {
        updates.slug = updates.name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }

      const strain = await Strain.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!strain) {
        return res.status(404).json({ error: 'Strain not found' });
      }

      logger.info(`[Strains] Updated: ${strain.name} by user ${req.user?.id}`);
      res.json(strain);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/community/strains/:id
 * Strain löschen (Admin)
 */
router.delete('/:id',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid strain ID' });
      }

      const strain = await Strain.findByIdAndDelete(id);

      if (!strain) {
        return res.status(404).json({ error: 'Strain not found' });
      }

      logger.info(`[Strains] Deleted: ${strain.name} by user ${req.user?.id}`);
      res.json({ success: true, message: 'Strain deleted' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/community/strains/:id/toggle
 * Strain aktivieren/deaktivieren (Admin)
 */
router.post('/:id/toggle',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid strain ID' });
      }

      const strain = await Strain.findById(id);
      if (!strain) {
        return res.status(404).json({ error: 'Strain not found' });
      }

      strain.isActive = !strain.isActive;
      await strain.save();

      logger.info(`[Strains] Toggled ${strain.name} to ${strain.isActive ? 'active' : 'inactive'} by user ${req.user?.id}`);
      res.json({ success: true, isActive: strain.isActive });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
