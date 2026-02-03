// /apps/search-service/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initializeIndexes, checkHealth } from './config/meilisearch';
import { redis } from './config/redis';
import searchRoutes from './routes/search.routes';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3007;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
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
