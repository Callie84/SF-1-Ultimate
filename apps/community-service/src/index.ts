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

// /apps/community-service/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectMongoDB } from './config/mongodb';
import { connectRedis } from './config/redis';
import threadsRoutes from './routes/threads.routes';
import repliesRoutes from './routes/replies.routes';
import votesRoutes from './routes/votes.routes';
import moderationRoutes from './routes/moderation.routes';
import categoriesRoutes from './routes/categories.routes';
import strainsRoutes from './routes/strains.routes';
import analyticsRoutes from './routes/analytics.routes';
import messagesRoutes from './routes/messages.routes';
import followsRoutes from './routes/follows.routes';
import adsRoutes from './routes/ads.routes';
import seedbankReviewsRoutes from './routes/seedbank-reviews.routes';
import announcementRoutes from './routes/announcement.routes';
import fontVotesRoutes from './routes/font-votes.routes';
import internalRoutes from './routes/internal.routes';
import { errorHandler } from './utils/errors';
import { logger } from './utils/logger';
import promClient from 'prom-client';
import { globalRateLimit } from './middleware/rate-limit.middleware';
promClient.collectDefaultMetrics({ prefix: 'sf1_' });

const app = express();
const PORT = process.env.PORT || 3005;

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
    service: 'community-service',
    timestamp: new Date().toISOString()
  });
});

// Health endpoint for Traefik routing
app.get('/api/community/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'community-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/community/threads', threadsRoutes);
app.use('/api/community/replies', repliesRoutes);
app.use('/api/community/votes', votesRoutes);
app.use('/api/community/moderation', moderationRoutes);
app.use('/api/community/categories', categoriesRoutes);
app.use('/api/community/strains', strainsRoutes);
app.use('/api/community/analytics', analyticsRoutes);
app.use('/api/community/messages', messagesRoutes);
app.use('/api/community/follows', followsRoutes);
app.use('/api/community/ads', adsRoutes);
app.use('/api/community/seedbank-reviews', seedbankReviewsRoutes);
app.use('/api/community/announcement', announcementRoutes);
app.use('/api/community/font-votes', fontVotesRoutes);
app.use('/api/community/internal', internalRoutes);

// Error Handler
  // Sentry error handler (muss vor allen anderen Error-Handlern stehen)
  Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

// Start
async function start() {
  try {
    await Promise.all([
      connectMongoDB(),
      connectRedis()
    ]);
    
    app.listen(PORT, () => {
      logger.info(`[Community] Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('[Community] Failed to start:', error);
    process.exit(1);
  }
}

start();
