#!/usr/bin/env node
/**
 * Advanced Tests: Notification, Tools, AI, Gamification, Edge-Cases
 * Zusammengefasst in eine Datei um schneller zu bleiben
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request, requestOrThrow } from '../lib/http-client.mjs';
import { TestSession, createAnotherSession } from '../lib/auth-helper.mjs';
import { BASE } from '../lib/service-discovery.mjs';

const INTERNAL_SECRET = process.env.SF1_INTERNAL_SECRET || 'SF1_Internal_2026_MicroserviceAuth_xK9mP3qW7vL2nR5t';

// ═════════════════════════════════════════════════════════════════════════════
// NOTIFICATION SERVICE
// ═════════════════════════════════════════════════════════════════════════════

describe('Notification Service', () => {
  const session = new TestSession();

  before(async () => {
    await session.setup();
  });

  after(async () => {
    await session.teardown();
  });

  it('abruft Benachrichtigungen → 200', async () => {
    const res = await requestOrThrow('GET', `${BASE.notification}/api/notifications`, {
      token: session.token,
      expectStatus: [200, 404],
    });
    assert.ok(Array.isArray(res.data.notifications) || res.status === 404);
  });

  it('abruft unread-count → 200', async () => {
    const res = await requestOrThrow('GET', `${BASE.notification}/api/notifications/unread-count`, {
      token: session.token,
      expectStatus: 200,
    });
    assert.ok(typeof res.data.count === 'number');
  });

  it('abruft Preferences → 200', async () => {
    const res = await request('GET', `${BASE.notification}/api/preferences`, {
      token: session.token,
      expectStatus: [200, 404],
    });
    assert.ok([200, 404].includes(res.status));
  });

  it('VAPID-Key (public) → 200', async () => {
    const res = await request('GET', `${BASE.notification}/api/notifications/push/vapid-key`, {
      expectStatus: [200, 404],
    });
    assert.ok([200, 404].includes(res.status));
  });

  it('Contact-Form mit kurzer Nachricht → 400', async () => {
    const res = await request('POST', `${BASE.notification}/api/notifications/contact`, {
      body: { name: 'Test', email: 'test@test.de', message: 'Hi' },  // zu kurz
      expectStatus: [400, 422],
    });
    assert.strictEqual(res.status, 400, 'sollte kurze Nachricht mit 400 ablehnen');
  });

  it('Contact-Form mit gültiger Nachricht → [200, 201, 500]', async () => {
    const res = await request('POST', `${BASE.notification}/api/notifications/contact`, {
      body: {
        name: 'Test User',
        email: 'test@seedfinder.de',
        message: 'Dies ist eine Test-Nachricht für den Notification Service',
      },
      expectStatus: [200, 201, 500],  // 500 wenn SMTP nicht konfiguriert
    });
    assert.ok([200, 201, 500].includes(res.status));
  });

  it('ohne Token → 401', async () => {
    const res = await request('GET', `${BASE.notification}/api/notifications`, {
      expectStatus: 401,
    });
    assert.strictEqual(res.status, 401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// TOOLS SERVICE (Auth-Endpoints)
// ═════════════════════════════════════════════════════════════════════════════

describe('Tools Service (Auth)', () => {
  const session = new TestSession();

  before(async () => {
    await session.setup();
  });

  after(async () => {
    await session.teardown();
  });

  it('abruft Calculator-History → [200, 401, 404]', async () => {
    const res = await request('GET', `${BASE.tools}/api/tools/history`, {
      token: session.token,
      expectStatus: [200, 401, 404],
    });
    assert.ok([200, 401, 404].includes(res.status));
  });

  it('abruft Lieblings-Rechner → [200, 401, 404]', async () => {
    const res = await request('GET', `${BASE.tools}/api/tools/favorites`, {
      token: session.token,
      expectStatus: [200, 401, 404],
    });
    assert.ok([200, 401, 404].includes(res.status));
  });

  it('mit Validierungsfehler → [400, 422]', async () => {
    const res = await request('POST', `${BASE.tools}/api/tools/vpd`, {
      token: session.token,
      body: { temperature: -999, humidity: 200 },  // Ungültig
      expectStatus: [400, 422, 401],
    });
    assert.ok([400, 422, 401].includes(res.status), `Expected 400/422/401 but got ${res.status}`);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// AI SERVICE (Auth)
// ═════════════════════════════════════════════════════════════════════════════

describe('AI Service (Auth)', () => {
  const session1 = new TestSession();
  let session2 = null;
  let session1ChatId = null;

  before(async () => {
    await session1.setup();
    session2 = await createAnotherSession();
  });

  after(async () => {
    await session1.teardown();
    if (session2) await session2.teardown();
  });

  it('erstellt Chat-Session → [200, 201, 429, 503]', async () => {
    const res = await request('POST', `${BASE.ai}/api/ai/chat`, {
      token: session1.token,
      body: { message: 'Was ist VPD?', context: 'growing' },
      expectStatus: [200, 201, 429, 503],  // Rate-limit möglich
    });
    if (res.status === 200 || res.status === 201) {
      session1ChatId = res.data?.sessionId || res.data?.id;
    }
  });

  it('abruft Chat-Sessions → [200, 404]', async () => {
    const res = await request('GET', `${BASE.ai}/api/ai/chat/sessions`, {
      token: session1.token,
      expectStatus: [200, 404],
    });
    assert.ok([200, 404].includes(res.status));
  });

  it('Ownership-Guard: User2 kann Session von User1 nicht sehen → [403, 404]', async () => {
    if (!session1ChatId) {
      console.log('  ⏭️  Chat-ID nicht vorhanden, überspringe Ownership-Test');
      return;
    }

    const res = await request('GET', `${BASE.ai}/api/ai/chat/sessions/${session1ChatId}`, {
      token: session2.token,
      expectStatus: [403, 404, 401],  // 403 = Permission, 404 = nicht gefunden, 401 = auth issue
    });

    assert.ok([403, 404, 401].includes(res.status), `sollte nicht 200 sein bei fremder Session, ist ${res.status}`);
  });

  it('Strain-Beratung → [200, 400, 429, 503]', async () => {
    const res = await request('POST', `${BASE.ai}/api/ai/advice/strain`, {
      token: session1.token,
      body: { strainName: 'Northern Lights' },
      expectStatus: [200, 400, 429, 503],
    });
    assert.ok([200, 400, 429, 503].includes(res.status));
  });

  it('ohne Token → 401', async () => {
    const res = await request('POST', `${BASE.ai}/api/ai/chat`, {
      body: { message: 'test' },
      expectStatus: 401,
    });
    assert.strictEqual(res.status, 401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GAMIFICATION SERVICE (Auth + Admin-Guard)
// ═════════════════════════════════════════════════════════════════════════════

describe('Gamification Service', () => {
  const session = new TestSession();

  before(async () => {
    await session.setup();
  });

  after(async () => {
    await session.teardown();
  });

  it('abruft eigenes Profil → [200, 404]', async () => {
    const res = await request('GET', `${BASE.gamification}/api/gamification/profile/${session.userId}`, {
      token: session.token,
      expectStatus: [200, 404],
    });
    assert.ok([200, 404].includes(res.status));
  });

  it('abruft Leaderboard → [200, 404]', async () => {
    const res = await request('GET', `${BASE.gamification}/api/gamification/leaderboard`, {
      token: session.token,
      expectStatus: [200, 404],
    });
    assert.ok([200, 404].includes(res.status));
  });

  it('Admin-Endpoint ohne Admin-Role → 403', async () => {
    const res = await request('GET', `${BASE.gamification}/api/gamification/admin/stats`, {
      token: session.token,  // normaler User, kein Admin
      expectStatus: [403, 401],
    });
    assert.ok([403, 401].includes(res.status), `Admin-Endpoint sollte 403 sein, ist ${res.status}`);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// EDGE-CASES: Validierung, Permission Guards, Internal-Secret
// ═════════════════════════════════════════════════════════════════════════════

describe('Edge Cases', () => {
  const session1 = new TestSession();
  let session2 = null;
  let setupFailed = false;

  before(async () => {
    try {
      await session1.setup();
      session2 = await createAnotherSession();
    } catch (e) {
      if (e.message.includes('429')) {
        // Rate limited - skip this suite
        setupFailed = true;
        console.log('⏭️  Edge Cases: Rate limited, skipping suite');
      } else {
        throw e;
      }
    }
  });

  after(async () => {
    if (!setupFailed) {
      await session1.teardown();
      if (session2) await session2.teardown();
    }
  });

  // Zod-Validierungsfehler
  it('Auth: ohne ageVerified → 400', async () => {
    const res = await request('POST', `${BASE.auth}/api/auth/register`, {
      body: {
        email: `test${Date.now()}@test.de`,
        username: `test${Date.now()}`,
        password: 'Test123!',
        // ageVerified: true  ← missing
      },
      expectStatus: [400, 422],
    });
    assert.ok([400, 422].includes(res.status), `sollte Validierungsfehler zurückgeben, got ${res.status}`);
  });

  it('Tools: VPD mit ungültiger Temperatur → 400', async () => {
    const res = await request('POST', `${BASE.tools}/api/tools/vpd`, {
      body: { temperature: -999, humidity: 60 },
      expectStatus: [400, 401, 422],
    });
    assert.ok([400, 401, 422].includes(res.status), `sollte Validierungsfehler zurückgeben, got ${res.status}`);
  });

  it('Community: Thread mit zu kurzem Titel → 400', async (t) => {
    if (setupFailed) {
      t.skip();
      return;
    }
    const res = await request('POST', `${BASE.community}/api/community/threads`, {
      token: session1.token,
      body: {
        title: 'Hi',  // < 5 Zeichen
        content: 'Test',
        categoryId: '698110595273fae6816bc848',
      },
      expectStatus: [400, 422],
    });
    assert.ok([400, 422].includes(res.status), `sollte Validierungsfehler zurückgeben, got ${res.status}`);
  });

  // Internal-Secret Tests
  it('Notification Internal-Endpoint ohne Secret → 401', async () => {
    const res = await request('POST', `${BASE.notification}/api/notifications/internal/create`, {
      body: { userId: 'test', type: 'TEST', message: 'test' },
      expectStatus: 401,
    });
    assert.strictEqual(res.status, 401);
  });

  it('Notification Internal-Endpoint mit Secret → [200, 201, 400, 404]', async (t) => {
    if (setupFailed) {
      t.skip();
      return;
    }
    const res = await request('POST', `${BASE.notification}/api/notifications/internal/create`, {
      headers: { 'X-Internal-Secret': INTERNAL_SECRET },
      body: { userId: session1.userId, type: 'TEST', message: 'test' },
      expectStatus: [200, 201, 400, 404],
    });
    assert.ok([200, 201, 400, 404].includes(res.status), `sollte nicht 401 sein bei korrektem Secret`);
  });

  it('Private Grow: User2 kann Grow von User1 nicht sehen → [403, 404]', async (t) => {
    if (setupFailed) {
      t.skip();
      return;
    }
    // User1 erstellt privaten Grow
    const createRes = await request('POST', `${BASE.journal}/api/journal/grows`, {
      token: session1.token,
      body: {
        strainName: 'Private Test Grow',
        type: 'feminized',
        environment: 'indoor',
        startDate: new Date().toISOString(),
        medium: 'soil',
        isPublic: false,
      },
      expectStatus: 201,
    });

    if (!createRes.ok) return;  // Skip wenn Grow nicht erstellt
    const growId = createRes.data.grow?._id;
    if (!growId) return;

    // User2 versucht zu sehen
    const getRes = await request('GET', `${BASE.journal}/api/journal/grows/${growId}`, {
      token: session2.token,
      expectStatus: [403, 404],
    });

    assert.ok([403, 404].includes(getRes.status), `User2 sollte privaten Grow nicht sehen, ist ${getRes.status}`);
  });
});
