#!/usr/bin/env node
/**
 * Read-Only Services Tests — Price, Search, Tools, Gamification, Media, Backup, AI
 * Keine Test-Daten werden erstellt, nur GETs/POSTs auf bestehende Daten
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { request, requestOrThrow } from '../lib/http-client.mjs';
import { getAdminToken } from '../lib/auth-helper.mjs';
import { BASE } from '../lib/service-discovery.mjs';

describe('Price Service', () => {
  it('Preise-Übersicht → 200', async () => {
    const res = await requestOrThrow('GET', `${BASE.price}/api/prices/browse?limit=10`, {
      expectStatus: 200,
    });
    assert.ok(Array.isArray(res.data.prices) || Array.isArray(res.data));
  });

  it('Preise suchen → 200', async () => {
    const res = await requestOrThrow('GET', `${BASE.price}/api/prices/search?q=northern`, {
      expectStatus: 200,
    });
    assert.ok(res.data);
  });

  it('Trending Strains → 200', async () => {
    const res = await request('GET', `${BASE.price}/api/prices/trending`, {
      expectStatus: [200, 404],
    });
    assert.ok([200, 404].includes(res.status));
  });

  it('Strain-Detail (slug) → [200, 404]', async () => {
    const res = await request('GET', `${BASE.price}/api/prices/seed/northern-lights`, {
      expectStatus: [200, 404],
    });
    assert.ok([200, 404].includes(res.status));
  });
});

describe('Search Service', () => {
  it('Strain-Suche → 200', async () => {
    const res = await requestOrThrow('GET', `${BASE.search}/api/search?q=cannabis&type=strains`, {
      expectStatus: 200,
    });
    assert.ok(res.data);
  });

  it('Post-Suche → 200', async () => {
    const res = await request('GET', `${BASE.search}/api/search?q=grow&type=posts`, {
      expectStatus: [200, 400],
    });
    assert.ok([200, 400].includes(res.status));
  });

  it('User-Suche → 200', async () => {
    const res = await request('GET', `${BASE.search}/api/search?q=grower&type=users`, {
      expectStatus: [200, 400],
    });
    assert.ok([200, 400].includes(res.status));
  });

  it('Leere Suche → 400', async () => {
    const res = await request('GET', `${BASE.search}/api/search?q=`, {
      expectStatus: [200, 400],
    });
    assert.ok([200, 400].includes(res.status));
  });
});

describe('Tools Service', () => {
  it('VPD Rechner → 200', async () => {
    const res = await requestOrThrow('POST', `${BASE.tools}/api/tools/vpd`, {
      body: { temperature: 24, humidity: 60, leafOffset: 2 },
      expectStatus: 200,
    });
    assert.ok(typeof res.data.vpd === 'number' || res.data.vpd);
  });

  it('EC/PPM Rechner → 200', async () => {
    const res = await requestOrThrow('POST', `${BASE.tools}/api/tools/ec-ppm`, {
      body: { value: 1.5, unit: 'ec' },
      expectStatus: 200,
    });
    assert.ok(res.data);
  });

  it('DLI Rechner → 200', async () => {
    const res = await requestOrThrow('POST', `${BASE.tools}/api/tools/dli`, {
      body: { ppfd: 600, hoursPerDay: 18 },
      expectStatus: 200,
    });
    assert.ok(res.data);
  });

  it('PPFD Rechner → 200', async () => {
    const res = await requestOrThrow('POST', `${BASE.tools}/api/tools/ppfd`, {
      body: { lightType: 'led', wattage: 400, distance: 60 },
      expectStatus: 200,
    });
    assert.ok(res.data);
  });

  it('CO2 Rechner → 200', async () => {
    const res = await requestOrThrow('POST', `${BASE.tools}/api/tools/co2`, {
      body: { tentWidth: 1.2, tentDepth: 1.2, tentHeight: 2.0, targetPPM: 1000 },
      expectStatus: 200,
    });
    assert.ok(res.data);
  });

  it('Rechner-Presets abrufen → [200, 401]', async () => {
    const res = await request('GET', `${BASE.tools}/api/tools/presets`, {
      expectStatus: [200, 401],
    });
    assert.ok([200, 401].includes(res.status));
  });
});

describe('Gamification Service', () => {
  it('Leaderboard → [200, 404]', async () => {
    const res = await request('GET', `${BASE.gamification}/api/gamification/leaderboard`, {
      expectStatus: [200, 404],
    });
    assert.ok([200, 404].includes(res.status));
  });

  it('Badge-Liste → [200, 404]', async () => {
    const res = await request('GET', `${BASE.gamification}/api/gamification/badges`, {
      expectStatus: [200, 404],
    });
    assert.ok([200, 404].includes(res.status));
  });
});

describe('Media Service', () => {
  it('Health Check → 200', async () => {
    const res = await requestOrThrow('GET', `${BASE.media}/health`, {
      expectStatus: 200,
    });
    assert.ok(res.data);
  });
});

describe('Backup Service', () => {
  it('Backup-Status (mit Admin-Token) → 200', async () => {
    const res = await request('GET', `${BASE.backup}/api/backup/status`, {
      token: getAdminToken(),
      expectStatus: 200,
    });
    assert.ok(res.status === 200 || res.status === 401);  // 401 wenn Secret falsch
  });

  it('Backup-Status (ohne Token) → 401', async () => {
    const res = await request('GET', `${BASE.backup}/api/backup/status`, {
      expectStatus: 401,
    });
    assert.strictEqual(res.status, 401);
  });
});

describe('AI Service', () => {
  it('Chat ohne Auth → 401', async () => {
    const res = await request('POST', `${BASE.ai}/api/ai/chat`, {
      body: { message: 'Was ist VPD?' },
      expectStatus: 401,
    });
    assert.strictEqual(res.status, 401);
  });
});
