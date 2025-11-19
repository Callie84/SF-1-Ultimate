/**
 * SF-1 Ultimate - Scraper Service Admin Routes (SECURED)
 * ========================================================
 * 
 * Datei: admin.routes.ts
 * Speicherort: /SF-1-Ultimate/scraper-service/src/routes/
 * Service: scraper-service (Port 3003)
 * 
 * ALLE Admin-Endpunkte sind durch adminMiddleware geschützt!
 * Nur Users mit role='admin' können zugreifen.
 */

import { Router, Response } from 'express';
import { adminMiddleware, AuthRequest, rateLimitMiddleware } from '../middleware/auth.middleware';
import { scheduleScrapeJob, getScrapeStatus, cancelScrapeJob } from '../services/scraper.service';
import { body, param, validationResult } from 'express-validator';

const router = Router();

// ============================================
// ALLE ROUTES UNTER /admin SIND GESCHÜTZT!
// ============================================
router.use(adminMiddleware(true)); // Gilt für alle folgenden Routes

/**
 * @route   POST /admin/scrape/:seedbank
 * @desc    Startet manuelles Scraping für eine Seedbank
 * @access  Admin only
 * @rateLimit 10 Requests pro Minute (verhindert DoS)
 */
router.post(
  '/scrape/:seedbank',
  rateLimitMiddleware(10, 60000), // Max 10 Scrapes pro Minute
  [
    param('seedbank')
      .isIn(['seedfinder', 'seedsman', 'attitude', 'sensiseeds', 'barneys'])
      .withMessage('Invalid seedbank. Allowed: seedfinder, seedsman, attitude, sensiseeds, barneys')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      // Validierung
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array() 
        });
      }

      const { seedbank } = req.params;
      const { priority = 'normal', fullRescrape = false } = req.body;

      // Log Admin-Action
      console.log(`🔐 Admin ${req.user?.email} triggered scraping for ${seedbank}`);

      // Prüfe ob bereits ein Scrape läuft
      const existingJob = await getScrapeStatus(seedbank);
      if (existingJob && existingJob.status === 'running') {
        return res.status(409).json({
          error: 'Scraping already in progress',
          jobId: existingJob.id,
          startedAt: existingJob.startedAt,
          progress: existingJob.progress
        });
      }

      // Starte Scraping-Job
      const job = await scheduleScrapeJob({
        seedbank,
        priority,
        fullRescrape,
        triggeredBy: {
          userId: req.user!.id,
          email: req.user!.email,
          timestamp: new Date()
        }
      });

      return res.status(202).json({
        message: `Scraping für ${seedbank} gestartet`,
        job: {
          id: job.id,
          seedbank: job.seedbank,
          status: job.status,
          estimatedDuration: job.estimatedDuration,
          startedAt: job.startedAt
        },
        startedBy: req.user!.email
      });

    } catch (error) {
      console.error('Scraping trigger failed:', error);
      return res.status(500).json({ 
        error: 'Scraping konnte nicht gestartet werden',
        details: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      });
    }
  }
);

/**
 * @route   GET /admin/scrape/status
 * @desc    Zeigt Status aller laufenden Scraping-Jobs
 * @access  Admin only
 */
router.get('/scrape/status', async (req: AuthRequest, res: Response) => {
  try {
    const jobs = await getScrapeStatus(); // Alle Jobs

    return res.status(200).json({
      jobs: jobs.map(job => ({
        id: job.id,
        seedbank: job.seedbank,
        status: job.status,
        progress: job.progress,
        strainsScraped: job.strainsScraped,
        startedAt: job.startedAt,
        estimatedCompletion: job.estimatedCompletion,
        triggeredBy: job.triggeredBy?.email || 'system'
      })),
      totalJobs: jobs.length,
      runningJobs: jobs.filter(j => j.status === 'running').length,
      queuedJobs: jobs.filter(j => j.status === 'queued').length
    });

  } catch (error) {
    console.error('Status fetch failed:', error);
    return res.status(500).json({ error: 'Status konnte nicht abgerufen werden' });
  }
});

/**
 * @route   DELETE /admin/scrape/:jobId
 * @desc    Bricht einen laufenden Scraping-Job ab
 * @access  Admin only
 */
router.delete(
  '/scrape/:jobId',
  [
    param('jobId').isMongoId().withMessage('Invalid job ID')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array() 
        });
      }

      const { jobId } = req.params;

      // Log Admin-Action
      console.log(`🔐 Admin ${req.user?.email} cancelled job ${jobId}`);

      // Stoppe Job
      const cancelled = await cancelScrapeJob(jobId);

      if (!cancelled) {
        return res.status(404).json({ error: 'Job not found or already completed' });
      }

      return res.status(200).json({
        message: 'Job erfolgreich abgebrochen',
        jobId,
        cancelledBy: req.user!.email,
        cancelledAt: new Date()
      });

    } catch (error) {
      console.error('Job cancellation failed:', error);
      return res.status(500).json({ error: 'Job konnte nicht abgebrochen werden' });
    }
  }
);

/**
 * @route   POST /admin/scrape/schedule
 * @desc    Erstellt einen geplanten Scraping-Job (Cron-Style)
 * @access  Admin only
 */
router.post(
  '/scrape/schedule',
  [
    body('seedbank').isIn(['seedfinder', 'seedsman', 'attitude', 'sensiseeds', 'barneys']),
    body('cronExpression').matches(/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/)
      .withMessage('Invalid cron expression')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array() 
        });
      }

      const { seedbank, cronExpression, enabled = true } = req.body;

      // TODO: Implement scheduled jobs in scheduler-service
      
      return res.status(201).json({
        message: 'Scheduled job created',
        schedule: {
          seedbank,
          cronExpression,
          enabled,
          createdBy: req.user!.email
        }
      });

    } catch (error) {
      console.error('Schedule creation failed:', error);
      return res.status(500).json({ error: 'Schedule konnte nicht erstellt werden' });
    }
  }
);

/**
 * @route   GET /admin/stats
 * @desc    Zeigt Scraping-Statistiken
 * @access  Admin only
 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    // TODO: Implement stats aggregation
    
    return res.status(200).json({
      totalStrains: 0,
      lastScrape: null,
      avgScrapeTime: 0,
      successRate: 0
    });

  } catch (error) {
    console.error('Stats fetch failed:', error);
    return res.status(500).json({ error: 'Stats konnten nicht abgerufen werden' });
  }
});

/**
 * @route   POST /admin/config
 * @desc    Aktualisiert Scraper-Konfiguration
 * @access  Admin only
 */
router.post(
  '/config',
  [
    body('userAgent').optional().isString(),
    body('rateLimit').optional().isInt({ min: 1, max: 1000 }),
    body('timeout').optional().isInt({ min: 1000, max: 60000 }),
    body('retries').optional().isInt({ min: 0, max: 10 })
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array() 
        });
      }

      const config = req.body;

      // Log Admin-Action
      console.log(`🔐 Admin ${req.user?.email} updated scraper config:`, config);

      // TODO: Implement config update
      
      return res.status(200).json({
        message: 'Config updated',
        config,
        updatedBy: req.user!.email
      });

    } catch (error) {
      console.error('Config update failed:', error);
      return res.status(500).json({ error: 'Config konnte nicht aktualisiert werden' });
    }
  }
);

export default router;
