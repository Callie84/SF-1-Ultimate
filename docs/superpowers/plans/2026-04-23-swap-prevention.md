# Swap-Prävention & Auto-Remediation — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swap-Vollaufen durch Memory-Limits, Prometheus-Alerts und automatischen Watchdog-Restart dauerhaft verhindern.

**Architecture:** Drei unabhängige Schichten — Limits (Prävention), Alerts (Erkennung), Watchdog-Script (Reaktion). Datenbanken werden nie automatisch neugestartet. Benachrichtigungen laufen über das bestehende Telegram-Setup.

**Tech Stack:** Docker Compose 3.8, Prometheus/node_exporter, Bash, cron, Telegram Bot API

---

## Datei-Übersicht

| Aktion | Datei |
|--------|-------|
| Modify | `/root/SF-1-Ultimate-/docker-compose.yml` (Plausible-Stack) |
| Modify | `/root/SF-1-Ultimate-/docker-compose.ki.yml` (Open-WebUI, n8n) |
| Modify | `/root/SF-1-Ultimate-/monitoring/prometheus/alerts/service-alerts.yml` |
| Create | `/root/SF-1-Ultimate-/scripts/swap-watchdog.sh` |
| Create | `/etc/cron.d/swap-watchdog` |

---

## Task 1: Prometheus Swap-Alerts

**Files:**
- Modify: `/root/SF-1-Ultimate-/monitoring/prometheus/alerts/service-alerts.yml`

- [ ] **Step 1: Swap-Alerts ans Ende der RESOURCES-Sektion einfügen**

Datei lesen und nach der `LowDiskSpace`-Rule (Zeile ~112) diese zwei Blöcke einfügen:

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
          summary: "Swap-Nutzung hoch (>70%)"
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
          summary: "Swap-Nutzung kritisch (>85%)"
          description: "Swap ist zu {{ $value | humanizePercentage }} voll — Auto-Restart lief oder fehlgeschlagen"
```

- [ ] **Step 2: Prometheus-Config validieren**

```bash
docker exec sf1-prometheus promtool check config /etc/prometheus/prometheus.yml
```

Erwartete Ausgabe: `SUCCESS: /etc/prometheus/prometheus.yml is valid prometheus config file syntax`

- [ ] **Step 3: Prometheus neu laden (kein Restart nötig)**

```bash
curl -s -X POST http://localhost:9090/-/reload && echo "OK"
```

Erwartete Ausgabe: `OK`

- [ ] **Step 4: Alert-Rules im Prometheus-UI prüfen**

```bash
curl -s http://localhost:9090/api/v1/rules | python3 -c "
import sys, json
data = json.load(sys.stdin)
for g in data['data']['groups']:
    for r in g['rules']:
        if 'Swap' in r.get('name',''):
            print(r['name'], '-', r['state'])
"
```

Erwartete Ausgabe:
```
SwapUsageHigh - inactive
SwapUsageCritical - inactive
```

- [ ] **Step 5: Commit**

```bash
cd /root/SF-1-Ultimate-
git add monitoring/prometheus/alerts/service-alerts.yml
git commit -m "monitoring: add swap usage alert rules (warn >70%, critical >85%)"
```

---

## Task 2: Docker Memory Limits

**Files:**
- Modify: `/root/SF-1-Ultimate-/docker-compose.yml` (Plausible-Stack: Zeilen ~857–888)
- Modify: `/root/SF-1-Ultimate-/docker-compose.ki.yml` (Open-WebUI Zeile ~49, n8n Zeile ~73)

**Hinweis:** `sf1-frontend` wird NICHT limitiert — es hat `NODE_OPTIONS: "--max-old-space-size=2048"` und braucht beim Build-Schritt mehr Speicher.

- [ ] **Step 1: Memory-Limit für sf1-plausible-clickhouse einfügen**

In `/root/SF-1-Ultimate-/docker-compose.yml`, Service `plausible-clickhouse` (ca. Zeile 857), nach dem `ulimits`-Block einfügen:

```yaml
    deploy:
      resources:
        limits:
          memory: 500m
```

Die finale Service-Definition sieht so aus:
```yaml
  plausible-clickhouse:
    image: clickhouse/clickhouse-server:23.3-alpine
    container_name: sf1-plausible-clickhouse
    restart: always
    volumes:
      - plausible_ch_data:/var/lib/clickhouse
    networks:
      - sf1-network
    ulimits:
      nofile:
        soft: 262144
        hard: 262144
    deploy:
      resources:
        limits:
          memory: 500m
```

- [ ] **Step 2: Memory-Limit für sf1-plausible einfügen**

In `/root/SF-1-Ultimate-/docker-compose.yml`, Service `plausible` (ca. Zeile 870), vor `depends_on` einfügen:

```yaml
    deploy:
      resources:
        limits:
          memory: 400m
```

- [ ] **Step 3: Memory-Limit für sf1-plausible-db einfügen**

In `/root/SF-1-Ultimate-/docker-compose.yml`, Service `plausible-db` (ca. Zeile 839), nach dem `healthcheck`-Block einfügen:

```yaml
    deploy:
      resources:
        limits:
          memory: 256m
