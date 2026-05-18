import { describe, it, expect, beforeAll } from 'vitest';
import { aiClient, safeGet } from '../helpers/client.js';
import { logPass, logFail } from '../helpers/logger.js';

const SVC = 'ai';
let aiAvailable = false;

beforeAll(async () => {
  const res = await safeGet(aiClient, '/health');
  aiAvailable = res !== null;
  if (!aiAvailable) {
    console.warn('[ai-service] nicht erreichbar (Port 3010) — Tests werden übersprungen');
  }
});

describe('ai-service', () => {
  it('Health-Endpoint — gibt status zurück', async (ctx) => {
    if (!aiAvailable) return ctx.skip();
    const res = await safeGet(aiClient, '/health');
    try {
      expect(res?.status).toBe(200);
      expect(res?.data).toHaveProperty('status');
      expect(['healthy', 'degraded']).toContain(res?.data.status);
      logPass(SVC, 'health');
    } catch (e: any) {
      logFail(SVC, 'health', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });

  it('Common-Diagnoses — erreichbar (200 oder 401)', async (ctx) => {
    if (!aiAvailable) return ctx.skip();
    const res = await safeGet(aiClient, '/api/ai/diagnose/common');
    try {
      expect([200, 401]).toContain(res?.status);
      logPass(SVC, 'common-diagnoses-reachable');
    } catch (e: any) {
      logFail(SVC, 'common-diagnoses-reachable', `Status ${res?.status}`);
      throw e;
    }
  });
});
