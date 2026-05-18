import { logger } from '../utils/logger';

const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://sf1-notification-service:3006';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || '';

interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedUrl?: string;
  relatedId?: string;
  relatedType?: string;
}

/**
 * Benachrichtigung über den Notification-Service erstellen.
 * Fire-and-forget — Fehler werden geloggt, nicht geworfen.
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  if (!INTERNAL_SECRET) {
    logger.warn('[NotificationClient] INTERNAL_SECRET not set, skipping notification');
    return;
  }

  try {
    const body = JSON.stringify(payload);
    await fetch(`${NOTIFICATION_URL}/api/notifications/internal/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_SECRET,
      },
      body,
      signal: AbortSignal.timeout(3000),
    });
  } catch (error: any) {
    // Niemals den Hauptprozess blockieren
    logger.warn(`[NotificationClient] Failed to send notification: ${error?.message}`);
  }
}
