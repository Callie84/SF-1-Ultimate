// Auth Service - Main Entry
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import analyticsRoutes from './routes/analytics.routes';
import adminRoutes from './routes/admin.routes';
import promClient from 'prom-client';
promClient.collectDefaultMetrics({ prefix: 'sf1_' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://seedfinderpro.de',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Health Check
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

// Static files (avatars)
app.use('/api/auth/uploads', express.static('/app/uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/analytics', analyticsRoutes);
app.use('/api/auth/admin', adminRoutes);

// JSON Parse Error Handler (body-parser errors → proper JSON response instead of HTML)
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Ungültiges JSON-Format. Bitte prüfe deine Eingaben und versuche es erneut.',
      code: 'INVALID_JSON'
    });
  }
  next(err);
});

// Start
async function start() {
  try {
    await connectDatabase();
    await connectRedis();
    
    app.listen(PORT, () => {
      logger.info(`[Auth] Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('[Auth] Failed to start:', error);
    process.exit(1);
  }
}

start();
