// Sentry MUST be imported and initialized FIRST, before express
import Sentry from './sentry';

// Price Service - Server Entry Point
// Hybrid-Ansatz: Feed-Importer (Affiliate) + Lightweight Scraping (Fallback)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { connectMongoDB, disconnectMongoDB } from './config/mongodb';
import { connectRedis, disconnectRedis, redis } from './config/redis';
import { websocketService } from './services/websocket.service';
import { alertService } from './services/alert.service';
import { priceService } from './services/price.service';
import { seedfinderEnrichment } from './services/seedfinder-enrichment.service';
import { circuitBreaker } from './services/circuit-breaker.service';
import { scheduleAllFeeds, scheduleFeedJob, getFeedQueueStats, runFeedImportNow } from './workers/feed.worker';
import { getFeedInfos, getFeedSlugs } from './feeds';
import pricesRoutes from './routes/prices.routes';
import alertsRoutes from './routes/alerts.routes';
import affiliateRoutes from './routes/affiliate.routes';
import { logger } from './utils/logger';
import promClient from 'prom-client';
import { globalRateLimit } from './middleware/rate-limit.middleware';
promClient.collectDefaultMetrics({ prefix: 'sf1_' });

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(globalRateLimit);

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://seedfinderpro.de',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// ==========================================
// HEALTH & STATUS ENDPOINTS
// ==========================================

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'price-service',
    version: '2.0.0-hybrid',
    timestamp: new Date().toISOString(),
    websocket: {
      connections: websocketService.getConnectionsCount(),
      subscribedSeeds: websocketService.getSubscribedSeedsCount()
    },
    feeds: getFeedSlugs().length,
  });
});

app.get('/api/prices/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'price-service',
    version: '2.0.0-hybrid',
    timestamp: new Date().toISOString(),
  });
});

// Public: Seedbanks-Übersicht — weitergeleitet an prices.routes.ts (GET /seedbanks)

// ==========================================
// ADMIN/FEED MANAGEMENT ENDPOINTS
// Erreichbar über Traefik via /api/prices/admin/*
// ==========================================

// Simple Admin-Auth Check (JWT via Traefik X-User-Role Header oder Bearer Token)
function requireAdmin(req: any, res: any, next: any) {
  // Via Traefik: X-User-Role Header
  const role = req.headers['x-user-role'] as string;
  if (role && role.toUpperCase() === 'ADMIN') return next();

  // Via Bearer Token (direkt)
  const auth = req.headers.authorization as string;
  if (auth?.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const payload: any = jwt.verify(auth.slice(7), process.env.JWT_SECRET || '');
      if (payload?.role?.toUpperCase() === 'ADMIN') return next();
    } catch {}
  }

  return res.status(403).json({ error: 'Admin-Zugriff erforderlich' });
}

