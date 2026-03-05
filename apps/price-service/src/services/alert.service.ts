// Price Service - Alert Service
import { PriceAlert, IPriceAlert } from '../models/PriceAlert.model';
import { Price } from '../models/Price.model';
import { Seed } from '../models/Seed.model';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export class AlertService {
  /**
   * Create price alert
   */
  async createAlert(data: {
    userId: string;
    seedSlug: string;
    targetPrice: number;
    currency?: string;
    seedbanks?: string[];
    packSize?: string;
    notifyOnDiscount?: boolean;
    notifyOnRestock?: boolean;
  }): Promise<IPriceAlert> {
    // Find seed
    const seed = await Seed.findOne({ slug: data.seedSlug });
    if (!seed) {
      throw new Error('Seed not found');
    }
    
    // Check for existing alert
    const existing = await PriceAlert.findOne({
      userId: data.userId,
      seedId: seed._id,
      isActive: true
    });
    
    if (existing) {
      // Update existing
      existing.targetPrice = data.targetPrice;
      existing.currency = data.currency || 'EUR';
      existing.seedbanks = data.seedbanks;
      existing.packSize = data.packSize;
      existing.notifyOnDiscount = data.notifyOnDiscount ?? true;
      existing.notifyOnRestock = data.notifyOnRestock ?? false;
      
      await existing.save();
      
      logger.info(`[AlertService] Updated alert for user ${data.userId}, seed ${data.seedSlug}`);
      
      return existing;
    }
    
    // Create new
    const alert = new PriceAlert({
      userId: data.userId,
      seedId: seed._id,
      seedSlug: data.seedSlug,
      targetPrice: data.targetPrice,
      currency: data.currency || 'EUR',
      seedbanks: data.seedbanks,
      packSize: data.packSize,
      notifyOnDiscount: data.notifyOnDiscount ?? true,
      notifyOnRestock: data.notifyOnRestock ?? false,
      isActive: true,
      notificationCount: 0
    });
    
    await alert.save();
    
    logger.info(`[AlertService] Created alert for user ${data.userId}, seed ${data.seedSlug}`);
    
    return alert;
  }
  
  /**
   * Get user's alerts
   */
  async getUserAlerts(userId: string, activeOnly: boolean = true): Promise<IPriceAlert[]> {
    const query: any = { userId };
    
    if (activeOnly) {
      query.isActive = true;
    }
    
    return PriceAlert.find(query)
      .populate('seedId', 'name breeder slug')
      .sort({ createdAt: -1 })
      .lean()
      .then((alerts) => alerts.map((a: any) => ({
        ...a,
        seed: a.seedId ? { name: a.seedId.name, breeder: a.seedId.breeder } : undefined,
      })));
  }
  
  /**
   * Deactivate alert
   */
  async deactivateAlert(alertId: string, userId: string): Promise<void> {
    await PriceAlert.updateOne(
      { _id: alertId, userId },
      { isActive: false }
    );
    
    logger.info(`[AlertService] Deactivated alert ${alertId}`);
  }
  
  /**
   * Delete alert
   */
  async deleteAlert(alertId: string, userId: string): Promise<void> {
    await PriceAlert.deleteOne({ _id: alertId, userId });
    
    logger.info(`[AlertService] Deleted alert ${alertId}`);
  }
  
  /**
   * Check all active alerts for triggers
   */
  async checkAlerts(): Promise<number> {
    const activeAlerts = await PriceAlert.find({ isActive: true });
    
    let triggeredCount = 0;
    
    for (const alert of activeAlerts) {
      try {
        const triggered = await this.checkSingleAlert(alert);
        if (triggered) {
          triggeredCount++;
        }
      } catch (error) {
        logger.error(`[AlertService] Error checking alert ${alert._id}:`, error);
      }
    }
    
    logger.info(`[AlertService] Checked ${activeAlerts.length} alerts, ${triggeredCount} triggered`);
    
    return triggeredCount;
  }
  
  /**
   * Check single alert
   */
  private async checkSingleAlert(alert: IPriceAlert): Promise<boolean> {
    // Build query
    const query: any = {
      seedId: alert.seedId,
      inStock: true,
      validUntil: { $gt: new Date() },
      currency: alert.currency
    };
    
    if (alert.seedbanks && alert.seedbanks.length > 0) {
      query.seedbank = { $in: alert.seedbanks };
    }
    
    if (alert.packSize) {
      query.packSize = alert.packSize;
    }
    
    // Find matching prices
    const prices = await Price.find(query).sort({ price: 1 }).limit(5);
    
    if (prices.length === 0) return false;
    
    const lowestPrice = prices[0];
    
    // Check if target price is met
    if (lowestPrice.price <= alert.targetPrice) {
      // Trigger alert!
      await this.triggerAlert(alert, lowestPrice);
      return true;
    }
    
    // Check discount notification
    if (alert.notifyOnDiscount && lowestPrice.discount && lowestPrice.discount > 20) {
      await this.triggerAlert(alert, lowestPrice, 'discount');
      return true;
    }
    
    return false;
  }
  
  /**
   * Trigger alert (send notification)
   */
  private async triggerAlert(
    alert: IPriceAlert,
    price: any,
    reason: 'price' | 'discount' | 'restock' = 'price'
  ): Promise<void> {
    // Don't spam - check last notification time
    if (alert.lastNotified) {
      const hoursSinceLastNotified = 
        (Date.now() - alert.lastNotified.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastNotified < 24) {
        logger.debug(`[AlertService] Alert ${alert._id} triggered too recently, skipping`);
        return;
      }
    }
    
    // Update alert
    alert.triggeredAt = new Date();
    alert.triggeredPrice = price.price;
    alert.triggeredSeedbank = price.seedbank;
    alert.lastNotified = new Date();
    alert.notificationCount += 1;
    
    await alert.save();
    
    // Send to notification queue
    const notificationData = {
      type: 'price_alert',
      userId: alert.userId,
      data: {
        seedSlug: alert.seedSlug,
        targetPrice: alert.targetPrice,
        currentPrice: price.price,
        seedbank: price.seedbank,
        url: price.url,
        reason
      }
    };
    
    await redis.lPush('queue:notifications', JSON.stringify(notificationData));
    
    logger.info(`[AlertService] Triggered alert ${alert._id} for user ${alert.userId}`);
  }
  
  /**
   * Clean old inactive alerts
   */
  async cleanOldAlerts(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await PriceAlert.deleteMany({
      isActive: false,
      updatedAt: { $lt: cutoffDate }
    });
    
    logger.info(`[AlertService] Cleaned ${result.deletedCount} old alerts`);
    
    return result.deletedCount;
  }
}

export const alertService = new AlertService();
