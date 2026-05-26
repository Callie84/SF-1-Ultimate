# Design: Swap-Prävention & Auto-Remediation

**Datum:** 2026-04-23  
**Status:** Approved  
**Kontext:** Nach 62 Tagen Laufzeit war der Swap zu 99,4% voll (2034/2048 MiB). Größter Verursacher: Plausible (beam.smp, 200 MiB Swap). Keine Swap-spezifischen Alerts vorhanden, keine Memory-Limits auf Containern.

---

## Ziel

Verhindern dass der Swap erneut unkontrolliert volläuft — durch drei Maßnahmen: Limits (verhindert Akkumulation), Alerts (frühzeitige Warnung), Auto-Restart (automatische Abhilfe ohne Datenbankberührung).

---

## Komponente 1: Docker Memory Limits

**Datei:** `/root/SF-1-Ultimate-/docker-compose.yml`

Nur unkritische, stateless Container bekommen ein Limit. Datenbanken (postgres, mongo, redis) bleiben unlimitiert — sie brauchen flexiblen Speicher für Caching.

| Container | Aktueller Verbrauch | Limit |
|-----------|---------------------|-------|
| `sf1-open-webui` | 558 MiB | 800 MiB |
| `sf1-plausible-clickhouse` | 300 MiB | 500 MiB |
| `sf1-frontend` | 250 MiB | 450 MiB |
| `sf1-plausible` | 86 MiB (fresh) | 400 MiB |
| `sf1-n8n` | 88 MiB | 300 MiB |

Puffer: ~50% über aktuellem Verbrauch. Wenn ein Container sein Limit erreicht, kann er nicht weiter in den Swap wachsen. Der Watchdog (Komponente 3) fängt Restfälle ab.

Docker-Compose-Syntax:
```yaml
deploy:
  resources:
    limits:
      memory: 800m
```

---

## Komponente 2: Prometheus Swap-Alerts

**Datei:** `/root/SF-1-Ultimate-/monitoring/prometheus/alerts/service-alerts.yml`

Zwei neue Alert-Regeln im bestehenden `service_alerts`-Block:

```yaml
- alert: SwapUsageHigh
  expr: |
    (node_memory_SwapTotal_bytes - node_memory_SwapFree_bytes)
    / node_memory_SwapTotal_bytes > 0.70
  for: 10m
  labels:
    severity: warning
    category: resources
  annotations:
    summary: "Swap-Nutzung hoch"
    description: "Swap ist zu {{ $value | humanizePercentage }} voll — Watchdog greift bei 80% ein"

- alert: SwapUsageCritical
  expr: |
    (node_memory_SwapTotal_bytes - node_memory_SwapFree_bytes)
    / node_memory_SwapTotal_bytes > 0.85
  for: 5m
  labels:
    severity: critical
    category: resources
  annotations:
    summary: "Swap-Nutzung kritisch"
    description: "Swap ist zu {{ $value | humanizePercentage }} voll — Auto-Restart läuft oder ist fehlgeschlagen"
```

Alert-Flow über bestehendes Telegram-Setup (Alertmanager):
- Warning → Telegram nach 10 min, wiederholt alle 4h
- Critical → Telegram nach 5 min, wiederholt alle 30 min

---

## Komponente 3: Swap-Watchdog Script

**Datei:** `/root/SF-1-Ultimate-/scripts/swap-watchdog.sh`  
**Log:** `/var/log/swap-watchdog.log`  
**Cron:** `/etc/cron.d/swap-watchdog` — alle 6 Stunden

### Logik

1. Lese Swap-Nutzung aus `/proc/meminfo`
2. Wenn Nutzung > 80%:
   a. Messe Swap-Nutzung vor Restart
   b. Starte SAFE_CONTAINERS nacheinander neu (nicht parallel — Regel 10)
   c. Messe Swap-Nutzung nach Restart
   d. Sende Telegram-Nachricht mit: Zeitstempel, Swap vorher/nachher, welche Container neugestartet
   e. Logge in `/var/log/swap-watchdog.log`
3. Wenn Nutzung <= 80%: kein Eingriff, kein Log-Eintrag

### Safe Containers (dürfen neugestartet werden)

```
sf1-plausible
sf1-plausible-clickhouse
sf1-plausible-db
sf1-open-webui
sf1-n8n
```

**Explizit ausgeschlossen (nie angetastet):**
- sf1-postgres, sf1-mongodb, sf1-redis (Datenbanken)
- sf1-v2-postgres, sf1-v2-mongo, sf1-v2-redis (v2 Datenbanken)
- sf1-api-gateway, sf1-auth-service (kritische Kern-Services)

### Telegram-Nachricht Format

```
🔄 Swap-Watchdog: Auto-Restart ausgeführt
Zeit: 2026-04-23 06:00:01
Swap vorher: 1850 MiB / 2048 MiB (90%)
Neugestartet: sf1-plausible, sf1-plausible-clickhouse, sf1-plausible-db
Swap nachher: 1480 MiB / 2048 MiB (72%)
Freigegeben: ~370 MiB
```

---

## Ablauf im Ernstfall

```
Swap steigt langsam über Tage/Wochen
  → 70% erreicht → Telegram Warning (frühe Info)
  → Cron läuft (alle 6h) → 80% überschritten → Auto-Restart → Telegram Bestätigung
  → Swap fällt unter 70% → Alert löst sich auf → Telegram "resolved"
```

---

## Nicht in Scope

- Swap-Größe erhöhen (würde Problem nur verschieben)
- OOM-Killer-Konfiguration (zu invasiv)
- Automatischer Neustart von Datenbanken (Datenverlust-Risiko)
- Monitoring-Dashboard für Swap-Trend (nice-to-have, separates Ticket)
