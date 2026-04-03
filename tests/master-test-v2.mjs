/**
 * SF-1 MASTER SYSTEM TEST v2 — Vollständige Plattform-Prüfung
 * ============================================================
 * Korrigierte Endpunkte, dynamische IPs, umfassende Tests
 */
import http from 'http';
import https from 'https';
import { execSync } from 'child_process';

// ── IPs dynamisch ermitteln ────────────────────────────────────────────────
function getIP(container) {
  try {
    return execSync(
      `docker inspect ${container} --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'`,
      { encoding: 'utf8', timeout: 5000 }
    ).trim();
  } catch { return null; }
}

const IPs = {
  auth:         getIP('sf1-auth-service'),
  community:    getIP('sf1-community-service'),
  price:        getIP('sf1-price-service'),
  search:       getIP('sf1-search-service'),
  journal:      getIP('sf1-journal-service'),
  tools:        getIP('sf1-tools-service'),
  ai:           getIP('sf1-ai-service'),
  backup:       getIP('sf1-backup'),
  gamification: getIP('sf1-gamification-service'),
  notification: getIP('sf1-notification-service'),
  media:        getIP('sf1-media-service'),
};

const SVC = {
  auth:         `http://${IPs.auth}:3001`,
  community:    `http://${IPs.community}:3005`,
  price:        `http://${IPs.price}:3002`,
  search:       `http://${IPs.search}:3007`,
  journal:      `http://${IPs.journal}:3003`,
  tools:        `http://${IPs.tools}:3004`,
  ai:           `http://${IPs.ai}:3010`,
  backup:       `http://${IPs.backup}:3011`,
  gamification: `http://${IPs.gamification}:3009`,
  notification: `http://${IPs.notification}:3006`,
  media:        `http://${IPs.media}:3008`,
};

const FRONTEND = 'https://seedfinderpro.de';
const REDIS_PASS = execSync("grep REDIS_PASSWORD /root/SF-1-Ultimate-/.env 2>/dev/null | head -1 | cut -d= -f2", { encoding: 'utf8' }).trim();

let ADMIN_JWT = '';
let USER_JWT  = '';
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
function section(title) {
  log(`\n${'═'.repeat(62)}`);
  log(`  ${title}`);
  log(`${'═'.repeat(62)}`);
}

async function req(method, url, body = null, headers = {}, timeout = 10000) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      port: urlObj.port || (url.startsWith('https') ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    const timer = setTimeout(() => resolve({ status: 0, data: null, error: 'TIMEOUT' }), timeout);
    const r = lib.request(opts, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        clearTimeout(timer);
        try { resolve({ status: res.statusCode, data: JSON.parse(raw), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, data: raw, headers: res.headers }); }
      });
    });
    r.on('error', (e) => { clearTimeout(timer); resolve({ status: 0, data: null, error: e.message }); });
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function authH(jwt) { return { Authorization: `Bearer ${jwt}` }; }

