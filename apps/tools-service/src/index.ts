import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectMongoDB } from './config/mongodb';
import { connectRedis } from './config/redis';
import calculatorsRoutes from './routes/calculators.routes';
import historyRoutes from './routes/history.routes';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

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
