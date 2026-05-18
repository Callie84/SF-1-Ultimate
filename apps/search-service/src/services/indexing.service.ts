// /apps/search-service/src/services/indexing.service.ts
import { meiliClient, INDEXES } from '../config/meilisearch';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';
import { Pool } from 'pg';

export interface IndexDocument {
  id: string;
  [key: string]: any;
}

export class IndexingService {
  /**
   * Einzelnes Dokument indexieren
   */
  async indexDocument(
    index: keyof typeof INDEXES,
    document: IndexDocument
  ): Promise<void> {
    try {
      const indexName = INDEXES[index];
      const meiliIndex = meiliClient.index(indexName);
      
      await meiliIndex.addDocuments([document]);
      
      logger.debug(`[Indexing] Indexed document in ${index}: ${document.id}`);
    } catch (error) {
      logger.error('[Indexing] Failed to index document:', error);
      throw error;
    }
  }
  
  /**
   * Bulk Indexing
   */
  async indexDocuments(
    index: keyof typeof INDEXES,
    documents: IndexDocument[]
  ): Promise<void> {
    if (documents.length === 0) return;
    
    try {
      const indexName = INDEXES[index];
      const meiliIndex = meiliClient.index(indexName);
      
      // In Batches aufteilen (max 1000 pro Batch)
      const batchSize = 1000;
      const batches = [];
      
      for (let i = 0; i < documents.length; i += batchSize) {
        batches.push(documents.slice(i, i + batchSize));
      }
      
      logger.info(`[Indexing] Indexing ${documents.length} documents in ${batches.length} batches`);
      
      for (const batch of batches) {
        await meiliIndex.addDocuments(batch);
      }
      
      logger.info(`[Indexing] Successfully indexed ${documents.length} documents in ${index}`);
    } catch (error) {
      logger.error('[Indexing] Bulk indexing failed:', error);
      throw error;
    }
  }
  
  /**
   * Dokument aktualisieren
   */
  async updateDocument(
    index: keyof typeof INDEXES,
    document: IndexDocument
  ): Promise<void> {
    try {
      const indexName = INDEXES[index];
      const meiliIndex = meiliClient.index(indexName);
      
      await meiliIndex.updateDocuments([document]);
      
      logger.debug(`[Indexing] Updated document in ${index}: ${document.id}`);
    } catch (error) {
      logger.error('[Indexing] Failed to update document:', error);
      throw error;
    }
  }
  
  /**
   * Dokument löschen
   */
  async deleteDocument(
    index: keyof typeof INDEXES,
    documentId: string
  ): Promise<void> {
    try {
      const indexName = INDEXES[index];
      const meiliIndex = meiliClient.index(indexName);
      
      await meiliIndex.deleteDocument(documentId);
      
      logger.debug(`[Indexing] Deleted document from ${index}: ${documentId}`);
    } catch (error) {
      logger.error('[Indexing] Failed to delete document:', error);
      throw error;
    }
  }
  
  /**
   * Mehrere Dokumente löschen
   */
  async deleteDocuments(
    index: keyof typeof INDEXES,
    documentIds: string[]
  ): Promise<void> {
    try {
      const indexName = INDEXES[index];
      const meiliIndex = meiliClient.index(indexName);
      
      await meiliIndex.deleteDocuments(documentIds);
      
      logger.info(`[Indexing] Deleted ${documentIds.length} documents from ${index}`);
    } catch (error) {
      logger.error('[Indexing] Failed to delete documents:', error);
      throw error;
    }
  }
  
  /**
   * Index komplett leeren
   */
  async clearIndex(index: keyof typeof INDEXES): Promise<void> {
    try {
      const indexName = INDEXES[index];
      const meiliIndex = meiliClient.index(indexName);
      
      await meiliIndex.deleteAllDocuments();
      
      logger.info(`[Indexing] Cleared index: ${index}`);
    } catch (error) {
      logger.error('[Indexing] Failed to clear index:', error);
      throw error;
    }
  }
  
  /**
   * Strains aus MongoDB indexieren
   */
  async reindexStrains(): Promise<void> {
    try {
      logger.info('[Indexing] Starting strain reindex...');
      
      // MongoDB-Connection (zu Price-Service DB)
      const mongoUrl = process.env.MONGODB_URL_PRICES || process.env.MONGODB_URL || 'mongodb://localhost:27017/sf1-prices';
      await mongoose.connect(mongoUrl);
      
      // Strain-Model (simplified)
      const Strain = mongoose.models['Seed'] || mongoose.model('Seed', new mongoose.Schema({}, { strict: false }));
      
      const strains = await Strain.find({ deletedAt: { $exists: false } })
        .select('_id name slug breeder type thc cbd floweringTime genetics effects flavors viewCount')
        .lean();
      
      const documents = strains.map(strain => ({
        id: strain._id.toString(),
        name: strain.name,
        slug: strain.slug,
        breeder: strain.breeder,
        type: strain.type,
        thc: strain.thc,
        cbd: strain.cbd,
        floweringTime: strain.floweringTime,
        genetics: strain.genetics,
        effects: strain.effects,
        flavors: strain.flavors,
        popularity: strain.viewCount || 0
      }));
      
      await this.indexDocuments('STRAINS', documents);
      
      logger.info(`[Indexing] Reindexed ${documents.length} strains`);
      
      await mongoose.disconnect();
    } catch (error) {
      logger.error('[Indexing] Strain reindex failed:', error);
      throw error;
    }
  }
  
