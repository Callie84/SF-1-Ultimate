# Stale-Preis-Alarm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Telegram-Alarm an Admin wenn Seedbank-Preise >24h veraltet + In-App-Notification an User wenn Seed-Preise >36h fehlen.

**Architecture:** Neuer `StalenessService` aggregiert `max(scrapedAt)` je Seedbank. Ein neuer Admin-Endpoint `/api/prices/admin/staleness` gibt die Stale-Liste zurück. Das Shell-Script ruft diesen Endpoint auf und sendet Telegram. `alert.service.ts` prüft parallel User-Alerts auf veraltete Preise und schreibt in die Notification-Queue.

**Tech Stack:** TypeScript, Express, Mongoose, Redis (ioredis), Bash, curl, Node.js JWT

---

## Datei-Übersicht

| Datei | Typ | Änderung |
|-------|-----|----------|
| `apps/price-service/src/services/staleness.service.ts` | NEU | MongoDB-Aggregation → stale Seedbanken |
| `apps/price-service/src/index.ts` | MODIFY | Endpoint `GET /api/prices/admin/staleness` (vor API-ROUTES Block, nach Zeile ~377) |
| `apps/price-service/src/services/alert.service.ts` | MODIFY | `checkStaleAlerts()` + Aufruf in `checkAlerts()` |
| `apps/notification-service/src/workers/queue.worker.ts` | MODIFY | `reason === 'stale'` Branch innerhalb `price_alert` Handler |
| `/root/scripts/price-service-alarm.sh` | MODIFY | Staleness-Check Block anhängen |

**Wichtig:**
- Price-Service läuft auf Port **3002**, Container-IP `172.17.0.28`
- Nach Änderungen an TypeScript-Services: `docker restart sf1-price-service` bzw. `sf1-notification-service`
- Shell-Script liegt außerhalb des SF-1-Git-Repos (Root-Repo)

---

## Task 1 — StalenessService anlegen

**Files:**
- Create: `apps/price-service/src/services/staleness.service.ts`

- [ ] **Step 1: Datei anlegen**

```typescript
// apps/price-service/src/services/staleness.service.ts
import { Price } from '../models/Price.model';
import { logger } from '../utils/logger';

export interface SeedбankStaleness {
  seedbank: string;
  lastScraped: Date;
  hoursAgo: number;
}

export interface StaleResult {
  threshold: number;
  checkedAt: Date;
  stale: SeedбankStaleness[];
  ok: SeedбankStaleness[];
}

export class StalenessService {
  async getStaleSeedbanks(thresholdHours: number = 24): Promise<StaleResult> {
    const checkedAt = new Date();
    const thresholdMs = thresholdHours * 60 * 60 * 1000;

    const rows = await Price.aggregate([
      {
        $group: {
          _id: '$seedbank',
          lastScraped: { $max: '$scrapedAt' },
        },
      },
      { $sort: { lastScraped: 1 } },
    ]);

    const stale: SeedбankStaleness[] = [];
    const ok: SeedбankStaleness[] = [];

    for (const row of rows) {
      const hoursAgo = (checkedAt.getTime() - new Date(row.lastScraped).getTime()) / (1000 * 60 * 60);
      const entry: SeedбankStaleness = {
        seedbank: row._id,
        lastScraped: new Date(row.lastScraped),
        hoursAgo: Math.round(hoursAgo * 10) / 10,
      };
      if (hoursAgo > thresholdHours) {
        stale.push(entry);
      } else {
        ok.push(entry);
      }
    }

    logger.info(`[StalenessService] Geprüft: ${rows.length} Seedbanken, ${stale.length} veraltet (>${thresholdHours}h)`);

    return { threshold: thresholdHours, checkedAt, stale, ok };
  }
}

export const stalenessService = new StalenessService();
```

- [ ] **Step 2: Tipp-Fehler prüfen** — `SeedбankStaleness` hat ein kyrillisches `б` (Copy-Paste-Artefakt). Suchen und durch normales `k` ersetzen: Interface-Name muss `SeedbankStaleness` heißen. Datei erneut speichern mit korrektem Namen.

Korrekter Dateiinhalt (Step 1 nochmal mit korrekter Schreibweise):

