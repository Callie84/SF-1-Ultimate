import { appendFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = join(__dirname, '..', 'mastertest.log');

let passed = 0;
let failed = 0;
let sessionId = '';

export function initLog(sid: string) {
  sessionId = sid;
  writeFileSync(LOG_PATH, `[${new Date().toISOString()}] START mastertest session=${sid}\n`);
}

export function logPass(service: string, testName: string) {
  passed++;
  appendFileSync(LOG_PATH, `[${new Date().toISOString()}] PASS  ${service.padEnd(14)} :: ${testName}\n`);
}

export function logFail(service: string, testName: string, error: string) {
  failed++;
  appendFileSync(LOG_PATH, `[${new Date().toISOString()}] FAIL  ${service.padEnd(14)} :: ${testName} — ${error}\n`);
}

export function logSummary() {
  const total = passed + failed;
  const line = `[${new Date().toISOString()}] SUMMARY ${passed}/${total} passed | ${failed} failed\n`;
  appendFileSync(LOG_PATH, line);
  console.log(`\n📋 mastertest.log: ${LOG_PATH}`);
  console.log(`✅ ${passed}/${total} bestanden | ❌ ${failed} fehlgeschlagen`);
}
