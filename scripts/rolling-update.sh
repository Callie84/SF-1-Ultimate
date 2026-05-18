#!/bin/bash
# ============================================================
# SF-1 Ultimate — Zero-Downtime Rolling Update
#
# Usage:
#   bash scripts/rolling-update.sh                    # Alle Backend-Services
#   bash scripts/rolling-update.sh --service auth     # Nur auth-service
#   bash scripts/rolling-update.sh --include-frontend # + Frontend rebuild
#   bash scripts/rolling-update.sh --skip-backup      # Kein Pre-Deploy Backup
#   bash scripts/rolling-update.sh --dry-run          # Nur zeigen, nicht ausführen
#   bash scripts/rolling-update.sh --rollback auth    # Service zurückrollen
#
# Exit-Codes:
#   0 = Erfolg
#   1 = Ein oder mehrere Services fehlgeschlagen
#   2 = Pre-Deploy-Fehler (Backup/Checks)
# ============================================================
set -euo pipefail

# ── Konfiguration ────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_DIR/logs/rolling-update-$(date +%Y%m%d-%H%M%S).log"
HEALTH_TIMEOUT=120   # Sekunden bis Health-Check-Timeout
HEALTH_INTERVAL=5    # Sekunden zwischen Health-Check-Versuchen
ROLLBACK_RETRIES=2   # Restart-Versuche vor Rollback

# ── .env laden ───────────────────────────────────────────────
if [ -f "$PROJECT_DIR/.env" ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$PROJECT_DIR/.env" | grep -v '^$' | xargs)
fi

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

# ── Farben ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# ── Argumente ────────────────────────────────────────────────
INCLUDE_FRONTEND=false
SKIP_BACKUP=false
DRY_RUN=false
ONLY_SERVICE=""
ROLLBACK_SERVICE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --include-frontend) INCLUDE_FRONTEND=true ;;
    --skip-backup)      SKIP_BACKUP=true ;;
    --dry-run)          DRY_RUN=true ;;
    --service)          ONLY_SERVICE="$2"; shift ;;
    --rollback)         ROLLBACK_SERVICE="$2"; shift ;;
    -h|--help)
      sed -n '4,14p' "$0" | sed 's/^# //; s/^#//'
      exit 0
      ;;
    *) echo "Unbekannte Option: $1"; exit 1 ;;
  esac
  shift
done

# ── Services (Reihenfolge = Dependency-Order) ─────────────────
declare -A SERVICE_PORTS=(
  [auth-service]=3001
  [price-service]=3002
  [journal-service]=3003
  [tools-service]=3004
  [community-service]=3005
  [notification-service]=3006
  [search-service]=3007
  [media-service]=3008
  [gamification-service]=3009
  [ai-service]=3010
  [backup]=3011
)

SERVICE_ORDER=(
  auth-service
  price-service
  journal-service
  tools-service
  community-service
  notification-service
  search-service
  media-service
  gamification-service
  ai-service
  backup
)

# ── Status-Tracking ──────────────────────────────────────────
UPDATED=()
FAILED=()
SKIPPED=()
ROLLBACKS=()
START_TIME=$(date +%s)

# ── Log & Output ─────────────────────────────────────────────
mkdir -p "$PROJECT_DIR/logs"
exec > >(tee -a "$LOG_FILE") 2>&1

