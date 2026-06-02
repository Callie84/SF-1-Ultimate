# SF-1 Ultimate — Security Roadmap
# Erstellt: 2026-03-15 nach vollständigem Security-Audit
# Basis: Stresstest + Code-Analyse aller 11 Services

---

## Übersicht

| Session | Thema | Aufwand | Schwere |
|---------|-------|---------|---------|
| SEC-1 | JWT-Blacklist bei Logout + Account-Lockout | ~2h | 🔴 HIGH |
| SEC-2 | Backup-Verschlüsselung (AES-256) | ~2h | 🔴 HIGH |
| SEC-3 | npm audit fix — CVEs beseitigen | ~1h | 🔴 HIGH |
| SEC-4 | Content-Security-Policy (CSP) | ~2h | 🟡 MEDIUM |
| SEC-5 | DOMPurify für Forum/Community-Content | ~1h | 🟡 MEDIUM |
| SEC-6 | /.well-known/security.txt | ~15min | 🟡 MEDIUM |
| SEC-7 | 2FA für Admin-Account (TOTP) | ~3h | 🟡 MEDIUM |
| SEC-8 | Traefik Rate Limiting (Gateway-Ebene) | ~1h | 🟢 LOW |
| SEC-9 | Backup-Integrität (HMAC-SHA256) | ~1h | 🟢 LOW |
| SEC-10 | Container read-only Filesystem | ~1h | 🟢 LOW |

---

---

## SESSION SEC-1 — JWT-Blacklist bei Logout + Account-Lockout

**Datum:** offen
**Aufwand:** ~2h

### Warum wichtig
- **Aktuell:** Logout löscht nur Client-Cookie. Der JWT-Token bleibt bis zu 15 Minuten gültig.
  Wenn jemand den Token stiehlt (XSS, Log-Leak), hat er 15 Minuten Zugriff nach Logout.
- **Account-Lockout:** Aktuell nur IP-basiertes Rate Limiting. Ein Angreifer mit wechselnden IPs
  kann unbegrenzt Passwörter ausprobieren.

### Was gebaut wird

**1. JWT-Blacklist (auth-service)**

`apps/auth-service/src/services/token.service.ts` — neue Funktion:
```typescript
// Bei Logout: Token in Redis-Blacklist speichern (TTL = restliche Token-Laufzeit)
export async function blacklistToken(token: string, expiresAt: number): Promise<void> {
  const ttl = expiresAt - Math.floor(Date.now() / 1000);
  if (ttl > 0) {
    await redis.setEx(`blacklist:${token}`, ttl, '1');
  }
}

// In auth-Middleware: Blacklist prüfen
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  return (await redis.get(`blacklist:${token}`)) === '1';
}
```

`apps/auth-service/src/middleware/auth.middleware.ts` — Blacklist-Check einbauen:
```typescript
// Nach JWT-Verify:
if (await isTokenBlacklisted(token)) {
  return res.status(401).json({ error: 'Token wurde widerrufen' });
}
```

`apps/auth-service/src/routes/auth.routes.ts` — Logout-Route:
```typescript
// POST /api/auth/logout
const token = req.headers.authorization?.split(' ')[1];
if (token) {
  const decoded = jwt.decode(token) as any;
  if (decoded?.exp) await blacklistToken(token, decoded.exp);
}
```

**Performance:** Redis-Lookup in <1ms. Bei 15min Token-Lifetime maximal ~1000 aktive Tokens
gleichzeitig im Speicher → vernachlässigbar.

---

**2. Account-Lockout (auth-service)**

`apps/auth-service/src/routes/auth.routes.ts` — Login-Route erweitern:
```typescript
// Beim Login-Versuch:
const lockKey = `login_lock:${email}`;
const failKey = `login_fails:${email}`;

// Gesperrt?
if (await redis.get(lockKey)) {
  const ttl = await redis.ttl(lockKey);
  return res.status(429).json({
    error: 'Account vorübergehend gesperrt.',
    unlockIn: ttl
  });
}

// Fehlgeschlagener Login:
const fails = await redis.incr(failKey);
await redis.expire(failKey, 15 * 60); // Reset nach 15min
if (fails >= 10) {
  await redis.setEx(lockKey, 15 * 60, '1'); // 15min Sperre
}
```

