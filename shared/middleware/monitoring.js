"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsHandler = exports.metricsMiddleware = exports.cacheHitRate = exports.errorRate = exports.activeConnections = exports.httpRequestTotal = exports.httpRequestDuration = exports.register = void 0;
const prom_client_1 = __importDefault(require("prom-client"));
// Prometheus Metrics Registry
exports.register = new prom_client_1.default.Registry();
// Default Metrics (CPU, Memory, etc.)
prom_client_1.default.collectDefaultMetrics({ register: exports.register });
// Custom Metrics
exports.httpRequestDuration = new prom_client_1.default.Histogram({
    name: 'sf1_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code', 'service'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});
exports.httpRequestTotal = new prom_client_1.default.Counter({
    name: 'sf1_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'service']
});
exports.activeConnections = new prom_client_1.default.Gauge({
    name: 'sf1_active_connections',
    help: 'Number of active connections',
    labelNames: ['service']
});
exports.errorRate = new prom_client_1.default.Counter({
    name: 'sf1_errors_total',
    help: 'Total number of errors',
    labelNames: ['service', 'type', 'endpoint']
});
exports.cacheHitRate = new prom_client_1.default.Counter({
    name: 'sf1_cache_operations_total',
    help: 'Total number of cache operations',
    labelNames: ['service', 'operation', 'result']
});
// Register alle Metrics
exports.register.registerMetric(exports.httpRequestDuration);
exports.register.registerMetric(exports.httpRequestTotal);
exports.register.registerMetric(exports.activeConnections);
exports.register.registerMetric(exports.errorRate);
exports.register.registerMetric(exports.cacheHitRate);
// Middleware für Request Tracking
const metricsMiddleware = (serviceName) => {
    return (req, res, next) => {
        const start = Date.now();
        // Increment active connections
        exports.activeConnections.inc({ service: serviceName });
        // Response Handler
        res.on('finish', () => {
            const duration = (Date.now() - start) / 1000;
            const route = req.route?.path || req.path;
            // Record metrics
            exports.httpRequestDuration.observe({
                method: req.method,
                route,
                status_code: res.statusCode,
                service: serviceName
            }, duration);
            exports.httpRequestTotal.inc({
                method: req.method,
                route,
                status_code: res.statusCode,
                service: serviceName
            });
            // Track errors (4xx, 5xx)
            if (res.statusCode >= 400) {
                exports.errorRate.inc({
                    service: serviceName,
                    type: res.statusCode >= 500 ? 'server_error' : 'client_error',
                    endpoint: route
                });
            }
            // Decrement active connections
            exports.activeConnections.dec({ service: serviceName });
        });
        next();
    };
};
exports.metricsMiddleware = metricsMiddleware;
// Metrics Endpoint Handler
const metricsHandler = async (req, res) => {
    res.set('Content-Type', exports.register.contentType);
    res.end(await exports.register.metrics());
};
exports.metricsHandler = metricsHandler;
