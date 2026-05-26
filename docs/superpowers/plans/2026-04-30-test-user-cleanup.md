# Test-User-Cleanup Bug Fix — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Test-User werden nach Mastertest zuverlässig aus der DB gelöscht, und ein täglicher Cron räumt Überbleibsel auf.

**Architecture:** `cleanup.ts` bekommt `email` + `password` pro User-Task; `runCleanup` logt sich frisch ein bevor es den Account löscht (umgeht Logout-Token-Invalidierung). Alle 5 Test-Files übergeben Credentials. Ein Shell-Cron-Script löscht täglich mt-User die älter als 1h sind direkt via psql.

**Tech Stack:** Vitest, axios, TypeScript, PostgreSQL (psql), Docker cron

---

## Hintergrund / Ursachen

**Bug 1:** `DELETE /api/auth/account` verlangt `{ password }` im Request-Body. `cleanup.ts` schickt keinen Body → immer 400. `catch {}` schluckt den Fehler.

**Bug 2:** `auth.test.ts` macht einen Logout-Test der den Token in Redis invalidiert. `runCleanup` läuft danach in `afterAll` mit dem nun ungültigen Token → 401.

**Betroffene Dateien:**
- Modify: `tests/helpers/cleanup.ts` — Interface + Re-Login-Logik
- Modify: `tests/services/auth.test.ts` — registerCleanup-Aufruf ergänzen
- Modify: `tests/services/community.test.ts` — registerCleanup-Aufruf ergänzen
- Modify: `tests/services/journal.test.ts` — registerCleanup-Aufruf ergänzen
- Modify: `tests/services/gamification.test.ts` — registerCleanup-Aufruf ergänzen
- Modify: `tests/services/notification.test.ts` — registerCleanup-Aufruf ergänzen
- Create: `tests/scripts/cleanup-mt-users.sh` — täglicher Cron
- One-time: psql-Befehl zum Löschen der 64 bestehenden mt-User

---

## Task 1: cleanup.ts fixen — Interface + Re-Login-Logik

**Files:**
- Modify: `tests/helpers/cleanup.ts`

- [ ] **Step 1: Datei lesen**

```bash
cat /root/SF-1-Ultimate-/tests/helpers/cleanup.ts
```

- [ ] **Step 2: cleanup.ts ersetzen**

Ersetze den gesamten Inhalt von `tests/helpers/cleanup.ts`:

```typescript
import axios from 'axios';
import { authClient } from './client.js';

interface CleanupTask {
  type: 'user' | 'thread' | 'grow' | 'notification';
  id: string;
  token?: string;
  email?: string;
  password?: string;
}

const tasks: CleanupTask[] = [];

export function registerCleanup(task: CleanupTask) {
  tasks.push(task);
}

export async function runCleanup() {
  for (const task of tasks.reverse()) {
    try {
      if (task.type === 'grow' && task.token) {
        const { journalClient, withAuth } = await import('./client.js');
        await journalClient.delete(`/api/journal/grows/${task.id}`, withAuth(task.token));
      } else if (task.type === 'thread' && task.token) {
        const { communityClient, withAuth } = await import('./client.js');
        await communityClient.delete(`/api/community/threads/${task.id}`, withAuth(task.token));
      } else if (task.type === 'notification') {
        // Notifications werden automatisch beim User-Delete entfernt
      } else if (task.type === 'user' && task.email && task.password) {
        // Frisch einloggen — der gespeicherte Token könnte durch Logout invalidiert sein
        let freshToken = task.token;
        try {
          const loginRes = await authClient.post('/api/auth/login', {
            email: task.email,
            password: task.password,
          });
          if (loginRes.status === 200 && loginRes.data?.accessToken) {
            freshToken = loginRes.data.accessToken;
          }
        } catch {
          // Re-Login fehlgeschlagen — versuche trotzdem mit gespeichertem Token
        }
        if (freshToken) {
          await authClient.delete('/api/auth/account', {
            headers: { Authorization: `Bearer ${freshToken}` },
            data: { password: task.password },
          });
        }
      }
    } catch {
      // Cleanup-Fehler ignorieren — besser dreckig als blockiert
    }
  }
  tasks.length = 0;
}
```

