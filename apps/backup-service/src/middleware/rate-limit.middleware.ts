import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Instanzen werden beim Modulload erstellt (nicht lazy) — express-rate-limit Anforderung
const _globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown',
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Zu viele Anfragen. Bitte warte kurz.',
      retryAfter: 60,
    });
  },
  skip: (req) => {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '';
    const cleanIp = ip.replace('::ffff:', '');
    return req.path === '/health' || req.path === '/metrics' || cleanIp.startsWith('172.28.');
  },
});

const _strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown',
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Zu viele Versuche. Bitte warte 15 Minuten.',
      retryAfter: 900,
    });
  },
});

/**
 * Globales Rate Limiting — 200 Requests pro 15 Minuten pro IP
 */
export function globalRateLimit(req: Request, res: Response, next: NextFunction) {
  return _globalLimiter(req, res, next);
}

/**
 * Strenges Rate Limiting — 20 Requests pro 15 Minuten pro IP
 * Für sensible Endpoints (Login, Register, Password Reset)
 */
export function strictRateLimit(req: Request, res: Response, next: NextFunction) {
  return _strictLimiter(req, res, next);
}

