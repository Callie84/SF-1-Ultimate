// /apps/research-service/src/routes/priceWatch.ts
//
// Stub für spätere Phase (Preis-Beobachtung via Exa). Aktuell nicht implementiert.

import { Router, Request, Response } from 'express';

export const priceWatchRouter = Router();

priceWatchRouter.all('/', (_req: Request, res: Response) => {
  return res.status(501).json({
    error: 'NOT_IMPLEMENTED',
    message: 'price-watch ist noch nicht implementiert (spätere Phase)',
  });
});
