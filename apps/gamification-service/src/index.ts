// /apps/gamification-service/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectMongoDB } from './config/mongodb';
import { connectRedis } from './config/redis';
import { eventProcessorService } from './services/event-processor.service';
import profileRoutes from './routes/profile.routes';
import analyticsRoutes from './routes/analytics.routes';
import { errorHandler } from './utils/errors';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3009;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health Check
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

// Shortcut routes (für Traefik PathPrefix)
app.use('/api/leaderboard', (req, res) => {
  res.redirect(307, `/api/gamification/profile/leaderboard${req.url === '/' ? '' : req.url}`);
});

app.use('/api/achievements', (req, res) => {
  res.status(200).json({ message: 'Use /api/gamification/profile/:userId for achievements' });
});

// Error Handler
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
