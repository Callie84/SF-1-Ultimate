import webpush from 'web-push';
import { Notification } from '../models/Notification.model';
import { Device } from '../models/Device.model';
import { logger } from '../utils/logger';

// VAPID Keys konfigurieren
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:noreply@seedfinderpro.de';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  logger.info('[Push] VAPID Web Push initialized');
} else {
  logger.warn('[Push] VAPID keys not found - push notifications disabled');
}

export class PushService {
  private get vapidReady(): boolean {
    return !!(vapidPublicKey && vapidPrivateKey);
  }

  /**
   * Send Web Push notification
   */
  async send(notificationId: string): Promise<void> {
    if (!this.vapidReady) {
      logger.warn('[Push] VAPID not configured');
      return;
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      logger.warn(`[Push] Notification ${notificationId} not found`);
      return;
    }

    // Web Push Subscriptions des Users laden
    const devices = await Device.find({
      userId: notification.userId,
      platform: 'web',
      isActive: true,
      'webPushSubscription.endpoint': { $exists: true },
    });

    if (devices.length === 0) {
      logger.debug(`[Push] No web push subscriptions for user ${notification.userId}`);
      await Notification.updateOne(
        { _id: notificationId },
        { 'deliveryStatus.push': 'sent' }
      );
      return;
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.message,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: notification.type,
      data: {
        url: notification.relatedUrl
          ? `https://seedfinderpro.de${notification.relatedUrl}`
          : 'https://seedfinderpro.de/notifications',
        type: notification.type,
        notificationId: notification._id.toString(),
      },
    });

    const failedTokens: string[] = [];
    let successCount = 0;

    await Promise.allSettled(
      devices.map(async (device) => {
        if (!device.webPushSubscription) return;

        try {
          await webpush.sendNotification(
            {
              endpoint: device.webPushSubscription.endpoint,
              keys: {
                p256dh: device.webPushSubscription.keys.p256dh,
                auth: device.webPushSubscription.keys.auth,
              },
            },
            payload,
            { TTL: 3600 }
          );
          successCount++;
        } catch (err: any) {
          // 410 Gone / 404 Not Found → Subscription abgelaufen
          if (err.statusCode === 410 || err.statusCode === 404) {
            failedTokens.push(device.token);
          } else {
            logger.warn(`[Push] Send error for device ${device._id}: ${err.message}`);
          }
        }
      })
    );

    // Abgelaufene Subscriptions deaktivieren
    if (failedTokens.length > 0) {
      await Device.updateMany(
        { token: { $in: failedTokens } },
        { isActive: false }
      );
      logger.warn(`[Push] ${failedTokens.length} expired subscriptions deactivated`);
    }

    await Notification.updateOne(
      { _id: notificationId },
      { 'deliveryStatus.push': 'sent' }
    );

    logger.info(`[Push] Sent to ${successCount}/${devices.length} devices`);
  }

  /**
   * Web Push Subscription registrieren
   */
  async registerDevice(
    userId: string,
    data: {
      token: string;
      platform: 'ios' | 'android' | 'web';
      deviceName?: string;
      appVersion?: string;
      osVersion?: string;
      webPushSubscription?: {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
    }
  ): Promise<void> {
    await Device.findOneAndUpdate(
      { token: data.token },
      {
        userId,
        ...data,
        isActive: true,
        lastUsedAt: new Date(),
      },
      { upsert: true }
    );

    logger.info(`[Push] Device registered for user ${userId} (${data.platform})`);
  }

  /**
   * Device / Subscription entfernen
   */
  async unregisterDevice(token: string): Promise<void> {
    await Device.deleteOne({ token });
    logger.info(`[Push] Device unregistered`);
  }

  /**
   * Alle Web-Push-Subscriptions eines Users entfernen
   */
  async unregisterAllWebPush(userId: string): Promise<void> {
    await Device.deleteMany({ userId, platform: 'web' });
    logger.info(`[Push] All web push subscriptions removed for user ${userId}`);
  }
}

export const pushService = new PushService();
