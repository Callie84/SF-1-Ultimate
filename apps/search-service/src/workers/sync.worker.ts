// /apps/search-service/src/workers/sync.worker.ts
import { Queue, Worker, Job } from 'bullmq';
import { indexingService } from '../services/indexing.service';
import { logger } from '../utils/logger';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined
};

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000
  },
  removeOnComplete: true,
  removeOnFail: false
};

export interface SyncJob {
  type: 'index' | 'update' | 'delete';
  index: 'STRAINS' | 'THREADS' | 'GROWS' | 'USERS';
  documentId?: string;
  document?: any;
}

const syncQueue = new Queue('search-sync', {
  connection,
  defaultJobOptions
});

const syncWorkerInstance = new Worker(
  'search-sync',
  async (job: Job) => {
    const { type, index, documentId, document } = job.data as SyncJob;

    logger.debug(`[Sync] Processing ${type} for ${index}:${documentId || 'bulk'}`);

    try {
      switch (type) {
        case 'index':
          if (document) {
            await indexingService.indexDocument(index, document);
          }
          break;

        case 'update':
          if (document) {
            await indexingService.updateDocument(index, document);
          }
          break;

        case 'delete':
          if (documentId) {
            await indexingService.deleteDocument(index, documentId);
          }
          break;
      }

      logger.info(`[Sync] Successfully processed ${type} for ${index}`);
    } catch (error) {
      logger.error(`[Sync] Failed to process ${type}:`, error);
      throw error;
    }
  },
  { connection }
);

syncWorkerInstance.on('completed', (job: Job) => {
  logger.debug(`[Sync] Job ${job.id} completed`);
});

syncWorkerInstance.on('failed', (job: Job | undefined, err: Error) => {
  logger.error(`[Sync] Job ${job?.id} failed:`, err);
});

export const syncWorker = {
  async queueIndex(index: SyncJob['index'], document: any): Promise<void> {
    await syncQueue.add('sync', { type: 'index', index, document });
  },

  async queueUpdate(index: SyncJob['index'], document: any): Promise<void> {
    await syncQueue.add('sync', { type: 'update', index, document });
  },

  async queueDelete(index: SyncJob['index'], documentId: string): Promise<void> {
    await syncQueue.add('sync', { type: 'delete', index, documentId });
  },

  async getStats(): Promise<any> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      syncQueue.getWaitingCount(),
      syncQueue.getActiveCount(),
      syncQueue.getCompletedCount(),
      syncQueue.getFailedCount(),
      syncQueue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed
    };
  }
};

export { syncQueue, syncWorkerInstance };
