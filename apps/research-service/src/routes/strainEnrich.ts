// /apps/research-service/src/routes/strainEnrich.ts
//
// Stub für spätere Phase (Strain-Anreicherung via Exa). Aktuell nicht implementiert.

import { Router, Request, Response } from 'express';

export const strainEnrichRouter = Router();

strainEnrichRouter.all('/', (_req: Request, res: Response) => {
  return res.status(501).json({
    error: 'NOT_IMPLEMENTED',
    message: 'strain-enrichment ist noch nicht implementiert (spätere Phase)',
  });
});
