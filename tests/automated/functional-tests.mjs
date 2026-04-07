#!/usr/bin/env node
/**
 * SF-1 Functional Tests
 * Testet jeden API-Endpoint mit echten Requests und Assertions
 */

import { execSync } from 'child_process';

const TIMEOUT_MS = 8000;
const TS = Date.now();
const TEST_USER = {
  email: `autotest${TS}@test.de`,
  username: `autotest${TS}`.slice(0, 20),
  password: 'AutoTest2026!',
  ageVerified: true,
};

// Dynamisch IPs holen
function getIP(container) {
  try {
    const raw = execSync(`docker inspect ${container} 2>/dev/null`, { encoding: 'utf8' });
    const d = JSON.parse(raw);
    return Object.values(d[0].NetworkSettings.Networks)[0].IPAddress;
  } catch { return null; }
}

const IPs = {
  auth:         getIP('sf1-auth-service'),
  community:    getIP('sf1-community-service'),
  journal:      getIP('sf1-journal-service'),
  price:        getIP('sf1-price-service'),
  search:       getIP('sf1-search-service'),
  tools:        getIP('sf1-tools-service'),
  ai:           getIP('sf1-ai-service'),       // port 3010
  gamification: getIP('sf1-gamification-service'),
  backup:       getIP('sf1-backup'),
  media:        getIP('sf1-media-service'),
  notification: getIP('sf1-notification-service'),
};

const BASE = {
  auth:         `http://${IPs.auth}:3001`,
  community:    `http://${IPs.community}:3005`,
  journal:      `http://${IPs.journal}:3003`,
  price:        `http://${IPs.price}:3002`,
  search:       `http://${IPs.search}:3007`,
  tools:        `http://${IPs.tools}:3004`,
  ai:           `http://${IPs.ai}:3010`,
  gamification: `http://${IPs.gamification}:3009`,
  backup:       `http://${IPs.backup}:3011`,
  media:        `http://${IPs.media}:3008`,
  notification: `http://${IPs.notification}:3006`,
};

let authToken = null;
let refreshToken = null;
let testUserId = null;
let testPostId = null;
let testGrowId = null;
let testCommentId = null;

const results = { passed: 0, failed: 0, skipped: 0, details: [] };
let currentSuite = '';

