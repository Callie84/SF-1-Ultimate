// Price Service - Server Entry Point
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { connectMongoDB, disconnectMongoDB } from './config/mongodb';
import { connectRedis, disconnectRedis } from './config/redis';
import { websocketService } from './services/websocket.service';
import { alertService } from './services/alert.service';
import { priceService } from './services/price.service';
import { scheduleAllSeedbanks, getQueueStats } from './workers/scraper.worker';
import pricesRoutes from './routes/prices.routes';
import alertsRoutes from './routes/alerts.routes';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'price-service',
    timestamp: new Date().toISOString(),
    websocket: {
      connections: websocketService.getConnectionsCount(),
      subscribedSeeds: websocketService.getSubscribedSeedsCount()
    }
  });
});

// Queue stats endpoint
app.get('/queue/stats', async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get queue stats' });
  }
});

// Manual scrape trigger (admin only - would need auth)
app.post('/admin/scrape/:seedbank', async (req, res) => {
  try {
    const { seedbank } = req.params;

    const { scheduleScrapeJob } = await import('./workers/scraper.worker');
    await scheduleScrapeJob(seedbank);
    
    res.json({ success: true, message: `Scrape job scheduled for ${seedbank}` });
  } catch (error) {
    logger.error('[Admin] Failed to schedule scrape:', error);
    res.status(500).json({ error: 'Failed to schedule scrape job' });
  }
});

// Routes
app.use('/api/prices', pricesRoutes);
app.use('/api/alerts', alertsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('[Server] Error:', err);
  
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize WebSocket
websocketService.initialize(httpServer);

/**
 * Start server
 */
async function start() {
  try {
    logger.info('[Server] Starting Price Service...');
    
    // Connect databases
    await Promise.all([
      connectMongoDB(),
      connectRedis()
    ]);
    
    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`[Server] Price Service running on port ${PORT}`);
      logger.info(`[Server] WebSocket ready at ws://localhost:${PORT}`);
    });
    
    // Schedule daily scraping (run at 02:00)
    const now = new Date();
    const scheduledTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      2, 0, 0 // 02:00 next day
    );
    
    const msUntilScheduled = scheduledTime.getTime() - now.getTime();
    
    setTimeout(() => {
      scheduleAllSeedbanks();
      
      // Then repeat every 24 hours
      setInterval(() => {
        scheduleAllSeedbanks();
      }, 24 * 60 * 60 * 1000);
      
    }, msUntilScheduled);
    
    logger.info(`[Server] Daily scraping scheduled for ${scheduledTime.toISOString()}`);
    
    // Check alerts every hour
    setInterval(async () => {
      try {
        await alertService.checkAlerts();
      } catch (error) {
        logger.error('[Server] Alert check failed:', error);
      }
    }, 60 * 60 * 1000);
    
    logger.info('[Server] Alert checker running (every hour)');
    
    // Clean expired prices every 6 hours
    setInterval(async () => {
      try {
        await priceService.cleanExpiredPrices();
      } catch (error) {
        logger.error('[Server] Price cleanup failed:', error);
      }
    }, 6 * 60 * 60 * 1000);
    
    logger.info('[Server] Price cleanup running (every 6 hours)');
    
  } catch (error) {
    logger.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

/**
 * Shutdown
 */
async function shutdown() {
  logger.info('[Server] Shutting down...');
  
  httpServer.close(() => {
    logger.info('[Server] HTTP server closed');
  });
  
  await Promise.all([
    disconnectMongoDB(),
    disconnectRedis()
  ]);
  
  logger.info('[Server] Shutdown complete');
  process.exit(0);
}

// Handle signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('[Server] Unhandled Rejection:', reason);
});

// Start
start();
