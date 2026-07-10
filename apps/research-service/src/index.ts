// /apps/research-service/src/index.ts
//
// Research Service — Exa.ai-Integration für SF-1 Ultimate.
// Läuft rein intern (kein öffentliches Traefik-Routing). Ohne EXA_API_KEY
// startet der Service im inaktiven Modus und antwortet auf die Such-Routen
// mit HTTP 503 statt abzustürzen.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { logger } from './utils/logger';
import { isExaActive, assertExaConfigured } from './exaClient';
import { partnersRouter } from './routes/partners';
import { priceWatchRouter } from './routes/priceWatch';
import { strainEnrichRouter } from './routes/strainEnrich';

const app = express();
const PORT = Number(process.env.PORT) || 3010;

// Kontrollierte Start-Prüfung: loggt Warnung, wenn EXA_API_KEY fehlt (kein Crash).
assertExaConfigured();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'https://seedfinderpro.de',
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// ==========================================
// HEALTH (Traefik-/Docker-kompatibel)
// ==========================================
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'research-service',
    version: '1.0.0',
    mode: isExaActive() ? 'active' : 'inactive',
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// ROUTES
// ==========================================
app.use('/partners', partnersRouter);
app.use('/price-watch', priceWatchRouter);
app.use('/strain-enrich', strainEnrichRouter);

// 404-Fallback
app.use((_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route nicht gefunden' });
});

const server = app.listen(PORT, () => {
  logger.info(`research-service läuft auf Port ${PORT} (Modus: ${isExaActive() ? 'active' : 'inactive'})`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`${signal} empfangen - fahre research-service herunter`);
  server.close(() => {
    logger.info('research-service beendet');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
