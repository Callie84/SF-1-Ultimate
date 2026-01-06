/**
 * Prometheus Metrics Middleware for Express Services
 *
 * This middleware collects HTTP request metrics and exposes them
 * via a /metrics endpoint for Prometheus scraping.
 *
 * Installation:
 * 1. npm install prom-client
 * 2. Copy this file to your service's middleware directory
 * 3. Import and use in your Express app
 *
 * Usage:
 * import { metricsMiddleware, metricsEndpoint } from './middleware/metrics.middleware';
 * app.use(metricsMiddleware);
 * app.get('/metrics', metricsEndpoint);
 */

import { Request, Response, NextResponse } from 'express';
import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'sf1_',
  labels: { service: process.env.SERVICE_NAME || 'unknown' },
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// ==========================================
// CUSTOM METRICS
// ==========================================

// HTTP Request Counter
const httpRequestsTotal = new client.Counter({
  name: 'sf1_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service'],
  registers: [register],
});

// HTTP Request Duration
const httpRequestDuration = new client.Histogram({
  name: 'sf1_http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// Active Requests Gauge
const activeRequests = new client.Gauge({
  name: 'sf1_http_requests_active',
  help: 'Number of active HTTP requests',
  labelNames: ['service'],
  registers: [register],
});

// Error Counter
const errorsTotal = new client.Counter({
  name: 'sf1_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'route', 'service'],
  registers: [register],
});

// Database Query Duration
export const dbQueryDuration = new client.Histogram({
  name: 'sf1_db_query_duration_seconds',
  help: 'Database query latency in seconds',
  labelNames: ['operation', 'table', 'service'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

// Cache Operations
export const cacheOperations = new client.Counter({
  name: 'sf1_cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'result', 'service'],
  registers: [register],
});

// ==========================================
// MIDDLEWARE
// ==========================================

/**
 * Prometheus Metrics Middleware
 *
 * Automatically tracks HTTP requests and response times
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextResponse) => {
  // Don't track metrics endpoint itself
  if (req.path === '/metrics' || req.path === '/health') {
    return next();
  }

  const serviceName = process.env.SERVICE_NAME || 'unknown';
  const start = Date.now();

  // Increment active requests
  activeRequests.inc({ service: serviceName });

  // Track response
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const route = req.route?.path || req.path || 'unknown';
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
      service: serviceName,
    };

    // Record metrics
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
    activeRequests.dec({ service: serviceName });

    // Track errors (4xx, 5xx)
    if (res.statusCode >= 400) {
      errorsTotal.inc({
        type: res.statusCode >= 500 ? 'server_error' : 'client_error',
        route,
        service: serviceName,
      });
    }
  });

  next();
};

/**
 * Metrics Endpoint
 *
 * Exposes Prometheus metrics at /metrics
 */
export const metricsEndpoint = async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error);
  }
};

/**
 * Helper: Record Database Query
 *
 * Usage:
 * const timer = recordDbQuery('SELECT', 'users');
 * // ... execute query ...
 * timer();
 */
export const recordDbQuery = (operation: string, table: string) => {
  const end = dbQueryDuration.startTimer({
    operation,
    table,
    service: process.env.SERVICE_NAME || 'unknown',
  });
  return end;
};

/**
 * Helper: Record Cache Operation
 *
 * Usage:
 * recordCacheOperation('get', 'hit');
 * recordCacheOperation('set', 'success');
 */
export const recordCacheOperation = (operation: 'get' | 'set' | 'del', result: 'hit' | 'miss' | 'success' | 'error') => {
  cacheOperations.inc({
    operation,
    result,
    service: process.env.SERVICE_NAME || 'unknown',
  });
};

// Export registry for custom metrics
export { register };
export default { metricsMiddleware, metricsEndpoint, recordDbQuery, recordCacheOperation };