**Schwellwert:** 10 Fehlversuche → 15 Minuten Sperre
**Frontend:** Fehlermeldung mit Countdown anzeigen

---

### Services betroffen
- `apps/auth-service/src/services/token.service.ts`
- `apps/auth-service/src/middleware/auth.middleware.ts`
- `apps/auth-service/src/routes/auth.routes.ts`
- Kein Frontend-Rebuild nötig (reiner Backend-Change)

---

---

## SESSION SEC-2 — Backup-Verschlüsselung (AES-256)

**Datum:** offen
**Aufwand:** ~2h

### Warum wichtig
- Backups liegen als unkomprimierte .tar.gz auf `/root/SF-1-Ultimate-/backups/`
- Enthalten: MongoDB-Dump (alle User-Daten, Passwort-Hashes), PostgreSQL-Dump
- Wenn der Server kompromittiert wird oder ein Angreifer Zugriff auf das Dateisystem
  bekommt, sind alle Nutzerdaten im Klartext lesbar.

### Was gebaut wird

**`apps/backup-service/src/backup.ts` — Verschlüsselung nach tar.gz:**

```typescript
import { execSync } from 'child_process';

// Nach der tar.gz-Erstellung — AES-256-CBC Verschlüsselung:
const encKey = process.env.BACKUP_ENCRYPTION_KEY; // 32-Byte Hex-Key
if (encKey) {
  execSync(
    `openssl enc -aes-256-cbc -pbkdf2 -iter 100000 ` +
    `-in ${backupPath}.tar.gz ` +
    `-out ${backupPath}.tar.gz.enc ` +
    `-pass pass:${encKey}`
  );
  fs.unlinkSync(`${backupPath}.tar.gz`); // Unverschlüsselt löschen
  log(`Backup verschlüsselt: ${backupName}.tar.gz.enc`);
}

// HMAC-SHA256 Integritäts-Hash:
const hmacOutput = execSync(
  `openssl dgst -sha256 -hmac "${encKey}" ${backupPath}.tar.gz.enc`
).toString().trim().split(' ').pop();

// Hash in Meta-Datei speichern:
meta.hmac = hmacOutput;
meta.encrypted = true;
```

**Entschlüsselung (bei Restore):**
```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -in backup-2026-03-15T02-00-00.tar.gz.enc \
  -out backup-2026-03-15T02-00-00.tar.gz \
  -pass pass:$BACKUP_ENCRYPTION_KEY
```

**`.env` erweitern:**
```env
BACKUP_ENCRYPTION_KEY=<32 zufällige Bytes als Hex — einmalig generieren>
```
Key generieren: `openssl rand -hex 32`

**Admin-UI (`/admin/backup`):**
- Badge "🔒 Verschlüsselt" bei verschlüsselten Backups
- Integritätsstatus (HMAC OK / FAIL) anzeigen
- Restore-Anleitung im UI

**Restore-Script:**
```bash
# /root/SF-1-Ultimate-/scripts/restore-backup.sh
#!/bin/bash
BACKUP_FILE=$1
ENCRYPTION_KEY=$(grep BACKUP_ENCRYPTION_KEY /root/SF-1-Ultimate-/.env | cut -d= -f2)
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -in "$BACKUP_FILE" -out "${BACKUP_FILE%.enc}" \
  -pass pass:$ENCRYPTION_KEY
echo "Entschlüsselt: ${BACKUP_FILE%.enc}"
```

### Services betroffen
- `apps/backup-service/src/backup.ts`
- `apps/backup-service/src/routes/backup.routes.ts` (HMAC-Anzeige)
- `apps/web-app/src/app/admin/backup/page.tsx` (UI Badge)
- `.env` (neuer Key)
- `docker-compose restart backup`

---

---

## SESSION SEC-3 — npm audit fix (CVE-Bereinigung)

**Datum:** offen
**Aufwand:** ~1h

