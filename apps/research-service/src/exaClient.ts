// /apps/research-service/src/exaClient.ts
//
// Budget-Guard + Redis-Cache-Wrapper um exa-js.
//
// Verhalten ohne EXA_API_KEY (inaktiver Modus):
//   - Der Service stürzt NICHT ab. Beim Start wird eine klare Warnung geloggt.
//   - Jeder Aufruf von guardedSearch() wirft eine ExaInactiveError.
//   - Die Routen fangen diese ab und antworten mit HTTP 503.
//
// Budget-Guard-Logik (Monatszähler, Redis-Cache 3 Tage, MONTHLY_REQUEST_LIMIT=900)
// stammt 1:1 aus SF1-Exa-Integration-Plan.md. Einzige Anpassung: die set()-Aufrufe
// nutzen die ioredis-Signatur `set(key, val, 'EX', seconds)` statt der node-redis-v4-
// Objekt-Signatur `{ EX: n }` — die Cache-/Limit-Logik selbst ist unverändert.

import Exa from 'exa-js';
import { redisClient } from './config/redis';
import { logger } from './utils/logger';

const MONTHLY_REQUEST_LIMIT = Number(process.env.EXA_MONTHLY_REQUEST_LIMIT) || 900;
const EXA_API_KEY = process.env.EXA_API_KEY;

/**
 * Fehler, der geworfen wird, wenn der Service ohne EXA_API_KEY betrieben wird.
 * Wird von den Routen erkannt und in ein HTTP 503 übersetzt.
 */
export class ExaInactiveError extends Error {
  public readonly code = 'EXA_INACTIVE';
  constructor(message = 'EXA_API_KEY nicht gesetzt - research-service läuft im inaktiven Modus') {
    super(message);
    this.name = 'ExaInactiveError';
  }
}

/**
 * Fehler bei erreichtem Monatslimit.
 */
export class ExaBudgetError extends Error {
  public readonly code = 'EXA_BUDGET_EXCEEDED';
  constructor(message: string) {
    super(message);
    this.name = 'ExaBudgetError';
  }
}

// Exa-Client nur instanziieren, wenn ein Key vorhanden ist.
const exa = EXA_API_KEY ? new Exa(EXA_API_KEY) : null;

/**
 * true, wenn ein EXA_API_KEY gesetzt ist und der Service aktiv arbeiten kann.
 */
export function isExaActive(): boolean {
  return exa !== null;
}

/**
 * Beim Start aufrufen: loggt eine kontrollierte Warnung, wenn kein Key gesetzt ist.
 * Wirft NICHT (kein Crash) — der Service startet trotzdem und antwortet mit 503.
 */
export function assertExaConfigured(): void {
  if (!isExaActive()) {
    logger.warn('EXA_API_KEY nicht gesetzt - research-service läuft im inaktiven Modus (Routen antworten mit HTTP 503)');
  } else {
    logger.info(`Exa aktiv (Monatslimit: ${MONTHLY_REQUEST_LIMIT} Requests)`);
  }
}

export interface GuardedSearchOptions {
  numResults?: number;
  category?: string;
  [key: string]: unknown;
}

/**
 * Budget-Guard + Cache-Wrapper um exa.searchAndContents().
 *
 * - Cache-Hit (Redis, 3 Tage TTL) → sofortige Rückgabe, kein API-Request.
 * - Monatszähler in Redis; bei Erreichen von MONTHLY_REQUEST_LIMIT → ExaBudgetError.
 * - Ohne EXA_API_KEY → ExaInactiveError (kein Live-Request).
 */
export async function guardedSearch(query: string, opts: GuardedSearchOptions = {}) {
  if (!exa) {
    throw new ExaInactiveError();
  }

  const monthKey = new Date().toISOString().slice(0, 7);
  const counterKey = `exa:requests:${monthKey}`;
  const cacheKey = `exa:cache:${Buffer.from(query + JSON.stringify(opts)).toString('base64')}`;

  const cached = await redisClient.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const currentCount = Number(await redisClient.get(counterKey)) || 0;
  if (currentCount >= MONTHLY_REQUEST_LIMIT) {
    throw new ExaBudgetError(`Exa Monatslimit erreicht (${MONTHLY_REQUEST_LIMIT} von 1.000 Frei-Requests).`);
  }

  // opts wird bewusst generisch gehalten (z. B. category='company'); an dieser
  // Grenze auf die exa-js-Optionssignatur casten.
  const searchOpts = { numResults: 10, ...opts } as Parameters<typeof exa.searchAndContents>[1];
  const result = await exa.searchAndContents(query, searchOpts);

  await redisClient.incr(counterKey);
  await redisClient.expire(counterKey, 60 * 60 * 24 * 32);
  await redisClient.set(cacheKey, JSON.stringify(result), 'EX', 60 * 60 * 24 * 3);

  return result;
}
