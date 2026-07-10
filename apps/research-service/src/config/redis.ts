// /apps/research-service/src/config/redis.ts
import Redis from 'ioredis';
import { logger } from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

export const redisClient = new Redis(REDIS_URL, {
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisClient.on('connect', () => {
  logger.info('[Redis] Connected successfully');
});

redisClient.on('error', (err) => {
  logger.error('[Redis] Connection error:', err);
});
