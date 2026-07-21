import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export function withCache(keyPrefix: string, ttl: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // WICHTIG: req.originalUrl (Pfad + Querystring) MUSS in den Key — sonst
    // teilen sich alle Requests derselben Route EINEN Cache-Eintrag und der
    // erste Treffer wird für alle Queries zurückgegeben (z. B. /search?q=…).
    const cacheKey = `cache:${keyPrefix}:${req.originalUrl}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }
    } catch (err) {
      logger.warn('[Cache] Redis read error:', err);
    }

    const originalJson = res.json.bind(res);
    res.json = (data: any) => {
      redis.set(cacheKey, JSON.stringify(data), { EX: ttl }).catch((err) =>
        logger.warn('[Cache] Redis write error:', err)
      );
      res.setHeader('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
    return;
  };
}
