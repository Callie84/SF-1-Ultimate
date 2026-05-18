#!/bin/bash
set -euo pipefail

LOG_FILE="/var/log/swap-watchdog.log"
THRESHOLD=80

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
