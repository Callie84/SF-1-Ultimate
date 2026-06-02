# SF-1 Security Audit Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 4 Security-Gaps aus dem Audit schließen: 2FA Login-Gate, Traefik Rate Limits anwenden, npm CVEs fixen, Container read-only setzen.

**Architecture:** 3 Sessions (s1–s3) in Reihenfolge. s1 ist kritisch (2 aktive Security-Holes), s2 ist CVE-Hygiene, s3 ist Defense-in-Depth.

**Tech Stack:** TypeScript/Express (auth-service), Docker Compose Labels (Traefik), npm audit, Docker read_only

---

## SESSION s1 — 2FA Login-Gate + Traefik Rate Limits

### Task 1: 2FA Gate in Login-Route einbauen

**Files:**
- Modify: `apps/auth-service/src/routes/auth.routes.ts` (Zeile ~308 — vor "// Generiere Tokens")

- [ ] **Schritt 1: Backup des auth-service**
```bash
docker exec sf1-backup node -e "require('./src/index').runBackup()" 2>/dev/null || \
  echo "Backup via Script" && bash /root/scripts/sf1-backup.sh
```

- [ ] **Schritt 2: Import `randomBytes` sicherstellen**

In `apps/auth-service/src/routes/auth.routes.ts` prüfen ob `createHash` aus `crypto` importiert ist (Zeile ~25). `randomBytes` ist im gleichen Modul:
```typescript
import { createHash, randomBytes } from 'crypto';
```
Falls nur `createHash` importiert ist, `randomBytes` ergänzen.

- [ ] **Schritt 3: 2FA Gate einfügen**

In `apps/auth-service/src/routes/auth.routes.ts` den Block `// Generiere Tokens` (Zeile ~308) finden.
**Direkt davor** einfügen:
```typescript
      // 2FA Gate: wenn User 2FA aktiviert hat, kein Token ausstellen
      if ((user as any).totpEnabled) {
        const mfaToken = randomBytes(32).toString('hex');
        await redis.setEx(`mfa_pending:${mfaToken}`, 5 * 60, user.id);
        return res.status(200).json({
          requires2FA: true,
          mfa_token: mfaToken,
        });
      }
```

- [ ] **Schritt 4: Service neu bauen und starten**
```bash
cd /root/SF-1-Ultimate-
docker compose build auth-service --no-cache 2>&1 | tail -5
docker compose up -d auth-service
sleep 5
docker logs sf1-auth-service --tail 10
```
Erwartete Ausgabe: kein Error, Service started.

- [ ] **Schritt 5: 2FA Gate testen**
```bash
# Normaler Login (User ohne 2FA) — muss weiterhin funktionieren
curl -s -X POST https://seedfinderpro.de/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.de","password":"wrongpass"}' | jq '.error'
# Erwartung: "Ungültige Credentials" (kein requires2FA bei falschem PW)
```
```bash
# Health-Check
curl -s https://seedfinderpro.de/api/auth/health | jq '.status'
# Erwartung: "ok"
```

- [ ] **Schritt 6: Commit**
```bash
cd /root/SF-1-Ultimate-
git add apps/auth-service/src/routes/auth.routes.ts
git commit -m "fix(auth): 2FA login-gate erzwingen — Token nur nach TOTP-Verify

Sicherheitslücke: totpEnabled=true hatte keinen Effekt auf Login-Flow.
User erhielten Tokens ohne TOTP-Code. mfa_pending Redis-Key bereits in
/2fa/login implementiert — Login-Route nutzt nun denselben Mechanismus."
```

---

### Task 2: Traefik Rate-Limit-Middlewares auf Routen anwenden

**Files:**
- Modify: `docker-compose.yml` (Labels für auth, journal, search, gamification, price, media, tools, notification, community, backup Router)

- [ ] **Schritt 1: Auth-Router Rate Limit anbinden**