- [ ] **Step 3: TypeScript-Kompilierung prüfen**

```bash
cd /root/SF-1-Ultimate-/tests && npx tsc --noEmit 2>&1 | head -20
```

Erwartung: keine Fehler (oder nur unveränderte pre-existing Fehler)

- [ ] **Step 4: Commit**

```bash
cd /root/SF-1-Ultimate- && git add tests/helpers/cleanup.ts
git commit -m "fix(tests): cleanup re-login vor Account-Delete, password im Body"
```

---

## Task 2: auth.test.ts — registerCleanup um Credentials ergänzen

**Files:**
- Modify: `tests/services/auth.test.ts:34`

- [ ] **Step 1: Zeile 34 prüfen**

```bash
sed -n '30,40p' /root/SF-1-Ultimate-/tests/services/auth.test.ts
```

Erwartung: `registerCleanup({ type: 'user', id: userId, token });`

- [ ] **Step 2: registerCleanup-Aufruf ergänzen**

Ersetze in `tests/services/auth.test.ts` Zeile 34:

Alt:
```typescript
    registerCleanup({ type: 'user', id: userId, token });
```

Neu:
```typescript
    registerCleanup({ type: 'user', id: userId, token, email: testEmail, password: testPassword });
```

- [ ] **Step 3: Commit**

```bash
cd /root/SF-1-Ultimate- && git add tests/services/auth.test.ts
git commit -m "fix(tests): auth.test.ts email+password an registerCleanup übergeben"
```

---

## Task 3: community.test.ts — registerCleanup um Credentials ergänzen

**Files:**
- Modify: `tests/services/community.test.ts:30`

- [ ] **Step 1: Zeile prüfen**

```bash
sed -n '26,35p' /root/SF-1-Ultimate-/tests/services/community.test.ts
```

Erwartung: `registerCleanup({ type: 'user', id: reg.data.user.id, token });`

- [ ] **Step 2: registerCleanup-Aufruf ergänzen**

Ersetze in `tests/services/community.test.ts`:

Alt:
```typescript
  registerCleanup({ type: 'user', id: reg.data.user.id, token });
```

Neu:
```typescript
  registerCleanup({ type: 'user', id: reg.data.user.id, token, email: testEmail, password: 'MasterTest!2026' });
```

- [ ] **Step 3: Commit**

```bash
cd /root/SF-1-Ultimate- && git add tests/services/community.test.ts
git commit -m "fix(tests): community.test.ts email+password an registerCleanup übergeben"
```

---

## Task 4: journal.test.ts — registerCleanup um Credentials ergänzen

**Files:**
- Modify: `tests/services/journal.test.ts:29`

- [ ] **Step 1: Zeile prüfen**

```bash
sed -n '25,35p' /root/SF-1-Ultimate-/tests/services/journal.test.ts
```

Erwartung: `registerCleanup({ type: 'user', id: reg.data.user.id, token });`

- [ ] **Step 2: registerCleanup-Aufruf ergänzen**

Ersetze in `tests/services/journal.test.ts`:

Alt:
```typescript
  registerCleanup({ type: 'user', id: reg.data.user.id, token });
```

Neu:
```typescript
  registerCleanup({ type: 'user', id: reg.data.user.id, token, email: testEmail, password: 'MasterTest!2026' });
```

- [ ] **Step 3: Commit**

```bash
cd /root/SF-1-Ultimate- && git add tests/services/journal.test.ts
git commit -m "fix(tests): journal.test.ts email+password an registerCleanup übergeben"
```

---

## Task 5: gamification.test.ts — registerCleanup um Credentials ergänzen

**Files:**
- Modify: `tests/services/gamification.test.ts:30`

- [ ] **Step 1: Zeile prüfen**

```bash
sed -n '26,35p' /root/SF-1-Ultimate-/tests/services/gamification.test.ts
```

Erwartung: `registerCleanup({ type: 'user', id: userId, token });`

- [ ] **Step 2: registerCleanup-Aufruf ergänzen**

Ersetze in `tests/services/gamification.test.ts`:

Alt:
```typescript
  registerCleanup({ type: 'user', id: userId, token });
```

Neu:
```typescript
  registerCleanup({ type: 'user', id: userId, token, email: testEmail, password: 'MasterTest!2026' });
```