```

- [ ] **Step 4: Memory-Limits für sf1-open-webui und sf1-n8n einfügen**

In `/root/SF-1-Ultimate-/docker-compose.ki.yml`:

Service `open-webui` (ca. Zeile 49) — nach dem letzten vorhandenen Feld:
```yaml
    deploy:
      resources:
        limits:
          memory: 800m
```

Service `n8n` (ca. Zeile 73) — nach dem letzten vorhandenen Feld:
```yaml
    deploy:
      resources:
        limits:
          memory: 300m
```

- [ ] **Step 5: Limits anwenden (Container neu starten)**

```bash
cd /root/SF-1-Ultimate-
docker compose -f docker-compose.yml up -d plausible-db plausible-clickhouse plausible
docker compose -f docker-compose.ki.yml up -d open-webui n8n
```

Warte 30 Sekunden, dann prüfen:

```bash
docker inspect sf1-plausible --format '{{.HostConfig.Memory}}' && \
docker inspect sf1-plausible-clickhouse --format '{{.HostConfig.Memory}}' && \
docker inspect sf1-open-webui --format '{{.HostConfig.Memory}}' && \
docker inspect sf1-n8n --format '{{.HostConfig.Memory}}'
```

Erwartete Ausgabe (in Bytes):
```
419430400    # 400m
524288000    # 500m
838860800    # 800m
314572800    # 300m
```

Wenn alle 0 zeigen → deploy.resources.limits funktioniert nicht ohne Swarm. Dann Fallback:

```bash
# Fallback: mem_limit direkt im service block (Compose v1 kompatibel)
# → Datei manuell auf mem_limit umstellen, dann nochmal up -d
```

- [ ] **Step 6: Health-Check der neu gestarteten Container**

```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "plausible|open-webui|n8n"
```

Alle müssen `Up` sein (kein `Restarting` oder `Exited`).

- [ ] **Step 7: Commit**

```bash
cd /root/SF-1-Ultimate-
git add docker-compose.yml docker-compose.ki.yml
git commit -m "docker: add memory limits to plausible, open-webui, n8n containers"
```

---

## Task 3: Swap-Watchdog Script

**Files:**
- Create: `/root/SF-1-Ultimate-/scripts/swap-watchdog.sh`

- [ ] **Step 1: Script-Verzeichnis anlegen falls nicht vorhanden**

```bash
mkdir -p /root/SF-1-Ultimate-/scripts
```

- [ ] **Step 2: Script erstellen**

```bash
cat > /root/SF-1-Ultimate-/scripts/swap-watchdog.sh << 'EOF'
#!/bin/bash
set -euo pipefail

LOG_FILE="/var/log/swap-watchdog.log"
THRESHOLD=80

# Telegram-Credentials aus alertmanager.yml übernommen
TELEGRAM_TOKEN="8682775025:AAFzOVljDSOif8ZdQSn1EAGUAUiSpLls8xE"
TELEGRAM_CHAT_ID="8430091807"

# Nur diese Container dürfen automatisch neugestartet werden.
# Datenbanken (postgres, mongo, redis) sind NICHT enthalten.
SAFE_CONTAINERS=(
  "sf1-plausible"
  "sf1-plausible-clickhouse"
  "sf1-plausible-db"
  "sf1-open-webui"
  "sf1-n8n"
)

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

send_telegram() {
  local msg="$1"
  curl -s -X POST \
    "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "parse_mode=HTML" \
    --data-urlencode "text=${msg}" \
    > /dev/null 2>&1
}

get_swap_pct() {
  local total free
  total=$(grep SwapTotal /proc/meminfo | awk '{print $2}')
  free=$(grep SwapFree /proc/meminfo | awk '{print $2}')
  [ "$total" -eq 0 ] && echo 0 && return
  echo $(( (total - free) * 100 / total ))
}

get_swap_label() {
  local total free used
  total=$(grep SwapTotal /proc/meminfo | awk '{print $2}')
  free=$(grep SwapFree /proc/meminfo | awk '{print $2}')
  used=$(( total - free ))
  echo "$((used / 1024)) MiB / $((total / 1024)) MiB"
}

main() {
  local pct_before
  pct_before=$(get_swap_pct)

  if [ "$pct_before" -le "$THRESHOLD" ]; then
    exit 0
  fi

  local swap_before
  swap_before=$(get_swap_label)
  log "Swap bei ${pct_before}% (Schwelle: ${THRESHOLD}%) — starte Auto-Restart"

  local restarted=()
  for container in "${SAFE_CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
      log "Starte neu: $container"
      docker restart "$container" >> "$LOG_FILE" 2>&1
      restarted+=("$container")
      sleep 5
    else
      log "Übersprungen (nicht aktiv): $container"
    fi
  done

  # Warte bis Swap-Pages freigegeben sind
  sleep 30

  local pct_after swap_after
  pct_after=$(get_swap_pct)
  swap_after=$(get_swap_label)

  local containers_str
  containers_str=$(IFS=', '; echo "${restarted[*]:-keine}")

  local msg
  msg="🔄 <b>SF-1 Swap-Watchdog</b>
Zeit: $(date '+%Y-%m-%d %H:%M:%S')
Swap vorher: ${swap_before} (${pct_before}%)
Neugestartet: ${containers_str}
Swap nachher: ${swap_after} (${pct_after}%)"

  send_telegram "$msg"
  log "Erledigt. Swap: ${pct_before}% → ${pct_after}%"
}

