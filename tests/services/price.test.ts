import { describe, it, expect } from 'vitest';
import { priceClient, safeGet } from '../helpers/client.js';
import { logPass, logFail } from '../helpers/logger.js';

const SVC = 'price';

describe('price-service', () => {
  it('Today-Preise — gibt prices-Array zurück', async () => {
    const res = await safeGet(priceClient, '/api/prices/today');
    try {
      expect(res?.status).toBe(200);
      expect(Array.isArray(res?.data.prices)).toBe(true);
      logPass(SVC, 'today-prices');
    } catch (e: any) {
      logFail(SVC, 'today-prices', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });

  it('Preis-Suche nach "white widow" — gibt 200 zurück', async () => {
    const res = await safeGet(priceClient, '/api/prices/search?q=white+widow');
    try {
      expect(res?.status).toBe(200);
      logPass(SVC, 'price-search');
    } catch (e: any) {
      logFail(SVC, 'price-search', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });

  it('Browse — gibt paginierte Liste zurück', async () => {
    const res = await safeGet(priceClient, '/api/prices/browse?page=1&limit=10');
    try {
      expect(res?.status).toBe(200);
      logPass(SVC, 'price-browse');
    } catch (e: any) {
      logFail(SVC, 'price-browse', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });

  it('Trending — gibt Liste zurück', async () => {
    const res = await safeGet(priceClient, '/api/prices/trending');
    try {
      expect(res?.status).toBe(200);
      logPass(SVC, 'price-trending');
    } catch (e: any) {
      logFail(SVC, 'price-trending', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });
});
