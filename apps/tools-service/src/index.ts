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

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectMongoDB } from './config/mongodb';
import { connectRedis } from './config/redis';
import calculatorsRoutes from './routes/calculators.routes';
import historyRoutes from './routes/history.routes';
import sentryWebhookRoutes from './routes/sentry-webhook.routes';
import { logger } from './utils/logger';
import promClient from 'prom-client';
import { globalRateLimit } from './middleware/rate-limit.middleware';
promClient.collectDefaultMetrics({ prefix: 'sf1_' });

const app = express();
const PORT = process.env.PORT || 3004;

app.use(globalRateLimit);

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://seedfinderpro.de',
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'tools-service',
    timestamp: new Date().toISOString()
  });
});

// Health endpoint for Traefik routing
app.get('/api/tools/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'tools-service',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/tools', calculatorsRoutes);
app.use('/api/tools', historyRoutes);
app.use('/api/tools', sentryWebhookRoutes);

  // Sentry error handler (muss vor allen anderen Error-Handlern stehen)
  Sentry.setupExpressErrorHandler(app);
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error'
  });
});

async function start() {
  try {
    await Promise.all([
      connectMongoDB(),
      connectRedis()
    ]);
    
    app.listen(PORT, () => {
      logger.info(`[Tools] Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('[Tools] Failed to start:', error);
    process.exit(1);
  }
}

start();
