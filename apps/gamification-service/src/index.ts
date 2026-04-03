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

// /apps/gamification-service/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectMongoDB } from './config/mongodb';
import { connectRedis } from './config/redis';
import { eventProcessorService } from './services/event-processor.service';
import profileRoutes from './routes/profile.routes';
import analyticsRoutes from './routes/analytics.routes';
import adminRoutes from './routes/admin.routes';
import internalRoutes from './routes/internal.routes';
import { errorHandler } from './utils/errors';
import { logger } from './utils/logger';
import promClient from 'prom-client';
import { globalRateLimit } from './middleware/rate-limit.middleware';
promClient.collectDefaultMetrics({ prefix: 'sf1_' });

const app = express();
const PORT = process.env.PORT || 3009;

// Middleware
app.use(globalRateLimit);

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://seedfinderpro.de',
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// Health Check
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'gamification-service',
    timestamp: new Date().toISOString()
  });
});

// Health endpoint for Traefik routing
app.get('/api/gamification/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'gamification-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/gamification/profile', profileRoutes);
app.use('/api/gamification/analytics', analyticsRoutes);
app.use('/api/gamification/admin', adminRoutes);
app.use('/api/gamification/internal', internalRoutes);

// Shortcut routes (für Traefik PathPrefix)
app.use('/api/leaderboard', (req, res) => {
  res.redirect(307, `/api/gamification/profile/leaderboard${req.url === '/' ? '' : req.url}`);
});

app.use('/api/achievements', (req, res) => {
  res.status(200).json({ message: 'Use /api/gamification/profile/:userId for achievements' });
});

// Error Handler
  // Sentry error handler (muss vor allen anderen Error-Handlern stehen)
  Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

// Start
async function start() {
  try {
    // Connections
    await Promise.all([
      connectMongoDB(),
      connectRedis()
    ]);
    
    // Server starten
    app.listen(PORT, () => {
      logger.info(`[Gamification] Service running on port ${PORT}`);
    });
    
    // Worker starten (Event-Processing)
    if (process.env.WORKER_ENABLED !== 'false') {
      eventProcessorService.processQueue().catch(err => {
        logger.error('[Gamification] Worker crashed:', err);
        process.exit(1);
      });
    }
    
  } catch (error) {
    logger.error('[Gamification] Failed to start:', error);
    process.exit(1);
  }
}

// Graceful Shutdown
process.on('SIGTERM', async () => {
  logger.info('[Gamification] SIGTERM received, shutting down');
  process.exit(0);
});

start();
