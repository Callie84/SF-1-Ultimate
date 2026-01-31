"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCacheKey = exports.CacheManager = void 0;
// Redis Caching Utilities
const redis_1 = require("redis");
const logger_1 = require("./logger");
const monitoring_1 = require("./monitoring");
const logger = (0, logger_1.createLogger)('cache');
class CacheManager {
    client = null;
    serviceName;
    constructor(serviceName) {
        this.serviceName = serviceName;
    }
    async connect(redisUrl) {
        try {
            this.client = (0, redis_1.createClient)({ url: redisUrl });
            this.client.on('error', (err) => {
                logger.error('Redis Client Error', { error: err });
            });
            this.client.on('connect', () => {
                logger.info('Redis Cache connected');
            });
            await this.client.connect();
        }
        catch (error) {
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
    async get(key) {
        if (!this.client)
            return null;
        try {
            const value = await this.client.get(key);
            // Track Metrics
            monitoring_1.cacheHitRate.inc({
                service: this.serviceName,
                operation: 'get',
                result: value ? 'hit' : 'miss'
            });
            if (!value)
                return null;
            return JSON.parse(value);
        }
        catch (error) {
            logger.error('Cache GET error', { key, error });
            return null;
        }
    }
    // Set mit TTL
    async set(key, value, ttlSeconds = 3600) {
        if (!this.client)
            return false;
        try {
            await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
            // Track Metrics
            monitoring_1.cacheHitRate.inc({
                service: this.serviceName,
                operation: 'set',
                result: 'success'
            });
            return true;
        }
        catch (error) {
            logger.error('Cache SET error', { key, error });
            return false;
        }
    }
    // Delete
    async delete(key) {
        if (!this.client)
            return false;
        try {
            await this.client.del(key);
            // Track Metrics
            monitoring_1.cacheHitRate.inc({
                service: this.serviceName,
                operation: 'delete',
                result: 'success'
            });
            return true;
        }
        catch (error) {
            logger.error('Cache DELETE error', { key, error });
            return false;
        }
    }
    // Delete by Pattern
    async deletePattern(pattern) {
        if (!this.client)
            return 0;
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length === 0)
                return 0;
            await this.client.del(keys);
            return keys.length;
        }
        catch (error) {
            logger.error('Cache DELETE PATTERN error', { pattern, error });
            return 0;
        }
    }
    // Cache Wrapper für Functions
    async wrap(key, fn, ttlSeconds = 3600) {
        // Try Cache first
        const cached = await this.get(key);
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
exports.CacheManager = CacheManager;
// Cache Key Builder Helpers
const buildCacheKey = (prefix, ...parts) => {
    return `${prefix}:${parts.join(':')}`;
};
exports.buildCacheKey = buildCacheKey;
