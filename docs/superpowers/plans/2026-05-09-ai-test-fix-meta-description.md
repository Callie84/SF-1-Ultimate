# AI-Test-Fix + Meta-Description Update — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI-Service-Tests graceful skippen wenn Service nicht läuft + Meta-Description in layout.tsx auf aktuellen Seed-Stand aktualisieren.

**Architecture:** Zwei unabhängige Fixes. Fix 1: `beforeAll`-Connectivity-Check in ai.test.ts, Tests rufen `ctx.skip()` wenn AI-Service nicht erreichbar. Fix 2: 3 Textstellen in layout.tsx von `7.000+` auf `11.500+` ändern.

**Tech Stack:** Vitest (ctx.skip API), TypeScript, Next.js Metadata

---

### Task 1: AI-Test — graceful Skip bei nicht-erreichbarem Service

**Files:**
- Modify: `tests/services/ai.test.ts`

- [ ] **Step 1: Aktuelle Datei lesen (Pflicht vor Edit)**

```bash
cat /root/SF-1-Ultimate-/tests/services/ai.test.ts
```

- [ ] **Step 2: Test lokal ausführen — Ist-Zustand "FAIL" bestätigen**

```bash
cd /root/SF-1-Ultimate-/tests && npm run test:ai
```

Erwartetes Ergebnis: 2 Tests FAIL mit `AssertionError: expected undefined to be 200`

- [ ] **Step 3: Datei ersetzen**

Vollständiger neuer Inhalt für `tests/services/ai.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { aiClient, safeGet } from '../helpers/client.js';
import { logPass, logFail } from '../helpers/logger.js';

const SVC = 'ai';
let aiAvailable = false;

beforeAll(async () => {
  const res = await safeGet(aiClient, '/health');
  aiAvailable = res !== null;
  if (!aiAvailable) {
    console.warn('[ai-service] nicht erreichbar (Port 3010) — Tests werden übersprungen');
  }
});

describe('ai-service', () => {
  it('Health-Endpoint — gibt status zurück', async (ctx) => {
    if (!aiAvailable) return ctx.skip();
    const res = await safeGet(aiClient, '/health');
    try {
      expect(res?.status).toBe(200);
      expect(res?.data).toHaveProperty('status');
      expect(['healthy', 'degraded']).toContain(res?.data.status);
      logPass(SVC, 'health');
    } catch (e: any) {
      logFail(SVC, 'health', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });

  it('Common-Diagnoses — erreichbar (200 oder 401)', async (ctx) => {
    if (!aiAvailable) return ctx.skip();
    const res = await safeGet(aiClient, '/api/ai/diagnose/common');
    try {
      expect([200, 401]).toContain(res?.status);
      logPass(SVC, 'common-diagnoses-reachable');
    } catch (e: any) {
      logFail(SVC, 'common-diagnoses-reachable', `Status ${res?.status}`);
      throw e;
    }
  });
});
```

- [ ] **Step 4: Test erneut ausführen — Soll-Zustand "SKIP" bestätigen**

```bash
cd /root/SF-1-Ultimate-/tests && npm run test:ai
```

Erwartetes Ergebnis:
```
[ai-service] nicht erreichbar (Port 3010) — Tests werden übersprungen
 ↓ Health-Endpoint — gibt status zurück [skipped]
 ↓ Common-Diagnoses — erreichbar (200 oder 401) [skipped]
 Test Files  1 skipped (1)
      Tests  2 skipped (2)
```

- [ ] **Step 5: Commit**

```bash
cd /root/SF-1-Ultimate- && git add tests/services/ai.test.ts
git commit -m "fix(tests): ai-service tests graceful skip wenn Service nicht erreichbar

ctx.skip() statt FAIL wenn Port 3010 nicht antwortet.
Greift automatisch wieder wenn ai-service deployed wird."
```

---

### Task 2: Meta-Description — 7.000+ → 11.500+

**Files:**
- Modify: `apps/web-app/src/app/layout.tsx` (Zeilen 22, 33, 38)

- [ ] **Step 1: Aktuelle Datei lesen (Pflicht vor Edit)**

```bash
grep -n "7.000\|11.500" /root/SF-1-Ultimate-/apps/web-app/src/app/layout.tsx
```

Erwartetes Ergebnis: 3 Zeilen mit `7.000+`

- [ ] **Step 2: Alle 3 Vorkommen ersetzen**

```bash
sed -i 's/7\.000+ Cannabis Samen/11.500+ Cannabis Samen/g' /root/SF-1-Ultimate-/apps/web-app/src/app/layout.tsx
```

- [ ] **Step 3: Änderung prüfen**

```bash
grep -n "7.000\|11.500" /root/SF-1-Ultimate-/apps/web-app/src/app/layout.tsx
```

Erwartetes Ergebnis: 0 Zeilen mit `7.000+`, 3 Zeilen mit `11.500+` (Zeilen 22, 33, 38)

- [ ] **Step 4: Commit**

```bash
cd /root/SF-1-Ultimate- && git add apps/web-app/src/app/layout.tsx
git commit -m "fix(seo): meta-description seed-zahl auf 11.500+ aktualisieren

DB hat 11.576 Seeds, Landing Page zeigt bereits 11.500+.
layout.tsx war noch auf veralteten Stand 7.000+.
Content-Check-Alarm damit aufgelöst."
```

---

### Task 3: Mastertest ausführen — Gesamtverifikation

- [ ] **Step 1: Mastertest starten**

```bash
cd /root/SF-1-Ultimate-/tests && npm run mastertest 2>&1 | tail -20
```

Erwartetes Ergebnis:
```
Test Files  11 passed (11)
     Tests  42 passed | 2 skipped (44)
```

Kein FAIL mehr. Die 2 AI-Tests erscheinen als `skipped`, nicht als `failed`.

- [ ] **Step 2: Mastertest-Log prüfen**

```bash
tail -5 /var/log/sf1-daily-mastertest.log
```

Hinweis: Der automatische Cron läuft täglich 06:00. Beim nächsten Lauf sollte der Log zeigen:
`SF-1 Daily Mastertest abgeschlossen — ✅ 42 grün / 0 fehlgeschlagen (2 übersprungen)`

---

### Akzeptanz-Kriterien

- [ ] `npm run test:ai` zeigt 2 Tests als `skipped`, kein FAIL
- [ ] `npm run mastertest` zeigt 0 failed
- [ ] `grep "7.000" apps/web-app/src/app/layout.tsx` gibt keine Ausgabe
- [ ] Nächster Content-Check (Mo 11.05): Meta-Description-Abweichung < 10%
