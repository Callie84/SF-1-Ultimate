// /apps/search-service/src/config/redis.ts
import Redis from 'ioredis';
import { logger } from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

export const redis = new Redis(REDIS_URL, {
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('connect', () => {
  logger.info('[Redis] Connected successfully');
});

redis.on('error', (err) => {
  logger.error('[Redis] Connection error:', err);
});

/**
 * Cache-Keys
 */
export const CACHE_KEYS = {
  searchResults: (query: string) => `search:results:${query}`,
  popularSearches: 'search:popular',
  recentSearches: (userId: string) => `search:recent:${userId}`
};

/**
 * Cache TTL (in seconds)
 */
export const CACHE_TTL = {
  searchResults: 300,      // 5 Min
  popularSearches: 3600,   // 1 Stunde
  recentSearches: 86400    // 1 Tag
};
