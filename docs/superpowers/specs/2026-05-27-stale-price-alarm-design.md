# Stale-Preis-Alarm — Design-Spec

**Datum:** 2026-05-27  
**Status:** approved  
**Kontext:** SF-1 Ultimate Monitoring-Serie (nach Circuit-Breaker-Alarm Audit-Punkt 6 und Backup-Alter-Alarm Audit-Punkt 7)

---

## Ziel

Zwei unabhängige Alarme wenn Preise in MongoDB veralten:

1. **Admin-Alarm (24h):** Telegram-Nachricht wenn eine oder mehr Seedbanken seit >24h keine Preise gescrapt haben.
2. **User-Alarm (36h):** In-App-Notification (und optional Push/E-Mail) wenn für einen beobachteten Seed seit >36h keine gültigen Preise vorhanden sind.

---

## Architektur

```
Admin-Alarm:
  price-service-alarm.sh (Cron alle 30min)
    └─ curl -H "Authorization: Bearer <JWT>" GET /api/prices/admin/staleness
         └─ StalenessService.getStaleSeedbanks(thresholdHours=24)
              └─ Price.aggregate([
                   { $group: { _id: '$seedbank', lastScraped: { $max: '$scrapedAt' } } }
                 ])
              → Liste: [{ seedbank, lastScraped, hoursAgo }] für alle > 24h
         → JSON: { stale: [...], ok: [...] }
    → bei stale.length > 0: send_telegram(...)

User-Alarm:
  alert.service.ts — checkAlerts() (alle 30min)
    └─ checkStaleAlerts() (neu)
         └─ Alle aktiven PriceAlerts
         └─ Price.findOne({ seedId, scrapedAt: { $gt: now - 36h } })
         → kein Ergebnis → triggerAlert(alert, null, 'stale')
              └─ redis.lPush('queue:notifications', {
                   type: 'price_alert', reason: 'stale', userId, ...
                 })

notification-service — queue.worker.ts
  └─ if (msg.type === 'price_alert' && msg.data.reason === 'stale')
       → Nachricht: "Preise für [Seed] sind veraltet — bitte prüfe später"
```

---

## Neue Dateien

| Datei | Typ | Zweck |
|-------|-----|-------|
| `apps/price-service/src/services/staleness.service.ts` | neu | MongoDB-Aggregation, gibt stale Seedbanken zurück |

---

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `apps/price-service/src/index.ts` | Neuer Endpoint `GET /api/prices/admin/staleness` mit `requireAdmin` |
| `apps/price-service/src/services/alert.service.ts` | `checkStaleAlerts()` + Aufruf in `checkAlerts()` |
| `apps/notification-service/src/workers/queue.worker.ts` | Extra Branch für `reason === 'stale'` |
| `/root/scripts/price-service-alarm.sh` | Staleness-Check via curl + JWT-Generierung |

---

## Endpoint-Spec

### `GET /api/prices/admin/staleness`

**Auth:** `requireAdmin` (Bearer JWT mit `role: ADMIN`)

**Query-Parameter:**
- `threshold` (optional, default: 24) — Stunden-Schwelle

**Response:**
```json
{
  "threshold": 24,
  "checkedAt": "2026-05-27T10:00:00Z",
  "stale": [
    { "seedbank": "sensiseeds", "lastScraped": "2026-05-26T01:00:00Z", "hoursAgo": 33 }
  ],
  "ok": [
    { "seedbank": "barneys", "lastScraped": "2026-05-27T02:00:00Z", "hoursAgo": 8 }
  ]
}
```

---

## StalenessService

```typescript
// getStaleSeedbanks(thresholdHours: number): Promise<StaleResult>
// Aggregiert max(scrapedAt) je Seedbank aus der prices-Collection.
// Gibt { stale, ok } zurück sortiert nach hoursAgo DESC.
```

---

## User-Alarm — Verhalten

- Wird nur getriggert wenn `lastNotified` älter als 24h (bestehende Cooldown-Logik).
- Löst **keine** permanente Deaktivierung des Alerts aus — sobald neue Preise vorhanden sind, funktioniert der normale Preis-Check wieder.
- Notification-Nachricht: `"Preise für [Seed] sind seit >36h nicht aktualisiert. Wir informieren dich sobald neue Preise verfügbar sind."`

---

## Admin-Alarm — Shell-Script-Erweiterung

Das bestehende `price-service-alarm.sh` bekommt einen zweiten Block:

```bash
# JWT generieren
JWT=$(node -e "
  const jwt=require('/root/SF-1-Ultimate-/apps/auth-service/node_modules/jsonwebtoken');
  const s=require('fs').readFileSync('/root/SF-1-Ultimate-/.env','utf8')
    .match(/JWT_SECRET=(.+)/)?.[1]?.trim();
  console.log(jwt.sign({userId:'monitoring',role:'ADMIN'},s,{expiresIn:'5m'}));
" 2>/dev/null)

# Staleness-Check
STALE_RESPONSE=$(curl -s -H "Authorization: Bearer $JWT" \
  "http://172.17.0.28:3003/api/prices/admin/staleness?threshold=24")

STALE_COUNT=$(echo "$STALE_RESPONSE" | node -e "
  const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  process.stdout.write(String(d.stale?.length ?? 0));
")

if [ "$STALE_COUNT" -gt 0 ]; then
  # Telegram-Alert senden
fi
```

---

## Nicht im Scope

- Keine Änderung am Notification-Model-Enum (nutzt bestehendes `price_alert`)
- Kein Frontend-Badge für veraltete Preise
- Keine automatische Deaktivierung von Adaptern (bleibt Circuit-Breaker)
- Kein neuer Cron — nutzt bestehenden 30-min-Cron in `index.ts` für User-Alarm

---

## Akzeptanzkriterien

- [ ] `GET /api/prices/admin/staleness` antwortet mit korrekter Stale-Liste
- [ ] `price-service-alarm.sh` sendet Telegram wenn ≥1 Seedbank stale ist
- [ ] User-Alert triggert Notification wenn Seed-Preise >36h fehlen
- [ ] Queue-Worker verarbeitet `reason: 'stale'` korrekt
- [ ] Kein Spam: 24h Cooldown greift für Stale-Alerts