main
EOF
```

- [ ] **Step 3: Ausführbar machen**

```bash
chmod +x /root/SF-1-Ultimate-/scripts/swap-watchdog.sh
```

- [ ] **Step 4: Syntax prüfen**

```bash
bash -n /root/SF-1-Ultimate-/scripts/swap-watchdog.sh && echo "Syntax OK"
```

Erwartete Ausgabe: `Syntax OK`

- [ ] **Step 5: Dry-Run — Script manuell ausführen (aktueller Swap ist unter 80%, also kein Eingriff)**

```bash
/root/SF-1-Ultimate-/scripts/swap-watchdog.sh && echo "Kein Eingriff nötig (Swap unter 80%)"
```

Erwarteter Exit: sauber, keine Ausgabe (Swap ist gerade ~70%, Schwelle ist 80%)

- [ ] **Step 6: Commit**

```bash
cd /root/SF-1-Ultimate-
git add scripts/swap-watchdog.sh
git commit -m "ops: add swap-watchdog auto-restart script (threshold 80%)"
```

---

## Task 4: Cron-Job einrichten

**Files:**
- Create: `/etc/cron.d/swap-watchdog`

- [ ] **Step 1: Cron-Datei erstellen**

```bash
cat > /etc/cron.d/swap-watchdog << 'EOF'
# Swap-Watchdog: alle 6 Stunden prüfen und ggf. safe containers neustarten
0 */6 * * * root /root/SF-1-Ultimate-/scripts/swap-watchdog.sh
EOF
```

- [ ] **Step 2: Cron-Datei-Berechtigungen setzen**

```bash
chmod 644 /etc/cron.d/swap-watchdog
```

- [ ] **Step 3: Cron-Syntax validieren**

```bash
crontab -l 2>/dev/null; cat /etc/cron.d/swap-watchdog
```

Erwartete Ausgabe enthält: `0 */6 * * * root /root/SF-1-Ultimate-/scripts/swap-watchdog.sh`

- [ ] **Step 4: End-to-End-Test mit gesenktem Schwellwert**

Temporär Schwellwert auf 0% setzen und Script direkt ausführen — das triggert den Restart:

```bash
THRESHOLD_BAK=$(grep "^THRESHOLD=" /root/SF-1-Ultimate-/scripts/swap-watchdog.sh)
sed -i 's/^THRESHOLD=80/THRESHOLD=0/' /root/SF-1-Ultimate-/scripts/swap-watchdog.sh
/root/SF-1-Ultimate-/scripts/swap-watchdog.sh
```

Prüfen dass Telegram-Nachricht ankam und Container wieder laufen:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "plausible|open-webui|n8n"
tail -20 /var/log/swap-watchdog.log
```

Erwartete Ausgabe in Log:
```
[2026-04-23 ...] Swap bei X% (Schwelle: 0%) — starte Auto-Restart
[2026-04-23 ...] Starte neu: sf1-plausible
...
[2026-04-23 ...] Erledigt. Swap: X% → Y%
```

- [ ] **Step 5: Schwellwert zurücksetzen**

```bash
sed -i 's/^THRESHOLD=0/THRESHOLD=80/' /root/SF-1-Ultimate-/scripts/swap-watchdog.sh
grep "^THRESHOLD=" /root/SF-1-Ultimate-/scripts/swap-watchdog.sh
```

Erwartete Ausgabe: `THRESHOLD=80`

- [ ] **Step 6: Commit**

```bash
cd /root/SF-1-Ultimate-
git add scripts/swap-watchdog.sh
git commit -m "ops: configure swap-watchdog cron (every 6h), test passed"
```

---

## Gesamtstatus prüfen

Nach Abschluss aller Tasks:

```bash
# 1. Prometheus-Rules aktiv
curl -s http://localhost:9090/api/v1/rules | python3 -c "
import sys, json
data = json.load(sys.stdin)
for g in data['data']['groups']:
    for r in g['rules']:
        if 'Swap' in r.get('name',''):
            print('✓', r['name'])
"

# 2. Memory-Limits gesetzt
for c in sf1-plausible sf1-plausible-clickhouse sf1-open-webui sf1-n8n; do
  mem=$(docker inspect $c --format '{{.HostConfig.Memory}}' 2>/dev/null)
  echo "$c: ${mem} Bytes"
done

# 3. Cron aktiv
cat /etc/cron.d/swap-watchdog

# 4. Aktueller Swap-Status
free -h | grep Swap
```
