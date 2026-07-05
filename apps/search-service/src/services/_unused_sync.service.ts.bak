// Search Service - Sync Service
import { redis } from '../config/redis';
import { indexerService } from './indexer.service';
import { searchService } from './search.service';
import { logger } from '../utils/logger';

/**
 * Sync service listens to Redis pub/sub for real-time updates
 */
export class SyncService {
  private subscriber: any = null;
  
  /**
   * Start listening for database changes
   */
  async start(): Promise<void> {
    try {
      // Create Redis subscriber
      this.subscriber = redis.duplicate();
      await this.subscriber.connect();
      
      // Subscribe to channels
      await this.subscriber.subscribe('db:seed:created', this.handleSeedCreated.bind(this));
      await this.subscriber.subscribe('db:seed:updated', this.handleSeedUpdated.bind(this));
      await this.subscriber.subscribe('db:seed:deleted', this.handleSeedDeleted.bind(this));
      
      await this.subscriber.subscribe('db:grow:created', this.handleGrowCreated.bind(this));
      await this.subscriber.subscribe('db:grow:updated', this.handleGrowUpdated.bind(this));
      await this.subscriber.subscribe('db:grow:deleted', this.handleGrowDeleted.bind(this));
      
      await this.subscriber.subscribe('db:thread:created', this.handleThreadCreated.bind(this));
      await this.subscriber.subscribe('db:thread:updated', this.handleThreadUpdated.bind(this));
      await this.subscriber.subscribe('db:thread:deleted', this.handleThreadDeleted.bind(this));
      
      logger.info('[Sync] Started listening for database changes');
      
    } catch (error) {
      logger.error('[Sync] Failed to start:', error);
      throw error;
    }
  }
  
  /**
   * Stop listening
   */
  async stop(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit();
      logger.info('[Sync] Stopped listening');
    }
  }
  
  // Seed handlers
  private async handleSeedCreated(message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      await indexerService.indexDocument('seeds', data);
      await searchService.clearCache('search:seeds:*');
      logger.debug('[Sync] Seed created:', data.id);
    } catch (error) {
      logger.error('[Sync] Failed to handle seed creation:', error);
    }
  }
  
  private async handleSeedUpdated(message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      await indexerService.updateDocument('seeds', data.id, data.updates);
      await searchService.clearCache('search:seeds:*');
      logger.debug('[Sync] Seed updated:', data.id);
    } catch (error) {
      logger.error('[Sync] Failed to handle seed update:', error);
    }
  }
  
  private async handleSeedDeleted(message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      await indexerService.deleteDocument('seeds', data.id);
      await searchService.clearCache('search:seeds:*');
      logger.debug('[Sync] Seed deleted:', data.id);
    } catch (error) {
      logger.error('[Sync] Failed to handle seed deletion:', error);
    }
  }
  
  // Grow handlers
  private async handleGrowCreated(message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      if (data.isPublic) {
        await indexerService.indexDocument('grows', data);
        await searchService.clearCache('search:grows:*');
      }
      logger.debug('[Sync] Grow created:', data.id);
    } catch (error) {
      logger.error('[Sync] Failed to handle grow creation:', error);
    }
  }
  
  private async handleGrowUpdated(message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      
      if (data.isPublic) {
        await indexerService.updateDocument('grows', data.id, data.updates);
      } else {
        // If made private, remove from index
        await indexerService.deleteDocument('grows', data.id);
      }
      
      await searchService.clearCache('search:grows:*');
      logger.debug('[Sync] Grow updated:', data.id);
    } catch (error) {
      logger.error('[Sync] Failed to handle grow update:', error);
    }
  }
  
  private async handleGrowDeleted(message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      await indexerService.deleteDocument('grows', data.id);
      await searchService.clearCache('search:grows:*');
      logger.debug('[Sync] Grow deleted:', data.id);
    } catch (error) {
      logger.error('[Sync] Failed to handle grow deletion:', error);
    }
  }
  
  // Thread handlers
  private async handleThreadCreated(message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      await indexerService.indexDocument('threads', data);
      await searchService.clearCache('search:threads:*');
      logger.debug('[Sync] Thread created:', data.id);
    } catch (error) {
      logger.error('[Sync] Failed to handle thread creation:', error);
    }
  }
  
  private async handleThreadUpdated(message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      await indexerService.updateDocument('threads', data.id, data.updates);
      await searchService.clearCache('search:threads:*');
      logger.debug('[Sync] Thread updated:', data.id);
    } catch (error) {
      logger.error('[Sync] Failed to handle thread update:', error);
    }
  }
  
  private async handleThreadDeleted(message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      await indexerService.deleteDocument('threads', data.id);
      await searchService.clearCache('search:threads:*');
      logger.debug('[Sync] Thread deleted:', data.id);
    } catch (error) {
      logger.error('[Sync] Failed to handle thread deletion:', error);
    }
  }
}

export const syncService = new SyncService();
