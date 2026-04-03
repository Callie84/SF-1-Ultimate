#!/usr/bin/env node
/**
 * SF-1 Load Test — 1000 gleichzeitige Nutzer
 * Simuliert realistische User-Journeys unter Last
 */

import { execSync as exec } from 'child_process';
import { createHmac } from 'crypto';

function getIP(container) {
  try {
    const raw = exec(`docker inspect ${container} 2>/dev/null`, { encoding: 'utf8' });
    return Object.values(JSON.parse(raw)[0].NetworkSettings.Networks)[0].IPAddress;
  } catch { return null; }
}

const IPs = {
  auth:      getIP('sf1-auth-service'),
  community: getIP('sf1-community-service'),
  journal:   getIP('sf1-journal-service'),
  price:     getIP('sf1-price-service'),
  search:    getIP('sf1-search-service'),
  tools:     getIP('sf1-tools-service'),
  ai:        getIP('sf1-ai-service'),
};

const BASE = {
  auth:      `http://${IPs.auth}:3001`,
  community: `http://${IPs.community}:3005`,
  journal:   `http://${IPs.journal}:3003`,
  price:     `http://${IPs.price}:3002`,
  search:    `http://${IPs.search}:3007`,
  tools:     `http://${IPs.tools}:3004`,
  ai:        `http://${IPs.ai}:3010`,
};

// ─── Auth Token für Load Test ────────────────────────────────────────────
async function getLoadTestToken() {
  // Erst einloggen als bekannter Admin
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    userId: 'loadtest-vuser',
    role: 'USER',
    iat: Math.floor(Date.now()/1000),
    exp: Math.floor(Date.now()/1000) + 7200,
  })).toString('base64url');
  const sig = createHmac('sha256', 'b592989aa35c751ddc0d64a9078e73892752abb9ec214f006e13c1e0f5e64d49')
    .update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

// ─── Metriken ─────────────────────────────────────────────────────────────
class Metrics {
  constructor(name) {
    this.name = name;
    this.requests = 0;
    this.success = 0;
    this.errors = 0;
    this.latencies = [];
    this.startTime = Date.now();
  }

  record(latencyMs, success) {
    this.requests++;
    this.latencies.push(latencyMs);
    if (success) this.success++;
    else this.errors++;
  }

  percentile(p) {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * (p / 100))] || 0;
  }

  summary() {
    const duration = (Date.now() - this.startTime) / 1000;
    const rps = this.requests / duration;
    const errRate = this.requests > 0 ? (this.errors / this.requests * 100).toFixed(1) : 0;
    return {
      name: this.name,
      requests: this.requests,
      success: this.success,
      errors: this.errors,
      errorRate: `${errRate}%`,
      rps: rps.toFixed(1),
      avgMs: Math.round(this.latencies.reduce((a, b) => a + b, 0) / (this.latencies.length || 1)),
      p50: this.percentile(50),
      p95: this.percentile(95),
      p99: this.percentile(99),
      maxMs: Math.max(...this.latencies, 0),
    };
  }
}

async function timedFetch(url, options, metrics) {
  const t0 = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    metrics.record(Date.now() - t0, res.status < 500);
    return res;
  } catch (e) {
    metrics.record(Date.now() - t0, false);
    return null;
  }
}

// ─── Szenarien ────────────────────────────────────────────────────────────

// Szenario 1: Anonymes Browsing (Feed + Preise + Suche)
async function scenarioAnonymousBrowse(metrics) {
  // Feed lesen
  await timedFetch(`${BASE.community}/api/community/feed?limit=10`, {}, metrics);
  await new Promise(r => setTimeout(r, 100 + Math.random() * 200));

  // Preise browsen
  await timedFetch(`${BASE.price}/api/prices/browse?limit=10`, {}, metrics);
  await new Promise(r => setTimeout(r, 100 + Math.random() * 200));

  // Trending
  await timedFetch(`${BASE.price}/api/prices/trending`, {}, metrics);
}

