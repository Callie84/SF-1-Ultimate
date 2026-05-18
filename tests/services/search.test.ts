import { describe, it, expect } from 'vitest';
import { searchClient, safeGet } from '../helpers/client.js';
import { logPass, logFail } from '../helpers/logger.js';

const SVC = 'search';

describe('search-service', () => {
  it('Analytics-Endpoint erreichbar — gibt 401 (Auth required)', async () => {
    const res = await safeGet(searchClient, '/api/search/analytics');
    try {
      expect([200, 401]).toContain(res?.status);
      logPass(SVC, 'analytics-reachable');
    } catch (e: any) {
      logFail(SVC, 'analytics-reachable', `Status ${res?.status}`);
      throw e;
    }
  });

  it('Strain-Suggest "amnesia" — gibt 200 zurück', async () => {
    const res = await safeGet(searchClient, '/api/search/strains/suggest?q=amnesia');
    try {
      expect(res?.status).toBe(200);
      logPass(SVC, 'strain-suggest');
    } catch (e: any) {
      logFail(SVC, 'strain-suggest', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });

  it('Globale Suche "haze" — gibt 200 zurück', async () => {
    const res = await safeGet(searchClient, '/api/search/?q=haze');
    try {
      expect(res?.status).toBe(200);
      logPass(SVC, 'global-search');
    } catch (e: any) {
      logFail(SVC, 'global-search', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });
});
