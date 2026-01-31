"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.standardRateLimiter = exports.authRateLimiter = exports.createRateLimiter = void 0;
// Shared Rate Limiting Middleware
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const redis_1 = require("redis");
// Rate Limiter Factory
const createRateLimiter = (options) => {
    const { windowMs = 60 * 1000, // 1 Minute
    max = 100, // 100 Requests pro Minute
    redisUrl, keyPrefix = 'rate-limit' } = options;
    // Redis Client für Rate Limiting
    const redisClient = (0, redis_1.createClient)({
        url: redisUrl,
        legacyMode: true
    });
    redisClient.connect().catch(console.error);
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        store: new rate_limit_redis_1.default({
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
exports.createRateLimiter = createRateLimiter;
// Strikte Rate Limits für Auth-Endpoints
const authRateLimiter = (redisUrl) => {
    return (0, exports.createRateLimiter)({
        windowMs: 15 * 60 * 1000, // 15 Minuten
        max: 5, // 5 Versuche
        redisUrl,
        keyPrefix: 'rate-limit:auth'
    });
};
exports.authRateLimiter = authRateLimiter;
// Standard Rate Limits
const standardRateLimiter = (redisUrl) => {
    return (0, exports.createRateLimiter)({
        windowMs: 60 * 1000, // 1 Minute
        max: 100, // 100 Requests
        redisUrl,
        keyPrefix: 'rate-limit:standard'
    });
};
exports.standardRateLimiter = standardRateLimiter;
