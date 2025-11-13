// Shared Rate Limiting Middleware
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

// Rate Limiter Factory
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  redisUrl: string;
  keyPrefix?: string;
}) => {
  const {
    windowMs = 60 * 1000, // 1 Minute
    max = 100, // 100 Requests pro Minute
    redisUrl,
    keyPrefix = 'rate-limit'
  } = options;

  // Redis Client für Rate Limiting
  const redisClient = createClient({
    url: redisUrl,
    legacyMode: true
  });

  redisClient.connect().catch(console.error);

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      // @ts-ignore
      client: redisClient,
      prefix: keyPrefix
    }),
    message: {
      error: 'Too many requests',
      message: 'Sie haben zu viele Anfragen gesendet. Bitte versuchen Sie es später erneut.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    skip: (req) => {
      // Skip für Health-Checks
      return req.path === '/health' || req.path === '/ready';
    }
  });
};

// Strikte Rate Limits für Auth-Endpoints
export const authRateLimiter = (redisUrl: string) => {
  return createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 Minuten
    max: 5, // 5 Versuche
    redisUrl,
    keyPrefix: 'rate-limit:auth'
  });
};

// Standard Rate Limits
export const standardRateLimiter = (redisUrl: string) => {
  return createRateLimiter({
    windowMs: 60 * 1000, // 1 Minute
    max: 100, // 100 Requests
    redisUrl,
    keyPrefix: 'rate-limit:standard'
  });
};
