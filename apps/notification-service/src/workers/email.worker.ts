import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis';
import { emailService } from '../services/email.service';
import { Notification } from '../models/Notification.model';
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

const emailQueue = new Queue('email', {
  connection
});

const emailWorker = new Worker('email', async (job) => {
  const { notificationId } = job.data;
  
  logger.info(`[EmailWorker] Processing ${notificationId}`);
  
  try {
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      logger.warn(`[EmailWorker] Notification ${notificationId} not found`);
      return;
    }
    
    // Get user email from Auth Service (via HTTP or Redis cache)
    const userEmail = await getUserEmail(notification.userId);
    
    if (!userEmail) {
      logger.warn(`[EmailWorker] No email for user ${notification.userId}`);
      await Notification.updateOne(
        { _id: notificationId },
        { 'deliveryStatus.email': 'failed' }
      );
      return;
    }
    
    await emailService.sendNotification(notificationId, userEmail);
    
    logger.info(`[EmailWorker] Sent ${notificationId} to ${userEmail}`);
    
  } catch (error) {
    logger.error(`[EmailWorker] Failed:`, error);
    
    await Notification.updateOne(
      { _id: notificationId },
      { 'deliveryStatus.email': 'failed' }
    );
    
    throw error; // Retry
  }
}, {
  connection,
  concurrency: 5
});

emailWorker.on('completed', (job) => {
  logger.debug(`[EmailWorker] Job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  logger.error(`[EmailWorker] Job ${job?.id} failed:`, err);
});

/**
 * Get user email (cached)
 */
async function getUserEmail(userId: string): Promise<string | null> {
  // Try cache first
  const cached = await redis.get(`user:email:${userId}`);
  
  if (cached) return cached;
  
  // Fetch from Auth Service
  try {
    const response = await fetch(`http://auth-service:3001/api/auth/users/${userId}/email`, {
      headers: {
        'X-Internal-Secret': process.env.INTERNAL_SECRET || ''
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    // Cache for 1 hour
    await redis.setEx(`user:email:${userId}`, 3600, data.email);
    
    return data.email;
  } catch (error) {
    logger.error(`[EmailWorker] Failed to fetch user email:`, error);
    return null;
  }
}

export { emailQueue, emailWorker };