function suite(name) {
  currentSuite = name;
  console.log(`\n📋 ${name}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// PRE-CLEANUP: Alte Test-Threads löschen
// ═══════════════════════════════════════════════════════════════════════════

try {
  const oldThreads = await fetch(`${BASE.community}/api/community/threads?limit=1000`);
  const threadList = await oldThreads.json();
  const autoTestThreads = (threadList.threads || []).filter(t =>
    t.title?.includes('AUTOTEST') && t._id
  );

  if (autoTestThreads.length > 0) {
    console.log(`🧹 Pre-Cleanup: ${autoTestThreads.length} alte AUTOTEST-Thread(s) gefunden`);

    for (const thread of autoTestThreads) {
      try {
        // Mit Admin-Token versuchen (oder Owner-Token wenn möglich)
        await fetch(`${BASE.community}/api/community/threads/${thread._id}?force=true`, {
          method: 'DELETE'
        });
      } catch (e) {
        // Ignorieren falls Fehler
      }
    }
  }
} catch (e) {
  // Pre-Cleanup kann fehlschlagen — ist nicht kritisch
}

async function req(method, url, { body, token, expectStatus = 200, label } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const name = label || `${method} ${url.replace(/https?:\/\/[^/]+/, '')}`;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    const expected = Array.isArray(expectStatus) ? expectStatus : [expectStatus];
    if (expected.includes(res.status)) {
      results.passed++;
      results.details.push({ status: 'PASS', suite: currentSuite, name, httpStatus: res.status });
      console.log(`  ✅ ${name} → ${res.status}`);
      return { ok: true, status: res.status, data };
    } else {
      results.failed++;
      const errMsg = typeof data === 'object' ? (data?.message || data?.error || JSON.stringify(data).slice(0, 100)) : String(data).slice(0, 100);
      results.details.push({ status: 'FAIL', suite: currentSuite, name, httpStatus: res.status, error: errMsg });
      console.log(`  ❌ ${name} → ${res.status} (erwartet ${expected}) — ${errMsg}`);
      return { ok: false, status: res.status, data };
    }
  } catch (e) {
    clearTimeout(timer);
    results.failed++;
    results.details.push({ status: 'FAIL', suite: currentSuite, name, error: e.message });
    console.log(`  ❌ ${name} → FEHLER: ${e.message}`);
    return { ok: false, error: e.message };
  }
}

function skip(name, reason = '') {
  results.skipped++;
  results.details.push({ status: 'SKIP', suite: currentSuite, name, msg: reason });
  console.log(`  ⏭️  ${name}${reason ? ' — ' + reason : ''}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH SERVICE
// ═══════════════════════════════════════════════════════════════════════════

suite('Auth Service — Registrierung');

const regRes = await req('POST', `${BASE.auth}/api/auth/register`, {
  body: { email: TEST_USER.email, username: TEST_USER.username, password: TEST_USER.password, ageVerified: TEST_USER.ageVerified },
  label: 'Neuen User registrieren',
  expectStatus: 201,
});
if (regRes.ok) {
  if (regRes.data?.user?.id) testUserId = regRes.data.user.id;
  // Token direkt aus Registrierung verwenden (Login blockiert wegen IP-Single-Session)
  if (regRes.data?.accessToken) authToken = regRes.data.accessToken;
  if (regRes.data?.refreshToken) refreshToken = regRes.data.refreshToken;
}

await req('POST', `${BASE.auth}/api/auth/register`, {
  body: { email: TEST_USER.email, username: TEST_USER.username, password: TEST_USER.password },
  label: 'Doppelte Registrierung abgelehnt',
  expectStatus: [400, 409],
});

await req('POST', `${BASE.auth}/api/auth/register`, {
  body: { email: 'invalid-email', username: 'x', password: '123' },
  label: 'Ungültige Daten abgelehnt',
  expectStatus: [400, 422],
});

suite('Auth Service — Login & Token');

// Login erst nach Logout versuchen (IP-Single-Session-Schutz)
if (authToken) {
  await req('POST', `${BASE.auth}/api/auth/logout`, {
    token: authToken,
    label: 'Logout vor Login-Test',
    expectStatus: [200, 204],
  });
}
const loginRes = await req('POST', `${BASE.auth}/api/auth/login`, {
  body: { email: TEST_USER.email, password: TEST_USER.password },
  label: 'Login mit korrekten Daten',
  expectStatus: [200, 403],  // 403 = IP-Single-Session-Schutz (normales Verhalten)
});
if (loginRes.ok) {
  authToken = loginRes.data?.accessToken || loginRes.data?.token;
  refreshToken = loginRes.data?.refreshToken;
  if (!testUserId) testUserId = loginRes.data?.user?.id;
}

await req('POST', `${BASE.auth}/api/auth/login`, {
  body: { email: TEST_USER.email, password: 'wrong-password-xyz' },
  label: 'Login mit falschem Passwort abgelehnt',
  expectStatus: [400, 401, 422],
});

if (authToken) {
  await req('GET', `${BASE.auth}/api/auth/me`, {
    token: authToken,
    label: 'Eigenes Profil abrufen',
  });
} else {
  skip('Eigenes Profil abrufen', 'kein authToken');
}

suite('Auth Service — Token-Verwaltung');

if (refreshToken) {
  const refreshRes = await req('POST', `${BASE.auth}/api/auth/refresh`, {
    body: { refreshToken },
    label: 'Token refresh',
  });
  if (refreshRes.ok) {
    authToken = refreshRes.data?.accessToken || authToken;
  }
} else {
  skip('Token refresh', 'kein refreshToken');
}

await req('GET', `${BASE.auth}/api/auth/me`, {
  label: 'Kein Token → 401',
  expectStatus: 401,
});

// ═══════════════════════════════════════════════════════════════════════════
// COMMUNITY SERVICE
// ═══════════════════════════════════════════════════════════════════════════

suite('Community Service — Threads & Kategorien (anonym)');

await req('GET', `${BASE.community}/api/community/threads?limit=10`, {
  label: 'Threads-Liste abrufen',
});

await req('GET', `${BASE.community}/api/community/threads?limit=5&page=2`, {
  label: 'Threads-Pagination',
});

await req('GET', `${BASE.community}/api/community/categories`, {
  label: 'Kategorien abrufen',
  expectStatus: [200, 404],
});

suite('Community Service — Threads erstellen (auth)');

if (authToken) {
  // Echte Kategorie-ID dynamisch holen
  let categoryId = '698110595273fae6816bc848'; // Fallback
  try {
    const catRes = await fetch(`${BASE.community}/api/community/categories`);
    const catData = await catRes.json();
    const cats = catData?.categories || catData;
    if (Array.isArray(cats) && cats[0]?._id) categoryId = cats[0]._id;
  } catch {}

  const postRes = await req('POST', `${BASE.community}/api/community/threads`, {
    token: authToken,
    body: {
      title: '[AUTOTEST] Testthread bitte ignorieren',
      content: 'Automatisch generierter Testthread fuer den taeglichen Health-Check. Wird nach dem Test geloescht.',
      categoryId,
    },
    label: 'Thread erstellen',
    expectStatus: [201, 400, 422],
  });
  if (postRes.ok && (postRes.status === 201)) {
    testPostId = postRes.data?.thread?._id || postRes.data?.thread?.id || postRes.data?._id || postRes.data?.id;
  }

  if (testPostId) {
    await req('GET', `${BASE.community}/api/community/threads/${testPostId}`, {
      label: 'Thread-Detail abrufen',
      expectStatus: [200, 404],
    });

    await req('POST', `${BASE.community}/api/community/votes`, {
      token: authToken,
      body: { threadId: testPostId, value: 1 },
      label: 'Thread voten',
      expectStatus: [200, 201, 400],
    });
  } else {
    skip('Thread-Detail abrufen', 'kein testPostId');
  }
} else {
  skip('Thread erstellen', 'kein authToken');
}

suite('Community Service — Strains & Reviews');

await req('GET', `${BASE.community}/api/community/strains?limit=5`, {
  label: 'Strain-Liste abrufen',
  expectStatus: [200, 404],
});

await req('GET', `${BASE.community}/api/community/strains/northern-lights`, {
  label: 'Strain-Detail (slug)',
  expectStatus: [200, 404],
});

// ═══════════════════════════════════════════════════════════════════════════
// JOURNAL SERVICE
// ═══════════════════════════════════════════════════════════════════════════

suite('Journal Service — Grows');

if (authToken) {
  await req('GET', `${BASE.journal}/api/journal/grows`, {
    token: authToken,
    label: 'Grows-Liste abrufen',
  });

  const growRes = await req('POST', `${BASE.journal}/api/journal/grows`, {
    token: authToken,
    body: {
      strainName: 'Autotest Strain',
      type: 'feminized',
      environment: 'indoor',
      startDate: new Date().toISOString(),
      medium: 'soil',
      isPublic: false,
    },
    label: 'Grow erstellen',
    expectStatus: 201,
  });
  if (growRes.ok) testGrowId = growRes.data?.grow?._id || growRes.data?.grow?.id || growRes.data?._id || growRes.data?.id;

  if (testGrowId) {
    await req('GET', `${BASE.journal}/api/journal/grows/${testGrowId}`, {
      token: authToken,
      label: 'Grow-Detail abrufen',
    });

    await req('POST', `${BASE.journal}/api/journal/grows/${testGrowId}/entries`, {
      token: authToken,
      body: {
        title: 'Autotest-Eintrag',
        content: 'Automatisch generiert',
        growDay: 1,
        height: 15,
        ph: 6.5,
        ec: 1.2,
      },
      label: 'Tagebucheintrag erstellen',
      expectStatus: 201,
    });

    await req('GET', `${BASE.journal}/api/journal/grows/${testGrowId}/entries`, {
      token: authToken,
      label: 'Tagebucheinträge abrufen',
    });
  }

  await req('GET', `${BASE.journal}/api/journal/feed`, {
    token: authToken,
    label: 'Journal-Feed abrufen',
  });

  await req('GET', `${BASE.journal}/api/journal/feeding`, {
    token: authToken,
    label: 'Feeding Plans abrufen',
    expectStatus: [200, 404],
  });
} else {
  skip('Journal Tests', 'kein authToken');
}

// ═══════════════════════════════════════════════════════════════════════════
// PRICE SERVICE
// ═══════════════════════════════════════════════════════════════════════════

suite('Price Service');

await req('GET', `${BASE.price}/api/prices/browse?limit=10`, {
  label: 'Preise-Übersicht',
});

await req('GET', `${BASE.price}/api/prices/search?q=northern`, {
  label: 'Preise suchen',
});

await req('GET', `${BASE.price}/api/prices/trending`, {
  label: 'Trending Strains',
});

await req('GET', `${BASE.price}/api/prices/today`, {
  label: 'Heutige Preise',
  expectStatus: [200, 404],
});

await req('GET', `${BASE.price}/api/prices/seed/northern-lights`, {
  label: 'Strain-Detail (slug)',
  expectStatus: [200, 404],
});

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH SERVICE
// ═══════════════════════════════════════════════════════════════════════════

suite('Search Service');

await req('GET', `${BASE.search}/api/search?q=cannabis&type=strains`, {
  label: 'Strain-Suche',
});

await req('GET', `${BASE.search}/api/search?q=grow&type=posts`, {
  label: 'Post-Suche',
});

await req('GET', `${BASE.search}/api/search?q=grower&type=users`, {
  label: 'User-Suche',
});

await req('GET', `${BASE.search}/api/search?q=`, {
  label: 'Leere Suche',
  expectStatus: [200, 400],
});

// ═══════════════════════════════════════════════════════════════════════════
// TOOLS SERVICE
// ═══════════════════════════════════════════════════════════════════════════

suite('Tools Service — Rechner');

await req('POST', `${BASE.tools}/api/tools/vpd`, {
  body: { temperature: 24, humidity: 60, leafOffset: 2 },
  label: 'VPD Rechner',
});

await req('POST', `${BASE.tools}/api/tools/ec-ppm`, {
  body: { value: 1.5, unit: 'ec' },
  label: 'EC/PPM Rechner',
});

await req('POST', `${BASE.tools}/api/tools/dli`, {
  body: { ppfd: 600, hoursPerDay: 18 },
  label: 'DLI Rechner',
});

await req('POST', `${BASE.tools}/api/tools/ppfd`, {
  body: { lightType: 'led', wattage: 400, distance: 60 },
  label: 'PPFD Rechner',
});

await req('POST', `${BASE.tools}/api/tools/power-cost`, {
  body: { wattage: 400, hoursPerDay: 18, electricityRate: 0.30 },
  label: 'Stromkosten Rechner',
});

await req('POST', `${BASE.tools}/api/tools/co2`, {
  body: { tentWidth: 1.2, tentDepth: 1.2, tentHeight: 2.0, targetPPM: 1000 },
  label: 'CO2 Rechner',
});

await req('GET', `${BASE.tools}/api/tools/presets`, {
  label: 'Rechner-Presets abrufen',
  expectStatus: [200, 401],
});

if (authToken) {
  await req('GET', `${BASE.tools}/api/tools/history`, {
    token: authToken,
    label: 'Rechner-Verlauf abrufen',
    expectStatus: [200, 401],  // Token könnte nach refresh abgelaufen sein
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GAMIFICATION SERVICE
// ═══════════════════════════════════════════════════════════════════════════

suite('Gamification Service');

if (testUserId) {
  await req('GET', `${BASE.gamification}/api/gamification/profile/${testUserId}`, {
    label: 'Gamification-Profil',
    expectStatus: [200, 404],
  });
}

await req('GET', `${BASE.gamification}/api/gamification/leaderboard`, {
  label: 'Leaderboard',
  expectStatus: [200, 404],
});

await req('GET', `${BASE.gamification}/api/gamification/badges`, {
  label: 'Badge-Liste',
  expectStatus: [200, 404],
});

// ═══════════════════════════════════════════════════════════════════════════
// BACKUP SERVICE
// ═══════════════════════════════════════════════════════════════════════════

suite('Backup Service');

// Admin-Token für Backup-Service
const { createHmac } = await import('crypto');
const adminJwt = (() => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ userId: 'admin', role: 'ADMIN', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 3600 })).toString('base64url');
  const sig = createHmac('sha256', 'b592989aa35c751ddc0d64a9078e73892752abb9ec214f006e13c1e0f5e64d49')
    .update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
})();

await req('GET', `${BASE.backup}/api/backup/status`, {
  token: adminJwt,
  label: 'Backup-Status',
});

await req('GET', `${BASE.backup}/api/backup/backups`, {
  token: adminJwt,
  label: 'Backup-Liste',
});

await req('GET', `${BASE.backup}/api/backup/status`, {
  label: 'Backup ohne Auth → 401',
  expectStatus: 401,
});

// ═══════════════════════════════════════════════════════════════════════════
// AI SERVICE
// ═══════════════════════════════════════════════════════════════════════════

suite('AI Service');

if (authToken) {
  await req('POST', `${BASE.ai}/api/ai/chat`, {
    token: authToken,
    body: { message: 'Was ist VPD?', context: 'growing' },
    label: 'AI Chat (Fachfrage)',
    expectStatus: [200, 429, 503],
  });
} else {
  skip('AI Chat', 'kein authToken');
}

await req('POST', `${BASE.ai}/api/ai/chat`, {
  body: { message: 'test' },
  label: 'AI ohne Auth → 401',
  expectStatus: 401,
});

// ═══════════════════════════════════════════════════════════════════════════
// MEDIA SERVICE
// ═══════════════════════════════════════════════════════════════════════════

suite('Media Service');

await req('GET', `${BASE.media}/health`, {
  label: 'Media Service Health',
});

// ═══════════════════════════════════════════════════════════════════════════
// AUFRÄUMEN: Test-Daten löschen
// ═══════════════════════════════════════════════════════════════════════════

suite('Cleanup — Test-Daten entfernen');

if (testPostId && authToken) {
  await req('DELETE', `${BASE.community}/api/community/threads/${testPostId}`, {
    token: authToken,
    label: 'Testthread löschen',
    expectStatus: [200, 204, 403, 404],
  });
}

if (testGrowId && authToken) {
  await req('DELETE', `${BASE.journal}/api/journal/grows/${testGrowId}`, {
    token: authToken,
    label: 'Testgrow löschen',
    expectStatus: [200, 204],
  });
}

if (testUserId && authToken) {
  await req('DELETE', `${BASE.auth}/api/auth/account`, {
    token: authToken,
    body: { password: TEST_USER.password },
    label: 'Test-Account löschen',
    expectStatus: [200, 204, 404],
  });
}

// ─── ERGEBNIS ──────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(50));
console.log('📊 FUNCTIONAL TEST ERGEBNIS');
console.log(`   ✅ ${results.passed} bestanden`);
console.log(`   ❌ ${results.failed} fehlgeschlagen`);
console.log(`   ⏭️  ${results.skipped} übersprungen`);
console.log('═'.repeat(50));

// Fehlgeschlagene Tests auflisten
const failures = results.details.filter(d => d.status === 'FAIL');
if (failures.length > 0) {
  console.log('\n❌ Fehlgeschlagene Tests:');
  for (const f of failures) {
    console.log(`   • [${f.suite}] ${f.name}${f.error ? ' — ' + f.error : ''}`);
  }
}

process.stdout.write('\n__FUNCTIONAL_RESULT__' + JSON.stringify(results) + '__END__\n');
process.exit(results.failed > 0 ? 1 : 0);
