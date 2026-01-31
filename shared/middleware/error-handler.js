"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.AppError = void 0;
const zod_1 = require("zod");
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)('error-handler');
// Custom Error Classes
class AppError extends Error {
    statusCode;
    message;
    isOperational;
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message) {
        super(400, message);
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(404, message);
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(401, message);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(403, message);
    }
}
exports.ForbiddenError = ForbiddenError;
// Global Error Handler Middleware
const errorHandler = (err, req, res, next) => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let errors = undefined;
    // Zod Validation Error
    if (err instanceof zod_1.ZodError) {
        statusCode = 400;
        message = 'Validation Error';
        errors = err.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
        }));
    }
    // Custom App Error
    else if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    }
    // Unknown Error
    else {
        message = err.message || 'Internal Server Error';
    }
    // Log Error (mit Sensitive Data Masking)
    logger.error('Error occurred', {
        error: message,
        statusCode,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: (0, logger_1.maskSensitiveData)(req.body),
        query: req.query
    });
    // Send Response
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(errors && { errors }),
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};
exports.errorHandler = errorHandler;
// Async Error Wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// 404 Handler
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.path
    });
};
exports.notFoundHandler = notFoundHandler;
