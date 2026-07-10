// /apps/research-service/src/routes/partners.ts
//
// Stub-Route: POST /partners
// Company-Search über Exa (category='company'). Aktuell nur mit echtem
// EXA_API_KEY lauffähig; ohne Key antwortet die Route sauber mit HTTP 503.

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { guardedSearch, ExaInactiveError, ExaBudgetError } from '../exaClient';
import { logger } from '../utils/logger';

export const partnersRouter = Router();

const partnerSearchSchema = z.object({
  query: z.string().min(3, 'query muss mindestens 3 Zeichen lang sein'),
  numResults: z.number().int().min(1).max(25).optional(),
});

partnersRouter.post('/', async (req: Request, res: Response) => {
  const parsed = partnerSearchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Ungültige Eingabe',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { query, numResults } = parsed.data;

  try {
    const result = await guardedSearch(query, {
      category: 'company',
      ...(numResults ? { numResults } : {}),
    });
    return res.json({ query, category: 'company', result });
  } catch (err) {
    if (err instanceof ExaInactiveError) {
      logger.warn(`[partners] Anfrage abgelehnt (inaktiver Modus): ${err.message}`);
      return res.status(503).json({
        error: err.code,
        message: err.message,
      });
    }
    if (err instanceof ExaBudgetError) {
      logger.warn(`[partners] Budget-Limit: ${err.message}`);
      return res.status(429).json({
        error: err.code,
        message: err.message,
      });
    }
    logger.error('[partners] Unerwarteter Fehler', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Interner Fehler bei der Partner-Suche',
    });
  }
});
