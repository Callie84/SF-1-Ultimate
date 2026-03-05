// /apps/ai-service/src/utils/token-tracker.ts
import { redis } from '../config/redis';
import { COSTS } from '../config/openai';
import { logger } from './logger';

export type AIEndpoint = 'chat' | 'diagnose' | 'advice';
export type AIModel = 'gpt-4o' | 'gpt-4o-mini';

interface UsageRecord {
  model: AIModel;
  endpoint: AIEndpoint;
  inputTokens: number;
  outputTokens: number;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function calcCost(model: AIModel, inputTokens: number, outputTokens: number): number {
  const costs = model === 'gpt-4o' ? COSTS.GPT4O : COSTS.GPT4O_MINI;
  return (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output;
}

/**
 * Trackt einen OpenAI API-Call in Redis
 * Keys (TTL 90 Tage):
 *   ai:stats:daily:{date}:requests         - Gesamt-Requests
 *   ai:stats:daily:{date}:tokens:input     - Input-Tokens
 *   ai:stats:daily:{date}:tokens:output    - Output-Tokens
 *   ai:stats:daily:{date}:cost             - Kosten in USD (×10000 für Integer)
 *   ai:stats:daily:{date}:endpoint:{ep}    - Requests pro Endpoint
 *   ai:stats:daily:{date}:model:{model}:input  - Input-Tokens pro Modell
 *   ai:stats:daily:{date}:model:{model}:output - Output-Tokens pro Modell
 *   ai:stats:monthly:{month}:requests
 *   ai:stats:monthly:{month}:cost
 */
export async function trackUsage(usage: UsageRecord): Promise<void> {
  try {
    const today = getToday();
    const month = getMonth();
    const cost = calcCost(usage.model, usage.inputTokens, usage.outputTokens);
    const costInt = Math.round(cost * 10000); // Cent-Hunderstel als Integer
    const TTL = 90 * 24 * 3600; // 90 Tage

    const pipeline = redis.pipeline();

    // Tägliche Gesamt-Stats
    pipeline.incr(`ai:stats:daily:${today}:requests`);
    pipeline.incrby(`ai:stats:daily:${today}:tokens:input`, usage.inputTokens);
    pipeline.incrby(`ai:stats:daily:${today}:tokens:output`, usage.outputTokens);
    pipeline.incrby(`ai:stats:daily:${today}:cost`, costInt);

    // Pro Endpoint
    pipeline.incr(`ai:stats:daily:${today}:endpoint:${usage.endpoint}`);

    // Pro Modell
    pipeline.incrby(`ai:stats:daily:${today}:model:${usage.model}:input`, usage.inputTokens);
    pipeline.incrby(`ai:stats:daily:${today}:model:${usage.model}:output`, usage.outputTokens);

    // Monatliche Gesamt-Stats
    pipeline.incr(`ai:stats:monthly:${month}:requests`);
    pipeline.incrby(`ai:stats:monthly:${month}:cost`, costInt);

    // TTL setzen
    for (const key of [
      `ai:stats:daily:${today}:requests`,
      `ai:stats:daily:${today}:tokens:input`,
      `ai:stats:daily:${today}:tokens:output`,
      `ai:stats:daily:${today}:cost`,
      `ai:stats:daily:${today}:endpoint:${usage.endpoint}`,
      `ai:stats:daily:${today}:model:${usage.model}:input`,
      `ai:stats:daily:${today}:model:${usage.model}:output`,
    ]) {
      pipeline.expire(key, TTL);
    }

    // Monatliche Keys 400 Tage halten
    pipeline.expire(`ai:stats:monthly:${month}:requests`, 400 * 24 * 3600);
    pipeline.expire(`ai:stats:monthly:${month}:cost`, 400 * 24 * 3600);

    await pipeline.exec();
  } catch (error) {
    logger.error('[TokenTracker] Failed to track usage:', error);
    // Fail-silent: Monitoring soll den Service nicht beeinträchtigen
  }
}

/**
 * Liest Stats für ein Datum
 */
export async function getDailyStats(date: string) {
  const endpoints: AIEndpoint[] = ['chat', 'diagnose', 'advice'];
  const models: AIModel[] = ['gpt-4o', 'gpt-4o-mini'];

  const keys = [
    `ai:stats:daily:${date}:requests`,
    `ai:stats:daily:${date}:tokens:input`,
    `ai:stats:daily:${date}:tokens:output`,
    `ai:stats:daily:${date}:cost`,
    ...endpoints.map(ep => `ai:stats:daily:${date}:endpoint:${ep}`),
    ...models.map(m => `ai:stats:daily:${date}:model:${m}:input`),
    ...models.map(m => `ai:stats:daily:${date}:model:${m}:output`),
  ];

  const values = await redis.mget(...keys);

  const get = (i: number) => parseInt(values[i] || '0', 10);

  return {
    date,
    requests: get(0),
    inputTokens: get(1),
    outputTokens: get(2),
    totalTokens: get(1) + get(2),
    costUsd: get(3) / 10000,
    byEndpoint: {
      chat: get(4),
      diagnose: get(5),
      advice: get(6),
    },
    byModel: {
      'gpt-4o': {
        inputTokens: get(7),
        outputTokens: get(8),
      },
      'gpt-4o-mini': {
        inputTokens: get(9),
        outputTokens: get(10),
      },
    },
  };
}

/**
 * Liest Monatliche Stats
 */
export async function getMonthlyStats(month: string) {
  const [requests, costRaw] = await redis.mget(
    `ai:stats:monthly:${month}:requests`,
    `ai:stats:monthly:${month}:cost`,
  );
  return {
    month,
    requests: parseInt(requests || '0', 10),
    costUsd: parseInt(costRaw || '0', 10) / 10000,
  };
}

/**
 * Letzten N Tage Stats
 */
export async function getLastNDaysStats(n: number) {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const results = await Promise.all(days.map(getDailyStats));
  return results;
}