In `docker-compose.yml` beim `auth-service` labels-Block:
```yaml
# VORHER:
      - "traefik.http.routers.auth.tls.certresolver=letsencrypt"
      # Local HTTP route (for development)
      - "traefik.http.routers.auth-local.rule=Host(`localhost`) && PathPrefix(`/api/auth`)"

# NACHHER — middleware-Zeile ergänzen:
      - "traefik.http.routers.auth.tls.certresolver=letsencrypt"
      - "traefik.http.routers.auth.middlewares=rl-auth"
      # Local HTTP route (for development)
      - "traefik.http.routers.auth-local.rule=Host(`localhost`) && PathPrefix(`/api/auth`)"
      - "traefik.http.routers.auth-local.middlewares=rl-auth"
```

- [ ] **Schritt 2: Alle API-Routers mit rl-api anwenden**

In `docker-compose.yml` für jeden Service den letzten Traefik-Router-Label vor dem `# Service`-Kommentar suchen und `.middlewares=rl-api` ergänzen. Betrifft die Production-Router (nicht `-local`):

Für `journal-service`:
```yaml
      - "traefik.http.routers.journal.middlewares=rl-api"
```
Für `search-service`:
```yaml
      - "traefik.http.routers.search.middlewares=rl-api"
```
Für `gamification-service`:
```yaml
      - "traefik.http.routers.gamification.middlewares=rl-api"
```
Für `price-service`:
```yaml
      - "traefik.http.routers.price.middlewares=rl-api"
```
Für `media-service`:
```yaml
      - "traefik.http.routers.media.middlewares=rl-api"
```
Für `tools-service`:
```yaml
      - "traefik.http.routers.tools.middlewares=rl-api"
```
Für `notification-service`:
```yaml
      - "traefik.http.routers.notification.middlewares=rl-api"
```
Für `community-service`:
```yaml
      - "traefik.http.routers.community.middlewares=rl-api"
      - "traefik.http.routers.community-local.middlewares=rl-api"
```
Für `backup-service`:
```yaml
      - "traefik.http.routers.backup.middlewares=rl-api"
```

- [ ] **Schritt 3: Traefik neu laden (kein Downtime)**
```bash
cd /root/SF-1-Ultimate-
docker compose up -d api-gateway
sleep 5
docker logs sf1-api-gateway --tail 10
```
Erwartete Ausgabe: keine Fehler, kein panic.

- [ ] **Schritt 4: Rate Limit testen**
```bash
# Auth-Endpoint: 20/min Limit — nach 6 schnellen Requests muss 429 kommen
for i in {1..7}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    https://seedfinderpro.de/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"x@x.de","password":"x"}')
  echo "Request $i: $STATUS"
done
# Erwartung: erste Requests 401, ab ~6-7 muss 429 erscheinen
```

- [ ] **Schritt 5: Smoke-Test**
```bash
bash /root/SF-1-Ultimate-/scripts/smoke-test.sh 2>/dev/null || \
  curl -s https://seedfinderpro.de/api/auth/health | jq '.status'
```

- [ ] **Schritt 6: Commit**
```bash
cd /root/SF-1-Ultimate-
git add docker-compose.yml
git commit -m "fix(traefik): rate-limit middlewares auf alle API-Router anwenden

rl-auth (20/min) → auth-Router
rl-api (300/min) → alle anderen API-Router (journal, search, gamification,
price, media, tools, notification, community, backup)
Middlewares waren definiert aber nie angebunden."
```

---

## SESSION s2 — npm CVE-Fix + security.txt

### Task 3: npm audit fix alle Services

**Files:**
- Modify: `apps/*/package.json`, `apps/*/package-lock.json` (alle 10 Services)

- [ ] **Schritt 1: Vollständigen Audit-Report erstellen**
```bash
cd /root/SF-1-Ultimate-
for svc in auth-service price-service journal-service community-service \
           tools-service gamification-service search-service \
           notification-service media-service backup-service; do
  echo "=== $svc ==="
  cd apps/$svc
  npm audit --json 2>/dev/null | node -e "
    const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const v=d.metadata?.vulnerabilities||{};
    console.log('Critical:',v.critical,'High:',v.high,'Moderate:',v.moderate);
  " 2>/dev/null || echo "audit failed"
  cd /root/SF-1-Ultimate-
done
```

