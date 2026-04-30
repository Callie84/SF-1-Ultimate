# Design: Test-User-Cleanup (s3)

**Datum:** 2026-04-30  
**Status:** approved  
**Scope:** master-test.mjs + cleanup-mt-users.sh

---

## Problem

Nach Testläufen bleiben Test-User in der Auth-DB zurück:

1. `master-test.mjs` erstellt `testuser_${ts}@sf1-test.de` und löscht ihn nie
2. `tests/scripts/cleanup-mt-users.sh` löscht nur `mt*`-Pattern per direktem Postgres-DELETE — `testuser*` und `@sf1-test.de`-Adressen werden nicht erfasst
3. Direktes Postgres-DELETE löscht nur die Auth-DB, keine Cascades in anderen Services

Aktuell in DB: `testuser` (März 2026) + `testuser123` (April 2026) — Mastertest-Reste.

---

## Lösung

### Teil 1 — master-test.mjs: Cleanup am Ende

Am Ende von `main()`, nach dem JSON-Report, wird der Test-User über die API gelöscht:

```
POST /api/auth/login { email, password }
DELETE /api/auth/account { password }
```

- Schlägt Login fehl → `warn()`, kein `fail()` (Testergebnis nicht verfälschen)
- Schlägt DELETE fehl → `warn()`, kein `fail()`
- `TEST_USER_ID` und `USER_JWT` sind bereits als globale Variablen vorhanden
- Passwort: `TestPass123!` (hardcodiert in testAuth())

**Warum API statt Prisma:** Cascade-Sicherheit — Auth-Service löscht Sessions + RefreshTokens korrekt.

### Teil 2 — cleanup-mt-users.sh: Pattern erweitern

Das bestehende Script wird auf zwei Pattern erweitert:

```sql
WHERE (username ~ '^mt' OR username ~ '^testuser')
AND "createdAt" < NOW() - INTERVAL '2 hours'
```

Oder alternativ über Email-Domain:

```sql
WHERE (email LIKE '%@mastertest.invalid' OR email LIKE '%@sf1-test.de')
AND "createdAt" < NOW() - INTERVAL '2 hours'
```

Beide Bedingungen werden kombiniert (OR), um alle Test-User-Typen zu erfassen.

**Direkt-Postgres-Delete bleibt:** Da der Auth-Service Cascade-Constraints auf Sessions/RefreshTokens hat (`onDelete: Cascade` in Prisma-Schema), werden diese mitgelöscht. Community-Threads und Journal-Grows werden durch den Cron nicht gelöscht — das ist akzeptabel, da der Mastertest-Cleanup (Teil 1) die API nutzt.

### Nicht geändert

- `tests/helpers/cleanup.ts` — funktioniert korrekt
- Alle `*.test.ts` in `tests/services/` — haben bereits `afterAll(runCleanup)`
- Cron-Zeitplan (02:30) — bleibt

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `tests/master-test.mjs` | Cleanup-Block am Ende von `main()` |
| `tests/scripts/cleanup-mt-users.sh` | Pattern-Erweiterung auf `testuser*` + `@sf1-test.de` |

---

## Acceptance Criteria

- [ ] `master-test.mjs` löscht seinen Test-User nach dem Report via API
- [ ] Schlägt der Cleanup fehl → `warn()`, kein Test-Fail
- [ ] `cleanup-mt-users.sh` erfasst `testuser*`- und `@sf1-test.de`-User
- [ ] Bestehende `testuser`/`testuser123` in DB werden beim nächsten Cron-Lauf gelöscht
- [ ] Nach Mastertest-Run: 0 neue testuser* in der DB
