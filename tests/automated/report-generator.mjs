#!/usr/bin/env node
/**
 * SF-1 Report Generator
 * Liest Test-Ergebnisse und erstellt einen Markdown-Bericht
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const [,, logFile, outputFile] = process.argv;

if (!logFile || !outputFile) {
  console.error('Usage: node report-generator.mjs <logFile> <outputFile>');
  process.exit(1);
}

const log = readFileSync(logFile, 'utf8');

// Ergebnisse aus Log extrahieren
function extract(marker, content) {
  const rx = new RegExp(`__${marker}__(.*?)__END__`, 's');
  const m = content.match(rx);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

const health    = extract('HEALTH_RESULT', log);
const functional = extract('FUNCTIONAL_RESULT', log);
const load      = extract('LOAD_RESULT', log);
const wrkOutput = log.match(/--- WRK ERGEBNIS ---([\s\S]*?)--- WRK ENDE ---/)?.[1] || '';

// WRK Metriken parsen
const wrkMetrics = {};
const wrkMatches = wrkOutput.matchAll(/\[([^\]]+)\]\s*([\s\S]*?)(?=\[|$)/g);
for (const m of wrkMatches) {
  wrkMetrics[m[1].trim()] = m[2].trim();
}

const now = new Date();
const dateStr = now.toISOString().split('T')[0];
const timeStr = now.toTimeString().split(' ')[0];

// Gesamt-Status bestimmen
const healthOk = health && health.failed === 0;
const functionalOk = functional && functional.failed === 0;
const loadOk = load && parseFloat(load.overallErrRate) < 5;
const overallOk = healthOk && functionalOk && loadOk;

const statusIcon = overallOk ? '✅' : '❌';
const statusText = overallOk ? 'ALLE TESTS BESTANDEN' : 'FEHLER GEFUNDEN';

// Markdown Report
const report = `# SF-1 Täglicher Testbericht
**Datum:** ${dateStr} ${timeStr}
**Status:** ${statusIcon} ${statusText}

---

## 🏥 Health Check
${health ? `
| | |
|---|---|
| **Bestanden** | ✅ ${health.passed} |
| **Warnungen** | ⚠️ ${health.warnings} |
| **Fehlgeschlagen** | ❌ ${health.failed} |

${health.failed > 0 ? `### ❌ Fehlgeschlagene Health Checks\n${health.details.filter(d => d.status === 'FAIL').map(d => `- **${d.name}**: ${d.msg || d.error || ''}`).join('\n')}` : ''}
${health.warnings > 0 ? `### ⚠️ Warnungen\n${health.details.filter(d => d.status === 'WARN').map(d => `- **${d.name}**: ${d.msg || ''}`).join('\n')}` : ''}
` : '_Health Check Daten nicht verfügbar_'}

---

## 🧪 Functional Tests
${functional ? `
| | |
|---|---|
| **Bestanden** | ✅ ${functional.passed} |
| **Fehlgeschlagen** | ❌ ${functional.failed} |
| **Übersprungen** | ⏭️ ${functional.skipped} |

${functional.failed > 0 ? `### ❌ Fehlgeschlagene Tests\n${functional.details.filter(d => d.status === 'FAIL').map(d => `- **[${d.suite}]** ${d.name}${d.error ? ': ' + d.error : d.httpStatus ? ' → HTTP ' + d.httpStatus : ''}`).join('\n')}` : ''}

<details>
<summary>Alle Tests anzeigen (${functional.passed + functional.failed + functional.skipped} gesamt)</summary>

${functional.details.map(d => {
  const icon = d.status === 'PASS' ? '✅' : d.status === 'FAIL' ? '❌' : '⏭️';
  return `${icon} **[${d.suite}]** ${d.name}${d.httpStatus ? ' → ' + d.httpStatus : ''}`;
}).join('\n')}

</details>
` : '_Functional Test Daten nicht verfügbar_'}

---

## 🚀 Load Test (1000 virtuelle Nutzer)
${load ? `
| Metrik | Wert |
|---|---|
| **Gesamt-Dauer** | ${load.duration}s |
| **Gesamt-Requests** | ${load.totalRequests.toLocaleString()} |
| **Requests/Sek** | ${load.overallRps} RPS |
| **Fehlerrate** | ${load.overallErrRate}% |
| **Bewertung** | ${load.grade === 'EXCELLENT' ? '🟢 EXCELLENT' : load.grade === 'GOOD' ? '🟡 GOOD' : load.grade === 'NEEDS_IMPROVEMENT' ? '🟠 NEEDS IMPROVEMENT' : '🔴 POOR'} |

### Szenarien im Detail
| Szenario | Requests | Fehler% | RPS | Avg | P95 | P99 |
|---|---|---|---|---|---|---|
${load.scenarios.map(s => `| ${s.name} | ${s.requests} | ${s.errorRate} | ${s.rps} | ${s.avgMs}ms | ${s.p95}ms | ${s.p99}ms |`).join('\n')}
` : '_Load Test Daten nicht verfügbar_'}

---

## 🔨 HTTP-Stress Test (wrk)
${wrkOutput.trim() ? `\`\`\`\n${wrkOutput.trim()}\n\`\`\`` : '_wrk Stress Test nicht ausgeführt oder Daten nicht verfügbar_'}

---

## 📋 Zusammenfassung

| Test-Kategorie | Status |
|---|---|
| Health Check (Container + DBs + Ressourcen) | ${health ? (health.failed === 0 ? '✅ OK' : `❌ ${health.failed} Fehler`) : '❓ N/A'} |
| Functional Tests (alle API-Endpoints) | ${functional ? (functional.failed === 0 ? '✅ OK' : `❌ ${functional.failed} Fehler`) : '❓ N/A'} |
| Load Test (1000 VUs) | ${load ? (parseFloat(load.overallErrRate) < 5 ? '✅ OK' : `⚠️ ${load.overallErrRate}% Fehler`) : '❓ N/A'} |
| **Gesamt** | **${statusIcon} ${statusText}** |

---
_Automatisch generiert am ${dateStr} ${timeStr} — SF-1 Test Suite v1.0_
`;

mkdirSync(outputFile.split('/').slice(0, -1).join('/'), { recursive: true });
writeFileSync(outputFile, report, 'utf8');
console.log(`📄 Bericht gespeichert: ${outputFile}`);
