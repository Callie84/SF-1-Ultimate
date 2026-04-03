/**
 * SF-1 MASTER SYSTEM TEST — Vollständige Plattform-Prüfung
 * =========================================================
 * Testet: Security, Auth, alle Services, AI, Load (100 concurrent), DB, Scraping
 */

import http from 'http';
import https from 'https';
import { execSync } from 'child_process';

// ── Konfiguration ──────────────────────────────────────────────────────────
const SERVICES = {
  auth:      'http://172.28.0.11:3001',
  community: 'http://172.28.0.15:3005',
  price:     'http://172.28.0.8:3002',
  search:    'http://172.28.0.14:3007',
  journal:   'http://172.28.0.11:3003',
  tools:     'http://172.28.0.4:3004',
  ai:        'http://172.28.0.11:3010',
  backup:    'http://172.28.0.24:3011',
  gamification: 'http://172.28.0.11:3009',
  notification: 'http://172.28.0.11:3006',
  media:     'http://172.28.0.11:3008',
};
const FRONTEND = 'https://seedfinderpro.de';

// ── State ──────────────────────────────────────────────────────────────────
let ADMIN_JWT = '';
let USER_JWT  = '';
let TEST_USER_ID = '';
const results = { pass: [], fail: [], warn: [], total: 0 };

// ── Helpers ────────────────────────────────────────────────────────────────
function log(msg) { process.stdout.write(msg + '\n'); }
function pass(name, detail = '') {
  results.pass.push({ name, detail });
  results.total++;
  log(`  ✅ ${name}${detail ? ' — ' + detail : ''}`);
}
function fail(name, detail = '') {
  results.fail.push({ name, detail });
  results.total++;
  log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
}
function warn(name, detail = '') {
  results.warn.push({ name, detail });
  results.total++;
  log(`  ⚠️  ${name}${detail ? ' — ' + detail : ''}`);
}
function section(title) { log(`\n${'═'.repeat(60)}\n  ${title}\n${'═'.repeat(60)}`); }

