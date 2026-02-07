// /apps/ai-service/src/middleware/rate-limit.ts
import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

interface RateLimitOptions {
  windowMs: number;      // Zeitfenster in ms
  maxRequests: number;   // Max Requests pro Fenster
  keyPrefix?: string;    // Redis Key Prefix
}

/**
 * Rate-Limiting Middleware mit Redis
 * Begrenzt Requests pro User basierend auf Sliding Window
 */
export function rateLimitMiddleware(options: RateLimitOptions) {
  const {
    windowMs = 60000,    // Default: 1 Minute
    maxRequests = 10,    // Default: 10 Requests
    keyPrefix = 'ratelimit:ai'
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id || req.ip || 'anonymous';
    const key = `${keyPrefix}:${userId}`;

    try {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Alte Einträge entfernen, aktuellen hinzufügen, Fenster zählen
      await redis.zremrangebyscore(key, 0, windowStart);
      const count = await redis.zcard(key);

      if (count >= maxRequests) {
        const oldestEntry = await redis.zrange(key, 0, 0, 'WITHSCORES');
        const resetAt = oldestEntry.length >= 2
          ? parseInt(oldestEntry[1]) + windowMs
          : now + windowMs;

        logger.warn(`[RateLimit] User ${userId} exceeded limit: ${count}/${maxRequests}`);

        res.status(429).json({
          error: 'Zu viele Anfragen. Bitte warte einen Moment.',
          retryAfter: Math.ceil((resetAt - now) / 1000),
          limit: maxRequests,
          remaining: 0
        });
        return;
      }

      // Request zählen
      await redis.zadd(key, now, `${now}:${Math.random()}`);
      await redis.expire(key, Math.ceil(windowMs / 1000));

      // Rate-Limit Headers setzen
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - count - 1);

      next();
    } catch (error) {
      // Bei Redis-Fehler: Request durchlassen (fail-open)
      logger.error('[RateLimit] Redis error, allowing request:', error);
      next();
    }
  };
}
