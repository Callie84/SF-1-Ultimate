// /apps/research-service/src/routes/partners.ts
//
// Route: POST /partners — Company-Search über Exa (category='company').
// Ohne EXA_API_KEY antwortet die Route mit HTTP 503.
//
// ToS-4.2a-Fix (2026-07-17): Rohe Exa-Ergebnisse werden NICHT mehr direkt
// zurückgegeben, sondern in MongoDB (partner_candidates) gespeichert. Der
// Aufrufer bekommt nur ein gefiltertes DTO + die interne candidateId.

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { guardedSearch, ExaInactiveError, ExaBudgetError } from '../exaClient';
import { logger } from '../utils/logger';
import { PartnerCandidate } from '../models/PartnerCandidate.model';

export const partnersRouter = Router();

const partnerSearchSchema = z.object({
  query: z.string().min(3, 'query muss mindestens 3 Zeichen lang sein'),
  numResults: z.number().int().min(1).max(25).optional(),
});

// Nur unbedenkliche Felder für die Antwort an den Aufrufer — kein Volltext
// (`text`), keine internen Exa-Metadaten, keine Scores.
function toPublicDTO(candidateId: string, exaResult: any) {
  const results = Array.isArray(exaResult?.results) ? exaResult.results : [];
  return {
    candidateId,
    resultCount: results.length,
    items: results.map((r: any) => ({
      title: r.title ?? null,
      url: r.url ?? null,
      publishedDate: r.publishedDate ?? null,
    })),
  };
}

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

    const resultCount = Array.isArray((result as any)?.results)
      ? (result as any).results.length
      : 0;

    const candidate = await PartnerCandidate.create({
      query,
      category: 'company',
      rawResult: result,
      resultCount,
    });

    return res.json(toPublicDTO(candidate.id, result));
  } catch (err) {
    if (err instanceof ExaInactiveError) {
      logger.warn(`[partners] Anfrage abgelehnt (inaktiver Modus): ${err.message}`);
      return res.status(503).json({ error: err.code, message: err.message });
    }
    if (err instanceof ExaBudgetError) {
      logger.warn(`[partners] Budget-Limit: ${err.message}`);
      return res.status(429).json({ error: err.code, message: err.message });
    }
    logger.error('[partners] Unerwarteter Fehler', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Interner Fehler bei der Partner-Suche',
    });
  }
});

// GET /partners — Liste aller Kandidaten, rawResult explizit ausgeschlossen.
partnersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const candidates = await PartnerCandidate.find({}, { rawResult: 0 }).sort({
      createdAt: -1,
    });
    return res.json({ count: candidates.length, candidates });
  } catch (err) {
    logger.error('[partners] Fehler beim Laden der Kandidatenliste', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Interner Fehler' });
  }
});

// GET /partners/:id/raw — Rohdaten NUR intern (research-service hat
// traefik.enable=false, ist also nicht öffentlich erreichbar).
partnersRouter.get('/:id/raw', async (req: Request, res: Response) => {
  try {
    const candidate = await PartnerCandidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Kandidat nicht gefunden' });
    }
    return res.json(candidate);
  } catch (err) {
    logger.error('[partners] Fehler beim Laden der Rohdaten', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Interner Fehler' });
  }
});
