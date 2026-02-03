import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectMongoDB } from './config/mongodb';
import { connectRedis } from './config/redis';
import growsRoutes from './routes/grows.routes';
import entriesRoutes from './routes/entries.routes';
import photosRoutes from './routes/photos.routes';
import socialRoutes from './routes/social.routes';
import feedRoutes from './routes/feed.routes';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

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
  } catch (error) {
    logger.error('[Journal] Failed to start:', error);
    process.exit(1);
  }
}

start();
