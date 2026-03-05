/**
 * Queue Worker - Verarbeitet Nachrichten aus queue:notifications + queue:email (Redis-Listen)
 */
import { redis } from '../config/redis';
import { notificationService } from '../services/notification.service';
import { emailService } from '../services/email.service';
import { logger } from '../utils/logger';

let running = false;

const QUEUE_KEY = 'queue:notifications';
const EMAIL_QUEUE_KEY = 'queue:email';
const POLL_INTERVAL_MS = 5000; // 5 Sekunden

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://sf1-auth-service:3001';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || '';

async function getUserEmail(userId: string): Promise<string | null> {
  const cached = await redis.get(`user:email:${userId}`);
  if (cached) return cached;
  try {
    const res = await fetch(`${AUTH_SERVICE_URL}/api/auth/internal/user/${userId}`, {
      headers: { 'X-Internal-Secret': INTERNAL_SECRET },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    if (data.email) await redis.setEx(`user:email:${userId}`, 3600, data.email);
    return data.email || null;
  } catch {
    return null;
  }
}

async function processEmailQueue(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    const raw = await redis.rPop(EMAIL_QUEUE_KEY);
    if (!raw) break;
    let item: { notificationId: string };
    try { item = JSON.parse(raw); } catch { continue; }

    try {
      // Get notification to find userId
      const { Notification } = await import('../models/Notification.model');
      const notification = await Notification.findById(item.notificationId);
      if (!notification) continue;

      const userEmail = await getUserEmail(notification.userId);
      if (!userEmail) {
        logger.warn(`[QueueWorker] No email for user ${notification.userId}`);
        continue;
      }

      await emailService.sendNotification(item.notificationId, userEmail);
      logger.info(`[QueueWorker] Email sent for notification ${item.notificationId}`);
    } catch (err) {
      logger.error('[QueueWorker] Email processing error:', err);
    }
  }
}

interface QueueMessage {
  type: string;
  userId: string;
  data: Record<string, any>;
}

async function processMessage(raw: string): Promise<void> {
  let msg: QueueMessage;
  try {
    msg = JSON.parse(raw);
  } catch {
    logger.warn('[QueueWorker] Invalid JSON in queue:', raw);
    return;
  }

  logger.info(`[QueueWorker] Processing message type=${msg.type} userId=${msg.userId}`);

  try {
    if (msg.type === 'price_alert') {
      const { seedSlug, targetPrice, currentPrice, seedbank, url, reason } = msg.data;

      const reasonText = reason === 'discount'
        ? 'Preissenkung bei'
        : `Zielpreis erreicht für`;

      const title = `🌿 ${reasonText} ${seedSlug}`;
      const message = reason === 'discount'
        ? `${seedbank} hat den Preis gesenkt — aktuell ${currentPrice?.toFixed(2)}€`
        : `${seedbank} bietet ${seedSlug} für ${currentPrice?.toFixed(2)}€ an (Ziel: ${targetPrice?.toFixed(2)}€)`;

      await notificationService.create({
        userId: msg.userId,
        type: 'price_alert',
        title,
        message,
        relatedUrl: url,
        data: msg.data,
      });

    } else {
      logger.warn(`[QueueWorker] Unknown message type: ${msg.type}`);
    }
  } catch (error) {
    logger.error('[QueueWorker] Failed to process message:', error);
  }
}

async function poll(): Promise<void> {
  try {
    for (let i = 0; i < 10; i++) {
      const raw = await redis.rPop(QUEUE_KEY);
      if (!raw) break;
      await processMessage(raw);
    }
  } catch (error) {
    logger.error('[QueueWorker] Poll error:', error);
  }

  try {
    await processEmailQueue();
  } catch (error) {
    logger.error('[QueueWorker] Email poll error:', error);
  }
}

export function startQueueWorker(): void {
  if (running) return;
  running = true;

  logger.info(`[QueueWorker] Started — polling "${QUEUE_KEY}" every ${POLL_INTERVAL_MS / 1000}s`);

  const loop = async () => {
    if (!running) return;
    await poll();
    setTimeout(loop, POLL_INTERVAL_MS);
  };

  loop();
}

export function stopQueueWorker(): void {
  running = false;
  logger.info('[QueueWorker] Stopped');
}
