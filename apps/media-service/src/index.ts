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

// /apps/media-service/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectMongoDB } from './config/mongodb';
import { connectRedis } from './config/redis';
import { virusScanService } from './services/virus-scan.service';
import uploadRoutes from './routes/upload.routes';
import filesRoutes from './routes/files.routes';
import quotaRoutes from './routes/quota.routes';
import { errorHandler } from './utils/errors';
import { logger } from './utils/logger';
import promClient from 'prom-client';
import { globalRateLimit } from './middleware/rate-limit.middleware';
promClient.collectDefaultMetrics({ prefix: 'sf1_' });

const app = express();
const PORT = process.env.PORT || 3008;

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
    service: 'media-service',
    timestamp: new Date().toISOString()
  });
});

// Health endpoint for Traefik routing
app.get('/api/media/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'media-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/media', uploadRoutes);
app.use('/api/media/files', filesRoutes);
app.use('/api/media/quota', quotaRoutes);

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
    
    // ClamAV initialisieren (optional)
    await virusScanService.init().catch(err => {
      logger.warn('[VirusScan] Not available:', err.message);
    });
    
    // Server starten
    app.listen(PORT, () => {
      logger.info(`[Media] Service running on port ${PORT}`);
    });
    
  } catch (error) {
    logger.error('[Media] Failed to start:', error);
    process.exit(1);
  }
}

// Graceful Shutdown
process.on('SIGTERM', async () => {
  logger.info('[Media] SIGTERM received, shutting down gracefully');
  process.exit(0);
});

start();
