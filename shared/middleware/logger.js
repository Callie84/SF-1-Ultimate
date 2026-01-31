"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = exports.maskSensitiveData = exports.createLogger = void 0;
// Shared Structured Logging mit Winston
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
// Custom Log Format
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
// Console Format (nur für Development)
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `[${timestamp}] [${service}] ${level}: ${message} ${metaStr}`;
}));
// Erstelle Logger Factory
const createLogger = (serviceName) => {
    const logger = winston_1.default.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: logFormat,
        defaultMeta: { service: serviceName },
        transports: [
            // File Transport - Errors
            new winston_1.default.transports.File({
                filename: path_1.default.join(process.cwd(), 'logs', 'error.log'),
                level: 'error',
                maxsize: 100 * 1024 * 1024, // 100MB
                maxFiles: 7, // 7 Tage Retention
                tailable: true
            }),
            // File Transport - Combined
            new winston_1.default.transports.File({
                filename: path_1.default.join(process.cwd(), 'logs', 'combined.log'),
                maxsize: 100 * 1024 * 1024, // 100MB
                maxFiles: 7,
                tailable: true
            })
        ]
    });
    // Console Transport für Development
    if (process.env.NODE_ENV !== 'production') {
        logger.add(new winston_1.default.transports.Console({
            format: consoleFormat
        }));
    }
    return logger;
};
exports.createLogger = createLogger;
// Helper für Sensitive Data Masking
const maskSensitiveData = (data) => {
    if (typeof data !== 'object' || data === null) {
        return data;
    }
    const sensitiveFields = [
        'password',
        'token',
        'secret',
        'api_key',
        'apiKey',
        'accessToken',
        'refreshToken',
        'authorization'
    ];
    const masked = { ...data };
    for (const key in masked) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
            masked[key] = '***MASKED***';
        }
        else if (typeof masked[key] === 'object') {
            masked[key] = (0, exports.maskSensitiveData)(masked[key]);
        }
    }
    return masked;
};
exports.maskSensitiveData = maskSensitiveData;
// Express Middleware für Request Logging
const requestLogger = (logger) => {
    return (req, res, next) => {
        const start = Date.now();
        // Log Request
        logger.info('HTTP Request', {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
        // Response Handler
        res.on('finish', () => {
            const duration = Date.now() - start;
            logger.info('HTTP Response', {
                method: req.method,
                url: req.url,
                status: res.statusCode,
                duration: `${duration}ms`
            });
        });
        next();
    };
};
exports.requestLogger = requestLogger;
