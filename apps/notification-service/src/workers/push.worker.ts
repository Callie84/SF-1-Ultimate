import { Queue, Worker } from 'bullmq';
import { pushService } from '../services/push.service';
import { logger } from '../utils/logger';

// BullMQ braucht eine eigene Verbindungs-Beschreibung (Host/Port/Passwort),
// nicht den fertigen node-redis-Client (der ist mit BullMQ nicht kompatibel).
function getBullMQConnection() {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port || '6379'),
        password: url.password || undefined,
      };
    } catch {
      // fallback
    }
  }
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  };
}

const connection = getBullMQConnection();

const pushQueue = new Queue('push', {
  connection
});

const pushWorker = new Worker('push', async (job) => {
  const { notificationId } = job.data;
  
  logger.info(`[PushWorker] Processing ${notificationId}`);
  
  try {
    await pushService.send(notificationId);
    
    logger.info(`[PushWorker] Sent ${notificationId}`);
    
  } catch (error) {
    logger.error(`[PushWorker] Failed:`, error);
    throw error; // Retry
  }
}, {
  connection,
  concurrency: 10
});

pushWorker.on('completed', (job) => {
  logger.debug(`[PushWorker] Job ${job.id} completed`);
});

pushWorker.on('failed', (job, err) => {
  logger.error(`[PushWorker] Job ${job?.id} failed:`, err);
});

export { pushQueue, pushWorker };