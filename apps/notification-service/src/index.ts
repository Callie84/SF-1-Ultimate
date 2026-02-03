import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { connectMongoDB } from './config/mongodb';
import { redis } from './config/redis';
import { initWebSocket } from './services/websocket.service';
import notificationsRoutes from './routes/notifications.routes';
import preferencesRoutes from './routes/preferences.routes';
import { emailWorker } from './workers/email.worker';
import { pushWorker } from './workers/push.worker';
import { errorHandler } from './middleware/error-handler';
import { logger } from './utils/logger';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3006;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://seedfinderpro.de',
  credentials: true
}));
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString()
  });
});

// Health endpoint for Traefik routing
app.get('/api/notifications/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/notifications', notificationsRoutes);
app.use('/api/preferences', preferencesRoutes);

// Error Handler
app.use(errorHandler);

// Start
async function start() {
  try {
    await connectMongoDB();
    await redis.connect();
    
    // Init WebSocket
    initWebSocket(httpServer);
    
    // Start workers
    logger.info('[Workers] Email and Push workers started');
    
    httpServer.listen(PORT, () => {
      logger.info(`[Notification] Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('[Notification] Failed to start:', error);
    process.exit(1);
  }
}

start();