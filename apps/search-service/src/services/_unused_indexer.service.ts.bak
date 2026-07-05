// Search Service - Indexer Service
import { meilisearch } from '../config/meilisearch';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export class IndexerService {
  /**
   * Index seeds from MongoDB to Meilisearch
   */
  async indexSeeds(): Promise<{ indexed: number; failed: number }> {
    logger.info('[Indexer] Starting seed indexing...');
    
    try {
      // Connect to MongoDB (price-service database)
      const priceDb = mongoose.connection.useDb('sf1-prices');
      const Seed = priceDb.model('Seed', new mongoose.Schema({}, { strict: false }));
      
      const seeds = await Seed.find({}).lean();
      
      logger.info(`[Indexer] Found ${seeds.length} seeds to index`);
      
      if (seeds.length === 0) {
        return { indexed: 0, failed: 0 };
      }
      
      // Transform for Meilisearch
      const documents = seeds.map((seed: any) => ({
        id: seed._id.toString(),
        name: seed.name,
        slug: seed.slug,
        breeder: seed.breeder,
        type: seed.type,
        genetics: seed.genetics || '',
        thc: seed.thc || 0,
        cbd: seed.cbd || 0,
        floweringTime: seed.floweringTime || 0,
        yield: seed.yield || '',
        difficulty: seed.difficulty || '',
        climate: seed.climate || '',
        flavors: seed.flavors || [],
        effects: seed.effects || [],
        viewCount: seed.viewCount || 0,
        priceCount: seed.priceCount || 0,
        avgPrice: seed.avgPrice || 0,
        lowestPrice: seed.lowestPrice || 0,
        description: seed.description || '',
        imageUrl: seed.imageUrl || ''
      }));
      
      // Index in batches
      const seedsIndex = meilisearch.index('seeds');
      const batchSize = 1000;
      let indexed = 0;
      let failed = 0;
      
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        
        try {
          const task = await seedsIndex.addDocuments(batch);
          logger.debug(`[Indexer] Batch ${i / batchSize + 1} queued (task ${task.taskUid})`);
          indexed += batch.length;
        } catch (error) {
          logger.error(`[Indexer] Batch ${i / batchSize + 1} failed:`, error);
          failed += batch.length;
        }
      }
      
      logger.info(`[Indexer] Seed indexing complete: ${indexed} indexed, ${failed} failed`);
      
      return { indexed, failed };
      
    } catch (error) {
      logger.error('[Indexer] Seed indexing failed:', error);
      throw error;
    }
  }
  
  /**
   * Index grows from MongoDB to Meilisearch
   */
  async indexGrows(): Promise<{ indexed: number; failed: number }> {
    logger.info('[Indexer] Starting grow indexing...');
    
    try {
      const journalDb = mongoose.connection.useDb('sf1-journal');
      const Grow = journalDb.model('Grow', new mongoose.Schema({}, { strict: false }));
      
      const grows = await Grow.find({
        isPublic: true,
        deletedAt: { $exists: false }
      }).lean();
      
      logger.info(`[Indexer] Found ${grows.length} grows to index`);
      
      if (grows.length === 0) {
        return { indexed: 0, failed: 0 };
      }
      
      const documents = grows.map((grow: any) => ({
        id: grow._id.toString(),
        userId: grow.userId,
        strainName: grow.strainName,
        breeder: grow.breeder || '',
        type: grow.type,
        environment: grow.environment,
        status: grow.status,
        tags: grow.tags || [],
        viewCount: grow.viewCount || 0,
        likeCount: grow.likeCount || 0,
        commentCount: grow.commentCount || 0,
        efficiency: grow.efficiency || 0,
        yieldDry: grow.yieldDry || 0,
        isPublic: grow.isPublic,
        startDate: grow.startDate,
        createdAt: grow.createdAt
      }));
      
      const growsIndex = meilisearch.index('grows');
      const task = await growsIndex.addDocuments(documents);
      
      logger.info(`[Indexer] Grow indexing queued (task ${task.taskUid})`);
      
      return { indexed: documents.length, failed: 0 };
      
    } catch (error) {
      logger.error('[Indexer] Grow indexing failed:', error);
      throw error;
    }
  }
  
  /**
   * Index community threads
   */
  async indexThreads(): Promise<{ indexed: number; failed: number }> {
    logger.info('[Indexer] Starting thread indexing...');
    
    try {
      const communityDb = mongoose.connection.useDb('sf1-community');
      const Thread = communityDb.model('Thread', new mongoose.Schema({}, { strict: false }));
      
      const threads = await Thread.find({
        isDeleted: false
      }).lean();
      
      logger.info(`[Indexer] Found ${threads.length} threads to index`);
      
      if (threads.length === 0) {
        return { indexed: 0, failed: 0 };
      }
      
      const documents = threads.map((thread: any) => ({
        id: thread._id.toString(),
        userId: thread.userId,
        categoryId: thread.categoryId,
        title: thread.title,
        content: thread.content,
        tags: thread.tags || [],
        viewCount: thread.viewCount || 0,
        replyCount: thread.replyCount || 0,
        upvoteCount: thread.upvoteCount || 0,
        isPinned: thread.isPinned || false,
        isLocked: thread.isLocked || false,
        createdAt: thread.createdAt
      }));
      
      const threadsIndex = meilisearch.index('threads');
      const task = await threadsIndex.addDocuments(documents);
      
      logger.info(`[Indexer] Thread indexing queued (task ${task.taskUid})`);
      
      return { indexed: documents.length, failed: 0 };
      
    } catch (error) {
      logger.error('[Indexer] Thread indexing failed:', error);
      throw error;
    }
  }
  
  /**
   * Index all data sources
   */
  async indexAll(): Promise<{
    seeds: { indexed: number; failed: number };
    grows: { indexed: number; failed: number };
    threads: { indexed: number; failed: number };
  }> {
    logger.info('[Indexer] Starting full indexing...');
    
    const [seeds, grows, threads] = await Promise.all([
      this.indexSeeds(),
      this.indexGrows(),
      this.indexThreads()
    ]);
    
    const total = seeds.indexed + grows.indexed + threads.indexed;
    const totalFailed = seeds.failed + grows.failed + threads.failed;
    
    logger.info(`[Indexer] Full indexing complete: ${total} indexed, ${totalFailed} failed`);
    
    return { seeds, grows, threads };
  }
  
  /**
   * Index single document
   */
  async indexDocument(
    indexName: 'seeds' | 'grows' | 'threads',
    document: any
  ): Promise<void> {
    try {
      const index = meilisearch.index(indexName);
      await index.addDocuments([document]);
      
      logger.debug(`[Indexer] Indexed document ${document.id} in ${indexName}`);
    } catch (error) {
      logger.error(`[Indexer] Failed to index document in ${indexName}:`, error);
    }
  }
  
  /**
   * Update document
   */
  async updateDocument(
    indexName: 'seeds' | 'grows' | 'threads',
    documentId: string,
    updates: any
  ): Promise<void> {
    try {
      const index = meilisearch.index(indexName);
      await index.updateDocuments([{ id: documentId, ...updates }]);
      
      logger.debug(`[Indexer] Updated document ${documentId} in ${indexName}`);
    } catch (error) {
      logger.error(`[Indexer] Failed to update document in ${indexName}:`, error);
    }
  }
  
  /**
   * Delete document
   */
  async deleteDocument(
    indexName: 'seeds' | 'grows' | 'threads',
    documentId: string
  ): Promise<void> {
    try {
      const index = meilisearch.index(indexName);
      await index.deleteDocument(documentId);
      
      logger.debug(`[Indexer] Deleted document ${documentId} from ${indexName}`);
    } catch (error) {
      logger.error(`[Indexer] Failed to delete document from ${indexName}:`, error);
    }
  }
  
  /**
   * Clear index
   */
  async clearIndex(indexName: string): Promise<void> {
    try {
      const index = meilisearch.index(indexName);
      await index.deleteAllDocuments();
      
      logger.info(`[Indexer] Cleared index ${indexName}`);
    } catch (error) {
      logger.error(`[Indexer] Failed to clear index ${indexName}:`, error);
    }
  }
  
  /**
   * Get indexing stats
   */
  async getStats(): Promise<any> {
    try {
      const [seedsStats, growsStats, threadsStats] = await Promise.all([
        meilisearch.index('seeds').getStats(),
        meilisearch.index('grows').getStats(),
        meilisearch.index('threads').getStats()
      ]);
      
      return {
        seeds: seedsStats,
        grows: growsStats,
        threads: threadsStats
      };
    } catch (error) {
      logger.error('[Indexer] Failed to get stats:', error);
      return null;
    }
  }
}

export const indexerService = new IndexerService();
