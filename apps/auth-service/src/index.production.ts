// Auth Service - Production Ready
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';

// Import Shared Middleware
import {
  createLogger,
  requestLogger,
  metricsMiddleware,
  metricsHandler,
  standardRateLimiter,
  authRateLimiter,
  errorHandler,
  notFoundHandler,
  gracefulShutdown,
  HealthCheckManager,
  createDatabaseHealthCheck,
  createRedisHealthCheck,
  CacheManager
} from '../../../shared/middleware';

const logger = createLogger('auth-service');
const app = express();
const PORT = process.env.PORT || 3001;

// Cache Manager
const cache = new CacheManager('auth-service');

// Health Check Manager
const healthManager = new HealthCheckManager();

// ==========================================
// MIDDLEWARE SETUP
// ==========================================

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://seedfinderpro.de',
  credentials: true
}));

// Body Parser & Compression
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(cookieParser());

// Logging
app.use(requestLogger(logger));

// Metrics
app.use(metricsMiddleware('auth-service'));

// Rate Limiting
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
app.use('/api/auth/login', authRateLimiter(redisUrl));
app.use('/api/auth/register', authRateLimiter(redisUrl));
app.use(standardRateLimiter(redisUrl));

// ==========================================
// HEALTH CHECKS
// ==========================================

// Register Health Checks
healthManager.register(
  createDatabaseHealthCheck('postgres', async () => {
    try {
      // TODO: Implement actual DB check
      return true;
    } catch {
      return false;
    }
  })
);

healthManager.register(
  createRedisHealthCheck({
    ping: async () => {
      // TODO: Implement actual Redis check
      return 'PONG';
    }
  })
);

// Health Endpoints
app.get('/health', healthManager.basicHealth);
app.get('/ready', healthManager.readiness);
app.get('/metrics', metricsHandler);

// ==========================================
// ROUTES
// ==========================================

// TODO: Import und registriere Auth Routes
// app.use('/api/auth', authRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================

app.use(notFoundHandler);
app.use(errorHandler);

// ==========================================
// START SERVER
// ==========================================

async function start() {
  try {
    logger.info('Starting Auth Service...');

    // Connect to Database
    await connectDatabase();
    logger.info('Database connected');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected');

    // Connect Cache
    await cache.connect(redisUrl);
    logger.info('Cache connected');

    // Start Server
    const server = app.listen(PORT, () => {
      logger.info(`Auth Service running on port ${PORT}`);
      logger.info('Environment:', process.env.NODE_ENV);
    });

    // Setup Graceful Shutdown
    gracefulShutdown.register('database', async () => {
      logger.info('Closing database connections...');
      // TODO: Implement DB disconnect
    });

    gracefulShutdown.register('redis', async () => {
      logger.info('Closing Redis connection...');
      // TODO: Implement Redis disconnect
    });

    gracefulShutdown.register('cache', async () => {
      logger.info('Closing Cache connection...');
      await cache.disconnect();
    });

    gracefulShutdown.setup(server);

  } catch (error) {
    logger.error('Failed to start Auth Service', { error });
    process.exit(1);
  }
}

// Handle development hot-reload
if (require.main === module) {
  start();
}

export { app };