- [ ] **Step 3: Commit**

```bash
cd /root/SF-1-Ultimate- && git add tests/services/gamification.test.ts
git commit -m "fix(tests): gamification.test.ts email+password an registerCleanup übergeben"
```

---

## Task 6: notification.test.ts — registerCleanup um Credentials ergänzen

**Files:**
- Modify: `tests/services/notification.test.ts:28`

- [ ] **Step 1: Zeile prüfen**

```bash
sed -n '24,33p' /root/SF-1-Ultimate-/tests/services/notification.test.ts
```

Erwartung: `registerCleanup({ type: 'user', id: reg.data.user.id, token });`

- [ ] **Step 2: registerCleanup-Aufruf ergänzen**

Ersetze in `tests/services/notification.test.ts`:

Alt:
```typescript
  registerCleanup({ type: 'user', id: reg.data.user.id, token });
```

Neu:
```typescript
  registerCleanup({ type: 'user', id: reg.data.user.id, token, email: testEmail, password: 'MasterTest!2026' });
```

- [ ] **Step 3: Commit**

```bash
cd /root/SF-1-Ultimate- && git add tests/services/notification.test.ts
git commit -m "fix(tests): notification.test.ts email+password an registerCleanup übergeben"
```

---

## Task 7: Bestehende 64 mt-User einmalig bereinigen

**Files:**
- keine Dateiänderung — direkter psql-Befehl

> **Achtung:** Vor Ausführung User-Count anzeigen und bestätigen (Regel 3).

- [ ] **Step 1: Anzahl bestehender mt-User bestätigen**

```bash
docker exec sf1-postgres psql "postgresql://sf1_user:6YvuKJA4T5jorkFKXvg55XRzM2c2Wlo@localhost:5432/sf1_db" -t -c \
  'SELECT COUNT(*) FROM "User" WHERE username ~ '"'"'^mt'"'"';'
```

Erwartung: `64` (oder aktueller Wert)

- [ ] **Step 2: mt-User löschen (CASCADE löscht Sessions + RefreshTokens automatisch)**

```bash
docker exec sf1-postgres psql "postgresql://sf1_user:6YvuKJA4T5jorkFKXvg55XRzM2c2Wlo@localhost:5432/sf1_db" -t -c \
  'DELETE FROM "User" WHERE username ~ '"'"'^mt'"'"';'
```

Erwartung: `DELETE 64` (oder entsprechende Zahl)

- [ ] **Step 3: Verifizieren — 0 mt-User übrig**

```bash
docker exec sf1-postgres psql "postgresql://sf1_user:6YvuKJA4T5jorkFKXvg55XRzM2c2Wlo@localhost:5432/sf1_db" -t -c \
  'SELECT COUNT(*) FROM "User" WHERE username ~ '"'"'^mt'"'"';'
```

Erwartung: `0`

---

## Task 8: Cron-Cleanup-Script anlegen

**Files:**
- Create: `tests/scripts/cleanup-mt-users.sh`

- [ ] **Step 1: Scripts-Verzeichnis anlegen**

```bash
mkdir -p /root/SF-1-Ultimate-/tests/scripts
```

- [ ] **Step 2: Script erstellen**

Erstelle `/root/SF-1-Ultimate-/tests/scripts/cleanup-mt-users.sh`:

```bash
#!/usr/bin/env bash
# Löscht Test-User (username ~ '^mt') die älter als 1 Stunde sind.
# Cascade: Sessions + RefreshTokens werden automatisch mitgelöscht.
# Läuft täglich via cron um 02:30 Uhr.

set -euo pipefail

DB_URL="postgresql://sf1_user:6YvuKJA4T5jorkFKXvg55XRzM2c2Wlo@localhost:5432/sf1_db"

COUNT=$(docker exec sf1-postgres psql "$DB_URL" -t -c \
  "SELECT COUNT(*) FROM \"User\" WHERE username ~ '^mt' AND \"createdAt\" < NOW() - INTERVAL '1 hour';" \
  2>/dev/null | tr -d ' ')

if [ "$COUNT" -eq 0 ]; then
  echo "[$(date -Is)] cleanup-mt-users: keine alten mt-User gefunden"
  exit 0
fi

docker exec sf1-postgres psql "$DB_URL" -c \
  "DELETE FROM \"User\" WHERE username ~ '^mt' AND \"createdAt\" < NOW() - INTERVAL '1 hour';"

echo "[$(date -Is)] cleanup-mt-users: $COUNT mt-User gelöscht"
```

