import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (event.request?.headers?.['authorization']) {
      delete event.request.headers['authorization'];
    }
    if (event.request?.cookies) { event.request.cookies = {}; }
    return event;
  },
});

// /apps/search-service/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initializeIndexes, checkHealth } from './config/meilisearch';
import { redis } from './config/redis';
import searchRoutes from './routes/search.routes';
import { logger } from './utils/logger';
import promClient from 'prom-client';
import { globalRateLimit } from './middleware/rate-limit.middleware';
promClient.collectDefaultMetrics({ prefix: 'sf1_' });

const app = express();
const PORT = process.env.PORT || 3007;

// Middleware
app.use(globalRateLimit);

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://seedfinderpro.de',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.get('/health', async (req, res) => {
  const meilisearchHealthy = await checkHealth();

  res.json({
    status: meilisearchHealthy ? 'healthy' : 'degraded',
    service: 'search-service',
    meilisearch: meilisearchHealthy,
    redis: redis.status === 'ready',
    timestamp: new Date().toISOString()
  });
});

// Health endpoint for Traefik routing
app.get('/api/search/health', async (req, res) => {
  const meilisearchHealthy = await checkHealth();

  res.json({
    status: meilisearchHealthy ? 'healthy' : 'degraded',
    service: 'search-service',
    meilisearch: meilisearchHealthy,
    redis: redis.status === 'ready',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/search', searchRoutes);

// Error Handler
  // Sentry error handler (muss vor allen anderen Error-Handlern stehen)
  Sentry.setupExpressErrorHandler(app);
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Request error:', err);
  
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
    code: err.code
  });
});

// Start Server
async function start() {
  try {
    // Initialize Meilisearch Indexes
    await initializeIndexes();
    
    app.listen(PORT, () => {
      logger.info(`[Search] Service running on port ${PORT}`);
      logger.info(`[Search] Meilisearch: ${process.env.MEILISEARCH_HOST || 'http://localhost:7700'}`);
    });
  } catch (error) {
    logger.error('[Search] Failed to start:', error);
    process.exit(1);
  }
}

// Graceful Shutdown
process.on('SIGTERM', async () => {
  logger.info('[Search] SIGTERM received, shutting down gracefully');
  await redis.quit();
  process.exit(0);
});

start();
