import { Router } from 'express';
import { feedService } from '../services/feed.service';
import { authMiddleware } from '../middleware/auth';
import { cacheOrFetch } from '../utils/cache';

const router = Router();

router.get('/',
  async (req, res, next) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 12, 100);
      const skip = parseInt(req.query.skip as string) || 0;
      const sortBy = (req.query.sortBy as string) || 'recent';
      const status = (req.query.status as string) || undefined;
      const environment = (req.query.environment as string) || undefined;
      const medium = (req.query.medium as string) || undefined;
      const lightType = (req.query.lightType as string) || undefined;
      const difficulty = (req.query.difficulty as string) || undefined;
      const filterUserId = (req.query.userId as string) || undefined;

      // Cache nur für default-Feed ohne spezifische Filter und ohne eingeloggten User
      const hasFilters = status || environment || medium || lightType || difficulty || filterUserId;
      const isCacheable = !hasFilters && !req.user?.id && skip === 0;
      const cacheKey = `cache:feed:public:${sortBy}:${limit}`;

      const result = isCacheable
        ? await cacheOrFetch(cacheKey, 2 * 60, () =>
            feedService.getPublicFeed({ limit, skip: 0, sortBy, userId: undefined })
          )
        : await feedService.getPublicFeed({
            limit,
            skip,
            sortBy,
            status,
            environment,
            medium,
            lightType,
            difficulty,
            userId: req.user?.id,
            filterUserId,
          });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/following',
  authMiddleware,
  async (req, res, next) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = parseInt(req.query.skip as string) || 0;
      
      const result = await feedService.getFollowingFeed({
        userId: req.user!.id,
        limit,
        skip
      });
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/strain/:strainId',
  async (req, res, next) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = parseInt(req.query.skip as string) || 0;
      
      const result = await feedService.getStrainFeed({
        strainId: req.params.strainId,
        limit,
        skip,
        userId: req.user?.id
      });
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/harvests',
  async (req, res, next) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = parseInt(req.query.skip as string) || 0;
      
      const result = await feedService.getHarvestFeed({
        limit,
        skip,
        userId: req.user?.id
      });
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
