// Price Service - Scraper Worker
import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis';
import { connectMongoDB } from '../config/mongodb';
import { closeBrowser } from '../config/playwright';
import { priceService } from '../services/price.service';
import { websocketService } from '../services/websocket.service';
import { ZamnesiaScraper } from '../scrapers/adapters/zamnesia.scraper';
import { RQSScraper } from '../scrapers/adapters/rqs.scraper';
import { SensiSeedsScraper } from '../scrapers/adapters/sensi-seeds.scraper';
import { logger } from '../utils/logger';

// Initialize scrapers
const scrapers = {
  zamnesia: new ZamnesiaScraper(),
  rqs: new RQSScraper(),
  'sensi-seeds': new SensiSeedsScraper()
};

// Create BullMQ Queue
const scraperQueue = new Queue('scraper-jobs', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  }
});

// Create Worker
const worker = new Worker(
  'scraper-jobs',
  async (job) => {
    const { seedbank } = job.data;
    
    logger.info(`[Worker] Starting scrape job for ${seedbank}`);
    
    // Broadcast status
    websocketService.broadcastScrapingStatus({
      seedbank,
      status: 'started'
    });
    
    try {
      const scraper = scrapers[seedbank as keyof typeof scrapers];
      
      if (!scraper) {
        throw new Error(`Unknown seedbank: ${seedbank}`);
      }
      
      // Scrape all products
      const products = await scraper.scrapeAll();
      
      logger.info(`[Worker] Scraped ${products.length} products from ${seedbank}`);
      
      // Save to database
      const result = await priceService.saveScrapedProducts(
        products,
        seedbank,
        `${seedbank}-scraper-v1`
      );
      
      // Broadcast completion
      websocketService.broadcastScrapingStatus({
        seedbank,
        status: 'completed',
        productsScraped: products.length
      });
      
      logger.info(`[Worker] Completed scrape job for ${seedbank}:`, result);
      
      return {
        seedbank,
        productsScraped: products.length,
        seedsCreated: result.seeds,
        pricesCreated: result.prices
      };
      
    } catch (error) {
      logger.error(`[Worker] Error in scrape job for ${seedbank}:`, error);
      
      websocketService.broadcastScrapingStatus({
        seedbank,
        status: 'error',
        error: (error as Error).message
      });
      
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    },
    concurrency: 1, // Process one scraping job at a time
    limiter: {
      max: 3, // Max 3 jobs per duration
      duration: 60000 // per minute
    }
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
 * Add scrape job to queue
 */
export async function scheduleScrapeJob(seedbank: string): Promise<void> {
  await scraperQueue.add(
    `scrape-${seedbank}`,
    { seedbank },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000 // 1 minute
      },
      removeOnComplete: {
        age: 86400, // Keep for 1 day
        count: 100
      },
      removeOnFail: {
        age: 604800 // Keep for 7 days
      }
    }
  );
  
  logger.info(`[Worker] Scheduled scrape job for ${seedbank}`);
}

/**
 * Schedule all seedbanks
 */
export async function scheduleAllSeedbanks(): Promise<void> {
  const seedbanks = Object.keys(scrapers);
  
  for (const seedbank of seedbanks) {
    await scheduleScrapeJob(seedbank);
    
    // Delay between scheduling to avoid overload
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  logger.info(`[Worker] Scheduled ${seedbanks.length} scrape jobs`);
}

/**
 * Get queue stats
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    scraperQueue.getWaitingCount(),
    scraperQueue.getActiveCount(),
    scraperQueue.getCompletedCount(),
    scraperQueue.getFailedCount()
  ]);
  
  return {
    waiting,
    active,
    completed,
    failed,
    total: waiting + active + completed + failed
  };
}

/**
 * Startup
 */
async function start() {
  try {
    logger.info('[Worker] Starting scraper worker...');
    
    await connectMongoDB();
    
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
  await scraperQueue.close();
  await closeBrowser();
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

export { scraperQueue, worker };