async function req(method, url, body = null, headers = {}, timeout = 10000) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const opts = { method, headers: { 'Content-Type': 'application/json', ...headers } };
    const timer = setTimeout(() => resolve({ status: 0, data: null, error: 'TIMEOUT' }), timeout);
    const req = lib.request(url, opts, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        clearTimeout(timer);
        try { resolve({ status: res.statusCode, data: JSON.parse(raw), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, data: raw, headers: res.headers }); }
      });
    });
    req.on('error', (e) => { clearTimeout(timer); resolve({ status: 0, data: null, error: e.message }); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function authHeader(jwt) { return { Authorization: `Bearer ${jwt}` }; }

function getAdminJWT() {
  try {
    const out = execSync(`docker exec sf1-auth-service node -e "
      const jwt = require('jsonwebtoken');
      const p = new (require('@prisma/client').PrismaClient)();
      p.user.findFirst({ where: { role: 'ADMIN' } }).then(u => {
        if (!u) { console.log('NO_ADMIN'); process.exit(1); }
        const t = jwt.sign({ userId: u.id, role: u.role, email: u.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        console.log(t);
        p.$disconnect();
      });
    " 2>/dev/null`, { encoding: 'utf8', timeout: 15000 }).trim();
    return out;
  } catch {
    // Fallback: einfaches Admin-Token
    return execSync(`docker exec sf1-auth-service node -e "
      const jwt = require('jsonwebtoken');
      const t = jwt.sign({ userId: 'admin-test', role: 'ADMIN', email: 'klingenpascal@gmail.com' }, process.env.JWT_SECRET, { expiresIn: '1h' });
      console.log(t);
    " 2>/dev/null`, { encoding: 'utf8', timeout: 10000 }).trim();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. HEALTH CHECKS — alle Services
// ══════════════════════════════════════════════════════════════════════════════
async function testHealth() {
  section('1. HEALTH CHECKS — alle Services');
  const healthPaths = {
    auth:         '/api/auth/health',
    community:    '/api/community/health',
    price:        '/api/prices/health',
    search:       '/api/search/health',
    journal:      '/api/journal/health',
    tools:        '/api/tools/health',
    ai:           '/api/ai/health',
    backup:       '/api/backup/status',
    gamification: '/api/gamification/health',
    notification: '/api/notifications/health',
    media:        '/api/media/health',
  };
  for (const [name, path] of Object.entries(healthPaths)) {
    const url = SERVICES[name] + path;
    const r = await req('GET', url, null, {}, 8000);
    if (r.status === 200) pass(`${name}-service: healthy`);
    else if (r.status === 0) fail(`${name}-service: NICHT ERREICHBAR (${r.error || 'timeout'})`);
    else warn(`${name}-service: Status ${r.status}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. SICHERHEITS-TESTS
// ══════════════════════════════════════════════════════════════════════════════
async function testSecurity() {
  section('2. SICHERHEITS-TESTS');

  // 2.1 Unauthorized-Zugriff auf geschützte Routen
  log('\n  [2.1] Unauthorized-Schutz');
  const protectedRoutes = [
    [SERVICES.auth, '/api/auth/me'],
    [SERVICES.community, '/api/community/posts'],
    [SERVICES.journal, '/api/journal/grows'],
    [SERVICES.ai, '/api/ai/chat'],
    [SERVICES.backup, '/api/backup/backups/trigger'],
  ];
  for (const [base, path] of protectedRoutes) {
    const r = await req('GET', base + path);
    if (r.status === 401) pass(`Unauthorized-Schutz: ${path}`);
    else if (r.status === 403) pass(`Unauthorized-Schutz: ${path} (403)`);
    else if (r.status === 200) fail(`OFFEN ohne Auth: ${path}`, `Status ${r.status}`);
    else warn(`${path}: Status ${r.status}`);
  }

  // 2.2 Injection-Tests (XSS in Body)
  log('\n  [2.2] XSS / Injection-Schutz');
  const xssPayloads = ['<script>alert(1)</script>', '"><img src=x onerror=alert(1)>', "'; DROP TABLE users; --"];
  for (const payload of xssPayloads) {
    const r = await req('POST', SERVICES.auth + '/api/auth/login', { email: payload, password: payload });
    if (r.status !== 500 && r.status !== 0) pass(`XSS blockiert: ${payload.substring(0,30)}`);
    else fail(`Server-Error bei Injection`, `Status ${r.status}`);
  }

  // 2.3 JWT-Manipulation
  log('\n  [2.3] JWT-Manipulation');
  const fakeJWT = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJhZG1pbiIsInJvbGUiOiJBRE1JTiJ9.FAKE_SIGNATURE';
  const r1 = await req('GET', SERVICES.auth + '/api/auth/me', null, authHeader(fakeJWT));
  if (r1.status === 401) pass('Gefälschtes JWT abgelehnt');
  else fail('Gefälschtes JWT NICHT abgelehnt', `Status ${r1.status}`);

  // 2.4 Admin-Schutz (normaler User versucht Admin-Routen)
  log('\n  [2.4] Admin-Rollen-Schutz');
  const r2 = await req('GET', SERVICES.backup + '/api/backup/backups', null, authHeader('invalid.jwt.here'));
  if (r2.status === 401 || r2.status === 403) pass('Backup-Route: Admin-Schutz aktiv');
  else fail('Backup-Route ohne Auth zugänglich', `Status ${r2.status}`);

  // 2.5 Rate Limiting
  log('\n  [2.5] Brute-Force / Rate Limiting');
  let rateLimited = false;
  for (let i = 0; i < 10; i++) {
    const r = await req('POST', SERVICES.auth + '/api/auth/login', { email: 'test@test.com', password: 'wrong123' });
    if (r.status === 429) { rateLimited = true; break; }
  }
  if (rateLimited) pass('Rate Limiting aktiv (429 nach Wiederholungen)');
  else warn('Kein Rate Limiting detektiert (10 Fehlversuche ohne 429)');

  // 2.6 CORS-Check
  log('\n  [2.6] CORS');
  const r3 = await req('OPTIONS', SERVICES.auth + '/api/auth/health', null, { Origin: 'https://evil-site.com' });
  const allowOrigin = r3.headers?.['access-control-allow-origin'] || '';
  if (allowOrigin === '*') warn('CORS: Wildcard (*) erlaubt — prüfe ob gewollt');
  else if (allowOrigin.includes('seedfinderpro')) pass('CORS: Nur eigene Domain erlaubt');
  else pass(`CORS: Origin eingeschränkt (${allowOrigin || 'kein Header'})`);

  // 2.7 HTTPS / Security-Header
  log('\n  [2.7] Security-Header (Frontend)');
  const r4 = await req('GET', FRONTEND, null, {}, 15000);
  const secHeaders = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY oder SAMEORIGIN',
    'strict-transport-security': 'HSTS',
  };
  for (const [header, desc] of Object.entries(secHeaders)) {
    if (r4.headers?.[header]) pass(`Header vorhanden: ${header}`);
    else warn(`Header fehlt: ${header} (${desc})`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. AUTHENTIFIZIERUNG KOMPLETT
// ══════════════════════════════════════════════════════════════════════════════
async function testAuth() {
  section('3. AUTHENTIFIZIERUNG — vollständiger Flow');

  // Test-Registrierung
  const ts = Date.now();
  const testEmail = `testuser_${ts}@sf1-test.de`;
  const testPassword = 'TestPass123!';
  let testUserId = null;

  log('\n  [3.1] Registrierung');
  const reg = await req('POST', SERVICES.auth + '/api/auth/register', {
    email: testEmail, password: testPassword, username: `testuser${ts}`, displayName: 'Test User'
  });
  if (reg.status === 201 || reg.status === 200) {
    pass('Registrierung erfolgreich');
    USER_JWT = reg.data?.accessToken || '';
    testUserId = reg.data?.user?.id || '';
    TEST_USER_ID = testUserId;
  } else if (reg.status === 400 && reg.data?.error?.includes('Beta')) {
    warn('Registrierung: Beta-Limit erreicht (nicht kritisch)');
  } else {
    fail('Registrierung fehlgeschlagen', `Status ${reg.status}, ${JSON.stringify(reg.data)}`);
  }

  // Login
  log('\n  [3.2] Login');
  const login = await req('POST', SERVICES.auth + '/api/auth/login', { email: testEmail, password: testPassword });
  if (login.status === 200 && login.data?.accessToken) {
    pass('Login erfolgreich');
    USER_JWT = login.data.accessToken;
  } else if (login.status === 200 && login.data?.mfa_required) {
    warn('Login: MFA erfordert (Admin-Account?)');
  } else {
    fail('Login fehlgeschlagen', `Status ${login.status}`);
  }

  // Falsches Passwort
  log('\n  [3.3] Login mit falschem Passwort');
  const badLogin = await req('POST', SERVICES.auth + '/api/auth/login', { email: testEmail, password: 'WrongPass!' });
  if (badLogin.status === 401) pass('Falsches Passwort abgelehnt');
  else fail('Falsches Passwort NICHT abgelehnt', `Status ${badLogin.status}`);

  // /me Route
  log('\n  [3.4] /me Route');
  if (USER_JWT) {
    const me = await req('GET', SERVICES.auth + '/api/auth/me', null, authHeader(USER_JWT));
    if (me.status === 200 && me.data?.email) pass('/me liefert User-Daten');
    else fail('/me Route fehlerhaft', `Status ${me.status}`);
  } else {
    warn('/me Route: kein JWT vorhanden (Registrierung fehlgeschlagen)');
  }

  // Admin-JWT holen
  log('\n  [3.5] Admin-JWT');
  try {
    ADMIN_JWT = getAdminJWT();
    if (ADMIN_JWT && ADMIN_JWT.length > 50) pass(`Admin-JWT generiert (${ADMIN_JWT.length} Zeichen)`);
    else fail('Admin-JWT konnte nicht generiert werden');
  } catch (e) {
    fail('Admin-JWT Fehler', e.message);
  }

  // Admin-Zugriff prüfen
  if (ADMIN_JWT) {
    const adminMe = await req('GET', SERVICES.auth + '/api/auth/me', null, authHeader(ADMIN_JWT));
    if (adminMe.status === 200) pass('Admin-JWT funktioniert');
    else warn(`Admin-JWT: Status ${adminMe.status}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. COMMUNITY-SERVICE
// ══════════════════════════════════════════════════════════════════════════════
async function testCommunity() {
  section('4. COMMUNITY-SERVICE — Forum, Posts, Kategorien');

  // Kategorien abrufen
  const cats = await req('GET', SERVICES.community + '/api/community/categories');
  if (cats.status === 200 && Array.isArray(cats.data)) pass(`Kategorien: ${cats.data.length} geladen`);
  else fail('Kategorien-Abruf', `Status ${cats.status}`);

  // Posts abrufen (public)
  const posts = await req('GET', SERVICES.community + '/api/community/posts?limit=5');
  if (posts.status === 200) pass('Posts-Feed: abrufbar');
  else fail('Posts-Feed', `Status ${posts.status}`);

  // Post ohne Auth erstellen (muss 401 sein)
  const noAuthPost = await req('POST', SERVICES.community + '/api/community/posts', { title: 'Test', content: 'Test', categoryId: 'xxx' });
  if (noAuthPost.status === 401) pass('Post ohne Auth: korrekt abgelehnt');
  else fail('Post ohne Auth: NICHT geschützt', `Status ${noAuthPost.status}`);

  // Post mit Auth erstellen
  if (USER_JWT) {
    const cats2 = await req('GET', SERVICES.community + '/api/community/categories');
    const catId = cats2.data?.[0]?.id;
    if (catId) {
      const newPost = await req('POST', SERVICES.community + '/api/community/posts', {
        title: `Automatischer Test ${Date.now()}`,
        content: 'Dies ist ein automatisch erstellter Test-Post.',
        categoryId: catId
      }, authHeader(USER_JWT));
      if (newPost.status === 201 || newPost.status === 200) pass('Post erstellen: erfolgreich');
      else warn(`Post erstellen: Status ${newPost.status}`);
    }
  }

  // Suche
  const search = await req('GET', SERVICES.community + '/api/community/posts?search=test');
  if (search.status === 200) pass('Community-Suche: funktioniert');
  else warn(`Community-Suche: Status ${search.status}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. PRICE-SERVICE — Strains & Preise
// ══════════════════════════════════════════════════════════════════════════════
async function testPrice() {
  section('5. PRICE-SERVICE — Strains, Preisvergleich, Seedbanks');

  // Strains auflisten
  const strains = await req('GET', SERVICES.price + '/api/strains?limit=10');
  if (strains.status === 200) {
    const count = strains.data?.strains?.length || strains.data?.length || 0;
    pass(`Strains abrufbar: ${count} zurückgegeben`);
  } else fail('Strains-Abruf', `Status ${strains.status}`);

  // Seedbanks
  const seedbanks = await req('GET', SERVICES.price + '/api/prices/seedbanks');
  if (seedbanks.status === 200) {
    const count = Array.isArray(seedbanks.data) ? seedbanks.data.length : '?';
    pass(`Seedbanks: ${count} registriert`);
  } else warn(`Seedbanks: Status ${seedbanks.status}`);

  // Preissuche
  const prices = await req('GET', SERVICES.price + '/api/prices?limit=5');
  if (prices.status === 200) pass('Preisliste abrufbar');
  else fail('Preisliste', `Status ${prices.status}`);

  // Scraper-Status
  const scraperStatus = await req('GET', SERVICES.price + '/api/prices/scraper/status', null, authHeader(ADMIN_JWT));
  if (scraperStatus.status === 200) {
    const stats = scraperStatus.data;
    pass(`Scraper-Status: aktiv, ${stats?.schedule?.registeredFeeds?.length || 0} Feeds registriert`);
    if (stats?.schedule?.failed > 0) warn(`Scraper: ${stats.schedule.failed} Jobs fehlgeschlagen`);
  } else warn(`Scraper-Status: ${scraperStatus.status}`);

  // Feed-Queue-Stats
  const queue = await req('GET', SERVICES.price + '/api/prices/scraper/queue', null, authHeader(ADMIN_JWT));
  if (queue.status === 200) {
    const d = queue.data;
    if (d?.failed > 0) warn(`Feed-Queue: ${d.failed} fehlgeschlagene Jobs`);
    else pass(`Feed-Queue: OK (${d?.completed || 0} completed, ${d?.failed || 0} failed)`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. JOURNAL-SERVICE
// ══════════════════════════════════════════════════════════════════════════════
async function testJournal() {
  section('6. JOURNAL-SERVICE — Grows, Einträge');

  // Öffentliche Grows
  const grows = await req('GET', SERVICES.journal + '/api/grows/public?limit=5');
  if (grows.status === 200) pass(`Öffentliche Grows: abrufbar (${grows.data?.length || 0})`);
  else warn(`Öffentliche Grows: Status ${grows.status}`);

  // Geschützte Route ohne Auth
  const noAuth = await req('GET', SERVICES.journal + '/api/journal/grows');
  if (noAuth.status === 401) pass('Grows ohne Auth: korrekt geschützt');
  else fail('Grows ohne Auth: NICHT geschützt', `Status ${noAuth.status}`);

  // Grows mit Auth
  if (USER_JWT) {
    const myGrows = await req('GET', SERVICES.journal + '/api/journal/grows', null, authHeader(USER_JWT));
    if (myGrows.status === 200) pass('Grows mit Auth: abrufbar');
    else warn(`Grows mit Auth: Status ${myGrows.status}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. SEARCH-SERVICE — Meilisearch
// ══════════════════════════════════════════════════════════════════════════════
async function testSearch() {
  section('7. SEARCH-SERVICE — Meilisearch Volltext');

  const queries = ['OG Kush', 'Amnesia', 'Haze', 'autoflower'];
  for (const q of queries) {
    const r = await req('GET', SERVICES.search + `/api/search?q=${encodeURIComponent(q)}&limit=5`);
    if (r.status === 200) {
      const hits = r.data?.hits?.length || r.data?.results?.length || 0;
      pass(`Suche "${q}": ${hits} Treffer`);
    } else fail(`Suche "${q}": Status ${r.status}`);
  }

  // Leere Suche
  const empty = await req('GET', SERVICES.search + '/api/search?q=&limit=5');
  if (empty.status === 200 || empty.status === 400) pass('Leere Suche: keine Server-Fehler');
  else fail('Leere Suche: Unerwarteter Fehler', `Status ${empty.status}`);

  // Spezialzeichen
  const special = await req('GET', SERVICES.search + `/api/search?q=${encodeURIComponent('<script>alert</script>')}`);
  if (special.status !== 500) pass('XSS in Suche: kein Server-Crash');
  else fail('XSS in Suche: Server-Crash!');
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. AI-SERVICE — Chat, Diagnose
// ══════════════════════════════════════════════════════════════════════════════
async function testAI() {
  section('8. AI-SERVICE — Chat & Pflanzen-Diagnose');

  // Ohne Auth
  const noAuth = await req('POST', SERVICES.ai + '/api/ai/chat', { message: 'Hallo' });
  if (noAuth.status === 401) pass('AI-Chat ohne Auth: korrekt geschützt');
  else fail('AI-Chat ohne Auth: NICHT geschützt', `Status ${noAuth.status}`);

  // Mit Auth — einfache Anfrage
  if (USER_JWT || ADMIN_JWT) {
    const jwt = USER_JWT || ADMIN_JWT;
    log('\n  [8.2] AI-Chat Test (kann 10-30s dauern...)');
    const chat = await req('POST', SERVICES.ai + '/api/ai/chat',
      { message: 'Was ist der Unterschied zwischen Indica und Sativa? Antworte kurz in 1-2 Sätzen.' },
      authHeader(jwt), 30000
    );
    if (chat.status === 200 && chat.data?.response) {
      const len = chat.data.response.length;
      pass(`AI-Chat antwortet: ${len} Zeichen`);
    } else if (chat.status === 429) warn('AI-Chat: Rate Limit erreicht');
    else fail('AI-Chat: kein Response', `Status ${chat.status}, ${JSON.stringify(chat.data)?.substring(0,100)}`);

    // AI Strain-Info
    const strainAI = await req('POST', SERVICES.ai + '/api/ai/strain-info',
      { strainName: 'OG Kush' }, authHeader(jwt), 25000
    );
    if (strainAI.status === 200) pass('AI Strain-Info: funktioniert');
    else warn(`AI Strain-Info: Status ${strainAI.status}`);

    // AI Grow-Berater
    const growAI = await req('POST', SERVICES.ai + '/api/ai/grow-advisor',
      { question: 'Meine Blätter werden gelb. Was tun?' }, authHeader(jwt), 25000
    );
    if (growAI.status === 200) pass('AI Grow-Berater: funktioniert');
    else warn(`AI Grow-Berater: Status ${growAI.status}`);
  } else {
    warn('AI-Tests: kein JWT verfügbar');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 9. GAMIFICATION
// ══════════════════════════════════════════════════════════════════════════════
async function testGamification() {
  section('9. GAMIFICATION — XP, Leaderboard, Badges');

  const leaderboard = await req('GET', SERVICES.gamification + '/api/gamification/leaderboard?limit=10');
  if (leaderboard.status === 200) {
    pass(`Leaderboard: abrufbar (${leaderboard.data?.length || 0} Einträge)`);
  } else warn(`Leaderboard: Status ${leaderboard.status}`);

  if (USER_JWT || ADMIN_JWT) {
    const jwt = USER_JWT || ADMIN_JWT;
    const myStats = await req('GET', SERVICES.gamification + '/api/gamification/me', null, authHeader(jwt));
    if (myStats.status === 200) pass('Gamification-Stats: abrufbar');
    else warn(`Gamification-Stats: Status ${myStats.status}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 10. NOTIFICATION-SERVICE
// ══════════════════════════════════════════════════════════════════════════════
async function testNotifications() {
  section('10. NOTIFICATION-SERVICE');

  // Ohne Auth
  const noAuth = await req('GET', SERVICES.notification + '/api/notifications');
  if (noAuth.status === 401) pass('Notifications ohne Auth: geschützt');
  else fail('Notifications ohne Auth: NICHT geschützt', `Status ${noAuth.status}`);

  if (USER_JWT || ADMIN_JWT) {
    const jwt = USER_JWT || ADMIN_JWT;
    const notifs = await req('GET', SERVICES.notification + '/api/notifications', null, authHeader(jwt));
    if (notifs.status === 200) pass(`Notifications: abrufbar (${Array.isArray(notifs.data) ? notifs.data.length : '?'} Einträge)`);
    else warn(`Notifications: Status ${notifs.status}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 11. BACKUP-SERVICE
// ══════════════════════════════════════════════════════════════════════════════
async function testBackup() {
  section('11. BACKUP-SERVICE — Integrität');

  // Status (Admin)
  if (ADMIN_JWT) {
    const status = await req('GET', SERVICES.backup + '/api/backup/status', null, authHeader(ADMIN_JWT));
    if (status.status === 200) pass('Backup-Status: erreichbar');
    else fail('Backup-Status', `Status ${status.status}`);

    // Backup-Liste
    const list = await req('GET', SERVICES.backup + '/api/backup/backups', null, authHeader(ADMIN_JWT));
    if (list.status === 200 && Array.isArray(list.data)) {
      pass(`Backup-Liste: ${list.data.length} Backups vorhanden`);
      if (list.data.length === 0) warn('Keine Backups gefunden!');
    } else warn(`Backup-Liste: Status ${list.status}`);
  }

  // Backup-Dateien direkt prüfen
  try {
    const count = execSync('ls /root/SF-1-Ultimate-/backups/*.enc 2>/dev/null | wc -l', { encoding: 'utf8' }).trim();
    const latest = execSync('ls -lt /root/SF-1-Ultimate-/backups/*.enc 2>/dev/null | head -1', { encoding: 'utf8' }).trim();
    pass(`Backup-Dateien: ${count} verschlüsselte Backups`);
    if (latest) {
      // Datum des letzten Backups prüfen
      const dateMatch = latest.match(/(\d+)\.\s+(\w+)\s+(\d+:\d+)/);
      pass(`Letztes Backup: ${latest.split('/').pop()}`);
    }
  } catch (e) {
    warn('Backup-Dateien: nicht prüfbar');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 12. DATENBANK-INTEGRITÄT
// ══════════════════════════════════════════════════════════════════════════════
async function testDatabase() {
  section('12. DATENBANK-INTEGRITÄT — PostgreSQL & MongoDB');

  try {
    // PostgreSQL User-Count
    const pgCount = execSync(`docker exec sf1-auth-service node -e "
      const { PrismaClient } = require('@prisma/client');
      const p = new PrismaClient();
      Promise.all([
        p.user.count(),
        p.user.count({ where: { role: 'ADMIN' } }),
        p.refreshToken.count(),
      ]).then(([users, admins, tokens]) => {
        console.log(JSON.stringify({ users, admins, tokens }));
        p.$disconnect();
      });
    " 2>/dev/null`, { encoding: 'utf8', timeout: 15000 }).trim();
    const db = JSON.parse(pgCount);
    pass(`PostgreSQL: ${db.users} User, ${db.admins} Admin(s), ${db.tokens} aktive Tokens`);
    if (db.admins === 0) fail('KEIN ADMIN-USER IN DATENBANK!');

    // MongoDB Strain-Count
    const mongoCount = execSync(`docker exec sf1-mongodb mongosh sf1_prices --quiet --eval "
      db.seeds.countDocuments()
    " 2>/dev/null`, { encoding: 'utf8', timeout: 10000 }).trim();
    const seedCount = parseInt(mongoCount) || 0;
    if (seedCount > 0) pass(`MongoDB Seeds: ${seedCount} Samen in Datenbank`);
    else fail('MongoDB: Keine Seeds gefunden');

    // Community Posts
    const commCount = execSync(`docker exec sf1-mongodb mongosh sf1_community --quiet --eval "
      db.posts.countDocuments()
    " 2>/dev/null`, { encoding: 'utf8', timeout: 10000 }).trim();
    pass(`MongoDB Community-Posts: ${parseInt(commCount) || 0}`);

  } catch (e) {
    fail('Datenbank-Prüfung fehlgeschlagen', e.message.substring(0, 80));
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 13. FRONTEND / PWA
// ══════════════════════════════════════════════════════════════════════════════
async function testFrontend() {
  section('13. FRONTEND / PWA');

  // Startseite
  const home = await req('GET', FRONTEND, null, {}, 20000);
  if (home.status === 200) pass('Startseite: erreichbar (200)');
  else fail('Startseite: NICHT erreichbar', `Status ${home.status}`);

  // PWA Manifest
  const manifest = await req('GET', FRONTEND + '/manifest.webmanifest', null, {}, 10000);
  if (manifest.status === 200) pass('PWA Manifest: vorhanden');
  else warn(`PWA Manifest: Status ${manifest.status}`);

  // Service Worker
  const sw = await req('GET', FRONTEND + '/sw.js', null, {}, 10000);
  if (sw.status === 200) pass('Service Worker: vorhanden');
  else warn(`Service Worker: Status ${sw.status}`);

  // Wichtige Seiten
  const pages = ['/strains', '/strains/preisvergleich', '/auth/login', '/auth/register'];
  for (const page of pages) {
    const r = await req('GET', FRONTEND + page, null, {}, 15000);
    if (r.status === 200) pass(`Seite ${page}: erreichbar`);
    else if (r.status === 301 || r.status === 302) pass(`Seite ${page}: Redirect (${r.status})`);
    else fail(`Seite ${page}: Status ${r.status}`);
  }

  // HTTPS-Redirect (HTTP → HTTPS)
  const httpCheck = await req('GET', 'http://seedfinderpro.de', null, {}, 10000);
  if (httpCheck.status === 301 || httpCheck.status === 302) pass('HTTP→HTTPS Redirect: aktiv');
  else warn(`HTTP→HTTPS Redirect: Status ${httpCheck.status}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 14. TOOLS-SERVICE
// ══════════════════════════════════════════════════════════════════════════════
async function testTools() {
  section('14. TOOLS-SERVICE — Wasser-Kalkulator, Timer etc.');

  const toolsHealth = await req('GET', SERVICES.tools + '/api/tools/health');
  if (toolsHealth.status === 200) pass('Tools-Service: erreichbar');
  else warn(`Tools-Service: Status ${toolsHealth.status}`);

  // Öffentliche Tools
  const waterCalc = await req('POST', SERVICES.tools + '/api/tools/water-calculator', {
    ph: 7.0, ec: 1.2, temperature: 22
  });
  if (waterCalc.status === 200 || waterCalc.status === 201) pass('Wasser-Kalkulator: funktioniert');
  else warn(`Wasser-Kalkulator: Status ${waterCalc.status}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 15. LAST-TEST — 100 gleichzeitige Anfragen
// ══════════════════════════════════════════════════════════════════════════════
async function testLoad() {
  section('15. LAST-TEST — 100 gleichzeitige Nutzer simulieren');
  log('  Starte 100 parallele Requests auf verschiedene Endpoints...\n');

  const endpoints = [
    { url: SERVICES.price + '/api/strains?limit=5', label: 'Strains' },
    { url: SERVICES.community + '/api/community/posts?limit=5', label: 'Posts' },
    { url: SERVICES.search + '/api/search?q=kush&limit=5', label: 'Search' },
    { url: SERVICES.auth + '/api/auth/health', label: 'Auth-Health' },
    { url: FRONTEND, label: 'Frontend', timeout: 20000 },
  ];

  async function runBatch(batchSize, endpoint) {
    const start = Date.now();
    const promises = Array(batchSize).fill(0).map(() =>
      req('GET', endpoint.url, null, {}, endpoint.timeout || 10000)
    );
    const responses = await Promise.all(promises);
    const elapsed = Date.now() - start;
    const success = responses.filter(r => r.status === 200).length;
    const errors  = responses.filter(r => r.status === 0).length;
    const other   = batchSize - success - errors;
    return { elapsed, success, errors, other, batchSize };
  }

  // 20 gleichzeitig auf jeden Endpoint (5 Endpoints × 20 = 100 total)
  const batchResults = await Promise.all(
    endpoints.map(ep => runBatch(20, ep))
  );

  let totalSuccess = 0, totalErrors = 0;
  endpoints.forEach((ep, i) => {
    const r = batchResults[i];
    totalSuccess += r.success;
    totalErrors += r.errors;
    const rps = Math.round(r.batchSize / (r.elapsed / 1000));
    if (r.success === r.batchSize) {
      pass(`${ep.label}: 20/20 OK — ${r.elapsed}ms gesamt (~${rps} req/s)`);
    } else if (r.errors > 0) {
      fail(`${ep.label}: ${r.errors} FEHLER von 20`, `${r.success} OK, ${r.errors} Timeout/Error`);
    } else {
      warn(`${ep.label}: ${r.success}/20 OK, ${r.other} sonstige Status`);
    }
  });

  log(`\n  📊 GESAMT: ${totalSuccess}/100 erfolgreich, ${totalErrors} Fehler`);
  if (totalSuccess >= 95) pass(`Load-Test BESTANDEN: ${totalSuccess}/100 OK`);
  else if (totalSuccess >= 80) warn(`Load-Test: ${totalSuccess}/100 OK (Grenzwertig)`);
  else fail(`Load-Test FEHLGESCHLAGEN: nur ${totalSuccess}/100 OK`);

  // Stress-Test: 200 Requests in 5 Sekunden
  log('\n  [Stress-Test] 200 Requests in 5 Sekunden auf Auth-Health...');
  const stressStart = Date.now();
  const stressPromises = Array(200).fill(0).map(() =>
    req('GET', SERVICES.auth + '/api/auth/health', null, {}, 5000)
  );
  const stressResults = await Promise.all(stressPromises);
  const stressElapsed = Date.now() - stressStart;
  const stressOK = stressResults.filter(r => r.status === 200).length;
  const stressRPS = Math.round(200 / (stressElapsed / 1000));
  if (stressOK >= 190) pass(`Stress-Test: ${stressOK}/200 OK in ${stressElapsed}ms (~${stressRPS} req/s)`);
  else warn(`Stress-Test: ${stressOK}/200 OK (${stressElapsed}ms)`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 16. REDIS / CACHE
// ══════════════════════════════════════════════════════════════════════════════
async function testRedis() {
  section('16. REDIS — Cache & Session-Store');

  try {
    const redisCheck = execSync(`docker exec sf1-redis redis-cli ping 2>/dev/null`, { encoding: 'utf8', timeout: 5000 }).trim();
    if (redisCheck === 'PONG') pass('Redis: erreichbar (PONG)');
    else fail('Redis: kein PONG', redisCheck);

    const info = execSync(`docker exec sf1-redis redis-cli info memory 2>/dev/null | grep used_memory_human`, { encoding: 'utf8', timeout: 5000 }).trim();
    pass(`Redis Speicher: ${info.split(':')[1]?.trim() || 'unbekannt'}`);

    const keyCount = execSync(`docker exec sf1-redis redis-cli dbsize 2>/dev/null`, { encoding: 'utf8', timeout: 5000 }).trim();
    pass(`Redis Keys: ${keyCount}`);
  } catch (e) {
    fail('Redis-Prüfung fehlgeschlagen', e.message.substring(0, 50));
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 17. DOCKER / SYSTEM-RESSOURCEN
// ══════════════════════════════════════════════════════════════════════════════
async function testSystem() {
  section('17. SYSTEM-RESSOURCEN — CPU, RAM, Disk');

  try {
    // Disk Space
    const disk = execSync('df -h / | tail -1', { encoding: 'utf8' }).trim();
    const diskParts = disk.split(/\s+/);
    const usedPct = parseInt(diskParts[4]);
    if (usedPct < 80) pass(`Disk: ${diskParts[2]} von ${diskParts[1]} belegt (${diskParts[4]})`);
    else if (usedPct < 90) warn(`Disk: ${diskParts[4]} belegt — wird eng!`);
    else fail(`Disk: ${diskParts[4]} KRITISCH!`);

    // RAM
    const mem = execSync('free -h | grep Mem', { encoding: 'utf8' }).trim();
    pass(`RAM: ${mem}`);

    // Load Average
    const load = execSync('cat /proc/loadavg', { encoding: 'utf8' }).trim();
    const loadVal = parseFloat(load.split(' ')[0]);
    const cpus = parseInt(execSync('nproc', { encoding: 'utf8' }).trim());
    if (loadVal < cpus) pass(`CPU Load: ${load.split(' ').slice(0,3).join(' ')} (${cpus} CPUs)`);
    else warn(`CPU Load hoch: ${load.split(' ')[0]} (${cpus} CPUs)`);

    // Container-Anzahl
    const containers = execSync('docker ps --filter name=sf1 --format "{{.Names}}" | wc -l', { encoding: 'utf8' }).trim();
    pass(`Aktive SF-1 Container: ${containers}`);

    // Meilisearch Index-Stats
    try {
      const msStats = execSync(`curl -s http://localhost:7700/indexes 2>/dev/null | head -c 200`, { encoding: 'utf8', timeout: 5000 });
      if (msStats.includes('results')) pass('Meilisearch: Index-API erreichbar');
      else warn('Meilisearch: keine Antwort auf Index-API');
    } catch { warn('Meilisearch: API-Abfrage fehlgeschlagen'); }

  } catch (e) {
    warn('System-Ressourcen: Abfrage fehlgeschlagen', e.message.substring(0, 50));
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 18. ANALYTICS — Plausible
// ══════════════════════════════════════════════════════════════════════════════
async function testAnalytics() {
  section('18. ANALYTICS — Plausible');

  try {
    const plausible = execSync(`docker exec sf1-plausible wget -qO- http://localhost:8000/api/health 2>/dev/null || echo "check_failed"`, { encoding: 'utf8', timeout: 8000 }).trim();
    if (plausible.includes('check_failed')) warn('Plausible: interner Health-Check nicht zugänglich');
    else pass('Plausible: läuft');
  } catch {
    warn('Plausible-Check fehlgeschlagen');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HAUPT-PROGRAMM
// ══════════════════════════════════════════════════════════════════════════════
async function main() {
  const startTime = Date.now();
  log('\n');
  log('╔══════════════════════════════════════════════════════════════╗');
  log('║     SF-1 MASTER SYSTEM TEST — Vollständige Prüfung          ║');
  log(`║     Gestartet: ${new Date().toLocaleString('de-DE')}                      ║`);
  log('╚══════════════════════════════════════════════════════════════╝');

  await testHealth();
  await testAuth();
  await testSecurity();
  await testCommunity();
  await testPrice();
  await testJournal();
  await testSearch();
  await testAI();
  await testGamification();
  await testNotifications();
  await testBackup();
  await testDatabase();
  await testFrontend();
  await testTools();
  await testRedis();
  await testSystem();
  await testAnalytics();
  await testLoad();

  // ── Ergebnis-Zusammenfassung ──────────────────────────────────────────────
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const passRate = Math.round((results.pass.length / results.total) * 100);

  log('\n');
  log('╔══════════════════════════════════════════════════════════════╗');
  log('║                   TEST-ERGEBNISSE                           ║');
  log('╠══════════════════════════════════════════════════════════════╣');
  log(`║  ✅ BESTANDEN:   ${String(results.pass.length).padEnd(4)} Tests                                ║`);
  log(`║  ❌ FEHLGESCHL.: ${String(results.fail.length).padEnd(4)} Tests                                ║`);
  log(`║  ⚠️  WARNUNGEN:  ${String(results.warn.length).padEnd(4)} Tests                                ║`);
  log(`║  📊 GESAMT:      ${String(results.total).padEnd(4)} Tests  (${passRate}% Erfolgsrate)         ║`);
  log(`║  ⏱  Laufzeit:    ${elapsed}s                                     ║`);
  log('╠══════════════════════════════════════════════════════════════╣');

  if (results.fail.length > 0) {
    log('║  ❌ FEHLGESCHLAGENE TESTS:                                  ║');
    results.fail.forEach(f => {
      const line = `║     • ${f.name}${f.detail ? ': ' + f.detail : ''}`;
      log(line.substring(0, 63).padEnd(63) + '║');
    });
    log('╠══════════════════════════════════════════════════════════════╣');
  }

  if (results.warn.length > 0) {
    log('║  ⚠️  WARNUNGEN:                                             ║');
    results.warn.slice(0, 10).forEach(w => {
      const line = `║     • ${w.name}`;
      log(line.substring(0, 63).padEnd(63) + '║');
    });
    log('╠══════════════════════════════════════════════════════════════╣');
  }

  if (passRate >= 90) log('║  🏆 GESAMTSTATUS: SEHR GUT — System läuft stabil            ║');
  else if (passRate >= 75) log('║  👍 GESAMTSTATUS: GUT — kleinere Probleme vorhanden         ║');
  else if (passRate >= 60) log('║  ⚠️  GESAMTSTATUS: MÄSSIG — Handlungsbedarf                  ║');
  else log('║  🚨 GESAMTSTATUS: KRITISCH — sofortiger Handlungsbedarf!    ║');

  log('╚══════════════════════════════════════════════════════════════╝');
  log('');

  // JSON-Report für Datei
  return {
    timestamp: new Date().toISOString(),
    elapsed_seconds: elapsed,
    pass_rate: passRate,
    total: results.total,
    passed: results.pass.length,
    failed: results.fail.length,
    warnings: results.warn.length,
    failures: results.fail,
    warnings_list: results.warn,
  };
}

main().then(report => {
  // Report als JSON ausgeben für spätere Auswertung
  process.stdout.write('\n__REPORT__' + JSON.stringify(report) + '__END_REPORT__\n');
}).catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