```typescript
// apps/price-service/src/services/staleness.service.ts
import { Price } from '../models/Price.model';
import { logger } from '../utils/logger';

export interface SeedbankStaleness {
  seedbank: string;
  lastScraped: Date;
  hoursAgo: number;
}

export interface StaleResult {
  threshold: number;
  checkedAt: Date;
  stale: SeedbankStaleness[];
  ok: SeedbankStaleness[];
}

export class StalenessService {
  async getStaleSeedbanks(thresholdHours: number = 24): Promise<StaleResult> {
    const checkedAt = new Date();

    const rows = await Price.aggregate([
      {
        $group: {
          _id: '$seedbank',
          lastScraped: { $max: '$scrapedAt' },
        },
      },
      { $sort: { lastScraped: 1 } },
    ]);

    const stale: SeedbankStaleness[] = [];
    const ok: SeedbankStaleness[] = [];

    for (const row of rows) {
      const hoursAgo =
        (checkedAt.getTime() - new Date(row.lastScraped).getTime()) / (1000 * 60 * 60);
      const entry: SeedbankStaleness = {
        seedbank: row._id,
        lastScraped: new Date(row.lastScraped),
        hoursAgo: Math.round(hoursAgo * 10) / 10,
      };
      if (hoursAgo > thresholdHours) {
        stale.push(entry);
      } else {
        ok.push(entry);
      }
    }

    logger.info(
      `[StalenessService] ${rows.length} Seedbanken geprüft, ${stale.length} veraltet (>${thresholdHours}h)`
    );

    return { threshold: thresholdHours, checkedAt, stale, ok };
  }
}

export const stalenessService = new StalenessService();
```

- [ ] **Step 3: TypeScript-Syntax lokal prüfen**

```bash
cd /root/SF-1-Ultimate-/apps/price-service
npx tsc --noEmit 2>&1 | grep staleness
```

Erwartet: keine Ausgabe (keine Fehler in der neuen Datei).

---

## Task 2 — Endpoint in index.ts

**Files:**
- Modify: `apps/price-service/src/index.ts`

Einfügepunkt: nach dem `import`-Block am Anfang der Datei (Import hinzufügen) und nach dem letzten `app.post('/api/prices/admin/flavors/import-crawl', ...)` Block (ca. Zeile 377), vor dem Kommentar `// ==================== API ROUTES ====================`.

- [ ] **Step 1: Import ergänzen**

In `apps/price-service/src/index.ts` ganz oben in den bestehenden Import-Block einfügen:

```typescript
import { stalenessService } from './services/staleness.service';
```

(Direkt nach `import { crawlFlavorImport } from './services/crawl-flavor-import.service';`)

- [ ] **Step 2: Endpoint einfügen**

Direkt nach dem `app.post('/api/prices/admin/flavors/import-crawl', ...)` Block, vor dem `// ==================== API ROUTES ====================` Kommentar:

