#!/usr/bin/env node
/**
 * Test Runner — lädt und führt alle Test-Suites aus
 * Läuft sequentiell wegen IP-Single-Session-Schutz
 * Output kompatibel mit report-generator.mjs
 */

import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Test-Dateien in Reihenfolge (wichtig: Auth vor allem anderen)
const testFiles = [
  '01-auth.test.mjs',
  '02-community.test.mjs',
  '03-journal.test.mjs',
  '04-read-only.test.mjs',
  '05-09-advanced.test.mjs',
].map(f => `${__dirname}/${f}`);

// Starte Tests
console.log('\n🧪 SF-1 Integration Tests mit node:test\n');

const stream = run({
  files: testFiles,
  concurrency: 1,      // Sequentiell — IP-Single-Session-Schutz
  timeout: 30_000,     // 30 Sekunden pro Test max
  forceExit: false,    // Sauberes Shutdown
});

// Sammle Ergebnisse für Kompatibilität
const summary = {
  passed: 0,
  failed: 0,
  skipped: 0,
  details: [],
};

stream.on('test:pass', (event) => {
  summary.passed++;
  summary.details.push({
    status: 'PASS',
    suite: event.data.name?.split(' > ')[0] || 'unknown',
    name: event.data.name,
  });
});

stream.on('test:fail', (event) => {
  summary.failed++;
  const error = event.data.error?.message || event.data.error || 'unknown error';
  summary.details.push({
    status: 'FAIL',
    suite: event.data.name?.split(' > ')[0] || 'unknown',
    name: event.data.name,
    error,
  });
});

stream.on('test:skip', (event) => {
  summary.skipped++;
  summary.details.push({
    status: 'SKIP',
    suite: event.data.name?.split(' > ')[0] || 'unknown',
    name: event.data.name,
    msg: event.data.skip,
  });
});

// Spec-Report (human readable) zum Stdout
try {
  await pipeline(stream.compose(spec), process.stdout);
} catch (err) {
  console.error('Error in test pipeline:', err);
}

// Kompatibilität: JSON-Output für report-generator.mjs
console.log('\n__FUNCTIONAL_RESULT__' + JSON.stringify(summary) + '__END__');

// Exit-Code für Cron
process.exit(summary.failed > 0 ? 1 : 0);
