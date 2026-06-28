// Search Service - Indexer Worker
import { Queue, Worker } from 'bullmq';
import { connectMongoDB } from '../config/mongodb';
import { connectRedis, redis } from '../config/redis';
import { initializeMeilisearch } from '../config/meilisearch';
import { indexerService } from '../services/indexer.service';
import { logger } from '../utils/logger';

// Create Queue
const indexerQueue = new Queue('indexer-jobs', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined
  }
});

// Create Worker
const worker = new Worker(
  'indexer-jobs',
  async (job) => {
    const { action, index, data } = job.data;
    
    logger.info(`[Worker] Processing ${action} for ${index}`);
    
    try {
      switch (action) {
        case 'index-all':
          return await indexerService.indexAll();
        
        case 'index-seeds':
          return await indexerService.indexSeeds();
        
        case 'index-grows':
          return await indexerService.indexGrows();
        
        case 'index-threads':
          return await indexerService.indexThreads();
        
        case 'index-document':
          await indexerService.indexDocument(index, data);
          return { success: true };
        
        case 'update-document':
          await indexerService.updateDocument(index, data.id, data.updates);
          return { success: true };
        
        case 'delete-document':
          await indexerService.deleteDocument(index, data.id);
          return { success: true };
        
        case 'clear-index':
          await indexerService.clearIndex(index);
          return { success: true };
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      logger.error(`[Worker] Job failed:`, error);
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    },
    concurrency: 2
  }
);

// Worker event handlers
worker.on('completed', (job) => {
  logger.info(`[Worker] Job ${job.id} completed:`, job.returnvalue);
});

worker.on('failed', (job, err) => {
  logger.error(`[Worker] Job ${job?.id} failed:`, err);
});

worker.on('error', (err) => {
  logger.error('[Worker] Worker error:', err);
});

/**
 * Schedule indexing job
 */
export async function scheduleIndexJob(data: {
  action: string;
  index?: string;
  data?: any;
}): Promise<void> {
  await indexerQueue.add(
    `index-${data.action}`,
    data,
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: {
        age: 86400,
        count: 100
      },
      removeOnFail: {
        age: 604800
      }
    }
  );
  
  logger.info(`[Worker] Scheduled ${data.action} job`);
}

/**
 * Get queue stats
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    indexerQueue.getWaitingCount(),
    indexerQueue.getActiveCount(),
    indexerQueue.getCompletedCount(),
    indexerQueue.getFailedCount()
  ]);
  
  return {
    waiting,
    active,
    completed,
    failed
  };
}

/**
 * Startup
 */
async function start() {
  try {
    logger.info('[Worker] Starting indexer worker...');
    
    await Promise.all([
      connectMongoDB(),
      connectRedis(),
      initializeMeilisearch()
    ]);
    
    logger.info('[Worker] Worker ready and listening for jobs');
    
  } catch (error) {
    logger.error('[Worker] Failed to start:', error);
    process.exit(1);
  }
}

/**
 * Shutdown
 */
async function shutdown() {
  logger.info('[Worker] Shutting down...');
  
  await worker.close();
  await indexerQueue.close();
  await redis.quit();
  
  logger.info('[Worker] Shutdown complete');
  process.exit(0);
}

// Handle signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start if run directly
if (require.main === module) {
  start();
}

export { indexerQueue, worker };