### Warum wichtig
Der audit im auth-service zeigte:
- 0 critical, **5 high**, 2 moderate, 2 low

Unbehandelte CVEs können bekannte Exploits ermöglichen, auch wenn die
Wahrscheinlichkeit in diesem Kontext gering ist.

### Was gemacht wird

**Schritt 1: Audit aller Services:**
```bash
for svc in auth-service price-service journal-service community-service \
           tools-service gamification-service search-service \
           notification-service ai-service media-service; do
  echo "=== $svc ==="
  cd /root/SF-1-Ultimate-/apps/$svc && npm audit --json | \
    node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); \
    console.log('Critical:',d.metadata?.vulnerabilities?.critical, \
    'High:',d.metadata?.vulnerabilities?.high);"
done
```

**Schritt 2: Automatisches Fix:**
```bash
cd apps/$svc && npm audit fix
# Bei breaking changes:
npm audit fix --force  # NUR nach Test!
```

**Schritt 3: Breaking Changes prüfen:**
```bash
docker-compose restart $svc
sleep 5 && docker logs sf1-$svc --tail 20
```

**Schritt 4: Regelmäßiges Audit (Cron):**
```bash
# Wöchentlicher Cron auf dem Server:
0 8 * * 1 cd /root/SF-1-Ultimate- && ./scripts/weekly-audit.sh
```

**`scripts/weekly-audit.sh` — NEU:**
```bash
#!/bin/bash
# Schickt npm audit Ergebnisse an Admin
REPORT=""
for svc in auth-service price-service journal-service community-service ...; do
  RESULT=$(cd apps/$svc && npm audit 2>&1 | tail -5)
  REPORT="$REPORT\n=== $svc ===\n$RESULT"
done
# Per Telegram oder E-Mail senden
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d "chat_id=$TELEGRAM_CHAT_ID&text=Weekly npm audit:\n$REPORT"
```

### Services betroffen
- Alle 10 Backend-Services
- Kein Frontend-Rebuild nötig (außer web-app wenn dort Vulns)

---

---

## SESSION SEC-4 — Content-Security-Policy (CSP)

**Datum:** offen
**Aufwand:** ~2h

### Warum wichtig
CSP verhindert XSS-Angriffe auf der Browser-Ebene. Ohne CSP kann injizierter JavaScript-Code
beliebige Requests machen, Cookies stehlen, etc.

### Was gebaut wird

**Helmet.js in allen Backend-Services erweitern:**
```typescript
// apps/*/src/index.ts — statt app.use(helmet()):
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // Für CSS-in-JS
      imgSrc: ["'self'", "data:", "https://fsn1.your-objectstorage.com", "https://img.youtube.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    }
  },
  crossOriginEmbedderPolicy: false,  // Für YouTube-Embeds nötig
}));
```

**Next.js Frontend — `next.config.js` Headers erweitern:**
```javascript
// apps/web-app/next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // Next.js benötigt unsafe-eval
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://fsn1.your-objectstorage.com https://img.youtube.com",
      "media-src 'self' https://fsn1.your-objectstorage.com",
      "connect-src 'self' https://seedfinderpro.de https://sentry.io",
      "frame-src 'self' https://www.youtube.com",  // Für Video-Embeds (Session 48)
      "font-src 'self'",
      "object-src 'none'",
    ].join('; ')
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  }
};
```

**Vorgehen (iterativ — CSP Report-Only zuerst):**
1. `Content-Security-Policy-Report-Only` einschalten
2. Browser-Konsole auf Violations überwachen
3. Whitelist ggf. erweitern
4. Auf `Content-Security-Policy` wechseln

### Services betroffen
- Alle 10 Backend-Services (`index.ts` Helmet-Config)
- `apps/web-app/next.config.js`
- Frontend-Rebuild nötig (1× nach next.config.js Änderung)

---

---

## SESSION SEC-5 — DOMPurify für Forum/Community-Content

**Datum:** offen
**Aufwand:** ~1h

