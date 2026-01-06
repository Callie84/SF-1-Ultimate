/**
 * Redis Caching Middleware for Express
 *
 * High-performance caching layer with automatic cache invalidation
 *
 * Installation:
 * npm install ioredis
 *
 * Usage:
 * import { cacheMiddleware, clearCache } from './middleware/cache.middleware';
 * app.get('/api/prices/current/:symbol', cacheMiddleware(300), getPriceHandler);
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

// Redis client instance
let redisClient: Redis | null = null;

// Initialize Redis client
export function initRedisCache(redisUrl?: string): Redis {
  if (redisClient) {
    return redisClient;
  }

  const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis cache connected');
  });

  redisClient.on('error', (err) => {
    console.error('❌ Redis cache error:', err.message);
  });

  return redisClient;
}

// Get Redis client (lazy initialization)
function getRedisClient(): Redis {
  if (!redisClient) {
    return initRedisCache();
  }
  return redisClient;
}

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request): string {
  const { method, originalUrl, path, query, params } = req;

  // Include relevant request data in cache key
  const keyParts = [
    method,
    path || originalUrl,
    JSON.stringify(query),
    JSON.stringify(params),
  ];

  // Include user ID for user-specific caching
  if (req.headers['x-user-id']) {
    keyParts.push(req.headers['x-user-id'] as string);
  }

  return `cache:${keyParts.join(':')}`;
}

/**
 * Cache Middleware
 *
 * @param ttl - Time to live in seconds (default: 300 = 5 minutes)
 * @param options - Caching options
 */
export function cacheMiddleware(
  ttl: number = 300,
  options: {
    /** Skip caching for authenticated requests */
    skipAuth?: boolean;
    /** Custom cache key generator */
    keyGenerator?: (req: Request) => string;
    /** Condition to skip caching */
    shouldCache?: (req: Request, res: Response) => boolean;
  } = {}
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching for authenticated requests if configured
    if (options.skipAuth && req.headers.authorization) {
      return next();
    }

    try {
      const redis = getRedisClient();
      const cacheKey =
        options.keyGenerator?.(req) || generateCacheKey(req);

      // Try to get from cache
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        // Cache hit
        const data = JSON.parse(cachedData);

        // Add cache headers
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);

        // Track cache hit metric
        if (typeof (global as any).recordCacheOperation === 'function') {
          (global as any).recordCacheOperation('get', 'hit');
        }

        return res.json(data);
      }

      // Cache miss - intercept response
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);

      // Track cache miss metric
      if (typeof (global as any).recordCacheOperation === 'function') {
        (global as any).recordCacheOperation('get', 'miss');
      }

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = function (data: any) {
        // Check if we should cache this response
        const shouldCache = options.shouldCache
          ? options.shouldCache(req, res)
          : res.statusCode === 200;

        if (shouldCache) {
          // Cache the response asynchronously (don't block response)
          redis
            .setex(cacheKey, ttl, JSON.stringify(data))
            .then(() => {
              if (typeof (global as any).recordCacheOperation === 'function') {
                (global as any).recordCacheOperation('set', 'success');
              }
            })
            .catch((err) => {
              console.error('Cache set error:', err);
              if (typeof (global as any).recordCacheOperation === 'function') {
                (global as any).recordCacheOperation('set', 'error');
              }
            });
        }

        // Send original response
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Clear cache by pattern
 *
 * @param pattern - Redis key pattern (e.g., 'cache:GET:/api/prices/*')
 */
export async function clearCache(pattern: string): Promise<number> {
  try {
    const redis = getRedisClient();
    const keys = await redis.keys(pattern);

    if (keys.length === 0) {
      return 0;
    }

    await redis.del(...keys);
    console.log(`🗑️  Cleared ${keys.length} cache entries matching: ${pattern}`);

    return keys.length;
  } catch (error) {
    console.error('Clear cache error:', error);
    return 0;
  }
}

/**
 * Clear all cache entries
 */
export async function clearAllCache(): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.flushdb();
    console.log('🗑️  Cleared all cache entries');
  } catch (error) {
    console.error('Clear all cache error:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  keys: number;
  memoryUsage: number;
  hits: number;
  misses: number;
}> {
  try {
    const redis = getRedisClient();

    const [dbsize, info] = await Promise.all([
      redis.dbsize(),
      redis.info('stats'),
    ]);

    // Parse info for hits/misses
    const hitsMatch = info.match(/keyspace_hits:(\d+)/);
    const missesMatch = info.match(/keyspace_misses:(\d+)/);
    const memoryMatch = info.match(/used_memory:(\d+)/);

    return {
      keys: dbsize,
      memoryUsage: memoryMatch ? parseInt(memoryMatch[1]) : 0,
      hits: hitsMatch ? parseInt(hitsMatch[1]) : 0,
      misses: missesMatch ? parseInt(missesMatch[1]) : 0,
    };
  } catch (error) {
    console.error('Get cache stats error:', error);
    return { keys: 0, memoryUsage: 0, hits: 0, misses: 0 };
  }
}

/**
 * Invalidate cache on data modification
 *
 * Use in POST/PUT/DELETE handlers to invalidate related cache entries
 */
export async function invalidateCache(patterns: string[]): Promise<void> {
  for (const pattern of patterns) {
    await clearCache(pattern);
  }
}

/**
 * Cache decorator for functions (advanced usage)
 */
export function cached(ttl: number = 300) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const redis = getRedisClient();
      const cacheKey = `fn:${propertyKey}:${JSON.stringify(args)}`;

      try {
        const cachedResult = await redis.get(cacheKey);

        if (cachedResult) {
          return JSON.parse(cachedResult);
        }

        const result = await originalMethod.apply(this, args);

        await redis.setex(cacheKey, ttl, JSON.stringify(result));

        return result;
      } catch (error) {
        // Fallback to original method on cache error
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

export default {
  initRedisCache,
  cacheMiddleware,
  clearCache,
  clearAllCache,
  getCacheStats,
  invalidateCache,
  cached,
};