- [ ] **Step 3: Ausführbar machen**

```bash
chmod +x /root/SF-1-Ultimate-/tests/scripts/cleanup-mt-users.sh
```

- [ ] **Step 4: Script testweise ausführen**

```bash
/root/SF-1-Ultimate-/tests/scripts/cleanup-mt-users.sh
```

Erwartung: `cleanup-mt-users: keine alten mt-User gefunden` (da Task 7 sie bereits gelöscht hat)

- [ ] **Step 5: Cron-Eintrag anlegen**

```bash
(crontab -l 2>/dev/null; echo "30 2 * * * /root/SF-1-Ultimate-/tests/scripts/cleanup-mt-users.sh >> /root/SF-1-Ultimate-/logs/cleanup-mt-users.log 2>&1") | crontab -
crontab -l | grep cleanup-mt
```

Erwartung: Cron-Eintrag sichtbar.

- [ ] **Step 6: Commit**

```bash
cd /root/SF-1-Ultimate- && git add tests/scripts/cleanup-mt-users.sh
git commit -m "feat(tests): tägliches Cron-Script cleanup-mt-users.sh"
```

---

## Task 9: Mastertest ausführen + DB verifizieren

- [ ] **Step 1: Mastertest starten**

Skill `mastertest` aufrufen (Prompt: "starte master test")

- [ ] **Step 2: DB nach Test prüfen — keine mt-User übrig**

```bash
docker exec sf1-postgres psql "postgresql://sf1_user:6YvuKJA4T5jorkFKXvg55XRzM2c2Wlo@localhost:5432/sf1_db" -t -c \
  'SELECT COUNT(*) FROM "User" WHERE username ~ '"'"'^mt'"'"';'
```

Erwartung: `0` (alle Cleanup-Aufrufe erfolgreich)

- [ ] **Step 3: Falls mt-User übrig — Debug**

```bash
docker exec sf1-postgres psql "postgresql://sf1_user:6YvuKJA4T5jorkFKXvg55XRzM2c2Wlo@localhost:5432/sf1_db" -c \
  'SELECT username, email, "createdAt" FROM "User" WHERE username ~ '"'"'^mt'"'"' ORDER BY "createdAt" DESC LIMIT 10;'
```

---

## Task 10: Dokumentation + Session abschließen

- [ ] **Step 1: DOKUMENTATION.md aktualisieren**

Eintrag in `/root/SF-1-Ultimate-/DOKUMENTATION.md` unter aktuellem Datum:

```
## [abgeschlossen] Test-User-Cleanup Bug Fix — 2026-04-30

**Problem:** cleanup.ts schickte keinen password-Body an DELETE /api/auth/account → 400.
Logout-Test in auth.test.ts invalidierte Token vor afterAll → 401.
64 mt-User hatten sich akkumuliert.

**Lösung:**
- cleanup.ts: Re-Login vor Account-Delete, password im DELETE-Body
- Alle 5 Test-Files: email+password an registerCleanup übergeben
- Einmalige DB-Bereinigung: 64 mt-User gelöscht
- Cron-Script: tests/scripts/cleanup-mt-users.sh täglich 02:30

**Commits:** [nach Ausführung eintragen]
```

- [ ] **Step 2: overview.md auf ✅ setzen**

In `/root/.claude/session-plan/overview.md`:

Alt: `| s3 | ⏳ | Test-User-Cleanup: Warum werden sie nicht gelöscht? | mittel |`
Neu: `| s3 | ✅ | Test-User-Cleanup: Warum werden sie nicht gelöscht? | mittel |`

Und unter "Abgeschlossene Sessions":
```
- **s3** ✅ 2026-04-30 — Commits [eintragen] — Test-User-Cleanup (cleanup.ts + 5 Test-Files + Cron)
```

- [ ] **Step 3: s3-Skill löschen**

```bash
rm -rf /root/.claude/skills/s3
```

- [ ] **Step 4: /task-done aufrufen**