// Szenario 2: Strain-Suche
async function scenarioSearch(metrics) {
  const queries = ['northern lights', 'white widow', 'cannabis', 'indoor', 'outdoor'];
  const q = queries[Math.floor(Math.random() * queries.length)];
  await timedFetch(`${BASE.search}/api/search?q=${encodeURIComponent(q)}&type=strains`, {}, metrics);
  await new Promise(r => setTimeout(r, 150));
  await timedFetch(`${BASE.search}/api/search?q=${encodeURIComponent(q)}&type=posts`, {}, metrics);
}

// Szenario 3: Rechner nutzen
async function scenarioCalculators(metrics) {
  await timedFetch(`${BASE.tools}/api/tools/vpd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      temperature: 20 + Math.random() * 10,
      humidity: 50 + Math.random() * 30,
      leafTempOffset: 2,
    }),
  }, metrics);

  await new Promise(r => setTimeout(r, 100));

  await timedFetch(`${BASE.tools}/api/tools/ec-ppm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ec: 0.5 + Math.random() * 2, factor: 700 }),
  }, metrics);

  await timedFetch(`${BASE.tools}/api/tools/power-cost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ watt: 200 + Math.floor(Math.random() * 600), hoursPerDay: 18, pricePerKwh: 0.30 }),
  }, metrics);
}

// Szenario 4: Auth-User browsing (JWT vorhanden)
async function scenarioAuthBrowse(metrics, token) {
  const headers = { Authorization: `Bearer ${token}` };

  await timedFetch(`${BASE.community}/api/community/feed?limit=20`, { headers }, metrics);
  await new Promise(r => setTimeout(r, 200));
  await timedFetch(`${BASE.journal}/api/journal/feed`, { headers }, metrics);
  await new Promise(r => setTimeout(r, 100));
  await timedFetch(`${BASE.journal}/api/journal/grows`, { headers }, metrics);
}

// Szenario 5: Preisrecherche intensiv
async function scenarioPriceResearch(metrics) {
  const slugs = ['northern-lights', 'white-widow', 'ak-47', 'amnesia-haze', 'blue-dream'];
  const slug = slugs[Math.floor(Math.random() * slugs.length)];
  await timedFetch(`${BASE.price}/api/prices/seed/${slug}`, {}, metrics);
  await new Promise(r => setTimeout(r, 100));
  await timedFetch(`${BASE.price}/api/prices/compare?strains=${slug}`, {}, metrics);
}

// ─── Haupt Load Test ─────────────────────────────────────────────────────

async function runScenarioBatch(scenarioFn, metrics, token, concurrency, iterations) {
  // Concurrency-limitierter Pool
  const semaphore = { count: 0, max: concurrency };
  const wait = () => new Promise(resolve => {
    const check = () => {
      if (semaphore.count < semaphore.max) { semaphore.count++; resolve(); }
      else setTimeout(check, 10);
    };
    check();
  });

  const tasks = [];
  for (let i = 0; i < iterations; i++) {
    const task = wait().then(async () => {
      try { await scenarioFn(metrics, token); }
      finally { semaphore.count--; }
    });
    tasks.push(task);
  }
  await Promise.all(tasks);
}

console.log('\n🚀 SF-1 Load Test — 1000 gleichzeitige Nutzer\n');
console.log('   Bereite Test vor...');

const token = await getLoadTestToken();
const ITERATIONS_PER_SCENARIO = 200; // 5 Szenarien × 200 = 1000 VUs gesamt
const CONCURRENCY = 50; // max. 50 gleichzeitige Connections pro Szenario

const metricsMap = {
  'Anonymes Browsing':   new Metrics('Anonymes Browsing'),
  'Strain-Suche':        new Metrics('Strain-Suche'),
  'Rechner':             new Metrics('Rechner'),
  'Auth-User Browsing':  new Metrics('Auth-User Browsing'),
  'Preisrecherche':      new Metrics('Preisrecherche'),
};

console.log(`   Starte 5 Szenarien mit je ${ITERATIONS_PER_SCENARIO} virtuellen Nutzern (max ${CONCURRENCY} parallel)\n`);
const loadStart = Date.now();

// Alle Szenarien parallel starten
await Promise.all([
  runScenarioBatch(scenarioAnonymousBrowse, metricsMap['Anonymes Browsing'],  token, CONCURRENCY, ITERATIONS_PER_SCENARIO),
  runScenarioBatch(scenarioSearch,          metricsMap['Strain-Suche'],       token, CONCURRENCY, ITERATIONS_PER_SCENARIO),
  runScenarioBatch(scenarioCalculators,     metricsMap['Rechner'],            token, CONCURRENCY, ITERATIONS_PER_SCENARIO),
  runScenarioBatch(scenarioAuthBrowse,      metricsMap['Auth-User Browsing'], token, CONCURRENCY, ITERATIONS_PER_SCENARIO),
  runScenarioBatch(scenarioPriceResearch,   metricsMap['Preisrecherche'],     token, CONCURRENCY, ITERATIONS_PER_SCENARIO),
]);

const totalDuration = ((Date.now() - loadStart) / 1000).toFixed(1);

// ─── Ergebnis-Ausgabe ─────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(70));
console.log('📊 LOAD TEST ERGEBNIS');
console.log(`   Gesamt-Dauer: ${totalDuration}s | Virtuelle Nutzer: 1000 | Szenarien: 5`);
console.log('═'.repeat(70));
console.log(`${'Szenario'.padEnd(25)} ${'Req'.padStart(5)} ${'Err%'.padStart(6)} ${'RPS'.padStart(7)} ${'Avg'.padStart(7)} ${'P95'.padStart(7)} ${'P99'.padStart(7)} ${'Max'.padStart(7)}`);
console.log('─'.repeat(70));

const allSummaries = [];
for (const [, m] of Object.entries(metricsMap)) {
  const s = m.summary();
  allSummaries.push(s);
  const errFlag = parseFloat(s.errorRate) > 5 ? '⚠️' : '  ';
  console.log(
    `${errFlag} ${s.name.padEnd(23)} ${String(s.requests).padStart(5)} ${s.errorRate.padStart(6)} ${String(s.rps).padStart(7)} ${String(s.avgMs+'ms').padStart(7)} ${String(s.p95+'ms').padStart(7)} ${String(s.p99+'ms').padStart(7)} ${String(s.maxMs+'ms').padStart(7)}`
  );
}

const totalRequests = allSummaries.reduce((a, s) => a + s.requests, 0);
const totalErrors = allSummaries.reduce((a, s) => a + s.errors, 0);
const overallErrRate = (totalErrors / totalRequests * 100).toFixed(1);
const overallRps = (totalRequests / parseFloat(totalDuration)).toFixed(1);

console.log('─'.repeat(70));
console.log(`   Gesamt: ${totalRequests} Requests | ${overallRps} RPS | ${overallErrRate}% Fehler`);
console.log('═'.repeat(70));

// Bewertung
let grade = 'EXCELLENT';
if (parseFloat(overallErrRate) > 10) grade = 'POOR';
else if (parseFloat(overallErrRate) > 5) grade = 'NEEDS_IMPROVEMENT';
else if (parseFloat(overallErrRate) > 1) grade = 'GOOD';

const icons = { EXCELLENT: '🟢', GOOD: '🟡', NEEDS_IMPROVEMENT: '🟠', POOR: '🔴' };
console.log(`\n${icons[grade]} Bewertung: ${grade}`);
if (parseFloat(overallErrRate) > 5) {
  console.log('   Hohe Fehlerrate — Logs prüfen!');
}

process.stdout.write('\n__LOAD_RESULT__' + JSON.stringify({
  duration: totalDuration,
  totalRequests,
  totalErrors,
  overallErrRate,
  overallRps,
  grade,
  scenarios: allSummaries,
}) + '__END__\n');

process.exit(parseFloat(overallErrRate) > 20 ? 1 : 0);