  /**
   * Threads aus MongoDB indexieren
   */
  async reindexThreads(): Promise<void> {
    try {
      logger.info('[Indexing] Starting thread reindex...');
      
      const mongoUrl = process.env.MONGODB_URL_COMMUNITY || process.env.MONGODB_URL || 'mongodb://localhost:27017/sf1-community';
      await mongoose.connect(mongoUrl);
      
      const Thread = mongoose.models['Thread'] || mongoose.model('Thread', new mongoose.Schema({}, { strict: false }));
      
      const threads = await Thread.find({ deletedAt: { $exists: false } })
        .select('_id title content category tags isPinned isSolved replyCount viewCount upvotes createdAt')
        .lean();
      
      const documents = threads.map(thread => ({
        id: thread._id.toString(),
        title: thread.title,
        content: thread.content,
        category: thread.category,
        tags: thread.tags,
        isPinned: thread.isPinned,
        isSolved: thread.isSolved,
        replyCount: thread.replyCount,
        viewCount: thread.viewCount,
        upvotes: thread.upvotes,
        createdAt: thread.createdAt.getTime()
      }));
      
      await this.indexDocuments('THREADS', documents);
      
      logger.info(`[Indexing] Reindexed ${documents.length} threads`);
      
      await mongoose.disconnect();
    } catch (error) {
      logger.error('[Indexing] Thread reindex failed:', error);
      throw error;
    }
  }
  
  /**
   * Grows aus MongoDB indexieren
   */
  async reindexGrows(): Promise<void> {
    try {
      logger.info('[Indexing] Starting grow reindex...');
      
      const mongoUrl = process.env.MONGODB_URL_JOURNAL || process.env.MONGODB_URL || 'mongodb://localhost:27017/sf1-journal';
      await mongoose.connect(mongoUrl);
      
      const Grow = mongoose.models['Grow'] || mongoose.model('Grow', new mongoose.Schema({}, { strict: false }));
      
      const grows = await Grow.find({ 
        deletedAt: { $exists: false },
        isPublic: true 
      })
        .select('_id strainName strainId notes tags problems status environment viewCount likeCount yieldDry efficiency createdAt')
        .lean();
      
      const documents = grows.map(grow => ({
        id: grow._id.toString(),
        strainName: grow.strainName,
        strainId: grow.strainId,
        notes: grow.notes,
        tags: grow.tags,
        problems: grow.problems,
        status: grow.status,
        environment: grow.environment,
        isPublic: true,
        viewCount: grow.viewCount,
        likeCount: grow.likeCount,
        yieldDry: grow.yieldDry,
        efficiency: grow.efficiency,
        createdAt: grow.createdAt.getTime()
      }));
      
      await this.indexDocuments('GROWS', documents);
      
      logger.info(`[Indexing] Reindexed ${documents.length} grows`);
      
      await mongoose.disconnect();
    } catch (error) {
      logger.error('[Indexing] Grow reindex failed:', error);
      throw error;
    }
  }
  
  /**
   * Users aus PostgreSQL (auth-service DB) indexieren
   */
  async reindexUsers(): Promise<void> {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      logger.info('[Indexing] Starting user reindex...');

      const { rows: users } = await pool.query(`
        SELECT id, username, email, bio, avatar, role, "isVerified", "createdAt"
        FROM "User"
        WHERE "isActive" = true AND "isBanned" = false
      `);

      const documents = users.map(u => ({
        id: u.id,
        username: u.username,
        bio: u.bio || '',
        avatar: u.avatar || null,
        role: u.role,
        isVerified: u.isVerified,
        createdAt: new Date(u.createdAt).getTime(),
      }));

      await this.indexDocuments('USERS', documents);

      logger.info(`[Indexing] Reindexed ${documents.length} users`);
    } catch (error) {
      logger.error('[Indexing] User reindex failed:', error);
      throw error;
    } finally {
      await pool.end();
    }
  }
  
  /**
   * Alle Indexes neu aufbauen
   */
  async reindexAll(): Promise<void> {
    logger.info('[Indexing] Starting full reindex...');

    // Sequential to avoid mongoose session conflicts (each method connects/disconnects)
    await this.reindexStrains();
    await this.reindexThreads();
    await this.reindexGrows();
    await this.reindexUsers();

    logger.info('[Indexing] Full reindex completed');
  }
  
  /**
   * Index-Stats
   */
  async getStats(index: keyof typeof INDEXES): Promise<any> {
    try {
      const indexName = INDEXES[index];
      const meiliIndex = meiliClient.index(indexName);
      
      const stats = await meiliIndex.getStats();
      
      return {
        numberOfDocuments: stats.numberOfDocuments,
        isIndexing: stats.isIndexing,
        fieldDistribution: stats.fieldDistribution
      };
    } catch (error) {
      logger.error('[Indexing] Failed to get stats:', error);
      throw error;
    }
  }
}

export const indexingService = new IndexingService();
