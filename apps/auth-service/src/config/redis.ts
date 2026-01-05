// Auth Service - Redis Config
import { createClient } from 'redis';
import { logger } from '../utils/logger';

export const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redis.on('error', (err) => {
  logger.error('[Redis] Error:', err);
});

redis.on('connect', () => {
  logger.info('[Redis] Connected');
});

export async function connectRedis(): Promise<void> {
  await redis.connect();
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  logger.info('[Redis] Disconnected');
}
