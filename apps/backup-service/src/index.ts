import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (event.request?.headers?.['authorization']) {
      delete event.request.headers['authorization'];
    }
    if (event.request?.cookies) { event.request.cookies = {}; }
    return event;
  },
});

import express from 'express';
import cron from 'node-cron';
import jwt from 'jsonwebtoken';
import { runBackup, listBackups, deleteBackup, getStatus, verifyBackupIntegrity } from './backup';
import { globalRateLimit } from './middleware/rate-limit.middleware';

const app = express();
app.use(globalRateLimit);

app.use(express.json());

const PORT = parseInt(process.env.PORT || '3011', 10);
const BACKUP_SCHEDULE = process.env.BACKUP_SCHEDULE || '0 2 * * *';
const JWT_SECRET = process.env.JWT_SECRET || '';

const adminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as { role?: string };
    if (payload.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins' });
    }
    next();
  } catch {
    return res.status(401).json({ error: 'Ungültiger Token' });
  }
};

// Health (public)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'backup-service' });
});

// Status
app.get('/api/backup/status', adminAuth, (_req, res) => {
  res.json({
    status: getStatus(),
    schedule: BACKUP_SCHEDULE,
    retentionDays: parseInt(process.env.BACKUP_RETENTION || '7', 10),
  });
});

// List backups
app.get('/api/backup/backups', adminAuth, (_req, res) => {
  const backups = listBackups();
  res.json({ backups });
});

// Trigger manual backup
app.post('/api/backup/backups/trigger', adminAuth, (_req, res) => {
  const current = getStatus();
  if (current.running) {
    return res.status(409).json({ error: 'Ein Backup läuft bereits' });
  }
  runBackup().catch((err) => console.error('Backup-Fehler:', err.message));
  res.json({ message: 'Backup gestartet' });
});

// Verify backup integrity (HMAC check)
app.post('/api/backup/backups/:name/verify', adminAuth, (req, res) => {
  try {
    const result = verifyBackupIntegrity(req.params.name);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete backup
app.delete('/api/backup/backups/:name', adminAuth, (req, res) => {
  try {
    deleteBackup(req.params.name);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Cron-Job
cron.schedule(BACKUP_SCHEDULE, () => {
  console.log(`[Cron] Automatisches Backup gestartet (${new Date().toISOString()})`);
  runBackup()
    .then(({ name }) => console.log(`[Cron] Backup fertig: ${name}`))
    .catch((err) => console.error('[Cron] Backup-Fehler:', err.message));
});

// Sentry error handler
Sentry.setupExpressErrorHandler(app);

app.listen(PORT, () => {
  console.log(`[Backup] Service running on port ${PORT}`);
  console.log(`[Backup] Cron-Schedule: ${BACKUP_SCHEDULE}`);
});
