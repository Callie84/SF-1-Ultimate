// /apps/research-service/src/middleware/rate-limit.middleware.ts
//
// Rate-Limiting für die DB-zugreifenden Routen des research-service.
// Muster/Config gespiegelt aus backup-service/community-service (express-rate-limit v7).
// Der Limiter wird als Instanz exportiert und direkt via router.use() eingehängt.

import rateLimit from 'express-rate-limit';

// Instanz beim Modulload erstellen (nicht lazy) — express-rate-limit-Anforderung.
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 200, // 200 Requests pro Fenster pro IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown',
  handler: (_req, res) => {
    res.status(429).json({
      error: 'RATE_LIMITED',
      message: 'Zu viele Anfragen. Bitte warte kurz.',
      retryAfter: 60,
    });
  },
  // Interne Service-zu-Service-Calls (Docker-Netz) nicht drosseln.
  skip: (req) => {
    const ip = ((req.headers['x-forwarded-for'] as string) || req.ip || '').replace('::ffff:', '');
    return ip.startsWith('172.28.');
  },
});