### Warum wichtig
React escapt automatisch User-Input bei direkter JSX-Ausgabe (`{text}`).
Allerdings gibt es Stellen im Projekt wo `dangerouslySetInnerHTML` genutzt wird
oder wo Rich-Text-Inhalte mit HTML-Tags gespeichert werden könnten.

### Was gebaut wird

**Dependency installieren:**
```bash
cd apps/web-app && npm install isomorphic-dompurify
```

**Neue Utility-Funktion:**
```typescript
// apps/web-app/src/lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'rel'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

// Für plain-text (Strip all HTML):
export function stripHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}
```

**Einbindung in Community-Komponenten:**
```typescript
// Überall wo dangerouslySetInnerHTML mit User-Content:
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }} />
```

**Backend (community-service) — beim Speichern sanitieren:**
```typescript
// apps/community-service/src/routes/threads.routes.ts
import { sanitizeHtml } from '../utils/sanitize';

// Vor dem Speichern in DB:
const cleanContent = sanitizeHtml(req.body.content);
```

### Services betroffen
- `apps/web-app/src/lib/sanitize.ts` (neu)
- `apps/web-app/src/app/community/` (Nutzung)
- `apps/community-service/src/routes/threads.routes.ts`
- `apps/community-service/src/routes/replies.routes.ts`
- Frontend-Rebuild nach Installation

---

---

## SESSION SEC-6 — /.well-known/security.txt

**Datum:** offen
**Aufwand:** ~15 Minuten

### Warum wichtig
`security.txt` (RFC 9116) ist der Industriestandard für "Responsible Disclosure".
Security-Researcher die eine Schwachstelle finden, wissen so wie sie dich kontaktieren können
— statt die Lücke zu veröffentlichen oder zu missbrauchen.

### Was gebaut wird

**Datei erstellen:**
```
# apps/web-app/public/.well-known/security.txt
Contact: mailto:security@seedfinderpro.de
Expires: 2027-03-15T00:00:00.000Z
Preferred-Languages: de, en
Encryption: keine
Acknowledgments: https://seedfinderpro.de/security-thanks
Policy: https://seedfinderpro.de/security-policy
```

**Seite `/security-policy` erstellen:**
```
Wir nehmen Sicherheitsmeldungen ernst.
Bitte melde Schwachstellen an security@seedfinderpro.de.
Wir antworten innerhalb von 48h.
Wir bitten darum, die Schwachstelle nicht öffentlich zu machen,
bis wir sie behoben haben (Coordinated Disclosure).
```

**E-Mail-Alias einrichten:**
- `security@seedfinderpro.de` → Weiterleitung zu `klingenpascal@gmail.com`
- In Brevo-Einstellungen konfigurieren

### Services betroffen
- `apps/web-app/public/.well-known/security.txt` (neu, 7 Zeilen)
- `apps/web-app/src/app/security-policy/page.tsx` (neue Frontend-Seite)
- Frontend-Rebuild

---

---

## SESSION SEC-7 — 2FA für Admin-Account (TOTP)

**Datum:** offen
**Aufwand:** ~3h

### Warum wichtig
Der Admin-Account (`klingenpascal@gmail.com`) hat vollständige Plattform-Kontrolle:
- Alle User verwalten
- Backups triggern
- Daten löschen
- Inhalte moderieren

Ein kompromittiertes Admin-Passwort = komplette Plattform gefährdet.

### Was gebaut wird

**Dependency:**
```bash
cd apps/auth-service && npm install speakeasy qrcode
```

**`apps/auth-service/src/services/totp.service.ts` — NEU:**
```typescript
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export function generateTotpSecret(username: string) {
  const secret = speakeasy.generateSecret({
    name: `SeedFinderPro:${username}`,
    issuer: 'SeedFinderPro',
    length: 20
  });
  return {
    base32: secret.base32,
    otpauthUrl: secret.otpauth_url!,
  };
}

export async function generateQrCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyTotp(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,  // ±30 Sekunden Toleranz
  });
}
```

**Prisma-Schema erweitern:**
```prisma
model User {
  // Bestehende Felder...
  totpSecret    String?   // TOTP-Secret (nur für ADMIN)
  totpEnabled   Boolean   @default(false)
  totpVerified  Boolean   @default(false)  // Setup abgeschlossen
}
```

