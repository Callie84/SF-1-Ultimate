# SF-1 Security Audit Fixes — Design Spec

**Erstellt:** 2026-06-02
**Basis:** Security-Audit aller 10 ROADMAP-SECURITY.md Sessions

---

## Kontext

Security-Audit ergab: 6 von 10 SEC-Sessions bereits korrekt implementiert.
4 Gaps wurden identifiziert, davon 2 kritisch.

## Gap-Übersicht

### 🔴 KRITISCH: SEC-7 — 2FA Login-Gate fehlt

**Problem:** `totpEnabled` ist in Prisma-Schema und Setup-Routes vorhanden, aber `/api/auth/login`
prüft das Flag nicht. User mit aktivierter 2FA erhalten trotzdem sofort `accessToken + refreshToken`
ohne TOTP-Code eingeben zu müssen.

**Fix:** Login-Route zwischen Passwort-Check und Token-Generierung eine 2FA-Gate-Prüfung einbauen:
- Wenn `totpEnabled=true`: Redis-Key `mfa_pending:<random_token>` mit 5min TTL anlegen,
  Response `{ requires2FA: true, mfa_token }` zurückgeben (OHNE echte Tokens)
- Der bestehende `/api/auth/2fa/login` Endpoint nutzt bereits `mfa_pending:*` aus Redis → kompatibel

### 🔴 KRITISCH: SEC-8 — Traefik Rate Limits nicht angebunden

**Problem:** `rl-auth` (20/min) und `rl-api` (300/min) sind in docker-compose definiert, aber
kein einziger Router hat `.middlewares=rl-auth` oder `.middlewares=rl-api`.

**Fix:** Middleware-Labels zu folgenden Routern hinzufügen:
- `auth`, `auth-local` → `rl-auth`
- `journal`, `search`, `gamification`, `price`, `media`, `tools`, `notification`, `community`, `backup` → `rl-api`

### 🔴 OFFEN: SEC-3 — npm CVEs

**Status:** auth: 1 critical + 6 high, price: 12 high, community: 3 high, journal: 5 high

**Fix:** `npm audit fix` auf allen Services, bei breaking changes `--force` erst nach Smoke-Test

### 🟢 LOW: SEC-10 — Container read-only fehlt

**Status:** `no-new-privileges:true` bei 5 Services gesetzt, `read_only: true` = 0

**Fix:** Alle Backend-Services in docker-compose mit `read_only: true` + `tmpfs: [/tmp]`

### ⚠️ MINOR: SEC-6 security.txt

`Encryption:`-Feld fehlt (RFC 9116 empfohlen, nicht kritisch)

---

## Session-Aufteilung

| Session | Inhalt | Dateien |
|---------|--------|---------|
| s1 | 2FA Login-Gate + Traefik Rate Limits | `auth.routes.ts`, `docker-compose.yml` |
| s2 | npm CVE-Fix alle Services + security.txt | alle `package.json`, `security.txt` |
| s3 | Container read-only | `docker-compose.yml` |