// Übersicht aller registrierten Feeds (+ Queue Stats)
app.get('/api/prices/admin/feeds', requireAdmin, async (req, res) => {
  try {
    const [feedInfos, queueStats] = await Promise.all([
      getFeedInfos(),
      getFeedQueueStats(),
    ]);

    // Nächster geplanter Import berechnen
    const now = new Date();
    let nextRun = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 2, 0, 0);
    if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);

    res.json({
      feeds: feedInfos,
      queue: queueStats,
      schedule: {
        daily: '02:00 UTC',
        nextRun: nextRun.toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Queue-Statistiken
app.get('/api/prices/admin/queue/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await getFeedQueueStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Einzelnen Feed-Import starten (Queue)
app.post('/api/prices/admin/feed/:seedbank', requireAdmin, async (req, res) => {
  try {
    const { seedbank } = req.params;

    if (!getFeedSlugs().includes(seedbank)) {
      return res.status(404).json({
        error: `Feed "${seedbank}" nicht gefunden`,
        available: getFeedSlugs(),
      });
    }

    await scheduleFeedJob(seedbank);
    res.json({ success: true, message: `Feed-Import für ${seedbank} geplant` });
  } catch (error: any) {
    logger.error('[Admin] Feed-Import Fehler:', error);
    res.status(500).json({ error: error.message });
  }
});

// Alle Feeds importieren (Queue)
app.post('/api/prices/admin/feeds/run-all', requireAdmin, async (req, res) => {
  try {
    await scheduleAllFeeds();
    res.json({
      success: true,
      message: `${getFeedSlugs().length} Feed-Import Jobs geplant`,
      feeds: getFeedSlugs(),
    });
  } catch (error: any) {
    logger.error('[Admin] Feed-Import-All Fehler:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sofort-Import (synchron)
app.post('/api/prices/admin/feed/:seedbank/now', requireAdmin, async (req, res) => {
  try {
    const { seedbank } = req.params;

    if (!getFeedSlugs().includes(seedbank)) {
      return res.status(404).json({
        error: `Feed "${seedbank}" nicht gefunden`,
        available: getFeedSlugs(),
      });
    }

    logger.info(`[Admin] Sofort-Import gestartet: ${seedbank}`);
    const result = await runFeedImportNow(seedbank);

    res.json({
      success: true,
      seedbank,
      ...result,
    });
  } catch (error: any) {
    logger.error(`[Admin] Sofort-Import Fehler:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Seedbank-Statistiken aus MongoDB
app.get('/api/prices/admin/seedbanks', requireAdmin, async (req, res) => {
  try {
    const { Price } = await import('./models/Price.model');
    const { Seed } = await import('./models/Seed.model');

    const [priceStats, seedStats] = await Promise.all([
      Price.aggregate([
        {
          $group: {
            _id: '$seedbankSlug',
            name: { $first: '$seedbank' },
            priceCount: { $sum: 1 },
            avgPrice: { $avg: '$price' },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            inStockCount: { $sum: { $cond: ['$inStock', 1, 0] } },
            lastImport: { $max: '$scrapedAt' },
          },
        },
        { $sort: { priceCount: -1 } },
      ]),
      Seed.aggregate([
        { $group: { _id: '$breeder', seedCount: { $sum: 1 } } },
      ]),
    ]);

    // Merge seed counts into price stats
    const seedCountMap: Record<string, number> = {};
    for (const s of seedStats) {
      if (s._id) seedCountMap[s._id] = s.seedCount;
    }

    const feedSlugs = getFeedSlugs();
    // Load inactive seedbank slugs from Redis
    const inactiveSlugs = await redis.sMembers('set:inactive:seedbanks').catch(() => [] as string[]);

    const result = priceStats.map((p) => ({
      slug: p._id,
      name: p.name,
      priceCount: p.priceCount,
      seedCount: seedCountMap[p.name] || 0,
      avgPrice: Math.round((p.avgPrice || 0) * 100) / 100,
      minPrice: Math.round((p.minPrice || 0) * 100) / 100,
      inStockCount: p.inStockCount,
      lastImport: p.lastImport,
      hasFeed: feedSlugs.includes(p._id),
      isActive: !inactiveSlugs.includes(p._id),
    }));

    // Add feeds with no price data yet
    for (const slug of feedSlugs) {
      if (!result.find((r) => r.slug === slug)) {
        result.push({
          slug,
          name: slug,
          priceCount: 0,
          seedCount: 0,
          avgPrice: 0,
          minPrice: 0,
          inStockCount: 0,
          lastImport: null,
          hasFeed: true,
          isActive: !inactiveSlugs.includes(slug),
        });
      }
    }

    res.json({ seedbanks: result });
  } catch (error: any) {
    logger.error('[Admin] Seedbank-Stats Fehler:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle seedbank active/inactive
app.patch('/api/prices/admin/seedbanks/:slug/toggle', requireAdmin, async (req, res) => {
  try {
    const { slug } = req.params;
    const key = 'set:inactive:seedbanks';
    const isInactive = await redis.sIsMember(key, slug);
    if (isInactive) {
      await redis.sRem(key, slug);
      res.json({ slug, isActive: true, message: `${slug} aktiviert` });
    } else {
      await redis.sAdd(key, slug);
      res.json({ slug, isActive: false, message: `${slug} deaktiviert` });
    }
  } catch (error: any) {
    logger.error('[Admin] Seedbank-Toggle Fehler:', error);
    res.status(500).json({ error: error.message });
  }
});

// Legacy-Routen (intern, kein Traefik) - bleiben erhalten
app.get('/admin/feeds', async (req, res) => {
  const [feedInfos, queueStats] = await Promise.all([getFeedInfos(), getFeedQueueStats()]);
  res.json({ feeds: feedInfos, queue: queueStats });
});
app.get('/admin/queue/stats', async (req, res) => {
  res.json(await getFeedQueueStats());
});
app.post('/admin/feed/:seedbank', async (req, res) => {
  if (!getFeedSlugs().includes(req.params.seedbank)) return res.status(404).json({ error: 'not found' });
  await scheduleFeedJob(req.params.seedbank);
  res.json({ success: true });
});
app.post('/admin/feeds/run-all', async (req, res) => {
  await scheduleAllFeeds();
  res.json({ success: true });
});
app.post('/admin/feed/:seedbank/now', async (req, res) => {
  const result = await runFeedImportNow(req.params.seedbank);
  res.json({ success: true, ...result });
});

// Fix Seed THC/CBD Decimals (Admin)
app.post('/api/prices/admin/fix-decimals', requireAdmin, async (req, res) => {
  try {
    const { Seed } = require('./models/Seed.model');

    const seeds = await Seed.find({
      $or: [{ thc: { $exists: true } }, { cbd: { $exists: true } }]
    });

    let updated = 0;
    for (const seed of seeds) {
      let hasChange = false;

      // Round THC to 1 decimal place
      if (seed.thc && seed.thc % 1 !== 0) {
        const rounded = Math.round(seed.thc * 10) / 10;
        if (rounded !== seed.thc) {
          seed.thc = rounded;
          hasChange = true;
        }
      }

      // Round CBD to 1 decimal place
      if (seed.cbd && seed.cbd % 1 !== 0) {
        const rounded = Math.round(seed.cbd * 10) / 10;
        if (rounded !== seed.cbd) {
          seed.cbd = rounded;
          hasChange = true;
        }
      }

      if (hasChange) {
        await seed.save();
        updated++;
      }
    }

    logger.info(`[Admin] Fixed decimals for ${updated} seeds`);
    res.json({ success: true, updated, total: seeds.length });
  } catch (error: any) {
    logger.error('[Admin] Decimal-Fix Fehler:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// API ROUTES
// ==========================================
app.use('/api/prices/affiliate', affiliateRoutes);
app.use('/api/prices', pricesRoutes);
app.use('/api/alerts', alertsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
  // Sentry error handler (muss vor allen anderen Error-Handlern stehen)
  Sentry.setupExpressErrorHandler(app);
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('[Server] Error:', err);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize WebSocket
websocketService.initialize(httpServer);

// ==========================================
// SERVER START
// ==========================================

async function start() {
  try {
    logger.info('[Server] Starte Price Service v2.0 (Hybrid)...');

    // Connect databases
    await Promise.all([
      connectMongoDB(),
      connectRedis()
    ]);

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`[Server] Price Service läuft auf Port ${PORT}`);
      logger.info(`[Server] WebSocket bereit auf ws://localhost:${PORT}`);
      logger.info(`[Server] Registrierte Feeds: ${getFeedSlugs().join(', ')}`);
    });

    // ==========================================
    // SCHEDULING
    // ==========================================

    // Erster Import: 30 Sekunden nach Start
    setTimeout(async () => {
      logger.info('[Scheduler] Erster Feed-Import wird gestartet...');
      try {
        await scheduleAllFeeds();
      } catch (error) {
        logger.error('[Scheduler] Erster Import fehlgeschlagen:', error);
      }
    }, 30 * 1000);

    // Täglicher Import um 02:00 Uhr
    const now = new Date();
    let scheduledTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      2, 0, 0
    );

    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const msUntilScheduled = scheduledTime.getTime() - now.getTime();

    setTimeout(() => {
      scheduleAllFeeds();
      setInterval(() => {
        scheduleAllFeeds();
      }, 24 * 60 * 60 * 1000);
    }, msUntilScheduled);

    logger.info(`[Scheduler] Täglicher Import geplant: ${scheduledTime.toISOString()}`);

    // Alert-Check alle 30 Minuten
    const CHECK_INTERVAL = 30 * 60 * 1000;
    setInterval(async () => {
      try {
        const count = await alertService.checkAlerts();
        logger.info(`[AlertCron] ${count} Alarme geprüft`);
      } catch (error) {
        logger.error('[AlertCron] Fehler:', error);
      }
    }, CHECK_INTERVAL);
    // Einmal sofort beim Start (nach 10s Delay)
    setTimeout(() => {
      alertService.checkAlerts().catch(err => logger.error('[AlertCron] Initial check failed:', err));
    }, 10000);

    // Abgelaufene Preise alle 6 Stunden bereinigen
    setInterval(async () => {
      try {
        await priceService.cleanExpiredPrices();
      } catch (error) {
        logger.error('[Server] Preis-Cleanup fehlgeschlagen:', error);
      }
    }, 6 * 60 * 60 * 1000);

    // Seedfinder Enrichment — täglich um 02:00 Uhr
    const scheduleEnrichment = () => {
      const now = new Date();
      const next = new Date();
      next.setHours(2, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const delay = next.getTime() - now.getTime();

      setTimeout(async () => {
        try {
          const enrichedCount = await seedfinderEnrichment.enrichAllMissingFlavors();
          logger.info(`[EnrichmentCron] ${enrichedCount} Seeds angereichert`);
        } catch (error) {
          logger.error('[EnrichmentCron] Fehler:', error);
        }
        scheduleEnrichment(); // Reschedule for next day
      }, delay);
    };
    scheduleEnrichment();

    logger.info('[Server] Price Service v2.0 (Hybrid) bereit!');

  } catch (error) {
    logger.error('[Server] Start fehlgeschlagen:', error);
    process.exit(1);
  }
}

async function shutdown() {
  logger.info('[Server] Shutdown...');

  httpServer.close(() => {
    logger.info('[Server] HTTP Server gestoppt');
  });

  await Promise.all([
    disconnectMongoDB(),
    disconnectRedis()
  ]);

  logger.info('[Server] Shutdown abgeschlossen');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[Server] Unhandled Rejection:', reason);
});

start();