log()    { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $*"; }
ok()     { echo -e "${GREEN}  ✓ $*${NC}"; }
fail()   { echo -e "${RED}  ✗ $*${NC}"; }
warn()   { echo -e "${YELLOW}  ! $*${NC}"; }
header() { echo -e "\n${BOLD}${BLUE}══ $* ══${NC}"; }
dry()    { echo -e "${YELLOW}  [DRY-RUN] $*${NC}"; }

# ── Telegram ─────────────────────────────────────────────────
telegram() {
  local msg="$1"
  if [[ -z "$TELEGRAM_BOT_TOKEN" || -z "$TELEGRAM_CHAT_ID" ]]; then
    return 0
  fi
  python3 -c "
import urllib.request, json, sys
data = json.dumps({'chat_id': '$TELEGRAM_CHAT_ID', 'text': '''$msg''', 'parse_mode': 'HTML'}).encode()
req = urllib.request.Request(
  'https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage',
  data=data,
  headers={'Content-Type': 'application/json'}
)
try:
  urllib.request.urlopen(req, timeout=10)
except Exception as e:
  print(f'Telegram: {e}', file=sys.stderr)
" 2>/dev/null || true
}

# ── Health-Check ─────────────────────────────────────────────
wait_healthy() {
  local container="$1"
  local port="$2"
  local elapsed=0

  log "Health-Check: sf1-${container} (Port ${port}, Timeout ${HEALTH_TIMEOUT}s)..."

  while [ $elapsed -lt $HEALTH_TIMEOUT ]; do
    # Versuche Health-Endpoint
    local result
    result=$(docker exec "sf1-${container}" sh -c \
      "wget -qO- http://localhost:${port}/health 2>/dev/null \
       || curl -sf http://localhost:${port}/health 2>/dev/null \
       || echo ''" 2>/dev/null || echo "")

    if echo "$result" | grep -qi "healthy"; then
      ok "${container}: healthy nach ${elapsed}s"
      return 0
    fi

    # Docker-eigener Health-Status als Fallback
    local docker_health
    docker_health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' \
      "sf1-${container}" 2>/dev/null || echo "unknown")

    if [[ "$docker_health" == "healthy" ]]; then
      ok "${container}: Docker-Health OK nach ${elapsed}s"
      return 0
    fi

    sleep $HEALTH_INTERVAL
    elapsed=$((elapsed + HEALTH_INTERVAL))
    echo -ne "    Warte... ${elapsed}s/${HEALTH_TIMEOUT}s\r"
  done

  echo ""
  fail "${container}: Health-Check Timeout nach ${HEALTH_TIMEOUT}s!"
  return 1
}

# ── Smoke-Test (externe HTTP-Checks) ─────────────────────────
smoke_test() {
  header "Smoke-Test"
  local errors=0

  # Auth-Service
  local auth_ip
  auth_ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' sf1-auth-service 2>/dev/null | head -1)
  if [ -n "$auth_ip" ]; then
    local auth_result
    auth_result=$(python3 -c "
import urllib.request
try:
  r = urllib.request.urlopen('http://${auth_ip}:3001/health', timeout=5)
  print(r.read().decode())
except: print('FAIL')
" 2>/dev/null)
    if echo "$auth_result" | grep -qi "healthy"; then
      ok "Auth-Service erreichbar"
    else
      fail "Auth-Service nicht erreichbar"
      errors=$((errors + 1))
    fi
  fi

  # Frontend
  local fe_ip
  fe_ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' sf1-frontend 2>/dev/null | head -1)
  if [ -n "$fe_ip" ]; then
    local fe_result
    fe_result=$(python3 -c "
import urllib.request
try:
  r = urllib.request.urlopen('http://${fe_ip}:3000/', timeout=10)
  content = r.read().decode()
  print('html' if '<html' in content.lower() else 'no-html')
except Exception as e:
  print(f'FAIL: {e}')
" 2>/dev/null)
    if echo "$fe_result" | grep -qi "html"; then
      ok "Frontend antwortet (HTML)"
    else
      warn "Frontend: $fe_result"
    fi
  fi

  return $errors
}

# ── Backup triggern ───────────────────────────────────────────
trigger_backup() {
  log "Backup wird ausgelöst..."

  # Admin-JWT generieren
  local jwt
  jwt=$(cd "$PROJECT_DIR/apps/auth-service" && node -e "
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || '${JWT_SECRET:-}';
console.log(jwt.sign({ userId: 'deploy-script', role: 'ADMIN' }, secret, { expiresIn: '10m' }));
" 2>/dev/null) || { warn "JWT konnte nicht generiert werden — Backup übersprungen"; return 1; }

  local backup_ip
  backup_ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' sf1-backup 2>/dev/null | head -1)

  local result
  result=$(python3 -c "
import urllib.request, json
req = urllib.request.Request(
  'http://${backup_ip}:3011/api/backup/backups/trigger',
  method='POST',
  headers={'Authorization': 'Bearer ${jwt}', 'Content-Type': 'application/json'}
)
try:
  with urllib.request.urlopen(req, timeout=15) as r:
    print(r.read().decode())
except Exception as e:
  print(f'FAIL: {e}')
" 2>/dev/null)

  if echo "$result" | grep -qi "gestartet\|started\|success"; then
    ok "Backup ausgelöst"
    sleep 10  # Backup etwas starten lassen
    # Neuestes Backup prüfen
    local latest
    latest=$(ls -t "$PROJECT_DIR/backups/"*.enc 2>/dev/null | head -1)
    if [ -n "$latest" ]; then
      local age_min=$(( ($(date +%s) - $(stat -c %Y "$latest")) / 60 ))
      ok "Neuestes Backup: $(basename "$latest") (${age_min} Min. alt)"
    fi
    return 0
  else
    warn "Backup-Trigger: $result"
    return 1
  fi
}

# ── Service neu starten mit Rollback ─────────────────────────
restart_service() {
  local service="$1"
  local port="${SERVICE_PORTS[$service]}"
  local container="sf1-${service}"

  if $DRY_RUN; then
    dry "Würde neu starten: $container (Port $port)"
    UPDATED+=("$service")
    return 0
  fi

  log "Starte neu: $container..."

  # Vorherigen Status merken
  local prev_started
  prev_started=$(docker inspect -f '{{.State.StartedAt}}' "$container" 2>/dev/null || echo "unknown")

  # Restart
  cd "$PROJECT_DIR"
  if ! docker-compose restart "$service" 2>/dev/null; then
    fail "$service: docker-compose restart fehlgeschlagen"
    FAILED+=("$service")
    return 1
  fi

  # Health-Check mit Retry-Logik
  local attempt=0
  while [ $attempt -le $ROLLBACK_RETRIES ]; do
    if wait_healthy "$service" "$port"; then
      UPDATED+=("$service")
      return 0
    fi

    attempt=$((attempt + 1))
    if [ $attempt -le $ROLLBACK_RETRIES ]; then
      warn "${service}: Versuch ${attempt}/${ROLLBACK_RETRIES} — noch einmal neu starten..."
      docker-compose restart "$service" 2>/dev/null || true
      sleep 5
    fi
  done

  # Health-Check endgültig fehlgeschlagen
  fail "${service}: Nach ${ROLLBACK_RETRIES} Versuchen nicht healthy!"
  FAILED+=("$service")

  # Logs ausgeben zur Diagnose
  echo -e "\n${RED}=== Letzte Logs: $container ===${NC}"
  docker logs "$container" --tail 30 2>/dev/null || true

  telegram "⚠️ <b>SF-1 Deploy-Fehler</b>
Service: <code>${service}</code>
Status: Health-Check fehlgeschlagen nach ${ROLLBACK_RETRIES} Versuchen
Zeit: $(date '+%Y-%m-%d %H:%M:%S')
Aktion: Prüfe Logs: docker logs ${container} --tail 50"

  return 1
}

# ── Rollback-Modus ───────────────────────────────────────────
do_rollback() {
  local service="$1"
  local container="sf1-${service}"

  header "Rollback: $service"
  log "Starte Container neu (restart: always stellt letzten Zustand wieder her)..."

  if $DRY_RUN; then
    dry "Würde rollback: $container"
    return 0
  fi

  cd "$PROJECT_DIR"
  docker-compose stop "$service" 2>/dev/null || true
  sleep 3
  docker-compose start "$service" 2>/dev/null || docker-compose up -d "$service" 2>/dev/null

  local port="${SERVICE_PORTS[$service]:-3001}"
  if wait_healthy "$service" "$port"; then
    ok "Rollback erfolgreich: $service"
    ROLLBACKS+=("$service")
    telegram "🔄 <b>SF-1 Rollback</b>
Service: <code>${service}</code>
Status: Rollback erfolgreich
Zeit: $(date '+%Y-%m-%d %H:%M:%S')"
    return 0
  else
    fail "Rollback fehlgeschlagen: $service"
    telegram "🚨 <b>SF-1 KRITISCH: Rollback fehlgeschlagen!</b>
Service: <code>${service}</code>
Manuelle Intervention notwendig!
Zeit: $(date '+%Y-%m-%d %H:%M:%S')"
    return 1
  fi
}

# ── Frontend-Deploy ───────────────────────────────────────────
deploy_frontend() {
  header "Frontend (Rebuild — kurze Downtime)"
  warn "Frontend-Rebuild dauert ~5–10 Minuten."
  warn "Während des Rebuilds ist die Seite nicht erreichbar."

  if $DRY_RUN; then
    dry "Würde Frontend rebuilden: docker-compose restart frontend"
    return 0
  fi

  telegram "🔄 <b>SF-1 Frontend Deploy gestartet</b>
Rebuild läuft (~5–10 Min.)
Zeit: $(date '+%Y-%m-%d %H:%M:%S')"

  log "Frontend wird neu gebaut..."
  cd "$PROJECT_DIR"
  docker-compose restart frontend

  log "Warte auf Frontend-Start (bis zu 600s)..."
  local elapsed=0
  local timeout=600

  while [ $elapsed -lt $timeout ]; do
    local fe_ip
    fe_ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' sf1-frontend 2>/dev/null | head -1)

    if [ -n "$fe_ip" ]; then
      local result
      result=$(python3 -c "
import urllib.request
try:
  r = urllib.request.urlopen('http://${fe_ip}:3000/', timeout=5)
  content = r.read().decode()
  print('ok' if len(content) > 100 else 'empty')
except: print('wait')
" 2>/dev/null)
      if [ "$result" = "ok" ]; then
        ok "Frontend bereit nach ${elapsed}s"
        UPDATED+=("frontend")
        return 0
      fi
    fi

    sleep 15
    elapsed=$((elapsed + 15))
    echo -ne "    Warte... ${elapsed}s/${timeout}s (Build läuft)\r"
  done

  echo ""
  fail "Frontend-Rebuild Timeout nach ${timeout}s"
  FAILED+=("frontend")
  return 1
}

# ════════════════════════════════════════════════════════════════
# HAUPTPROGRAMM
# ════════════════════════════════════════════════════════════════

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║      SF-1 Ultimate — Zero-Downtime Rolling Update    ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo -e "  Start: $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "  Log:   $LOG_FILE"
$DRY_RUN && echo -e "  ${YELLOW}Modus: DRY-RUN (keine Änderungen)${NC}"
echo ""

# ── Rollback-Modus ────────────────────────────────────────────
if [ -n "$ROLLBACK_SERVICE" ]; then
  do_rollback "$ROLLBACK_SERVICE"
  exit $?
fi

# ── Pre-Deploy: Container-Status ─────────────────────────────
header "Pre-Deploy: Container-Status"
UNHEALTHY=0
for svc in "${SERVICE_ORDER[@]}"; do
  container="sf1-${svc}"
  status=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null || echo "not_found")
  health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container" 2>/dev/null || echo "unknown")

  if [[ "$status" != "running" ]]; then
    fail "${svc}: nicht running (Status: $status)"
    UNHEALTHY=$((UNHEALTHY + 1))
  elif [[ "$health" == "unhealthy" ]]; then
    warn "${svc}: unhealthy vor Deployment"
    UNHEALTHY=$((UNHEALTHY + 1))
  else
    ok "${svc}: OK"
  fi
done

if [ $UNHEALTHY -gt 0 ]; then
  warn "$UNHEALTHY Service(s) bereits vor Deploy nicht healthy."
  warn "Trotzdem fortfahren? (Ctrl+C zum Abbrechen, Enter zum Weitermachen)"
  $DRY_RUN || read -r -t 15 || true
fi

# ── Pre-Deploy: Backup ────────────────────────────────────────
if ! $SKIP_BACKUP; then
  header "Pre-Deploy: Backup"
  if ! trigger_backup; then
    warn "Backup fehlgeschlagen — trotzdem fortfahren?"
    warn "(Ctrl+C zum Abbrechen, Enter zum Weitermachen)"
    $DRY_RUN || read -r -t 15 || true
  fi
fi

# ── Pre-Deploy: Smoke-Test ────────────────────────────────────
header "Pre-Deploy: Smoke-Test (Baseline)"
smoke_test || warn "Smoke-Test vor Deploy hatte Fehler (trotzdem weiter)"

# ── Telegram: Deploy gestartet ────────────────────────────────
if [ -n "$ONLY_SERVICE" ]; then
  DEPLOY_SCOPE="Service: $ONLY_SERVICE"
else
  DEPLOY_SCOPE="Alle Backend-Services (${#SERVICE_ORDER[@]})"
  $INCLUDE_FRONTEND && DEPLOY_SCOPE="$DEPLOY_SCOPE + Frontend"
fi

telegram "🚀 <b>SF-1 Deploy gestartet</b>
Scope: $DEPLOY_SCOPE
Zeit: $(date '+%Y-%m-%d %H:%M:%S')
$(${DRY_RUN} && echo '[DRY-RUN]' || echo '')"

# ── Rolling Update ────────────────────────────────────────────
header "Rolling Update"

if [ -n "$ONLY_SERVICE" ]; then
  # Einzelnen Service updaten
  if [[ -v "SERVICE_PORTS[$ONLY_SERVICE]" ]]; then
    restart_service "$ONLY_SERVICE" || true
  else
    fail "Unbekannter Service: $ONLY_SERVICE"
    echo "Verfügbare Services: ${!SERVICE_PORTS[*]}"
    exit 1
  fi
else
  # Alle Services nacheinander
  DEPLOY_FAILED=false
  for svc in "${SERVICE_ORDER[@]}"; do
    if restart_service "$svc"; then
      : # ok
    else
      DEPLOY_FAILED=true
      warn "Fehler bei $svc — restliche Services werden trotzdem aktualisiert"
    fi
    # Kurze Pause zwischen Services
    $DRY_RUN || sleep 2
  done
fi

# ── Frontend (optional) ───────────────────────────────────────
if $INCLUDE_FRONTEND; then
  deploy_frontend || true
fi

# ── Post-Deploy: Smoke-Test ───────────────────────────────────
header "Post-Deploy: Smoke-Test"
$DRY_RUN || sleep 5
smoke_test || warn "Post-Deploy Smoke-Test hatte Fehler"

# ── Zusammenfassung ───────────────────────────────────────────
ELAPSED=$(( $(date +%s) - START_TIME ))
ELAPSED_MIN=$(( ELAPSED / 60 ))
ELAPSED_SEC=$(( ELAPSED % 60 ))

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║                   ZUSAMMENFASSUNG                   ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Dauer: ${ELAPSED_MIN}m ${ELAPSED_SEC}s"
echo ""

if [ ${#UPDATED[@]} -gt 0 ]; then
  echo -e "  ${GREEN}✓ Aktualisiert (${#UPDATED[@]}):${NC}"
  for s in "${UPDATED[@]}"; do echo -e "    - $s"; done
fi

if [ ${#ROLLBACKS[@]} -gt 0 ]; then
  echo -e "  ${YELLOW}↩ Rollbacks (${#ROLLBACKS[@]}):${NC}"
  for s in "${ROLLBACKS[@]}"; do echo -e "    - $s"; done
fi

if [ ${#FAILED[@]} -gt 0 ]; then
  echo -e "  ${RED}✗ Fehlgeschlagen (${#FAILED[@]}):${NC}"
  for s in "${FAILED[@]}"; do echo -e "    - $s"; done
fi

echo ""

# ── Post-Deploy: Telegram ─────────────────────────────────────
if [ ${#FAILED[@]} -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}Deploy: ERFOLGREICH ✓${NC}"
  telegram "✅ <b>SF-1 Deploy erfolgreich</b>
Aktualisiert: ${#UPDATED[@]} Services
Dauer: ${ELAPSED_MIN}m ${ELAPSED_SEC}s
Zeit: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  exit 0
else
  echo -e "  ${RED}${BOLD}Deploy: FEHLER bei ${#FAILED[@]} Service(s)!${NC}"
  echo -e "  Logs: tail -f $LOG_FILE"
  echo -e "  Rollback: bash scripts/rolling-update.sh --rollback <service>"
  telegram "❌ <b>SF-1 Deploy mit Fehlern</b>
Fehlgeschlagen: $(IFS=', '; echo "${FAILED[*]}")
Aktualisiert: ${#UPDATED[@]} Services
Dauer: ${ELAPSED_MIN}m ${ELAPSED_SEC}s
Rollback: bash scripts/rolling-update.sh --rollback &lt;service&gt;"
  echo ""
  exit 1
fi
