import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { connectMongoDB } from './config/mongodb';
import { connectRedis } from './config/redis';
import growsRoutes from './routes/grows.routes';
import entriesRoutes from './routes/entries.routes';
import photosRoutes from './routes/photos.routes';
import socialRoutes from './routes/social.routes';
import feedRoutes from './routes/feed.routes';
import analyticsRoutes from './routes/analytics.routes';
import remindersRoutes from './routes/reminders.routes';
import { startReminderWorker } from './workers/reminder.worker';
import { logger } from './utils/logger';
import promClient from 'prom-client';
promClient.collectDefaultMetrics({ prefix: 'sf1_' });

const UPLOADS_DIR = '/app/uploads';
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://seedfinderpro.de',
  credentials: true
}));

// Serve uploaded photos as static files
app.use('/api/journal/uploads', express.static(UPLOADS_DIR));

app.use(express.json({ limit: '1mb' }));

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'journal-service',
    timestamp: new Date().toISOString()
  });
});

// Health endpoint for Traefik routing
app.get('/api/journal/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'journal-service',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/journal/grows', growsRoutes);
app.use('/api/journal/grows', entriesRoutes);
app.use('/api/journal/entries', photosRoutes);
app.use('/api/journal/grows', socialRoutes);
app.use('/api/journal/feed', feedRoutes);
app.use('/api/journal/analytics', analyticsRoutes);
app.use('/api/journal/reminders', remindersRoutes);

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
      logger.info(`[Journal] Service running on port ${PORT}`);
    });

    // Start background workers
    startReminderWorker();
  } catch (error) {
    logger.error('[Journal] Failed to start:', error);
    process.exit(1);
  }
}

start();
