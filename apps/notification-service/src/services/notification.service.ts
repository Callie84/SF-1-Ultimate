import { Notification, INotification } from '../models/Notification.model';
import { Preference } from '../models/Preference.model';
import { emailService } from './email.service';
import { websocketService } from './websocket.service';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export class NotificationService {
  /**
   * Neue Notification erstellen
   */
  async create(data: {
    userId: string | string[];
    type: string;
    title: string;
    message: string;
    relatedId?: string;
    relatedType?: string;
    relatedUrl?: string;
    data?: Record<string, any>;
    groupKey?: string;
  }): Promise<void> {
    const userIds = Array.isArray(data.userId) ? data.userId : [data.userId];
    
    for (const userId of userIds) {
      await this.createForUser(userId, data);
    }
  }
  
  /**
   * Notification für einzelnen User
   */
  private async createForUser(userId: string, data: any): Promise<void> {
    // Preferences laden
    let pref = await Preference.findOne({ userId });
    
    if (!pref) {
      pref = new Preference({ userId });
      await pref.save();
    }
    
    if (!pref.enabled) {
      logger.debug(`[Notification] User ${userId} has notifications disabled`);
      return;
    }
    
    const typePrefs = pref.preferences[data.type as keyof typeof pref.preferences];
    if (!typePrefs) {
      logger.warn(`[Notification] Unknown type: ${data.type}`);
      return;
    }
    
    // Channels
    const channels: ('in_app' | 'email' | 'push')[] = [];
    if (typePrefs.in_app) channels.push('in_app');
    if (typePrefs.email) channels.push('email');
    if (typePrefs.push) channels.push('push');
    
    if (channels.length === 0) return;
    
    // Quiet Hours Check
    if (this.isQuietHours(pref) && channels.includes('push')) {
      channels.splice(channels.indexOf('push'), 1);
    }
    
    // Create Notification
    const notification = new Notification({
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedId: data.relatedId,
      relatedType: data.relatedType,
      relatedUrl: data.relatedUrl,
      data: data.data,
      groupKey: data.groupKey,
      channels,
      deliveryStatus: {
        in_app: true,
        email: channels.includes('email') ? 'pending' : undefined,
        push: channels.includes('push') ? 'pending' : undefined
      },
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });
    
    await notification.save();
    
    // WebSocket Real-time
    if (channels.includes('in_app')) {
      await websocketService.sendToUser(userId, 'notification:new', {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        relatedUrl: notification.relatedUrl,
        createdAt: notification.createdAt
      });
    }
    
    // Email Queue
    if (channels.includes('email') && pref.emailDigest === 'instant') {
      await this.queueEmail(notification._id.toString());
    }
    
    // Push Queue
    if (channels.includes('push')) {
      await this.queuePush(notification._id.toString());
    }
    
    // Increment unread count
    await redis.incr(`notifications:unread:${userId}`);
    
    logger.info(`[Notification] Created for ${userId}: ${data.type}`);
  }
  
  /**
   * Quiet Hours Check
   */
  private isQuietHours(pref: IPreference): boolean {
    if (!pref.quietHours.enabled || !pref.quietHours.start || !pref.quietHours.end) {
      return false;
    }
    
    const now = new Date();
    const current = `${now.getUTCHours().toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}`;
    
    const { start, end } = pref.quietHours;
    
    if (start > end) {
      // Over midnight (e.g. 22:00 - 08:00)
      return current >= start || current < end;
    }
    
    return current >= start && current < end;
  }
  
  /**
   * Queue Email
   */
  private async queueEmail(notificationId: string): Promise<void> {
    await redis.lPush('queue:email', JSON.stringify({
      notificationId,
      timestamp: Date.now()
    }));
  }
  
  /**
   * Queue Push
   */
  private async queuePush(notificationId: string): Promise<void> {
    await redis.lPush('queue:push', JSON.stringify({
      notificationId,
      timestamp: Date.now()
    }));
  }
  
  /**
   * Get notifications for user
   */
  async getForUser(userId: string, options: {
    limit?: number;
    skip?: number;
    unreadOnly?: boolean;
  } = {}): Promise<{ notifications: INotification[]; total: number; unread: number }> {
    const query: any = { userId };
    
    if (options.unreadOnly) {
      query.isRead = false;
    }
    
    const limit = Math.min(options.limit || 50, 200);
    const skip = options.skip || 0;
    
    const [notifications, total, unread] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId, isRead: false })
    ]);
    
    return { 
      notifications: notifications as INotification[], 
      total, 
      unread 
    };
  }
  
  /**
   * Mark as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const result = await Notification.updateOne(
      { _id: notificationId, userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    if (result.modifiedCount > 0) {
      await redis.decr(`notifications:unread:${userId}`);
    }
  }
  
  /**
   * Mark all as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    await redis.set(`notifications:unread:${userId}`, 0);
  }
  
  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const cached = await redis.get(`notifications:unread:${userId}`);
    
    if (cached !== null) {
      return parseInt(cached);
    }
    
    const count = await Notification.countDocuments({ userId, isRead: false });
    await redis.set(`notifications:unread:${userId}`, count);
    
    return count;
  }
  
  /**
   * Cleanup old notifications
   */
  async cleanup(): Promise<void> {
    const result = await Notification.deleteMany({
      createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      isRead: true
    });
    
    logger.info(`[Notification] Cleaned up ${result.deletedCount} old notifications`);
  }
}

export const notificationService = new NotificationService();