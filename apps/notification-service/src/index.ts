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
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { connectMongoDB } from './config/mongodb';
import { redis } from './config/redis';
import { initWebSocket } from './services/websocket.service';
import notificationsRoutes from './routes/notifications.routes';
import preferencesRoutes from './routes/preferences.routes';
import internalRoutes from './routes/internal.routes';
import { emailWorker } from './workers/email.worker';
import { startQueueWorker } from './workers/queue.worker';
import { errorHandler } from './middleware/error-handler';
import { logger } from './utils/logger';
import promClient from 'prom-client';
import { globalRateLimit } from './middleware/rate-limit.middleware';
promClient.collectDefaultMetrics({ prefix: 'sf1_' });

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3006;

// Middleware
app.use(globalRateLimit);

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://seedfinderpro.de',
  credentials: true
}));
app.use(express.json());

// Health Check
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString()
  });
});

// Health endpoint for Traefik routing
app.get('/api/notifications/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/notifications', notificationsRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/notifications/internal', internalRoutes);

// Error Handler
  // Sentry error handler (muss vor allen anderen Error-Handlern stehen)
  Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

// Start
async function start() {
  try {
    await connectMongoDB();
    await redis.connect();
    
    // Init WebSocket
    initWebSocket(httpServer);
    
    // Start workers
    startQueueWorker();
    logger.info('[Workers] Email, Push and Queue workers started');
    
    httpServer.listen(PORT, () => {
      logger.info(`[Notification] Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('[Notification] Failed to start:', error);
    process.exit(1);
  }
}

start();