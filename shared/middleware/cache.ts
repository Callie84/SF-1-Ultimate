// Redis Caching Utilities
import { createClient, RedisClientType } from 'redis';
import { createLogger } from './logger';
import { cacheHitRate } from './monitoring';

const logger = createLogger('cache');

export class CacheManager {
  private client: RedisClientType | null = null;
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  async connect(redisUrl: string) {
    try {
      this.client = createClient({ url: redisUrl });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error', { error: err });
      });

      this.client.on('connect', () => {
        logger.info('Redis Cache connected');
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      logger.info('Redis Cache disconnected');
    }
  }

  // Get mit Metrics
  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;

    try {
      const value = await this.client.get(key);

      // Track Metrics
      cacheHitRate.inc({
        service: this.serviceName,
        operation: 'get',
        result: value ? 'hit' : 'miss'
      });

      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache GET error', { key, error });
      return null;
    }
  }

  // Set mit TTL
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));

      // Track Metrics
      cacheHitRate.inc({
        service: this.serviceName,
        operation: 'set',
        result: 'success'
      });

      return true;
    } catch (error) {
      logger.error('Cache SET error', { key, error });
      return false;
    }
  }

  // Delete
  async delete(key: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.del(key);

      // Track Metrics
      cacheHitRate.inc({
        service: this.serviceName,
        operation: 'delete',
        result: 'success'
      });

      return true;
    } catch (error) {
      logger.error('Cache DELETE error', { key, error });
      return false;
    }
  }

  // Delete by Pattern
  async deletePattern(pattern: string): Promise<number> {
    if (!this.client) return 0;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;

      await this.client.del(keys);
      return keys.length;
    } catch (error) {
      logger.error('Cache DELETE PATTERN error', { pattern, error });
      return 0;
    }
  }

  // Cache Wrapper für Functions
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds: number = 3600
  ): Promise<T> {
    // Try Cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute Function
    const result = await fn();

    // Store in Cache
    await this.set(key, result, ttlSeconds);

    return result;
  }
}

// Cache Key Builder Helpers
export const buildCacheKey = (prefix: string, ...parts: (string | number)[]): string => {
  return `${prefix}:${parts.join(':')}`;
};
