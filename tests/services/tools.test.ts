import { describe, it, expect, afterAll } from 'vitest';
import { toolsClient, safePost } from '../helpers/client.js';
import { logPass, logFail } from '../helpers/logger.js';

const SVC = 'tools';

afterAll(() => {
  // Kein Cleanup nötig — Rechner schreiben keine Daten
});

describe('tools-service — VPD-Rechner', () => {
  it('25°C / 60% RH ergibt VPD ~0.91 (optimal)', async () => {
    const res = await safePost(toolsClient, '/api/tools/vpd', {
      temperature: 25,
      humidity: 60,
    });
    try {
      expect(res?.status).toBe(200);
      expect(res?.data.result.vpd).toBeCloseTo(0.91, 1);
      expect(res?.data.result.status).toBe('optimal');
      logPass(SVC, 'vpd-optimal');
    } catch (e: any) {
      logFail(SVC, 'vpd-optimal', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });

  it('35°C / 30% RH ergibt VPD > 1.5 (high)', async () => {
    const res = await safePost(toolsClient, '/api/tools/vpd', {
      temperature: 35,
      humidity: 30,
    });
    try {
      expect(res?.status).toBe(200);
      expect(res?.data.result.status).toBe('high');
      logPass(SVC, 'vpd-high');
    } catch (e: any) {
      logFail(SVC, 'vpd-high', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });
});

describe('tools-service — EC/PPM-Rechner', () => {
  it('EC 1.5 ergibt PPM (500-Skala) = 750', async () => {
    const res = await safePost(toolsClient, '/api/tools/ec-ppm', {
      value: 1.5,
      unit: 'ec',
    });
    try {
      expect(res?.status).toBe(200);
      expect(res?.data.result.ppm500).toBeCloseTo(750, 0);
      logPass(SVC, 'ec-ppm-500');
    } catch (e: any) {
      logFail(SVC, 'ec-ppm-500', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });
});

describe('tools-service — DLI-Rechner', () => {
  it('600 PPFD / 18h/Tag ergibt DLI ~38.9', async () => {
    const res = await safePost(toolsClient, '/api/tools/dli', {
      ppfd: 600,
      hoursPerDay: 18,
    });
    try {
      expect(res?.status).toBe(200);
      expect(res?.data.result.dli).toBeCloseTo(38.9, 1);
      logPass(SVC, 'dli-18h');
    } catch (e: any) {
      logFail(SVC, 'dli-18h', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });
});

describe('tools-service — PPFD-Rechner', () => {
  it('LED 600W / 60cm Abstand ergibt PPFD > 0', async () => {
    const res = await safePost(toolsClient, '/api/tools/ppfd', {
      lightType: 'led',
      wattage: 600,
      distance: 60,
    });
    try {
      expect(res?.status).toBe(200);
      expect(res?.data.result.ppfd).toBeGreaterThan(0);
      logPass(SVC, 'ppfd-600w');
    } catch (e: any) {
      logFail(SVC, 'ppfd-600w', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });
});

describe('tools-service — Power-Cost-Rechner', () => {
  it('600W / 18h / 0.30€/kWh ergibt Monatskosten > 0', async () => {
    const res = await safePost(toolsClient, '/api/tools/power-cost', {
      wattage: 600,
      hoursPerDay: 18,
      electricityRate: 0.30,
    });
    try {
      expect(res?.status).toBe(200);
      expect(res?.data.result.monthlyCost).toBeGreaterThan(0);
      logPass(SVC, 'power-cost');
    } catch (e: any) {
      logFail(SVC, 'power-cost', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });
});

describe('tools-service — CO2-Rechner', () => {
  it('1.5×2.0×2.5m Zelt / 1200ppm ergibt CO2-Bedarf > 0', async () => {
    const res = await safePost(toolsClient, '/api/tools/co2', {
      tentWidth: 1.5,
      tentDepth: 2.0,
      tentHeight: 2.5,
      targetPPM: 1200,
    });
    try {
      expect(res?.status).toBe(200);
      expect(res?.data.result.requiredCO2PerDay).toBeGreaterThan(0);
      logPass(SVC, 'co2-tent');
    } catch (e: any) {
      logFail(SVC, 'co2-tent', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });
});
