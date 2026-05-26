#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# SF-1 — Service Discovery & Test-Config Sync
#
# Erkennt alle laufenden sf1-* Container automatisch und schreibt
# docker/active-services.conf — wird von health-check.sh + health-check.mjs
# beim nächsten Lauf gelesen.
#
# Wann aufrufen:
#   - Nach jedem Deployment (rolling-update.sh ruft es automatisch auf)
#   - Manuell nach docker-compose up/down: bash scripts/sync-services.sh
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONF_FILE="${PROJECT_DIR}/docker/active-services.conf"

# ── Port-Map: container → port:label:type ──────────────────────────────────
# type: svc = hat /health HTTP-Endpoint | ctn = nur Docker-Status-Check
declare -A PORT_MAP=(
  # Application Services (haben /health Endpoint)
  [sf1-auth-service]="3001:Auth:svc"
  [sf1-price-service]="3002:Price:svc"
  [sf1-journal-service]="3003:Journal:svc"
  [sf1-tools-service]="3004:Tools:svc"
  [sf1-community-service]="3005:Community:svc"
  [sf1-notification-service]="3006:Notification:svc"
  [sf1-search-service]="3007:Search:svc"
  [sf1-media-service]="3008:Media:svc"
  [sf1-gamification-service]="3009:Gamification:svc"
  # Infrastructure Services (Docker-Status-Check)
  [sf1-mongodb]="27017:MongoDB:ctn"
  [sf1-postgres]="5432:PostgreSQL:ctn"
  [sf1-redis]="6379:Redis:ctn"
  [sf1-meilisearch]="7700:Meilisearch:ctn"
  [sf1-api-gateway]="80:Traefik:ctn"
  [sf1-frontend]="3000:Frontend:ctn"
  [sf1-grafana]="3000:Grafana:ctn"
  [sf1-prometheus]="9090:Prometheus:ctn"
  [sf1-alertmanager]="9093:Alertmanager:ctn"
  [sf1-loki]="3100:Loki:ctn"
  [sf1-promtail]="9080:Promtail:ctn"
  [sf1-node-exporter]="9100:Node-Exporter:ctn"
  [sf1-cadvisor]="8080:cAdvisor:ctn"
  [sf1-unleash]="4242:Unleash:ctn"
  [sf1-plausible]="8000:Plausible:ctn"
  [sf1-plausible-db]="5432:Plausible-DB:ctn"
  [sf1-plausible-clickhouse]="8123:Plausible-CH:ctn"
  [sf1-n8n]="5678:n8n:ctn"
  [sf1-backup]="3011:Backup:ctn"
  [sf1-unleash-db]="5432:Unleash-DB:ctn"
  # V2 Infrastructure (Docker-Status-Check)
  [sf1-v2-mongo]="27017:V2-MongoDB:ctn"
  [sf1-v2-postgres]="5432:V2-PostgreSQL:ctn"
  [sf1-v2-redis]="6379:V2-Redis:ctn"
  [sf1-v2-traefik]="80:V2-Traefik:ctn"
  [sf1-v2-grafana]="3000:V2-Grafana:ctn"
  [sf1-v2-prometheus]="9090:V2-Prometheus:ctn"
  [sf1-v2-alertmanager]="9093:V2-Alertmanager:ctn"
  [sf1-v2-loki]="3100:V2-Loki:ctn"
  [sf1-v2-promtail]="9080:V2-Promtail:ctn"
  [sf1-v2-cadvisor]="8080:V2-cAdvisor:ctn"
  [sf1-v2-node-exporter]="9100:V2-Node-Exporter:ctn"
  [sf1-v2-redis-exporter]="9121:V2-Redis-Exporter:ctn"
  [sf1-v2-postgres-exporter]="9187:V2-PG-Exporter:ctn"
)

# ── Alle laufenden sf1-* Container ermitteln ──────────────────────────────
mapfile -t RUNNING < <(docker ps --format '{{.Names}}' | grep '^sf1-' | sort)

ADDED=0
UNKNOWN=0
UNKNOWN_LIST=()

{
  echo "# Auto-generiert von sync-services.sh — $(date '+%Y-%m-%d %H:%M:%S')"
  echo "# Format: container_name:port:label:type"
  echo "# type: svc=hat /health Endpoint | ctn=nur Running-Check"
  echo "# Datei wird nach jedem Deployment automatisch aktualisiert."
  echo ""

  for container in "${RUNNING[@]}"; do
    if [[ -n "${PORT_MAP[$container]:-}" ]]; then
      echo "${container}:${PORT_MAP[$container]}"
      ADDED=$((ADDED+1))
    else
      echo "# UNBEKANNT: ${container} — bitte PORT_MAP in sync-services.sh ergänzen"
      UNKNOWN=$((UNKNOWN+1))
      UNKNOWN_LIST+=("$container")
    fi
  done
} > "$CONF_FILE"

echo "✅ active-services.conf aktualisiert: ${ADDED} Services"
if [ "$UNKNOWN" -gt 0 ]; then
  echo "⚠️  ${UNKNOWN} unbekannte Container (kein Port-Mapping):"
  for c in "${UNKNOWN_LIST[@]}"; do echo "   - $c"; done
  echo "   → PORT_MAP in scripts/sync-services.sh ergänzen"
fi
echo "   Pfad: ${CONF_FILE}"