- [ ] **Schritt 2: npm audit fix auf jedem Service (ohne force)**
```bash
cd /root/SF-1-Ultimate-
for svc in auth-service price-service journal-service community-service \
           tools-service gamification-service search-service \
           notification-service media-service backup-service; do
  echo "=== Fixing $svc ==="
  cd apps/$svc && npm audit fix 2>&1 | tail -3
  cd /root/SF-1-Ultimate-
done
```

- [ ] **Schritt 3: Verbleibende Highs/Criticals mit --force fixen**
```bash
# Nur wenn nach Schritt 2 noch Critical/High > 0
cd /root/SF-1-Ultimate-
for svc in auth-service price-service; do
  echo "=== Force-fixing $svc ==="
  cd apps/$svc
  BEFORE=$(npm audit --json 2>/dev/null | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.metadata?.vulnerabilities?.critical+d.metadata?.vulnerabilities?.high)" 2>/dev/null)
  if [ "$BEFORE" != "0" ] && [ "$BEFORE" != "" ]; then
    npm audit fix --force 2>&1 | tail -5
  fi
  cd /root/SF-1-Ultimate-
done
```

- [ ] **Schritt 4: Services neu bauen und starten**
```bash
cd /root/SF-1-Ultimate-
docker compose build auth-service price-service community-service journal-service \
  tools-service gamification-service search-service notification-service \
  media-service backup-service 2>&1 | grep -E "ERROR|error|Successfully" | head -20
docker compose up -d
sleep 10
docker ps --format "table {{.Names}}\t{{.Status}}" | grep sf1
```
Erwartung: alle Container `Up ... (healthy)` oder `Up X seconds`.

- [ ] **Schritt 5: Post-fix Audit-Report**
```bash
cd /root/SF-1-Ultimate-
for svc in auth-service price-service journal-service community-service; do
  echo "=== $svc ==="
  cd apps/$svc && npm audit --json 2>/dev/null | node -e "
    const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const v=d.metadata?.vulnerabilities||{};
    console.log('Critical:',v.critical,'High:',v.high);
  " 2>/dev/null
  cd /root/SF-1-Ultimate-
done
```
Erwartung: Critical = 0 auf allen. High möglichst 0.

- [ ] **Schritt 6: Smoke-Test**
```bash
curl -s https://seedfinderpro.de/api/auth/health | jq '.status'
curl -s https://seedfinderpro.de/api/search/health | jq '.status'
```

- [ ] **Schritt 7: Commit**
```bash
cd /root/SF-1-Ultimate-
git add apps/*/package.json apps/*/package-lock.json
git commit -m "fix(deps): npm audit fix — CVEs beseitigt (SEC-3)

Critical: 0 auf allen Services nach fix.
Betroffene Services: auth, price, community, journal + weitere."
```

---

### Task 4: security.txt Encryption-Feld ergänzen

**Files:**
- Modify: `apps/web-app/public/.well-known/security.txt`

- [ ] **Schritt 1: Encryption-Zeile ergänzen**

`apps/web-app/public/.well-known/security.txt` aktuellen Inhalt lesen, dann `Encryption: none` nach der `Contact:`-Zeile einfügen:
```
Contact: mailto:security@seedfinderpro.de
Encryption: none
Expires: 2027-03-15T00:00:00.000Z
Preferred-Languages: de, en
Policy: https://seedfinderpro.de/security-policy
Acknowledgments: https://seedfinderpro.de/security-thanks
```

- [ ] **Schritt 2: Commit**
```bash
cd /root/SF-1-Ultimate-
git add apps/web-app/public/.well-known/security.txt
git commit -m "fix(sec): security.txt Encryption-Feld ergänzen (RFC 9116)"
```

---

## SESSION s3 — Container read-only

### Task 5: read_only + tmpfs für alle Backend-Services

**Files:**
- Modify: `docker-compose.yml` (alle 10 Backend-Services)

- [ ] **Schritt 1: Services identifizieren die in /tmp oder /app schreiben**
```bash
# Welche Services haben Upload-Volumes?
grep -A 5 "volumes:" /root/SF-1-Ultimate-/docker-compose.yml | grep -v "#" | grep "uploads\|tmp\|log" | head -10
```

