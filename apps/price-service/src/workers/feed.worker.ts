// Price Service - Feed Import Worker
// Uses Feeds (axios+cheerio) statt Playwright
import { Queue, Worker, Job } from 'bullmq';
import { getFeed, getFeedSlugs } from '../feeds';
import { priceService } from '../services/price.service';
import { websocketService } from '../services/websocket.service';
import { logger } from '../utils/logger';

// Redis connection config
function getRedisConfig() {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port || '6379'),
        password: url.password || undefined,
      };
    } catch {
      // fallback
    }
  }
  return {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  };
}

const connection = getRedisConfig();

// Create BullMQ Queue
const feedQueue = new Queue('feed-import-jobs', { connection });

// Create Worker
const feedWorker = new Worker(
  'feed-import-jobs',
  async (job: Job) => {
    const { seedbank } = job.data;

    logger.info(`[FeedWorker] Starte Import für ${seedbank}`);

    websocketService.broadcastScrapingStatus({
      seedbank,
      status: 'started',
    });

    try {
      const feed = getFeed(seedbank);

      if (!feed) {
        throw new Error(`Unbekannter Feed: ${seedbank}`);
      }

      const startTime = Date.now();
      const products = await feed.importAll();
      const importTime = ((Date.now() - startTime) / 1000).toFixed(1);

      logger.info(`[FeedWorker] ${seedbank}: ${products.length} Produkte in ${importTime}s`);

      if (products.length === 0) {
        logger.warn(`[FeedWorker] ${seedbank}: Keine Produkte gefunden!`);

        websocketService.broadcastScrapingStatus({
          seedbank,
          status: 'completed',
          productsScraped: 0,
        });

        return {
          seedbank,
          productsImported: 0,
          seedsCreated: 0,
          pricesCreated: 0,
          duration: `${importTime}s`,
        };
      }

      // Convert FeedProduct to ScrapedProduct format for priceService
      const scrapedProducts = products.map(p => ({
        name: p.name,
        breeder: p.breeder,
        type: p.type,
        price: p.price,
        currency: p.currency,
        originalPrice: p.originalPrice,
        discount: p.discount,
        inStock: p.inStock,
        packSize: p.packSize,
        seedCount: p.seedCount,
        url: p.affiliateUrl || p.url,
        thc: p.thc,
        cbd: p.cbd,
        floweringTime: p.floweringTime,
        genetics: p.genetics,
        imageUrl: p.imageUrl,
        stockLevel: undefined,
      }));

      // Save to database
      const result = await priceService.saveScrapedProducts(
        scrapedProducts,
        seedbank,
        `feed-${seedbank}-v1`
      );

      websocketService.broadcastScrapingStatus({
        seedbank,
        status: 'completed',
        productsScraped: products.length,
      });

      logger.info(`[FeedWorker] ${seedbank} fertig: ${result.seeds} neue Seeds, ${result.prices} neue Preise, ${result.pricesUpdated} Preise aktualisiert (${importTime}s)`);

      return {
      seedbank,
      productsImported: products.length,
        seedsCreated: result.seeds,
        pricesCreated: result.prices,
        pricesUpdated: result.pricesUpdated,
        duration: `${importTime}s`,
      };

    } catch (error: any) {
      logger.error(`[FeedWorker] Fehler bei ${seedbank}: ${error.message}`);

      websocketService.broadcastScrapingStatus({
        seedbank,
        status: 'error',
        error: error.message,
      });

      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
    limiter: {
      max: 6,
      duration: 60000,
    },
  }
);

// Event handlers
feedWorker.on('completed', (job) => {
  logger.info(`[FeedWorker] Job ${job.id} abgeschlossen:`, job.returnvalue);
});

feedWorker.on('failed', (job, err) => {
  logger.error(`[FeedWorker] Job ${job?.id} fehlgeschlagen:`, err.message);
});

feedWorker.on('error', (err) => {
  logger.error('[FeedWorker] Worker-Fehler:', err.message);
});

/**
 * Add single feed import job to queue
 */
export async function scheduleFeedJob(seedbank: string): Promise<void> {
  await feedQueue.add(
    `feed-${seedbank}`,
    { seedbank },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 120000,
      },
      removeOnComplete: {
        age: 86400,
        count: 100,
      },
      removeOnFail: {
        age: 604800,
      },
    }
  );

  logger.info(`[FeedWorker] Feed-Import geplant: ${seedbank}`);
}

/**
 * Schedule all feeds for import
 */
export async function scheduleAllFeeds(): Promise<void> {
  const slugs = getFeedSlugs();

  for (const slug of slugs) {
    await scheduleFeedJob(slug);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  logger.info(`[FeedWorker] ${slugs.length} Feed-Import Jobs geplant: ${slugs.join(', ')}`);
}

/**
 * Get queue stats
 */
export async function getFeedQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    feedQueue.getWaitingCount(),
    feedQueue.getActiveCount(),
    feedQueue.getCompletedCount(),
    feedQueue.getFailedCount(),
    feedQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
    registeredFeeds: getFeedSlugs(),
  };
}

/**
 * Run import immediately (bypass queue)
 */
export async function runFeedImportNow(seedbank: string): Promise<{
  productsImported: number;
  seedsCreated: number;
  pricesCreated: number;
}> {
  const feed = getFeed(seedbank);
  if (!feed) throw new Error(`Unbekannter Feed: ${seedbank}`);

  const products = await feed.importAll();

  const scrapedProducts = products.map(p => ({
    name: p.name,
    breeder: p.breeder,
    type: p.type,
    price: p.price,
    currency: p.currency,
    originalPrice: p.originalPrice,
    discount: p.discount,
    inStock: p.inStock,
    packSize: p.packSize,
    seedCount: p.seedCount,
    url: p.affiliateUrl || p.url,
    thc: p.thc,
    cbd: p.cbd,
    floweringTime: p.floweringTime,
    genetics: p.genetics,
    imageUrl: p.imageUrl,
    stockLevel: undefined,
  }));

  const result = await priceService.saveScrapedProducts(
    scrapedProducts,
    seedbank,
    `feed-${seedbank}-manual`
  );

  return {
    productsImported: products.length,
    seedsCreated: result.seeds,
    pricesCreated: result.prices,
    pricesUpdated: result.pricesUpdated,
  };
}

export { feedQueue, feedWorker };
