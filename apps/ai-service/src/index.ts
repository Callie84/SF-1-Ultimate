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

// /apps/ai-service/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { redis } from './config/redis';
import aiRoutes from './routes/ai.routes';
import adminRoutes from './routes/admin.routes';
import { logger } from './utils/logger';
import promClient from 'prom-client';
import { globalRateLimit } from './middleware/rate-limit.middleware';
promClient.collectDefaultMetrics({ prefix: 'sf1_' });

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(globalRateLimit);

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://seedfinderpro.de',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

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
app.use('/api/ai/admin', adminRoutes);

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
  // Sentry error handler (muss vor allen anderen Error-Handlern stehen)
  Sentry.setupExpressErrorHandler(app);
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Request error:', err);
  
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
    code: err.code
  });
});

// Start
async function start() {
  if (!process.env.JWT_SECRET) {
    logger.error('[AI] FATAL: JWT_SECRET environment variable is not set');
    process.exit(1);
  }

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