```typescript
// Staleness-Check: welche Seedbanken haben veraltete Preise?
app.get('/api/prices/admin/staleness', requireAdmin, async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 24;
    const result = await stalenessService.getStaleSeedbanks(threshold);
    res.json(result);
  } catch (error: any) {
    logger.error('[Admin] Staleness-Check Fehler:', error);
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 3: TypeScript prüfen**

```bash
cd /root/SF-1-Ultimate-/apps/price-service
npx tsc --noEmit 2>&1 | head -20
```

Erwartet: keine Fehler.

- [ ] **Step 4: Service neu bauen und starten**

```bash
cd /root/SF-1-Ultimate-/apps/price-service
npm run build 2>&1 | tail -5
docker restart sf1-price-service
sleep 5
docker logs sf1-price-service --tail 10
```

Erwartet: `[Server] Price Service läuft auf Port 3002`

- [ ] **Step 5: Endpoint live testen**

```bash
JWT=$(node -e "
  const jwt=require('/root/SF-1-Ultimate-/apps/auth-service/node_modules/jsonwebtoken');
  const s=require('fs').readFileSync('/root/SF-1-Ultimate-/.env','utf8').match(/JWT_SECRET=(.+)/)?.[1]?.trim();
  console.log(jwt.sign({userId:'monitoring',role:'ADMIN'},s,{expiresIn:'5m'}));
" 2>/dev/null)

curl -s -H "Authorization: Bearer $JWT" \
  "http://172.17.0.28:3002/api/prices/admin/staleness?threshold=24" | \
  node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log('stale:', d.stale?.length, 'ok:', d.ok?.length)"
```

Erwartet: Ausgabe wie `stale: 0 ok: 29` (Zahlen variieren je nach aktuellem Scrape-Status).

- [ ] **Step 6: Commit**

```bash
cd /root/SF-1-Ultimate-
git add apps/price-service/src/services/staleness.service.ts apps/price-service/src/index.ts
git commit -m "feat: Staleness-Service + GET /api/prices/admin/staleness Endpoint"
```

---

## Task 3 — User-Alarm: checkStaleAlerts() in alert.service.ts

**Files:**
- Modify: `apps/price-service/src/services/alert.service.ts`

- [ ] **Step 1: checkStaleAlerts() Methode anlegen**

In `alert.service.ts` direkt vor `export const alertService = new AlertService();` (Zeile 246) einfügen:

```typescript
  /**
   * Check active alerts for seeds with no recent prices (>36h)
   */
  async checkStaleAlerts(): Promise<number> {
    const STALE_THRESHOLD_MS = 36 * 60 * 60 * 1000;
    const staleFrom = new Date(Date.now() - STALE_THRESHOLD_MS);

    const activeAlerts = await PriceAlert.find({ isActive: true });
    let notifiedCount = 0;

    for (const alert of activeAlerts) {
      try {
        // Skip if notified recently (24h cooldown via lastNotified)
        if (alert.lastNotified) {
          const hoursSince = (Date.now() - alert.lastNotified.getTime()) / (1000 * 60 * 60);
          if (hoursSince < 24) continue;
        }

        // Check if any price exists that is fresh enough
        const freshPrice = await Price.findOne({
          seedId: alert.seedId,
          scrapedAt: { $gt: staleFrom },
        });

        if (!freshPrice) {
          // No fresh price found — notify user
          await this.triggerStaleAlert(alert);
          notifiedCount++;
        }
      } catch (error) {
        logger.error(`[AlertService] Stale-Check Fehler für Alert ${alert._id}:`, error);
      }
    }

    logger.info(`[AlertService] Stale-Check: ${activeAlerts.length} Alerts geprüft, ${notifiedCount} benachrichtigt`);
    return notifiedCount;
  }

  /**
   * Trigger stale notification for a user alert
   */
  private async triggerStaleAlert(alert: IPriceAlert): Promise<void> {
    alert.lastNotified = new Date();
    alert.notificationCount += 1;
    await alert.save();

    const notificationData = {
      type: 'price_alert',
      userId: alert.userId,
      data: {
        seedSlug: alert.seedSlug,
        targetPrice: alert.targetPrice,
        reason: 'stale',
      },
    };

    await redis.lPush('queue:notifications', JSON.stringify(notificationData));

    logger.info(`[AlertService] Stale-Alert für User ${alert.userId}, Seed ${alert.seedSlug} gesendet`);
  }
```

- [ ] **Step 2: checkStaleAlerts() in checkAlerts() aufrufen**

In `checkAlerts()` (Zeile 117–138) am Ende der Methode, direkt vor dem `return triggeredCount;` Statement:

```typescript
    // Stale-Check: Preise >36h nicht aktualisiert
    const staleCount = await this.checkStaleAlerts();
    logger.info(`[AlertService] Stale-Alerts gesendet: ${staleCount}`);
```

- [ ] **Step 3: TypeScript prüfen**

```bash
cd /root/SF-1-Ultimate-/apps/price-service
npx tsc --noEmit 2>&1 | head -20
```

Erwartet: keine Fehler.

- [ ] **Step 4: Service neu bauen und starten**

```bash
cd /root/SF-1-Ultimate-/apps/price-service
npm run build 2>&1 | tail -5
docker restart sf1-price-service
sleep 5
docker logs sf1-price-service --tail 10
```

Erwartet: Service startet ohne Fehler, Logs zeigen `[Server] Price Service läuft auf Port 3002`.

- [ ] **Step 5: Commit**

```bash
cd /root/SF-1-Ultimate-
git add apps/price-service/src/services/alert.service.ts
git commit -m "feat: checkStaleAlerts() — User-Alarm wenn Seed-Preise >36h veraltet"
```

---

## Task 4 — Notification-Queue: stale-Branch im Queue-Worker

**Files:**
- Modify: `apps/notification-service/src/workers/queue.worker.ts`

Einfügepunkt: innerhalb des `if (msg.type === 'price_alert')` Blocks (Zeile 81), direkt vor `} else if (msg.type === 'level:up')` (Zeile 102).

- [ ] **Step 1: stale-Branch einfügen**

Den bestehenden Block in `queue.worker.ts` um einen `reason === 'stale'` Zweig erweitern. Der vollständige `price_alert`-Block wird so:

```typescript
    if (msg.type === 'price_alert') {
      const { seedSlug, targetPrice, currentPrice, seedbank, url, reason } = msg.data;

      if (reason === 'stale') {
        // Stale-Preise: User informieren dass keine aktuellen Preise vorhanden
        await notificationService.create({
          userId: msg.userId,
          type: 'price_alert',
          title: `⏳ Preise veraltet: ${seedSlug}`,
          message: `Für ${seedSlug} sind seit über 36 Stunden keine aktuellen Preise verfügbar. Wir benachrichtigen dich sobald neue Preise eingehen.`,
          relatedUrl: `/seeds/${seedSlug}`,
          data: msg.data,
        });
      } else {
        const reasonText = reason === 'discount'
          ? 'Preissenkung bei'
          : `Zielpreis erreicht für`;

        const title = `🌿 ${reasonText} ${seedSlug}`;
        const message = reason === 'discount'
          ? `${seedbank} hat den Preis gesenkt — aktuell ${currentPrice?.toFixed(2)}€`
          : `${seedbank} bietet ${seedSlug} für ${currentPrice?.toFixed(2)}€ an (Ziel: ${targetPrice?.toFixed(2)}€)`;

        await notificationService.create({
          userId: msg.userId,
          type: 'price_alert',
          title,
          message,
          relatedUrl: url,
          data: msg.data,
        });
      }

    } else if (msg.type === 'level:up') {
```

- [ ] **Step 2: Service neu bauen und starten**

```bash
cd /root/SF-1-Ultimate-/apps/notification-service
npm run build 2>&1 | tail -5
docker restart sf1-notification-service
sleep 5
docker logs sf1-notification-service --tail 10
```

Erwartet: `[Server] Notification Service started` ohne Fehler.

- [ ] **Step 3: Queue-Verarbeitung manuell testen**

```bash
# Test-Message direkt in Queue schreiben
REDIS_PASS=$(grep REDIS_PASSWORD /root/SF-1-Ultimate-/.env | cut -d= -f2)
docker exec sf1-redis redis-cli -a "$REDIS_PASS" --no-auth-warning \
  LPUSH queue:notifications '{"type":"price_alert","userId":"test-user-id","data":{"seedSlug":"test-seed","targetPrice":10,"reason":"stale"}}'

sleep 3
docker logs sf1-notification-service --tail 20 | grep -E "stale|test-seed|price_alert"
```

Erwartet: Log-Eintrag der zeigt dass die Stale-Notification erstellt wurde (oder Fehler "User not found" — beides zeigt dass der Branch ausgeführt wird).

- [ ] **Step 4: Commit**

```bash
cd /root/SF-1-Ultimate-
git add apps/notification-service/src/workers/queue.worker.ts
git commit -m "feat: Queue-Worker verarbeitet price_alert reason=stale"
```

---

## Task 5 — Shell-Script: Staleness-Check in price-service-alarm.sh

**Files:**
- Modify: `/root/scripts/price-service-alarm.sh`

- [ ] **Step 1: Script erweitern**

Den kompletten Inhalt von `/root/scripts/price-service-alarm.sh` ersetzen mit:

```bash
#!/bin/bash
# Prüft Circuit-Breaker-Status im Price-Service via Redis.
# Prüft Staleness der Preise via HTTP-Endpoint.
# Sendet Telegram-Alert wenn >3 Adapter-Circuits offen ODER ≥1 Seedbank veraltet.
# Cron: */30 * * * * /root/scripts/price-service-alarm.sh

ENV_FILE="/root/SF-1-Ultimate-/.env"
REDIS_PASSWORD=$(grep '^REDIS_PASSWORD=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
TELEGRAM_BOT_TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
TELEGRAM_CHAT_ID=$(grep '^TELEGRAM_CHAT_ID=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
CIRCUIT_THRESHOLD=3
PRICE_SERVICE_URL="http://172.17.0.28:3002"
LOG_TAG="[$(date -u +%Y-%m-%dT%H:%M:%SZ)]"

send_telegram() {
    local message="$1"
    if [[ -n "$TELEGRAM_BOT_TOKEN" && -n "$TELEGRAM_CHAT_ID" ]]; then
        curl -s -X POST \
            "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d chat_id="$TELEGRAM_CHAT_ID" \
            -d parse_mode="HTML" \
            -d text="$message" > /dev/null
    fi
}

# ── CHECK 1: Circuit-Breaker ──────────────────────────────────────────────────
OPEN_KEYS=$(docker exec sf1-redis redis-cli \
    -a "$REDIS_PASSWORD" --no-auth-warning \
    KEYS "circuit:open:*" 2>/dev/null)

OPEN_COUNT=$(echo "$OPEN_KEYS" | grep -c "circuit:open:" || true)

if [ "$OPEN_COUNT" -gt "$CIRCUIT_THRESHOLD" ]; then
    ADAPTER_LIST=$(echo "$OPEN_KEYS" | sed 's/circuit:open://g' | tr '\n' ', ' | sed 's/,$//')
    send_telegram "⚠️ <b>SF-1 Price-Service Alarm</b>

${OPEN_COUNT} Adapter-Circuit-Breaker offen (Schwelle: ${CIRCUIT_THRESHOLD}):
<code>${ADAPTER_LIST}</code>

Preise für diese Shops werden nicht abgerufen.
Prüfen: <code>docker logs sf1-price-service --tail 50</code>"
    echo "$LOG_TAG ALARM: ${OPEN_COUNT} Circuits offen — Telegram gesendet"
else
    echo "$LOG_TAG OK: ${OPEN_COUNT} Circuits offen (Schwelle: ${CIRCUIT_THRESHOLD})"
fi

# ── CHECK 2: Staleness-Check ──────────────────────────────────────────────────
JWT=$(node -e "
  try {
    const jwt=require('/root/SF-1-Ultimate-/apps/auth-service/node_modules/jsonwebtoken');
    const s=require('fs').readFileSync('/root/SF-1-Ultimate-/.env','utf8').match(/JWT_SECRET=(.+)/)?.[1]?.trim();
    if (!s) { process.stderr.write('JWT_SECRET nicht gefunden\n'); process.exit(1); }
    process.stdout.write(jwt.sign({userId:'monitoring',role:'ADMIN'},s,{expiresIn:'5m'}));
  } catch(e) { process.stderr.write(e.message+'\n'); process.exit(1); }
" 2>/dev/null)

if [[ -z "$JWT" ]]; then
    echo "$LOG_TAG WARN: JWT-Generierung fehlgeschlagen — Staleness-Check übersprungen"
else
    STALE_RESPONSE=$(curl -s --max-time 10 \
        -H "Authorization: Bearer $JWT" \
        "${PRICE_SERVICE_URL}/api/prices/admin/staleness?threshold=24" 2>/dev/null)

    STALE_COUNT=$(echo "$STALE_RESPONSE" | node -e "
      try {
        const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
        process.stdout.write(String(d.stale?.length ?? 0));
      } catch(e) { process.stdout.write('0'); }
    " 2>/dev/null)

    STALE_LIST=$(echo "$STALE_RESPONSE" | node -e "
      try {
        const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
        const lines=(d.stale||[]).map(s=>\`\${s.seedbank} (\${s.hoursAgo}h)\`).join(', ');
        process.stdout.write(lines || '—');
      } catch(e) { process.stdout.write('—'); }
    " 2>/dev/null)

    if [ "${STALE_COUNT:-0}" -gt 0 ] 2>/dev/null; then
        send_telegram "🕐 <b>SF-1 Preis-Alarm: Veraltete Daten</b>

${STALE_COUNT} Seedbank(en) haben seit >24h keine neuen Preise:
<code>${STALE_LIST}</code>

Scraper-Status prüfen: <code>docker logs sf1-price-service --tail 50</code>"
        echo "$LOG_TAG ALARM: ${STALE_COUNT} Seedbanken veraltet — Telegram gesendet"
    else
        echo "$LOG_TAG OK: Alle Preise frisch (0 Seedbanken >24h veraltet)"
    fi
fi
```

- [ ] **Step 2: Script ausführbar machen und testen**

```bash
chmod +x /root/scripts/price-service-alarm.sh
bash /root/scripts/price-service-alarm.sh
```

Erwartet: Zwei OK-Zeilen (eine für Circuit-Breaker, eine für Staleness), z.B.:
```
[2026-05-27T10:00:00Z] OK: 0 Circuits offen (Schwelle: 3)
[2026-05-27T10:00:00Z] OK: Alle Preise frisch (0 Seedbanken >24h veraltet)
```

- [ ] **Step 3: Cron prüfen**

```bash
crontab -l | grep price-service-alarm
```

Erwartet: `*/30 * * * * /root/scripts/price-service-alarm.sh >> /var/log/sf1-price-alarm.log 2>&1`

Falls nicht vorhanden:
```bash
(crontab -l 2>/dev/null; echo "*/30 * * * * /root/scripts/price-service-alarm.sh >> /var/log/sf1-price-alarm.log 2>&1") | crontab -
```

- [ ] **Step 4: Commit im Root-Repo**

```bash
cd /root
git add scripts/price-service-alarm.sh
git commit -m "feat: Stale-Preis-Alarm in price-service-alarm.sh (Audit-Punkt 8)"
```

---

## Task 6 — Abschluss: Dokumentation + Verifikation

- [ ] **Step 1: Gesamttest**

```bash
# Circuit-Breaker + Staleness in einem Lauf
bash /root/scripts/price-service-alarm.sh

# Endpoint nochmal direkt testen
JWT=$(node -e "
  const jwt=require('/root/SF-1-Ultimate-/apps/auth-service/node_modules/jsonwebtoken');
  const s=require('fs').readFileSync('/root/SF-1-Ultimate-/.env','utf8').match(/JWT_SECRET=(.+)/)?.[1]?.trim();
  console.log(jwt.sign({userId:'monitoring',role:'ADMIN'},s,{expiresIn:'5m'}));
" 2>/dev/null)
curl -s -H "Authorization: Bearer $JWT" "http://172.17.0.28:3002/api/prices/admin/staleness" | \
  python3 -m json.tool 2>/dev/null | head -20
```

Erwartet: Valides JSON mit `stale`, `ok`, `threshold`, `checkedAt`.

- [ ] **Step 2: Container-Status**

```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "sf1-price|sf1-notification"
```

Erwartet: beide `(healthy)`.

- [ ] **Step 3: DOKUMENTATION.md updaten**

In `/root/SF-1-Ultimate-/DOKUMENTATION.md` den `[geplant]`-Eintrag auf `[abgeschlossen]` setzen und Commits eintragen.

- [ ] **Step 4: Vault-Kopie**

```bash
cp /root/SF-1-Ultimate-/DOKUMENTATION.md "/root/SF-Brain/SF-1 Projekt/DOKUMENTATION.md"
```

- [ ] **Step 5: Vault-Log in sf1-v1.md ergänzen**

In `/root/SF-Brain/Logs/sf1-v1.md` Eintrag anhängen:

```markdown
### [2026-05-27] Stale-Preis-Alarm (Audit-Punkt 8)
**Typ:** ops / monitoring
**Commits:** [werden nach Fertigstellung eingetragen]
**Zusammenfassung:**
Admin-Alarm via price-service-alarm.sh (Staleness-Check 24h, Telegram). User-Alarm via checkStaleAlerts() in alert.service.ts (36h Schwelle, In-App-Notification). Neuer Endpoint GET /api/prices/admin/staleness. Notification-Queue-Worker verarbeitet reason=stale.
**Fallstricke:** Price-Service läuft auf Port 3002 (nicht 3003). JWT-Generierung für Shell-Script via node -e.
**Next:** —
```

- [ ] **Step 6: LIVE-PROGRESS aktualisieren**

In `/root/SF-1-Ultimate-/LIVE-PROGRESS.md`:
- `Status` → `✅ clean`
- `NEXT ACTION` → `(kein aktiver Task)`
- `Aktueller Task` → `—`
- Unter `Diese Session erledigt` Eintrag ergänzen

---

## Akzeptanzkriterien (aus Spec)

- [ ] `GET /api/prices/admin/staleness` antwortet mit korrekter Stale-Liste
- [ ] `price-service-alarm.sh` sendet Telegram wenn ≥1 Seedbank stale ist
- [ ] User-Alert triggert Notification wenn Seed-Preise >36h fehlen
- [ ] Queue-Worker verarbeitet `reason: 'stale'` korrekt
- [ ] Kein Spam: 24h Cooldown greift für Stale-Alerts