**Neue Auth-Routen:**
```typescript
// POST /api/auth/2fa/setup — TOTP-Setup starten
// POST /api/auth/2fa/verify — Setup bestätigen (ersten Code eingeben)
// POST /api/auth/2fa/disable — 2FA deaktivieren (mit Passwort)
// POST /api/auth/login (erweitern) — wenn totpEnabled: 2FA-Code abfragen
```

**Login-Flow mit 2FA:**
```
1. User gibt E-Mail + Passwort ein
2. Backend prüft Credentials
3. Wenn totpEnabled=true → Response: { requires2FA: true, tempToken: ... }
4. Frontend zeigt 2FA-Code-Eingabe
5. User gibt 6-stelligen TOTP ein
6. POST /api/auth/login/2fa mit tempToken + totpCode
7. Bei Erfolg: normaler Access/Refresh-Token
```

**Frontend-Seite `/settings/security`:**
- "Zwei-Faktor-Authentifizierung" Sektion
- QR-Code anzeigen (von Backend generiert)
- Code eingeben zum Bestätigen
- Backup-Codes (10 Einmalcodes) anzeigen und speichern

**Gilt nur für:** ADMIN-Role. Normale User können es optional nutzen.

### Services betroffen
- `apps/auth-service/src/services/totp.service.ts` (neu)
- `apps/auth-service/src/routes/auth.routes.ts` (Login-Erweiterung)
- `apps/auth-service/prisma/schema.prisma` (2 neue Felder)
- `apps/web-app/src/app/settings/security/page.tsx` (neu)
- Frontend-Rebuild nach UI-Änderungen

---

---

## SESSION SEC-8 — Traefik Rate Limiting (Gateway-Ebene)

**Datum:** offen
**Aufwand:** ~1h

### Warum wichtig
Aktuell schützt nur Express (Service-Ebene) gegen Rate-Limit-Angriffe.
Angriffe die Traefik erreichen aber durch Express geblockt werden,
verbrauchen trotzdem CPU und Netzwerk der Container.

Eine zweite Schicht auf Gateway-Ebene blockt bereits vor dem Container.

### Was gebaut wird

**`apps/api-gateway/config/dynamic/middlewares.yml` — Rate Limiting hinzufügen:**
```yaml
http:
  middlewares:
    # Standard-Limitierung für alle öffentlichen Endpunkte
    ratelimit-global:
      rateLimit:
        average: 100      # 100 req/s pro IP
        burst: 200        # Burst bis 200
        period: 1s

    # Strenge Limitierung für Auth-Endpunkte
    ratelimit-auth:
      rateLimit:
        average: 5        # 5 req/s für Login/Register
        burst: 10
        period: 1s

    # Sehr streng für Admin
    ratelimit-admin:
      rateLimit:
        average: 20
        burst: 30
        period: 1s
```

**Labels in `docker-compose.yml` für Auth-Routen erweitern:**
```yaml
# auth-service labels:
- "traefik.http.routers.auth.middlewares=ratelimit-auth@file"
# Alle anderen API-Routen:
- "traefik.http.routers.api.middlewares=ratelimit-global@file"
```

**Aber:** Traefik-Rate-Limiting ist weniger granular als Express.
Empfehlung: Traefik als DoS-Schutz, Express für präzise Business-Logik.

### Services betroffen
- `apps/api-gateway/config/dynamic/middlewares.yml` (Ergänzung)
- `docker-compose.yml` (Label-Ergänzungen)
- `docker-compose restart api-gateway` (kurze Downtime <5s)

---

---

## SESSION SEC-9 — Backup-Integritätsprüfung (HMAC-SHA256)

**Datum:** offen
**Aufwand:** ~1h

### Hinweis
SEC-9 baut auf SEC-2 auf. Idealerweise in derselben Session umsetzen.

### Was gebaut wird

Beim Erstellen: HMAC-SHA256 des verschlüsselten Backup-Files speichern.
Beim Anzeigen in der Admin-UI: HMAC verifizieren.

