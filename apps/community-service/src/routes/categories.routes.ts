// /apps/community-service/src/routes/categories.routes.ts
import { Router } from 'express';
import { Category } from '../models/Category.model';
import { authMiddleware, optionalAuthMiddleware, moderatorMiddleware } from '../middleware/auth';

const router = Router();

/**
 * GET /api/community/categories
 * Alle Kategorien
 */
router.get('/',
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const categories = await Category.find({ isActive: true })
        .sort({ order: 1 })
        .lean();
      
      res.json({ categories });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/community/categories/:slug
 * Kategorie-Details
 */
router.get('/:slug',
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const category = await Category.findOne({ 
        slug: req.params.slug,
        isActive: true
      }).lean();
      
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      res.json({ category });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/community/categories
 * Kategorie erstellen (Mod-Only)
 */
router.post('/',
  authMiddleware,
  moderatorMiddleware,
  async (req, res, next) => {
    try {
      const category = new Category(req.body);
      await category.save();
      
      res.status(201).json({ category });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
