// /apps/community-service/src/routes/categories.routes.ts
import { Router } from 'express';
import { Category } from '../models/Category.model';
import { authMiddleware, optionalAuthMiddleware, moderatorMiddleware } from '../middleware/auth';
import { cacheOrFetch, invalidateCache } from '../utils/cache';

const router = Router();

/**
 * GET /api/community/categories
 * Alle Kategorien
 */
router.get('/',
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const result = await cacheOrFetch('cache:categories:all', 30 * 60, async () => {
        const categories = await Category.find({ isActive: true }).sort({ order: 1 }).lean();
        return { categories };
      });
      res.json(result);
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
      await invalidateCache('cache:categories:*');
      res.status(201).json({ category });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/community/categories/:id
 * Kategorie bearbeiten (Mod-Only)
 */
router.put('/:id',
  authMiddleware,
  moderatorMiddleware,
  async (req, res, next) => {
    try {
      const { name, slug, description, icon, order, isActive } = req.body;
      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = String(name).slice(0, 100);
      if (slug !== undefined) updates.slug = String(slug).slice(0, 100);
      if (description !== undefined) updates.description = String(description).slice(0, 500);
      if (icon !== undefined) updates.icon = String(icon).slice(0, 10);
      if (order !== undefined) updates.order = Number(order);
      if (isActive !== undefined) updates.isActive = Boolean(isActive);
      const category = await Category.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true }
      );
      if (!category) {
        return res.status(404).json({ error: 'Kategorie nicht gefunden' });
      }
      await invalidateCache('cache:categories:*');
      res.json({ category });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/community/categories/:id
 * Kategorie löschen / deaktivieren (Mod-Only)
 */
router.delete('/:id',
  authMiddleware,
  moderatorMiddleware,
  async (req, res, next) => {
    try {
      const category = await Category.findByIdAndUpdate(
        req.params.id,
        { $set: { isActive: false } },
        { new: true }
      );
      if (!category) {
        return res.status(404).json({ error: 'Kategorie nicht gefunden' });
      }
      await invalidateCache('cache:categories:*');
      res.json({ success: true, message: 'Kategorie deaktiviert' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