- [ ] **Schritt 2: read_only + tmpfs für auth-service**

In `docker-compose.yml` beim `auth-service` Service-Block ergänzen:
```yaml
    read_only: true
    tmpfs:
      - /tmp:size=100m,noexec,nosuid
```
Direkt nach `restart: unless-stopped` oder nach `security_opt`.

- [ ] **Schritt 3: read_only + tmpfs für alle weiteren Backend-Services**

Für jeden der folgenden Services dieselben 3 Zeilen ergänzen:
`journal-service`, `search-service`, `gamification-service`, `price-service`,
`media-service`, `tools-service`, `notification-service`, `community-service`,
`backup-service`

Für `backup-service` stattdessen größeres tmpfs (Backup braucht Platz):
```yaml
    read_only: true
    tmpfs:
      - /tmp:size=500m,noexec,nosuid
```

Für `media-service` ebenfalls größeres tmpfs (Upload-Processing):
```yaml
    read_only: true
    tmpfs:
      - /tmp:size=500m,noexec,nosuid
```

- [ ] **Schritt 4: Services nacheinander starten und prüfen (nicht alle gleichzeitig!)**
```bash
cd /root/SF-1-Ultimate-
# Erst einen starten und prüfen:
docker compose up -d auth-service
sleep 5
docker logs sf1-auth-service --tail 5
docker inspect sf1-auth-service --format='ReadonlyRootfs: {{.HostConfig.ReadonlyRootfs}}'
# Erwartung: ReadonlyRootfs: true
```

- [ ] **Schritt 5: Alle weiteren Services nacheinander starten**
```bash
cd /root/SF-1-Ultimate-
for svc in journal-service search-service gamification-service price-service \
           media-service tools-service notification-service community-service backup-service; do
  docker compose up -d $svc
  sleep 3
  STATUS=$(docker inspect sf1-$svc --format='{{.State.Status}}' 2>/dev/null)
  READONLY=$(docker inspect sf1-$svc --format='{{.HostConfig.ReadonlyRootfs}}' 2>/dev/null)
  echo "$svc: status=$STATUS readonly=$READONLY"
done
```
Erwartung: alle `status=running readonly=true`.

- [ ] **Schritt 6: Falls ein Service crasht — tmpfs-Größe oder Volume prüfen**
```bash
# Bei Crash:
docker logs sf1-<service-name> --tail 20
# Häufige Ursache: Service schreibt in /app oder /var/run
# Fix: zusätzliches tmpfs oder Named Volume für den Write-Path
```

- [ ] **Schritt 7: Smoke-Test**
```bash
curl -s https://seedfinderpro.de/api/auth/health | jq '.status'
curl -s https://seedfinderpro.de/api/search/health | jq '.status'
curl -s https://seedfinderpro.de/api/prices/health 2>/dev/null | jq '.status'
```

- [ ] **Schritt 8: Commit**
```bash
cd /root/SF-1-Ultimate-
git add docker-compose.yml
git commit -m "feat(security): read_only filesystem für alle Backend-Container (SEC-10)

Verhindert dass bei Code-Execution ein Angreifer Dateien persistent
schreiben kann (Webshell, Backdoor). tmpfs für /tmp als Write-Escape.
no-new-privileges war bereits gesetzt."
```

---

## Abschluss: ROADMAP-SECURITY.md aktualisieren

- [ ] **Roadmap auf completed setzen**
```bash
# In /root/SF-1-Ultimate-/ROADMAP-SECURITY.md alle SESSION-Zeilen:
# **Datum:** offen → **Datum:** [abgeschlossen YYYY-MM-DD]
```

- [ ] **DOKUMENTATION.md aktualisieren**
Eintrag `## SF-1 Security Audit Fixes [abgeschlossen YYYY-MM-DD]` mit Commits ergänzen.

- [ ] **Vault-Kopie**
```bash
cp /root/SF-1-Ultimate-/DOKUMENTATION.md "/root/SF-Brain/SF-1 Projekt/DOKUMENTATION.md"
```
