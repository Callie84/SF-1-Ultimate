/**
 * Rate Limiting Middleware
 *
 * Protects against brute force attacks and API abuse
 *
 * Installation:
 * npm install express-rate-limit rate-limit-redis ioredis
 *
 * Usage:
 * import { rateLimiters } from './middleware/rate-limit.middleware';
 * app.use('/api', rateLimiters.api);
 * app.use('/api/auth/login', rateLimiters.strictAuth);
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

// Redis client for rate limiting
let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(url);
  }
  return redisClient;
}

/**
 * Rate limiters for different use cases
 */
export const rateLimiters = {
  /**
   * General API rate limiter
   * 1000 requests per 15 minutes
   */
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later',
      retryAfter: 900, // 15 minutes in seconds
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit-* headers

    // Use Redis for distributed rate limiting
    store: new RedisStore({
      client: getRedisClient(),
      prefix: 'rate_limit:api:',
    }),

    // Skip for certain conditions
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/metrics';
    },

    // Handler for when limit is exceeded
    handler: (req, res) => {
      console.warn(`⚠️  Rate limit exceeded: ${req.ip} → ${req.path}`);
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        retryAfter: 900,
      });
    },
  }),

  /**
   * Strict rate limiter for authentication endpoints
   * 5 requests per 15 minutes (prevents brute force)
   */
  strictAuth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Very strict limit
    message: {
      error: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
      retryAfter: 900,
    },
    standardHeaders: true,
    legacyHeaders: false,

    store: new RedisStore({
      client: getRedisClient(),
      prefix: 'rate_limit:auth:',
    }),

    skipSuccessfulRequests: true, // Don't count successful auth attempts

    handler: (req, res) => {
      console.warn(`🚨 Auth rate limit exceeded: ${req.ip} → ${req.path}`);
      res.status(429).json({
        error: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts, please try again in 15 minutes',
        retryAfter: 900,
      });
    },
  }),

  /**
   * Registration rate limiter
   * 3 registrations per hour per IP
   */
  registration: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
      error: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
      message: 'Too many accounts created, please try again later',
      retryAfter: 3600,
    },
    standardHeaders: true,
    legacyHeaders: false,

    store: new RedisStore({
      client: getRedisClient(),
      prefix: 'rate_limit:register:',
    }),

    handler: (req, res) => {
      console.warn(`🚨 Registration rate limit: ${req.ip}`);
      res.status(429).json({
        error: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
        message: 'Too many accounts created from this IP, please try again in 1 hour',
        retryAfter: 3600,
      });
    },
  }),

  /**
   * Password reset rate limiter
   * 3 requests per hour
   */
  passwordReset: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
      error: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset requests, please try again later',
      retryAfter: 3600,
    },
    standardHeaders: true,
    legacyHeaders: false,

    store: new RedisStore({
      client: getRedisClient(),
      prefix: 'rate_limit:password_reset:',
    }),
  }),

  /**
   * Admin endpoints rate limiter
   * 100 requests per 15 minutes
   */
  admin: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      error: 'ADMIN_RATE_LIMIT_EXCEEDED',
      message: 'Too many admin requests',
      retryAfter: 900,
    },
    standardHeaders: true,
    legacyHeaders: false,

    store: new RedisStore({
      client: getRedisClient(),
      prefix: 'rate_limit:admin:',
    }),
  }),

  /**
   * Public/unauthenticated rate limiter
   * 100 requests per 15 minutes
   */
  public: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      retryAfter: 900,
    },
    standardHeaders: true,
    legacyHeaders: false,

    store: new RedisStore({
      client: getRedisClient(),
      prefix: 'rate_limit:public:',
    }),
  }),
};

/**
 * Create custom rate limiter
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  prefix?: string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: 'RATE_LIMIT_EXCEEDED',
      message: options.message || 'Too many requests',
      retryAfter: Math.floor(options.windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,

    store: new RedisStore({
      client: getRedisClient(),
      prefix: options.prefix || 'rate_limit:custom:',
    }),
  });
}

/**
 * Get rate limit status for a key
 */
export async function getRateLimitStatus(
  prefix: string,
  identifier: string
): Promise<{
  remaining: number;
  limit: number;
  resetTime: Date;
}> {
  const redis = getRedisClient();
  const key = `${prefix}${identifier}`;

  const current = await redis.get(key);
  const ttl = await redis.ttl(key);

  // Parse rate limit data from Redis
  // This is a simplified version - actual implementation depends on rate-limit-redis format

  return {
    remaining: current ? parseInt(current) : 0,
    limit: 1000, // Default, should be configurable
    resetTime: new Date(Date.now() + ttl * 1000),
  };
}

export default rateLimiters;