**`apps/backup-service/src/backup.ts` — Ergänzung:**
```typescript
import { createHmac } from 'crypto';

function computeHmac(filePath: string, key: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return createHmac('sha256', key).update(fileBuffer).digest('hex');
}

// Nach Backup-Erstellung:
const hmac = computeHmac(`${backupPath}.tar.gz.enc`, process.env.BACKUP_ENCRYPTION_KEY!);
meta.hmac = hmac;

// Verifikation (beim Admin-Check):
export function verifyBackupIntegrity(backupName: string): boolean {
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  const computed = computeHmac(tarFile, process.env.BACKUP_ENCRYPTION_KEY!);
  return computed === meta.hmac;
}
```

**Admin-UI (`/admin/backup`):**
- "Integrität prüfen" Button pro Backup
- Status: ✅ Intakt / ❌ Manipuliert

### Services betroffen
- `apps/backup-service/src/backup.ts`
- `apps/web-app/src/app/admin/backup/page.tsx`

---

---

## SESSION SEC-10 — Container read-only Filesystem

**Datum:** abgeschlossen 2026-06-02 | Commit: 4108a0e
**Aufwand:** ~1h

### Warum wichtig
Wenn ein Angreifer Code-Ausführung in einem Container erreicht,
verhindert `readOnlyRootFilesystem`, dass er Dateien ändert (Webshell, Backdoor etc.)

### Was gebaut wird

**`docker-compose.yml` — Security-Context für alle Services:**
```yaml
services:
  auth-service:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp:size=100m,noexec   # Für temporäre Dateien
    # Benötigt explizite Volumes für Write-Paths:
    volumes:
      - ./apps/auth-service:/app   # Dev-Hotreload
      - /tmp/auth-uploads:/app/uploads  # Upload-Verzeichnis

  # Für Services mit Datei-Writes (media, backup):
  media-service:
    read_only: true
    tmpfs:
      - /tmp:size=500m
    volumes:
      - media_uploads:/app/uploads  # Persistenter Upload-Pfad

  backup:
    read_only: true
    volumes:
      - ./backups:/backups:rw  # Backup-Verzeichnis
```

**Vorsicht:** Services die in `/app` schreiben (tsx-watch, kompilierter Output)
brauchen spezielle Volumes. Dev-Volumes verhindern `read_only` im Dev-Modus.

**Empfehlung:** Erst in Staging-Umgebung testen, dann in Produktion ausrollen.

### Services betroffen
- `docker-compose.yml` (alle 10 Backend-Services)
- Kein Code-Change, nur Docker-Config

---

---

## Empfohlene Reihenfolge

```
SEC-1  →  JWT-Blacklist + Account-Lockout       [~2h]  🔴 ASAP
SEC-2  →  Backup-Verschlüsselung                [~2h]  🔴 ASAP
SEC-3  →  npm audit fix                         [~1h]  🔴 ASAP
SEC-4  →  Content-Security-Policy               [~2h]  🟡
SEC-5  →  DOMPurify Community-Content           [~1h]  🟡
SEC-6  →  security.txt                          [~15m] 🟡
SEC-7  →  2FA Admin (TOTP)                      [~3h]  🟡
SEC-8  →  Traefik Rate Limiting                 [~1h]  🟢
SEC-9  →  Backup-Integrität HMAC               [~1h]  🟢 (mit SEC-2)
SEC-10 →  Container read-only Filesystem        [~1h]  🟢
```

**Gesamt-Aufwand:** ~15 Stunden verteilt auf 7–10 Sessions

---

## Nach Abschluss aller Sessions: Ziel-Sicherheitsniveau

| Kategorie | Jetzt | Nach Roadmap |
|-----------|-------|--------------|
| Authentifizierung | 7/10 | 9.5/10 |
| Datenschutz (Backups) | 4/10 | 9/10 |
| XSS/Injection | 8/10 | 9.5/10 |
| Monitoring/Response | 8/10 | 9/10 |
| Dependencies | 6/10 | 9/10 |
| **Gesamt** | **7.5/10** | **9.5/10** |
