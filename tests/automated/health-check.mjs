#!/usr/bin/env node
/**
 * SF-1 Health Check
 * Prüft alle Services, Datenbanken, Disk & Memory
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const JWT_SECRET = 'b592989aa35c751ddc0d64a9078e73892752abb9ec214f006e13c1e0f5e64d49';
const TIMEOUT_MS = 5000;

// Dynamisch aktuelle IPs via docker inspect holen
function getServiceIP(containerName) {
  try {
    const raw = execSync(`docker inspect ${containerName} 2>/dev/null`, { encoding: 'utf8' });
    const data = JSON.parse(raw);
    const networks = data[0]?.NetworkSettings?.Networks || {};
    const net = Object.values(networks)[0];
    return net?.IPAddress || null;
  } catch {
    return null;
  }
}

async function httpGet(url, token = null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(url, { signal: controller.signal, headers });
    return { ok: res.ok, status: res.status, url };
  } catch (e) {
    return { ok: false, status: 0, url, error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

const results = { passed: 0, failed: 0, warnings: 0, details: [] };

function pass(name, msg = '') {
  results.passed++;
  results.details.push({ status: 'PASS', name, msg });
  console.log(`  ✅ ${name}${msg ? ': ' + msg : ''}`);
}

function fail(name, msg = '') {
  results.failed++;
  results.details.push({ status: 'FAIL', name, msg });
  console.log(`  ❌ ${name}${msg ? ': ' + msg : ''}`);
}

function warn(name, msg = '') {
  results.warnings++;
  results.details.push({ status: 'WARN', name, msg });
  console.log(`  ⚠️  ${name}${msg ? ': ' + msg : ''}`);
}

// ─── 1. CONTAINER STATUS ───────────────────────────────────────────────────
console.log('\n🐳 Container Status');
const expectedContainers = [
  'sf1-auth-service', 'sf1-community-service', 'sf1-journal-service',
  'sf1-price-service', 'sf1-search-service', 'sf1-tools-service',
  'sf1-ai-service', 'sf1-gamification-service', 'sf1-media-service',
  'sf1-notification-service', 'sf1-backup', 'sf1-api-gateway',
  'sf1-frontend', 'sf1-mongodb', 'sf1-postgres', 'sf1-redis',
  'sf1-meilisearch', 'sf1-grafana', 'sf1-prometheus', 'sf1-loki',
];

const dockerPs = execSync("docker ps --format '{{.Names}}\\t{{.Status}}'", { encoding: 'utf8' });
const runningContainers = {};
for (const line of dockerPs.trim().split('\n')) {
  const [name, ...statusParts] = line.split('\t');
  runningContainers[name] = statusParts.join('\t');
}

for (const name of expectedContainers) {
  if (runningContainers[name]) {
    const status = runningContainers[name];
    if (status.includes('(unhealthy)')) fail(name, status);
    else if (status.includes('Up')) pass(name, status);
    else warn(name, status);
  } else {
    fail(name, 'nicht gefunden');
  }
}

// ─── 2. SERVICE HEALTH ENDPOINTS ───────────────────────────────────────────
console.log('\n🌐 Service Health-Endpoints');
const services = [
  { name: 'Auth Service',          container: 'sf1-auth-service',         port: 3001 },
  { name: 'Community Service',     container: 'sf1-community-service',    port: 3005 },
  { name: 'Journal Service',       container: 'sf1-journal-service',      port: 3003 },
  { name: 'Price Service',         container: 'sf1-price-service',        port: 3002 },
  { name: 'Search Service',        container: 'sf1-search-service',       port: 3007 },
  { name: 'Tools Service',         container: 'sf1-tools-service',        port: 3004 },
  { name: 'AI Service',            container: 'sf1-ai-service',           port: 3010 },
  { name: 'Gamification Service',  container: 'sf1-gamification-service', port: 3009 },
  { name: 'Media Service',         container: 'sf1-media-service',        port: 3008 },
  { name: 'Notification Service',  container: 'sf1-notification-service', port: 3006 },
  { name: 'Backup Service',        container: 'sf1-backup',               port: 3011 },
];

for (const svc of services) {
  const ip = getServiceIP(svc.container);
  if (!ip) { fail(svc.name, 'IP nicht ermittelbar'); continue; }
  const r = await httpGet(`http://${ip}:${svc.port}/health`);
  if (r.ok) pass(svc.name, `${ip}:${svc.port} → ${r.status}`);
  else fail(svc.name, `${ip}:${svc.port} → ${r.status || r.error}`);
}

// ─── 3. API GATEWAY / TRAEFIK ──────────────────────────────────────────────
console.log('\n🔀 API Gateway (Traefik)');

// curl nutzen da fetch HTTP→HTTPS Redirect nicht zuverlässig folgt
try {
  const httpCode = execSync("curl -s -o /dev/null -w '%{http_code}' http://localhost:80/", { encoding: 'utf8' }).trim();
  if (httpCode === '301') pass('HTTP→HTTPS Redirect', `→ ${httpCode}`);
  else warn('HTTP→HTTPS Redirect', `→ ${httpCode}`);
} catch { warn('HTTP→HTTPS Redirect', 'curl nicht verfügbar'); }

try {
  const httpCode = execSync("curl -sk -o /dev/null -w '%{http_code}' https://localhost:443/ --max-time 5", { encoding: 'utf8' }).trim();
  // 404 ist OK — SSL funktioniert, aber Zertifikat ist für Domain nicht localhost
  if (['200','301','302','404'].includes(httpCode)) pass('HTTPS Frontend (Traefik)', `→ ${httpCode}`);
  else warn('HTTPS Frontend (Traefik)', `→ ${httpCode}`);
} catch { warn('HTTPS Frontend', 'curl nicht verfügbar'); }

// ─── 4. DATENBANKEN ────────────────────────────────────────────────────────
console.log('\n🗄️  Datenbanken');

// MongoDB
try {
  const mongoIP = getServiceIP('sf1-mongodb');
  const r = execSync(
    `docker exec sf1-mongodb mongosh --quiet --eval "db.adminCommand('ping').ok" 2>/dev/null`,
    { encoding: 'utf8', timeout: 8000 }
  ).trim();
  if (r === '1') pass('MongoDB', `${mongoIP}:27017 → pong`);
  else fail('MongoDB', `unerwartete Antwort: ${r}`);
} catch (e) {
  fail('MongoDB', e.message.slice(0, 80));
}

// PostgreSQL
try {
  const r = execSync(
    `docker exec sf1-postgres pg_isready -U sf1_user 2>/dev/null`,
    { encoding: 'utf8', timeout: 5000 }
  ).trim();
  if (r.includes('accepting connections')) pass('PostgreSQL', r);
  else fail('PostgreSQL', r);
} catch (e) {
  fail('PostgreSQL', e.message.slice(0, 80));
}

// Redis
try {
  const r = execSync(
    `docker exec sf1-redis redis-cli -a ERLTdskbOt3JUzPyaHv06Ng8ROCriD ping 2>/dev/null`,
    { encoding: 'utf8', timeout: 5000 }
  ).trim();
  if (r === 'PONG') pass('Redis', 'PONG');
  else fail('Redis', r);
} catch (e) {
  fail('Redis', e.message.slice(0, 80));
}

// Meilisearch
try {
  const msIP = getServiceIP('sf1-meilisearch');
  const r = await httpGet(`http://${msIP}:7700/health`);
  if (r.ok) pass('Meilisearch', `${msIP}:7700 → ${r.status}`);
  else fail('Meilisearch', `→ ${r.status}`);
} catch (e) {
  fail('Meilisearch', e.message);
}

// ─── 5. DISK & MEMORY ──────────────────────────────────────────────────────
console.log('\n💾 System-Ressourcen');

// Disk Space
try {
  const df = execSync("df -BG / --output=avail | tail -1", { encoding: 'utf8' }).trim();
  const freeGB = parseInt(df);
  if (freeGB >= 10) pass('Disk Space', `${freeGB} GB frei`);
  else if (freeGB >= 5) warn('Disk Space', `nur noch ${freeGB} GB frei`);
  else fail('Disk Space', `KRITISCH: nur ${freeGB} GB frei`);
} catch (e) {
  warn('Disk Space', 'konnte nicht geprüft werden');
}

// Memory
try {
  const free = execSync("free -m | awk 'NR==2{printf \"%d %d\", $3, $2}'", { encoding: 'utf8' }).trim();
  const [used, total] = free.split(' ').map(Number);
  const pct = Math.round((used / total) * 100);
  if (pct < 80) pass('Memory', `${used}/${total} MB (${pct}%)`);
  else if (pct < 90) warn('Memory', `${used}/${total} MB (${pct}%) — hoch`);
  else fail('Memory', `${used}/${total} MB (${pct}%) — kritisch`);
} catch (e) {
  warn('Memory', 'konnte nicht geprüft werden');
}

// CPU Load
try {
  const load = execSync("cat /proc/loadavg | cut -d' ' -f1-3", { encoding: 'utf8' }).trim();
  const load1 = parseFloat(load.split(' ')[0]);
  const cpus = parseInt(execSync("nproc", { encoding: 'utf8' }).trim());
  if (load1 < cpus) pass('CPU Load', `${load} (${cpus} CPUs)`);
  else if (load1 < cpus * 1.5) warn('CPU Load', `${load} — erhöht`);
  else fail('CPU Load', `${load} — überlastet`);
} catch (e) {
  warn('CPU Load', 'konnte nicht geprüft werden');
}

// ─── 6. BACKUP STATUS ──────────────────────────────────────────────────────
console.log('\n📦 Backup Status');
try {
  const backupDir = '/root/SF-1-Ultimate-/backups';
  const files = execSync(`ls -t ${backupDir}/*.tar.gz.enc 2>/dev/null | head -1`, { encoding: 'utf8' }).trim();
  if (files) {
    const stat = execSync(`stat -c "%Y" "${files}"`, { encoding: 'utf8' }).trim();
    const ageHours = (Date.now() / 1000 - parseInt(stat)) / 3600;
    if (ageHours < 26) pass('Letztes Backup', `${Math.round(ageHours)}h alt — ${files.split('/').pop()}`);
    else warn('Letztes Backup', `${Math.round(ageHours)}h alt — möglicherweise zu alt`);
  } else {
    fail('Backup-Dateien', 'keine .tar.gz.enc gefunden');
  }
} catch {
  fail('Backup-Status', 'Fehler beim Prüfen');
}

// ─── ERGEBNIS ──────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(50));
console.log(`📊 HEALTH CHECK ERGEBNIS`);
console.log(`   ✅ ${results.passed} bestanden`);
console.log(`   ⚠️  ${results.warnings} Warnungen`);
console.log(`   ❌ ${results.failed} fehlgeschlagen`);
console.log('═'.repeat(50));

// Maschinenlesbares Ergebnis für den Report-Generator
process.stdout.write('\n__HEALTH_RESULT__' + JSON.stringify(results) + '__END__\n');
process.exit(results.failed > 0 ? 1 : 0);
