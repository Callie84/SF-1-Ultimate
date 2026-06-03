import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export function withCache(keyPrefix: string, ttl: number) {
  return async (_req: Request, res: Response, next: NextFunction) => {
    const cacheKey = `cache:${keyPrefix}`;
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
