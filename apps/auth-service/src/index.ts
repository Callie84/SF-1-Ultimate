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
import billingRoutes from './routes/billing.routes';
import promClient from 'prom-client';
import { globalRateLimit } from './middleware/rate-limit.middleware';
import { cleanupExpiredTokens } from './services/token.service';
promClient.collectDefaultMetrics({ prefix: 'sf1_' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(globalRateLimit);

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://seedfinderpro.de',
  credentials: true
}));
// Stripe Webhook braucht raw body — MUSS vor express.json() stehen
app.use('/api/auth/billing/webhook', express.raw({ type: 'application/json' }));
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
app.use('/api/auth/billing', billingRoutes);

// JSON Parse Error Handler (body-parser errors → proper JSON response instead of HTML)
  // Sentry error handler (muss vor allen anderen Error-Handlern stehen)
  Sentry.setupExpressErrorHandler(app);
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

    // Abgelaufene Refresh-Tokens täglich um 03:00 bereinigen
    const scheduleTokenCleanup = () => {
      const now = new Date();
      const next3am = new Date(now);
      next3am.setHours(3, 0, 0, 0);
      if (next3am <= now) next3am.setDate(next3am.getDate() + 1);
      const msUntil3am = next3am.getTime() - now.getTime();
      setTimeout(async () => {
        const count = await cleanupExpiredTokens();
        logger.info(`[Auth] Token-Cleanup: ${count} abgelaufene Tokens entfernt`);
        setInterval(async () => {
          const c = await cleanupExpiredTokens();
          logger.info(`[Auth] Token-Cleanup: ${c} abgelaufene Tokens entfernt`);
        }, 24 * 60 * 60 * 1000);
      }, msUntil3am);
    };
    scheduleTokenCleanup();

  } catch (error) {
    logger.error('[Auth] Failed to start:', error);
    process.exit(1);
  }
}

start();
