// Shared Monitoring Middleware
import { Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';

// Prometheus Metrics Registry
export const register = new promClient.Registry();

// Default Metrics (CPU, Memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom Metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'sf1_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

export const httpRequestTotal = new promClient.Counter({
  name: 'sf1_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service']
});

export const activeConnections = new promClient.Gauge({
  name: 'sf1_active_connections',
  help: 'Number of active connections',
  labelNames: ['service']
});

export const errorRate = new promClient.Counter({
  name: 'sf1_errors_total',
  help: 'Total number of errors',
  labelNames: ['service', 'type', 'endpoint']
});

export const cacheHitRate = new promClient.Counter({
  name: 'sf1_cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['service', 'operation', 'result']
});

// Register alle Metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnections);
register.registerMetric(errorRate);
register.registerMetric(cacheHitRate);

// Middleware für Request Tracking
export const metricsMiddleware = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Increment active connections
    activeConnections.inc({ service: serviceName });

    // Response Handler
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.path;

      // Record metrics
      httpRequestDuration.observe(
        {
          method: req.method,
          route,
          status_code: res.statusCode,
          service: serviceName
        },
        duration
      );

      httpRequestTotal.inc({
        method: req.method,
        route,
        status_code: res.statusCode,
        service: serviceName
      });

      // Track errors (4xx, 5xx)
      if (res.statusCode >= 400) {
        errorRate.inc({
          service: serviceName,
          type: res.statusCode >= 500 ? 'server_error' : 'client_error',
          endpoint: route
        });
      }

      // Decrement active connections
      activeConnections.dec({ service: serviceName });
    });

    next();
  };
};

// Metrics Endpoint Handler
export const metricsHandler = async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};
