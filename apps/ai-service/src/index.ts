// /apps/ai-service/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { redis } from './config/redis';
import aiRoutes from './routes/ai.routes';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/health', async (req, res) => {
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  
  res.json({ 
    status: hasOpenAIKey ? 'healthy' : 'degraded',
    service: 'ai-service',
    openai: hasOpenAIKey,
    redis: redis.status === 'ready',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/ai', aiRoutes);

// API Health Check (für externe Checks)
app.get('/api/ai/health', async (req, res) => {
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  res.json({
    status: hasOpenAIKey ? 'healthy' : 'degraded',
    service: 'ai-service',
    openai: hasOpenAIKey,
    timestamp: new Date().toISOString()
  });
});

// Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Request error:', err);
  
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
    code: err.code
  });
});

// Start
async function start() {
  try {
    app.listen(PORT, () => {
      logger.info(`[AI] Service running on port ${PORT}`);
      logger.info(`[AI] OpenAI Key: ${process.env.OPENAI_API_KEY ? '✓' : '✗'}`);
    });
  } catch (error) {
    logger.error('[AI] Failed to start:', error);
    process.exit(1);
  }
}

// Graceful Shutdown
process.on('SIGTERM', async () => {
  logger.info('[AI] SIGTERM received, shutting down gracefully');
  await redis.quit();
  process.exit(0);
});

start();