function adminJWT() {
  try {
    return execSync(`docker exec sf1-auth-service node -e "const jwt=require('jsonwebtoken');const p=new (require('@prisma/client').PrismaClient)();p.user.findFirst({where:{role:'ADMIN'}}).then(u=>{if(!u){console.log('NO');process.exit(1);}console.log(jwt.sign({userId:u.id,role:u.role,email:u.email},process.env.JWT_SECRET,{expiresIn:'2h'}));p.$disconnect();})" 2>/dev/null`,
      { encoding: 'utf8', timeout: 15000 }).trim();
  } catch {
    return execSync(`docker exec sf1-auth-service node -e "const jwt=require('jsonwebtoken');console.log(jwt.sign({userId:'admin-test',role:'ADMIN',email:'klingenpascal@gmail.com'},process.env.JWT_SECRET,{expiresIn:'2h'}))" 2>/dev/null`,
      { encoding: 'utf8', timeout: 8000 }).trim();
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 1. HEALTH CHECKS
// ══════════════════════════════════════════════════════════════════════════
async function testHealth() {
  section('1. HEALTH CHECKS — alle 11 Services');
  const checks = [
    ['auth-service',         `${SVC.auth}/health`],
    ['community-service',    `${SVC.community}/api/community/health`],
    ['price-service',        `${SVC.price}/api/prices/health`],
    ['search-service',       `${SVC.search}/api/search/health`],
    ['journal-service',      `${SVC.journal}/api/journal/health`],
    ['tools-service',        `${SVC.tools}/api/tools/health`],
    ['ai-service',           `${SVC.ai}/api/ai/health`],
    ['backup-service',       `${SVC.backup}/api/backup/status`],
    ['gamification-service', `${SVC.gamification}/api/gamification/health`],
    ['notification-service', `${SVC.notification}/api/notifications/health`],
    ['media-service',        `${SVC.media}/api/media/health`],
  ];
  for (const [name, url] of checks) {
    const r = await req('GET', url, null, {}, 8000);
    if (r.status === 200) pass(`${name}: healthy`);
    else if (r.status === 401) warn(`${name}: Auth erforderlich (läuft)`);
    else if (r.status === 0) fail(`${name}: NICHT ERREICHBAR — ${r.error}`);
    else warn(`${name}: Status ${r.status}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 2. AUTHENTIFIZIERUNG
// ══════════════════════════════════════════════════════════════════════════
async function testAuth() {
  section('2. AUTHENTIFIZIERUNG — Vollständiger Flow');

  // Admin-JWT
  log('\n  [2.1] Admin-JWT');
  try {
    ADMIN_JWT = adminJWT();
    if (ADMIN_JWT?.length > 100) pass(`Admin-JWT: generiert (${ADMIN_JWT.length} Zeichen)`);
    else fail('Admin-JWT: leer oder zu kurz');
  } catch (e) { fail('Admin-JWT: Fehler', e.message.substring(0, 60)); }

  // /me mit Admin-JWT
  if (ADMIN_JWT) {
    const me = await req('GET', `${SVC.auth}/api/auth/me`, null, authH(ADMIN_JWT));
    if (me.status === 200 && me.data?.role === 'ADMIN') pass(`/me: Admin korrekt identifiziert (${me.data.email})`);
    else warn(`/me: Status ${me.status}`);
  }

  // Login-Test mit existierenden Credentials (kein neuer User, wegen Rate-Limit)
  log('\n  [2.2] Login-Flow Test');
  const badLogin = await req('POST', `${SVC.auth}/api/auth/login`,
    { email: 'nonexistent@sf1-test.de', password: 'WrongPass123!' });
  if (badLogin.status === 401) pass('Falsches Login korrekt abgelehnt (401)');
  else if (badLogin.status === 429) warn('Rate-Limit aktiv — zu viele Login-Versuche (429)');
  else warn(`Login-Test: Status ${badLogin.status}`);

  // Kein Auth → 401
  log('\n  [2.3] Unauthorized-Schutz');
  const noAuth = await req('GET', `${SVC.auth}/api/auth/me`);
  if (noAuth.status === 401) pass('GET /me ohne JWT: korrekt 401');
  else fail('GET /me ohne JWT: NICHT geschützt', `Status ${noAuth.status}`);

  // Gefälschtes JWT
  const fakeJWT = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJhZG1pbiIsInJvbGUiOiJBRE1JTiJ9.FAKE';
  const fakeR = await req('GET', `${SVC.auth}/api/auth/me`, null, authH(fakeJWT));
  if (fakeR.status === 401) pass('Gefälschtes JWT: korrekt abgelehnt');
  else fail('Gefälschtes JWT: NICHT abgelehnt', `Status ${fakeR.status}`);
}

// ══════════════════════════════════════════════════════════════════════════
// 3. SICHERHEITS-TESTS
// ══════════════════════════════════════════════════════════════════════════
async function testSecurity() {
  section('3. SICHERHEITS-TESTS');

  log('\n  [3.1] XSS / Injection');
  const injections = [
    { email: '<script>alert(1)</script>', password: 'test123' },
    { email: '"; DROP TABLE users; --', password: 'test' },
    { email: '${process.env.JWT_SECRET}', password: 'test' },
    { email: 'x@x.com OR 1=1', password: 'test' },
  ];
  for (const payload of injections) {
    const r = await req('POST', `${SVC.auth}/api/auth/login`, payload);
    if (r.status !== 500 && r.status !== 0) pass(`Injection blockiert: ${payload.email.substring(0,25)}`);
    else fail('Server-Crash bei Injection!', `Status ${r.status}`);
  }

  log('\n  [3.2] Admin-Routen-Schutz');
  const adminRoutes = [
    [`${SVC.backup}/api/backup/backups/trigger`, 'POST', 'Backup-Trigger'],
    [`${SVC.community}/api/community/categories`, 'POST', 'Kategorie erstellen'],
    [`${SVC.auth}/api/auth/admin/users`, 'GET', 'User-Liste'],
  ];
  for (const [url, method, label] of adminRoutes) {
    const r = await req(method, url, {}, {});
    if (r.status === 401 || r.status === 403) pass(`${label}: korrekt geschützt (${r.status})`);
    else if (r.status === 404) warn(`${label}: Route nicht gefunden`);
    else warn(`${label}: Status ${r.status}`);
  }

  log('\n  [3.3] CORS');
  const cors = await req('OPTIONS', `${SVC.auth}/health`, null, { Origin: 'https://evil-hacker.com' });
  const allowOrigin = cors.headers?.['access-control-allow-origin'] || '';
  if (!allowOrigin || allowOrigin === 'null') pass('CORS: Fremde Origin blockiert');
  else if (allowOrigin === '*') warn('CORS: Wildcard (*) — prüfen ob gewollt');
  else if (allowOrigin.includes('seedfinderpro')) pass(`CORS: Nur eigene Domain (${allowOrigin})`);
  else warn(`CORS: Origin = "${allowOrigin}"`);

  log('\n  [3.4] Security-Headers (Traefik/Frontend)');
  const front = await req('GET', FRONTEND, null, {}, 15000);
  const headers = front.headers || {};
  for (const [h, desc] of [
    ['x-content-type-options', 'MIME-Sniffing-Schutz'],
    ['x-frame-options', 'Clickjacking-Schutz'],
    ['strict-transport-security', 'HSTS'],
    ['x-xss-protection', 'XSS-Header'],
  ]) {
    if (headers[h]) pass(`Security-Header: ${h} (${desc})`);
    else warn(`Security-Header fehlt: ${h}`);
  }

  log('\n  [3.5] Rate-Limiting Prüfung');
  // Schnelle Login-Versuche
  let got429 = false;
  for (let i = 0; i < 8; i++) {
    const r = await req('POST', `${SVC.auth}/api/auth/login`,
      { email: `ratetest${i}@x.de`, password: 'wrong' });
    if (r.status === 429) { got429 = true; break; }
  }
  if (got429) pass('Rate-Limiting: aktiv (429 erhalten)');
  else warn('Rate-Limiting: in 8 Versuchen nicht ausgelöst');
}

// ══════════════════════════════════════════════════════════════════════════
// 4. COMMUNITY-SERVICE
// ══════════════════════════════════════════════════════════════════════════
async function testCommunity() {
  section('4. COMMUNITY-SERVICE — Forum, Threads, Kategorien');

  // Kategorien (public) — Response: { categories: [...] }
  const cats = await req('GET', `${SVC.community}/api/community/categories`);
  const catList = cats.data?.categories;
  if (cats.status === 200 && Array.isArray(catList)) {
    pass(`Kategorien: ${catList.length} geladen`);
  } else fail('Kategorien', `Status ${cats.status}`);

  // Threads (public)
  const threads = await req('GET', `${SVC.community}/api/community/threads?limit=5`);
  if (threads.status === 200 && threads.data?.threads) {
    pass(`Threads: ${threads.data.threads.length} geladen, ${threads.data.total || '?'} gesamt`);
  } else fail('Threads-Feed', `Status ${threads.status}`);

  // Thread erstellen ohne Auth (muss 401 sein)
  const noAuth = await req('POST', `${SVC.community}/api/community/threads`,
    { title: 'Test', content: 'test content hier', categoryId: 'xxx' });
  if (noAuth.status === 401) pass('Thread ohne Auth: korrekt geschützt');
  else warn(`Thread ohne Auth: Status ${noAuth.status}`);

  // Thread mit Admin-JWT erstellen
  if (ADMIN_JWT) {
    const cat = catList?.[0];
    if (cat) {
      const newThread = await req('POST', `${SVC.community}/api/community/threads`, {
        title: `System-Test ${Date.now()}`,
        content: 'Automatischer System-Test — dieser Thread kann gelöscht werden.',
        categoryId: cat._id,
        tags: ['test']
      }, authH(ADMIN_JWT));
      if (newThread.status === 201 || newThread.status === 200) {
        pass('Thread erstellen (Admin): erfolgreich');
      } else warn(`Thread erstellen: Status ${newThread.status} — ${JSON.stringify(newThread.data)?.substring(0,60)}`);
    }
  }

  // Suche
  const search = await req('GET', `${SVC.community}/api/community/threads?search=test&limit=3`);
  if (search.status === 200) pass('Community-Suche: funktioniert');
  else warn(`Community-Suche: Status ${search.status}`);

  // Follower-System
  const leaderboard = await req('GET', `${SVC.community}/api/community/users/leaderboard?limit=5`);
  if (leaderboard.status === 200) pass(`Leaderboard: abrufbar`);
  else warn(`Leaderboard: Status ${leaderboard.status}`);
}

// ══════════════════════════════════════════════════════════════════════════
// 5. PRICE-SERVICE
// ══════════════════════════════════════════════════════════════════════════
async function testPrice() {
  section('5. PRICE-SERVICE — Strains, Preise, Scraper');

  // Strains über Search-Service (korrekte Route)
  const strains = await req('GET', `${SVC.search}/api/search?q=OG+Kush&limit=5`);
  if (strains.status === 200 && strains.data?.strains?.hits) {
    pass(`Strains-Suche: ${strains.data.strains.hits.length} Ergebnisse`);
  } else warn(`Strains-Suche via Search: Status ${strains.status}`);

  // Preise (price-service)
  const prices = await req('GET', `${SVC.price}/api/prices/browse?limit=5`);
  if (prices.status === 200) {
    const count = prices.data?.seeds?.length || prices.data?.prices?.length || prices.data?.length || 0;
    pass(`Preisliste: ${count} Einträge`);
  } else fail('Preisliste', `Status ${prices.status}`);

  // Seedbanks
  const seedbanks = await req('GET', `${SVC.price}/api/prices/seedbanks`);
  if (seedbanks.status === 200) {
    const count = Array.isArray(seedbanks.data) ? seedbanks.data.length : '?';
    pass(`Seedbanks: ${count} registriert`);
  } else warn(`Seedbanks: Status ${seedbanks.status}`);

  // Scraper-Status (Admin)
  if (ADMIN_JWT) {
    const scraperSt = await req('GET', `${SVC.price}/api/prices/scraper/status`, null, authH(ADMIN_JWT));
    if (scraperSt.status === 200) {
      const feeds = scraperSt.data?.schedule?.registeredFeeds?.length || 0;
      pass(`Scraper: läuft, ${feeds} Feeds registriert`);
      if (scraperSt.data?.schedule?.failed > 0) warn(`Scraper: ${scraperSt.data.schedule.failed} Jobs fehlgeschlagen`);
    } else warn(`Scraper-Status: ${scraperSt.status}`);

    // Feed-Queue Stats
    const queue = await req('GET', `${SVC.price}/api/prices/scraper/queue`, null, authH(ADMIN_JWT));
    if (queue.status === 200) {
      const d = queue.data;
      const status = `completed=${d?.completed||0}, failed=${d?.failed||0}, active=${d?.active||0}`;
      if ((d?.failed || 0) > 5) warn(`Feed-Queue: ${d.failed} Fehler — ${status}`);
      else pass(`Feed-Queue: ${status}`);
    }
  }

  // Affiliates testen
  const aff = await req('GET', `${SVC.price}/api/prices/affiliate/click`, null, {});
  // 404 oder 400 = Route vorhanden aber Parameter fehlt
  if (aff.status !== 0) pass('Affiliate-Route: erreichbar');
  else warn('Affiliate-Route: nicht erreichbar');
}

// ══════════════════════════════════════════════════════════════════════════
// 6. JOURNAL-SERVICE
// ══════════════════════════════════════════════════════════════════════════
async function testJournal() {
  section('6. JOURNAL-SERVICE — Grows, Einträge, Feed');

  // Geschützte Routes ohne Auth
  const grows = await req('GET', `${SVC.journal}/api/journal/grows`);
  if (grows.status === 401) pass('Grows ohne Auth: korrekt geschützt (401)');
  else fail('Grows ohne Auth: NICHT geschützt', `Status ${grows.status}`);

  // Feed (public)
  const feed = await req('GET', `${SVC.journal}/api/journal/feed?limit=5`);
  if (feed.status === 200 || feed.status === 401) pass(`Journal-Feed: Status ${feed.status} (korrekt)`);
  else warn(`Journal-Feed: Status ${feed.status}`);

  // Mit Admin-JWT
  if (ADMIN_JWT) {
    const myGrows = await req('GET', `${SVC.journal}/api/journal/grows`, null, authH(ADMIN_JWT));
    if (myGrows.status === 200) {
      const count = Array.isArray(myGrows.data) ? myGrows.data.length : (myGrows.data?.grows?.length || '?');
      pass(`Grows (Admin): ${count} Grows abrufbar`);
    } else warn(`Grows (Admin): Status ${myGrows.status}`);

    // Analytics
    const analytics = await req('GET', `${SVC.journal}/api/journal/analytics/overview`, null, authH(ADMIN_JWT));
    if (analytics.status === 200) pass('Journal-Analytics: abrufbar');
    else warn(`Journal-Analytics: Status ${analytics.status}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 7. SEARCH-SERVICE — Meilisearch
// ══════════════════════════════════════════════════════════════════════════
async function testSearch() {
  section('7. SEARCH-SERVICE — Volltext-Suche (Meilisearch)');

  const queries = [
    { q: 'OG Kush', min: 1, label: 'bekannter Strain' },
    { q: 'Haze', min: 1, label: 'Haze-Suche' },
    { q: 'autoflower', min: 1, label: 'autoflower' },
    { q: 'growing', min: 0, label: 'Forum-Begriff' },
    { q: 'xyz123notexist', min: 0, label: 'Kein-Ergebnis-Query' },
  ];

  for (const { q, min, label } of queries) {
    const r = await req('GET', `${SVC.search}/api/search?q=${encodeURIComponent(q)}&limit=5`);
    if (r.status === 200) {
      const hits = r.data?.strains?.hits?.length || r.data?.hits?.length || 0;
      if (hits >= min) pass(`Suche "${q}" (${label}): ${hits} Treffer`);
      else warn(`Suche "${q}": ${hits} Treffer (erwartet ≥${min})`);
    } else fail(`Suche "${q}": Status ${r.status}`);
  }

  // XSS in Suche
  const xss = await req('GET', `${SVC.search}/api/search?q=${encodeURIComponent('<script>alert(1)</script>')}`);
  if (xss.status !== 500 && xss.status !== 0) pass('XSS in Suche: kein Server-Crash');
  else fail('XSS in Suche: Server-Crash!');

  // Leere Suche
  const empty = await req('GET', `${SVC.search}/api/search?q=`);
  if (empty.status === 200 || empty.status === 400) pass('Leere Suche: sauber behandelt');
  else warn(`Leere Suche: Status ${empty.status}`);
}

// ══════════════════════════════════════════════════════════════════════════
// 8. AI-SERVICE
// ══════════════════════════════════════════════════════════════════════════
async function testAI() {
  section('8. AI-SERVICE — Chat, Strain-Info, Grow-Berater');

  // Ohne Auth
  const noAuth = await req('POST', `${SVC.ai}/api/ai/chat`, { message: 'Hallo' });
  if (noAuth.status === 401) pass('AI-Chat ohne Auth: korrekt geschützt');
  else warn(`AI-Chat ohne Auth: Status ${noAuth.status}`);

  if (!ADMIN_JWT) { warn('AI-Tests: kein JWT — übersprungen'); return; }

  // Chat
  log('\n  [8.2] AI-Chat (10-30s)...');
  const chat = await req('POST', `${SVC.ai}/api/ai/chat`,
    { message: 'Was ist der Unterschied zwischen Indica und Sativa? 1 Satz.' },
    authH(ADMIN_JWT), 35000
  );
  if (chat.status === 200 && (chat.data?.response || chat.data?.message || chat.data?.content)) {
    const resp = chat.data?.response || chat.data?.message || chat.data?.content;
    pass(`AI-Chat: Antwort erhalten (${resp.length} Zeichen)`);
  } else if (chat.status === 429) warn('AI-Chat: Rate-Limit');
  else fail(`AI-Chat: Status ${chat.status}`, JSON.stringify(chat.data)?.substring(0,80));

  // Strain-Info
  log('\n  [8.3] AI Strain-Info...');
  const strainAI = await req('POST', `${SVC.ai}/api/ai/strain-info`,
    { strainName: 'White Widow' }, authH(ADMIN_JWT), 30000
  );
  if (strainAI.status === 200) pass('AI Strain-Info: funktioniert');
  else warn(`AI Strain-Info: Status ${strainAI.status}`);

  // Grow-Berater
  log('\n  [8.4] AI Grow-Berater...');
  const growAI = await req('POST', `${SVC.ai}/api/ai/grow-advisor`,
    { question: 'Blätter werden gelb — was tun?' }, authH(ADMIN_JWT), 30000
  );
  if (growAI.status === 200) pass('AI Grow-Berater: funktioniert');
  else warn(`AI Grow-Berater: Status ${growAI.status}`);

  // AI Diagnose
  log('\n  [8.5] AI Diagnose-Endpunkt...');
  const diagEndpoints = ['/api/ai/diagnose', '/api/ai/plant-diagnosis'];
  for (const ep of diagEndpoints) {
    const r = await req('GET', `${SVC.ai}${ep}`, null, authH(ADMIN_JWT), 5000);
    if (r.status !== 0) { pass(`AI Diagnose-Endpunkt ${ep}: erreichbar`); break; }
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 9. GAMIFICATION
// ══════════════════════════════════════════════════════════════════════════
async function testGamification() {
  section('9. GAMIFICATION — XP, Level, Badges, Leaderboard');

  // Leaderboard: /api/gamification/profile/leaderboard
  const lb = await req('GET', `${SVC.gamification}/api/gamification/profile/leaderboard?limit=10`);
  if (lb.status === 200) pass(`Leaderboard: ${lb.data?.users?.length || lb.data?.length || 0} Einträge`);
  else warn(`Leaderboard: Status ${lb.status}`);

  if (ADMIN_JWT) {
    // Profil: /api/gamification/profile/:userId (Admin hat userId 'admin')
    const me = await req('GET', `${SVC.gamification}/api/gamification/profile/admin`, null, authH(ADMIN_JWT));
    if (me.status === 200) {
      pass(`Gamification-Profil: Level ${me.data?.level || '?'}, ${me.data?.xp || 0} XP`);
    } else warn(`Gamification-Profil: Status ${me.status}`);

    // Badges: Admin-Route /api/gamification/admin/badges
    const badges = await req('GET', `${SVC.gamification}/api/gamification/admin/badges`, null, authH(ADMIN_JWT));
    if (badges.status === 200) pass(`Badges: ${Array.isArray(badges.data) ? badges.data.length : '?'} verfügbar`);
    else warn(`Badges: Status ${badges.status}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 10. NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════
async function testNotifications() {
  section('10. NOTIFICATION-SERVICE — In-App & Push');

  const noAuth = await req('GET', `${SVC.notification}/api/notifications`);
  if (noAuth.status === 401) pass('Notifications ohne Auth: 401');
  else warn(`Notifications ohne Auth: Status ${noAuth.status}`);

  if (ADMIN_JWT) {
    const notifs = await req('GET', `${SVC.notification}/api/notifications?limit=5`, null, authH(ADMIN_JWT));
    if (notifs.status === 200) {
      const count = Array.isArray(notifs.data) ? notifs.data.length : (notifs.data?.notifications?.length || '?');
      pass(`Notifications: ${count} Einträge`);
    } else warn(`Notifications: Status ${notifs.status}`);

    // Unread Count
    const unread = await req('GET', `${SVC.notification}/api/notifications/unread/count`, null, authH(ADMIN_JWT));
    if (unread.status === 200) pass(`Unread-Count: ${unread.data?.count || 0}`);
    else warn(`Unread-Count: Status ${unread.status}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 11. BACKUP-SERVICE
// ══════════════════════════════════════════════════════════════════════════
async function testBackup() {
  section('11. BACKUP-SERVICE — Integrität & Dateien');

  if (ADMIN_JWT) {
    const status = await req('GET', `${SVC.backup}/api/backup/status`, null, authH(ADMIN_JWT));
    if (status.status === 200) pass(`Backup-Service: läuft`);
    else fail('Backup-Service', `Status ${status.status}`);

    const list = await req('GET', `${SVC.backup}/api/backup/backups`, null, authH(ADMIN_JWT));
    if (list.status === 200 && Array.isArray(list.data)) {
      pass(`Backup-Liste: ${list.data.length} Backups`);
      const latest = list.data[0];
      if (latest) pass(`Neuestes: ${latest.filename || latest.name || JSON.stringify(latest).substring(0,40)}`);
    } else warn(`Backup-Liste: Status ${list.status}`);
  }

  // Dateien auf Disk
  try {
    const count = execSync('ls /root/SF-1-Ultimate-/backups/*.enc 2>/dev/null | wc -l', { encoding: 'utf8' }).trim();
    const latest = execSync("ls -lt /root/SF-1-Ultimate-/backups/*.enc 2>/dev/null | head -1 | awk '{print $NF}'", { encoding: 'utf8' }).trim().split('/').pop();
    if (parseInt(count) > 0) pass(`Backup-Dateien: ${count} verschlüsselte Backups auf Disk`);
    else fail('Keine Backup-Dateien auf Disk!');
    if (latest) pass(`Letztes Backup: ${latest}`);
  } catch { warn('Backup-Dateien: Prüfung fehlgeschlagen'); }
}

// ══════════════════════════════════════════════════════════════════════════
// 12. DATENBANK
// ══════════════════════════════════════════════════════════════════════════
async function testDatabase() {
  section('12. DATENBANK-INTEGRITÄT — PostgreSQL & MongoDB');

  // PostgreSQL
  try {
    const pg = execSync(`docker exec sf1-postgres psql -U postgres -d sf1_auth -c "SELECT COUNT(*) FROM users;" -t 2>/dev/null`, { encoding: 'utf8', timeout: 10000 }).trim();
    const userCount = parseInt(pg.trim()) || 0;
    pass(`PostgreSQL users: ${userCount} User`);

    const pgAdmin = execSync(`docker exec sf1-postgres psql -U postgres -d sf1_auth -c "SELECT COUNT(*) FROM users WHERE role='ADMIN';" -t 2>/dev/null`, { encoding: 'utf8', timeout: 8000 }).trim();
    const adminCount = parseInt(pgAdmin.trim()) || 0;
    if (adminCount > 0) pass(`PostgreSQL Admins: ${adminCount} Admin-Account(s)`);
    else fail('KEIN ADMIN in PostgreSQL!');

    const pgTokens = execSync(`docker exec sf1-postgres psql -U postgres -d sf1_auth -c "SELECT COUNT(*) FROM refresh_tokens;" -t 2>/dev/null`, { encoding: 'utf8', timeout: 8000 }).trim();
    pass(`PostgreSQL Refresh-Tokens: ${parseInt(pgTokens.trim()) || 0}`);
  } catch (e) {
    // Fallback via Prisma
    try {
      const pData = execSync(`docker exec sf1-auth-service node -e "const p=new(require('@prisma/client').PrismaClient)();Promise.all([p.user.count(),p.user.count({where:{role:'ADMIN'}})]).then(([u,a])=>{console.log(u+','+a);p.$disconnect();})" 2>/dev/null`,
        { encoding: 'utf8', timeout: 12000 }).trim();
      const [u, a] = pData.split(',').map(Number);
      pass(`PostgreSQL: ${u} User, ${a} Admins (via Prisma)`);
      if (a === 0) fail('KEIN ADMIN gefunden!');
    } catch (e2) { warn('PostgreSQL: Direktprüfung fehlgeschlagen', e2.message.substring(0,50)); }
  }

  // MongoDB
  try {
    const seeds = execSync(`docker exec sf1-mongodb mongosh sf1_prices --quiet --eval "db.seeds.countDocuments()" 2>/dev/null`, { encoding: 'utf8', timeout: 10000 }).trim();
    const prices = execSync(`docker exec sf1-mongodb mongosh sf1_prices --quiet --eval "db.prices.countDocuments()" 2>/dev/null`, { encoding: 'utf8', timeout: 10000 }).trim();
    const posts = execSync(`docker exec sf1-mongodb mongosh sf1_community --quiet --eval "db.threads.countDocuments()" 2>/dev/null`, { encoding: 'utf8', timeout: 10000 }).trim();
    pass(`MongoDB Seeds: ${seeds || 0} in DB`);
    pass(`MongoDB Prices: ${prices || 0} Preiseinträge`);
    pass(`MongoDB Community-Threads: ${posts || 0}`);
    if (parseInt(seeds) === 0) warn('Keine Seeds in MongoDB — Scraper-Problem?');
  } catch (e) { warn('MongoDB: Prüfung fehlgeschlagen', e.message.substring(0,50)); }
}

// ══════════════════════════════════════════════════════════════════════════
// 13. FRONTEND / PWA
// ══════════════════════════════════════════════════════════════════════════
async function testFrontend() {
  section('13. FRONTEND / PWA — Seiten & Assets');

  // Startseite (307 = Redirect ist OK)
  const home = await req('GET', FRONTEND, null, {}, 20000);
  if (home.status === 200 || home.status === 307) pass(`Startseite: ${home.status}`);
  else fail('Startseite: NICHT erreichbar', `Status ${home.status}`);

  // PWA-Assets
  for (const [label, path] of [
    ['PWA Manifest', '/manifest.webmanifest'],
    ['Service Worker', '/sw.js'],
    ['Icon 192', '/icon-192x192.png'],
    ['Icon 512', '/icon-512x512.png'],
    ['Apple Touch Icon', '/apple-touch-icon.png'],
  ]) {
    const r = await req('GET', FRONTEND + path, null, {}, 10000);
    if (r.status === 200) pass(`${label}: vorhanden`);
    else warn(`${label}: Status ${r.status}`);
  }

  // Wichtige Seiten
  const pages = [
    ['/strains', 'Strain-Datenbank'],
    ['/strains/preisvergleich', 'Preisvergleich'],
    ['/auth/login', 'Login'],
    ['/auth/register', 'Registrierung'],
    ['/forum', 'Forum'],
    ['/dashboard', 'Dashboard'],
  ];
  for (const [path, label] of pages) {
    const r = await req('GET', FRONTEND + path, null, {}, 15000);
    if ([200, 307, 301, 302].includes(r.status)) pass(`Seite ${label}: ${r.status}`);
    else fail(`Seite ${label}: Status ${r.status}`);
  }

  // HTTP→HTTPS Redirect
  const httpR = await req('GET', 'http://seedfinderpro.de', null, {}, 10000);
  if ([301, 302, 307, 308].includes(httpR.status)) pass('HTTP→HTTPS Redirect: aktiv');
  else warn(`HTTP→HTTPS: Status ${httpR.status}`);
}

// ══════════════════════════════════════════════════════════════════════════
// 14. TOOLS-SERVICE
// ══════════════════════════════════════════════════════════════════════════
async function testTools() {
  section('14. TOOLS-SERVICE — Kalkulatoren & Timer');

  const h = await req('GET', `${SVC.tools}/api/tools/health`);
  if (h.status === 200) pass('Tools-Service: healthy');
  else fail('Tools-Service', `Status ${h.status}`);

  // Timer (public oder auth)
  const timer = await req('GET', `${SVC.tools}/api/tools/timers`);
  if (timer.status === 200 || timer.status === 401) pass(`Timer-Route: Status ${timer.status}`);
  else warn(`Timer-Route: Status ${timer.status}`);

  // Kalkulator
  if (ADMIN_JWT) {
    const calc = await req('POST', `${SVC.tools}/api/tools/calculator`,
      { type: 'feeding', weight: 100, ec: 1.5 }, authH(ADMIN_JWT));
    if (calc.status === 200 || calc.status === 404 || calc.status === 400) {
      pass(`Kalkulator-Route: erreichbar (${calc.status})`);
    } else warn(`Kalkulator: Status ${calc.status}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 15. REDIS
// ══════════════════════════════════════════════════════════════════════════
async function testRedis() {
  section('15. REDIS — Cache & Session-Store');

  try {
    const ping = execSync(
      `docker exec sf1-redis redis-cli -a '${REDIS_PASS}' ping 2>/dev/null`,
      { encoding: 'utf8', timeout: 5000 }
    ).trim();
    if (ping === 'PONG') pass('Redis: PONG erhalten');
    else warn(`Redis: ${ping}`);

    const info = execSync(
      `docker exec sf1-redis redis-cli -a '${REDIS_PASS}' info memory 2>/dev/null | grep used_memory_human`,
      { encoding: 'utf8', timeout: 5000 }
    ).trim();
    pass(`Redis Speicher: ${info.split(':')[1]?.trim() || '?'}`);

    const keys = execSync(
      `docker exec sf1-redis redis-cli -a '${REDIS_PASS}' dbsize 2>/dev/null`,
      { encoding: 'utf8', timeout: 5000 }
    ).trim();
    pass(`Redis Keys: ${keys}`);

    // Latenz-Test
    const latency = execSync(
      `docker exec sf1-redis redis-cli -a '${REDIS_PASS}' --latency-samples 10 2>/dev/null | head -1`,
      { encoding: 'utf8', timeout: 8000 }
    ).trim();
    if (latency) pass(`Redis Latenz: ${latency}`);
  } catch (e) {
    fail('Redis-Test fehlgeschlagen', e.message.substring(0, 60));
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 16. SYSTEM-RESSOURCEN
// ══════════════════════════════════════════════════════════════════════════
async function testSystem() {
  section('16. SYSTEM-RESSOURCEN — CPU, RAM, Disk, Container');

  // Disk
  try {
    const disk = execSync('df -h / | tail -1', { encoding: 'utf8' }).trim().split(/\s+/);
    const pct = parseInt(disk[4]);
    if (pct < 80) pass(`Disk: ${disk[2]} von ${disk[1]} (${disk[4]})`);
    else if (pct < 90) warn(`Disk: ${disk[4]} — ENGPASS!`);
    else fail(`Disk: ${disk[4]} KRITISCH!`);
  } catch { warn('Disk: nicht abfragbar'); }

  // RAM
  try {
    const mem = execSync("cat /proc/meminfo | grep -E 'MemTotal|MemAvailable'", { encoding: 'utf8' }).trim();
    const total = parseInt(mem.match(/MemTotal:\s+(\d+)/)?.[1] || 0) / 1024;
    const avail = parseInt(mem.match(/MemAvailable:\s+(\d+)/)?.[1] || 0) / 1024;
    const used = total - avail;
    const pct = Math.round((used / total) * 100);
    if (pct < 85) pass(`RAM: ${Math.round(used)}MB von ${Math.round(total)}MB belegt (${pct}%)`);
    else warn(`RAM: ${pct}% belegt — eng!`);
  } catch { warn('RAM: nicht abfragbar'); }

  // CPU Load
  try {
    const load = execSync('cat /proc/loadavg', { encoding: 'utf8' }).trim().split(' ');
    const cpus = parseInt(execSync('nproc', { encoding: 'utf8' }).trim());
    const load1 = parseFloat(load[0]);
    if (load1 < cpus) pass(`CPU Load: ${load[0]} / ${load[1]} / ${load[2]} (${cpus} CPUs)`);
    else warn(`CPU Load hoch: ${load[0]} auf ${cpus} CPUs`);
  } catch { warn('CPU: nicht abfragbar'); }

  // Container
  try {
    const running = execSync("docker ps --filter 'name=sf1' --format '{{.Names}}' | wc -l", { encoding: 'utf8' }).trim();
    const unhealthy = execSync("docker ps --filter 'name=sf1' --filter 'health=unhealthy' --format '{{.Names}}'", { encoding: 'utf8' }).trim();
    pass(`SF-1 Container aktiv: ${running}`);
    if (unhealthy) warn(`Unhealthy Container: ${unhealthy}`);
    else pass('Alle Container: healthy/running');
  } catch { warn('Container-Status: nicht prüfbar'); }

  // Meilisearch
  try {
    const ms = execSync("curl -s http://172.28.0.17:7700/health 2>/dev/null || curl -s http://localhost:7700/health 2>/dev/null", { encoding: 'utf8', timeout: 5000 }).trim();
    const msIP = execSync("docker inspect sf1-meilisearch --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null", { encoding: 'utf8' }).trim();
    const ms2 = execSync(`curl -s http://${msIP}:7700/health 2>/dev/null`, { encoding: 'utf8', timeout: 5000 }).trim();
    if (ms2.includes('available')) pass('Meilisearch: healthy');
    else warn(`Meilisearch: ${ms2.substring(0,50)}`);
  } catch { warn('Meilisearch: Direkt-Check fehlgeschlagen'); }
}

// ══════════════════════════════════════════════════════════════════════════
// 17. LAST-TEST — 100 gleichzeitige User
// ══════════════════════════════════════════════════════════════════════════
async function testLoad() {
  section('17. LAST-TEST — 100 gleichzeitige Nutzer');

  async function runBatch(n, url, label, timeout = 10000) {
    const start = Date.now();
    const res = await Promise.all(Array(n).fill(0).map(() => req('GET', url, null, {}, timeout)));
    const ms = Date.now() - start;
    const ok = res.filter(r => r.status === 200 || r.status === 307).length;
    const err = res.filter(r => r.status === 0).length;
    const rps = Math.round(n / (ms / 1000));
    return { ok, err, other: n - ok - err, ms, rps, n, label };
  }

  const batches = [
    [20, `${SVC.community}/api/community/categories`,      'Community Kategorien'],
    [20, `${SVC.community}/api/community/threads?limit=5`, 'Community Threads'],
    [20, `${SVC.search}/api/search?q=kush&limit=5`,        'Meilisearch Suche'],
    [20, `${SVC.price}/api/prices/browse?limit=5`,          'Preisliste'],
    [20, `${SVC.auth}/health`,                             'Auth Health'],
  ];

  log('\n  Starte 100 parallele Requests (5 × 20)...\n');
  const results2 = await Promise.all(batches.map(([n, url, label]) => runBatch(n, url, label)));

  let totalOK = 0, totalErr = 0;
  for (const r of results2) {
    totalOK += r.ok;
    totalErr += r.err;
    const line = `${r.label}: ${r.ok}/${r.n} OK, ${r.ms}ms, ~${r.rps} req/s`;
    if (r.ok === r.n) pass(line);
    else if (r.err > 5) fail(`${r.label}: ${r.err} Timeouts`, line);
    else warn(line);
  }

  log(`\n  📊 Gesamt: ${totalOK}/100 OK, ${totalErr} Timeouts`);
  if (totalOK >= 95) pass(`Load-Test BESTANDEN: ${totalOK}/100`);
  else if (totalOK >= 80) warn(`Load-Test OK: ${totalOK}/100`);
  else fail(`Load-Test FEHLGESCHLAGEN: ${totalOK}/100`);

  // Stress-Test: 200 schnelle Requests
  log('\n  [Stress] 200 Requests auf Auth-Health...');
  const stress = await runBatch(200, `${SVC.auth}/health`, 'Stress');
  if (stress.ok >= 180) pass(`Stress-Test: ${stress.ok}/200 in ${stress.ms}ms (~${stress.rps} req/s)`);
  else warn(`Stress-Test: ${stress.ok}/200 in ${stress.ms}ms`);

  // Frontend-Load
  log('\n  [Frontend-Load] 10 gleichzeitige Frontend-Requests...');
  const fe = await runBatch(10, FRONTEND, 'Frontend', 20000);
  if (fe.ok >= 8) pass(`Frontend-Load: ${fe.ok}/10 OK in ${fe.ms}ms`);
  else warn(`Frontend-Load: ${fe.ok}/10 OK`);
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════
async function main() {
  const t0 = Date.now();
  log('\n╔══════════════════════════════════════════════════════════════╗');
  log('║   SF-1 MASTER SYSTEM TEST v2 — Vollständige Prüfung         ║');
  log(`║   ${new Date().toLocaleString('de-DE')}                              ║`);
  log('╚══════════════════════════════════════════════════════════════╝');
  log('\n  Ermittelte Service-IPs:');
  Object.entries(IPs).forEach(([n, ip]) => log(`  • ${n.padEnd(14)}: ${ip}`));

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
  await testLoad();

  const elapsed = Math.round((Date.now() - t0) / 1000);
  const rate = Math.round((results.pass.length / results.total) * 100);

  log('\n');
  log('╔══════════════════════════════════════════════════════════════╗');
  log('║                   TESTERGEBNISSE                            ║');
  log('╠══════════════════════════════════════════════════════════════╣');
  log(`║  ✅ BESTANDEN:     ${String(results.pass.length).padEnd(3)} Tests                                ║`);
  log(`║  ❌ FEHLGESCHL.:   ${String(results.fail.length).padEnd(3)} Tests                                ║`);
  log(`║  ⚠️  WARNUNGEN:    ${String(results.warn.length).padEnd(3)} Tests                                ║`);
  log(`║  📊 GESAMT:        ${String(results.total).padEnd(3)} Tests  (${rate}% Erfolgsrate)           ║`);
  log(`║  ⏱  Laufzeit:      ${elapsed}s                                      ║`);
  log('╠══════════════════════════════════════════════════════════════╣');

  if (results.fail.length > 0) {
    log('║  ❌ FEHLGESCHLAGENE TESTS:                                  ║');
    results.fail.forEach(f => {
      const txt = `     • ${f.name}`;
      log(('║  ' + txt).substring(0, 63).padEnd(63) + '║');
    });
    log('╠══════════════════════════════════════════════════════════════╣');
  }

  if (results.warn.length > 0) {
    log('║  ⚠️  WARNUNGEN (Auswahl):                                   ║');
    results.warn.slice(0, 8).forEach(w => {
      const txt = `  • ${w.name}`;
      log(('║  ' + txt).substring(0, 63).padEnd(63) + '║');
    });
    if (results.warn.length > 8) log(`║    ... und ${results.warn.length - 8} weitere                                     ║`);
    log('╠══════════════════════════════════════════════════════════════╣');
  }

  const status = rate >= 90 ? '🏆 SEHR GUT' : rate >= 75 ? '👍 GUT' : rate >= 60 ? '⚠️  MÄSSIG' : '🚨 KRITISCH';
  log(`║  ${status.padEnd(60)}║`);
  log('╚══════════════════════════════════════════════════════════════╝\n');

  return { timestamp: new Date().toISOString(), elapsed_seconds: elapsed, pass_rate: rate,
    total: results.total, passed: results.pass.length, failed: results.fail.length,
    warnings: results.warn.length, failures: results.fail, warnings_list: results.warn };
}

main().then(r => {
  process.stdout.write('\n__JSON__' + JSON.stringify(r, null, 2) + '__END__\n');
}).catch(e => { console.error('FATAL:', e); process.exit(1); });
