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
import { errorHandler } from './utils/errors';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health Check
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

// Error Handler
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
