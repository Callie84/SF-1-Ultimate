#!/bin/bash
# ============================================================
# SF-1 Ultimate – Umfassender System-Check
#
# Usage:
#   bash scripts/health-check.sh           # Normaler Check
#   bash scripts/health-check.sh --debug   # Mit ausführlichem Output
#   bash scripts/health-check.sh --section sec   # Nur eine Sektion
#
# Sektionen: sys | ctn | svc | cors | sec | mon | bak | stg
# ============================================================
# Kein set -e: Diagnose-Script muss auch bei Fehlern weiterlaufen

# ── Farben & Symbole ────────────────────────────────────────
RED='\033[0;31m';  GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m';  BOLD='\033[1m'; NC='\033[0m'
OK="  ${GREEN}✓${NC}"; FAIL="  ${RED}✗${NC}"; WARN="  ${YELLOW}!${NC}"; INFO="  ${CYAN}i${NC}"

# ── Argumente ───────────────────────────────────────────────
DEBUG=false
ONLY_SECTION=""
for arg in "$@"; do
  case $arg in
    --debug)   DEBUG=true ;;
    --section) ONLY_SECTION="${2:-}" ;;
    sys|ctn|svc|cors|sec|mon|bak|stg) ONLY_SECTION="$arg" ;;
  esac
done

# ── Zähler ──────────────────────────────────────────────────
PASS=0; FAIL_COUNT=0; WARN_COUNT=0
ISSUES=()

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── Hilfsfunktionen ─────────────────────────────────────────
pass()  { echo -e "$OK $1";  PASS=$((PASS+1)); }
fail()  { echo -e "$FAIL $1"; FAIL_COUNT=$((FAIL_COUNT+1)); ISSUES+=("FEHLER: $1"); }
warn()  { echo -e "$WARN $1"; WARN_COUNT=$((WARN_COUNT+1)); ISSUES+=("WARNUNG: $1"); }
info()  { echo -e "$INFO $1"; }
debug() { $DEBUG && echo -e "    ${CYAN}↳ $1${NC}"; }
header(){ echo ""; echo -e "${BOLD}${BLUE}══ $1 ══${NC}"; }

# Container-intern HTTP-Check via docker exec (wget → curl → node Fallback)
svc_check() {
  local container="$1" port="$2" path="${3:-/health}" expect="${4:-healthy}"
  local result
  # Versuche wget, dann curl, dann node.js
  result=$(docker exec "$container" sh -c \
    "wget -qO- http://localhost:${port}${path} 2>/dev/null \
     || curl -sf http://localhost:${port}${path} 2>/dev/null \
     || node -e \"require('http').get('http://localhost:${port}${path}',(r)=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>process.stdout.write(d))}).on('error',()=>process.stdout.write('UNREACHABLE'))\" 2>/dev/null \
     || echo 'UNREACHABLE'" 2>/dev/null || echo "EXEC_FAILED")
  debug "Response: ${result:0:120}"
  if echo "$result" | grep -q "$expect"; then
    return 0
  else
    return 1
  fi
}

# ── Abschnitt-Check ─────────────────────────────────────────
run_section() { [[ -z "$ONLY_SECTION" || "$ONLY_SECTION" == "$1" ]]; }

# ══════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║        SF-1 Ultimate – System Health Check           ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo -e "  Server: $(hostname)  |  $(date '+%Y-%m-%d %H:%M:%S')"


# ══════════════════════════════════════════════════════════════
# [SYS] System-Ressourcen
# ══════════════════════════════════════════════════════════════
if run_section sys; then
header "SYS  System-Ressourcen"

# RAM
TOTAL_MB=$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)
AVAIL_MB=$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)
USED_PCT=$(( (TOTAL_MB - AVAIL_MB) * 100 / TOTAL_MB ))
if [ "$AVAIL_MB" -gt 512 ]; then
  pass "RAM: ${AVAIL_MB} MB frei / ${TOTAL_MB} MB gesamt (${USED_PCT}% belegt)"
elif [ "$AVAIL_MB" -gt 200 ]; then
  warn "RAM: Nur ${AVAIL_MB} MB frei / ${TOTAL_MB} MB gesamt (${USED_PCT}% belegt)"
else
  fail "RAM: Kritisch – nur ${AVAIL_MB} MB frei!"
fi

# Disk
DISK_AVAIL=$(df -BG / | awk 'NR==2{print $4}' | tr -d 'G')
DISK_USED_PCT=$(df / | awk 'NR==2{print $5}' | tr -d '%')
if [ "$DISK_AVAIL" -gt 10 ]; then
  pass "Disk: ${DISK_AVAIL} GB frei (${DISK_USED_PCT}% belegt)"
elif [ "$DISK_AVAIL" -gt 3 ]; then
  warn "Disk: Nur ${DISK_AVAIL} GB frei (${DISK_USED_PCT}% belegt)"
else
  fail "Disk: Kritisch – nur ${DISK_AVAIL} GB frei!"
fi

# Uptime
UPTIME=$(uptime -p 2>/dev/null || uptime | awk -F'up' '{print $2}' | awk -F',' '{print $1}')
info "Uptime: $UPTIME"

# Swap
SWAP=$(awk '/SwapTotal/{print int($2/1024)}' /proc/meminfo)
if [ "$SWAP" -eq 0 ]; then
  warn "Kein Swap konfiguriert (bei RAM-Engpässen riskant)"
fi
fi # /sys


# ══════════════════════════════════════════════════════════════
# [CTN] Docker Container
# ══════════════════════════════════════════════════════════════
if run_section ctn; then
header "CTN  Docker Container (Production)"

PROD_CONTAINERS=(
  "sf1-mongodb:MongoDB"
  "sf1-postgres:PostgreSQL"
  "sf1-redis:Redis"
  "sf1-meilisearch:Meilisearch"
  "sf1-api-gateway:Traefik"
  "sf1-frontend:Frontend"
  "sf1-auth-service:Auth"
  "sf1-price-service:Price"
  "sf1-journal-service:Journal"
  "sf1-tools-service:Tools"
  "sf1-community-service:Community"
  "sf1-notification-service:Notification"
  "sf1-search-service:Search"
  "sf1-media-service:Media"
  "sf1-gamification-service:Gamification"
  "sf1-ai-service:AI"
  "sf1-prometheus:Prometheus"
  "sf1-grafana:Grafana"
  "sf1-alertmanager:Alertmanager"
  "sf1-node-exporter:Node-Exporter"
)

for entry in "${PROD_CONTAINERS[@]}"; do
  cname="${entry%%:*}"; label="${entry##*:}"
  STATUS=$(docker inspect -f '{{.State.Status}}' "$cname" 2>/dev/null || echo "not_found")
  HEALTH=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cname" 2>/dev/null || echo "")
  case "$STATUS" in
    running)
      if [[ "$HEALTH" == "healthy" || "$HEALTH" == "none" ]]; then
        pass "$label ($cname)"
        debug "Status: running, Health: $HEALTH"
      elif [[ "$HEALTH" == "starting" ]]; then
        warn "$label – Health: starting"
      else
        fail "$label – Health: $HEALTH"
      fi ;;
    not_found) fail "$label – Container nicht gefunden!" ;;
    *)         fail "$label – Status: $STATUS" ;;
  esac
done

# Port 8080 darf NICHT offen sein
if ss -tlnp 2>/dev/null | grep -q ':8080 '; then
  fail "Port 8080 ist exponiert! (sollte geschlossen sein)"
else
  pass "Port 8080 geschlossen (Traefik ohne insecure API)"
fi
fi # /ctn


# ══════════════════════════════════════════════════════════════
# [SVC] Service Health Endpoints
# ══════════════════════════════════════════════════════════════
if run_section svc; then
header "SVC  Service Health Endpoints (intern)"

declare -A SVC_MAP=(
  [sf1-auth-service]="3001"
  [sf1-price-service]="3002"
  [sf1-journal-service]="3003"
  [sf1-tools-service]="3004"
  [sf1-community-service]="3005"
  [sf1-notification-service]="3006"
  [sf1-search-service]="3007"
  [sf1-media-service]="3008"
  [sf1-gamification-service]="3009"
  [sf1-ai-service]="3010"
)

for container in "${!SVC_MAP[@]}"; do
  port="${SVC_MAP[$container]}"
  label="${container#sf1-}"
  if svc_check "$container" "$port" "/health" "healthy"; then
    pass "$label → /health: healthy"
  else
    fail "$label → /health nicht erreichbar (docker exec $container wget localhost:$port/health)"
  fi
done

# Frontend (Next.js antwortet mit HTML)
if svc_check "sf1-frontend" "3000" "/" "html"; then
  pass "frontend → /: antwortet"
else
  # Fallback: Prüfen ob Container überhaupt läuft
  STATUS=$(docker inspect -f '{{.State.Status}}' sf1-frontend 2>/dev/null || echo "unknown")
  if [ "$STATUS" = "running" ]; then
    warn "Frontend läuft, aber noch kein HTML (Build läuft noch?)"
  else
    fail "Frontend nicht erreichbar"
  fi
fi
fi # /svc


# ══════════════════════════════════════════════════════════════
# [CORS] CORS-Whitelist
# ══════════════════════════════════════════════════════════════
if run_section cors; then
header "CORS  CORS-Whitelist (5 Services)"

CORS_SERVICES=(
  "sf1-price-service:3002:price-service"
  "sf1-tools-service:3004:tools-service"
  "sf1-journal-service:3003:journal-service"
  "sf1-media-service:3008:media-service"
  "sf1-gamification-service:3009:gamification-service"
)

for entry in "${CORS_SERVICES[@]}"; do
  container="${entry%%:*}"; rest="${entry#*:}"; port="${rest%%:*}"; label="${rest##*:}"

  # Erlaubte Origin
  ALLOWED=$(docker exec "$container" sh -c \
    "wget -S -O/dev/null --header='Origin: https://seedfinderpro.de' http://localhost:${port}/health 2>&1" \
    2>/dev/null | grep -i "Access-Control-Allow-Origin" | awk '{print $2}' | tr -d '\r')

  # Browser-blockierte Origin
  BLOCKED=$(docker exec "$container" sh -c \
    "wget -S -O/dev/null --header='Origin: https://evil.com' http://localhost:${port}/health 2>&1" \
    2>/dev/null | grep -i "Access-Control-Allow-Origin" | awk '{print $2}' | tr -d '\r')

  if [[ "$ALLOWED" == "https://seedfinderpro.de" ]]; then
    pass "$label – erlaubte Origin korrekt"
    debug "ACAO: $ALLOWED"
    if [[ "$BLOCKED" == "https://seedfinderpro.de" || -z "$BLOCKED" ]]; then
      pass "$label – evil.com: Browser-CORS korrekt (ACAO ≠ Origin → Browser blockt)"
    fi
  else
    fail "$label – CORS falsch konfiguriert (ACAO: '${ALLOWED:-leer}')"
  fi
done
fi # /cors


# ══════════════════════════════════════════════════════════════
# [SEC] Sicherheit: UFW, SSH, Fail2ban
# ══════════════════════════════════════════════════════════════
if run_section sec; then
header "SEC  Sicherheit"

# -- UFW --
echo -e "  ${CYAN}UFW Firewall:${NC}"
UFW_STATUS=$(ufw status 2>/dev/null | head -1)
if echo "$UFW_STATUS" | grep -q "aktiv\|active"; then
  pass "UFW aktiv"
else
  fail "UFW inaktiv! ($UFW_STATUS)"
fi

# DOCKER-USER Chain
if iptables -L DOCKER-USER 2>/dev/null | grep -q "ACCEPT\|DROP"; then
  RULE_COUNT=$(iptables -L DOCKER-USER 2>/dev/null | grep -c "ACCEPT\|DROP" || echo "0")
  pass "DOCKER-USER Chain aktiv ($RULE_COUNT Regeln)"
else
  fail "DOCKER-USER Chain fehlt oder leer! Docker umgeht UFW."
fi

# Port 8080 von außen
if iptables -L DOCKER-USER 2>/dev/null | grep -qE "dpt:8080.*DROP"; then
  pass "Port 8080 extern geblockt"
else
  # Alternativ: DOCKER-USER hat generelle DROP am Ende
  if iptables -L DOCKER-USER 2>/dev/null | tail -5 | grep -q "DROP"; then
    pass "DOCKER-USER: externes Traffic geblockt (DROP am Ende)"
  else
    warn "DOCKER-USER: Kein explizites DROP gefunden"
  fi
fi

# -- SSH Hardening --
echo -e "  ${CYAN}SSH Hardening:${NC}"
if [ -f /etc/ssh/sshd_config.d/99-sf1-hardening.conf ]; then
  pass "Drop-in Konfig vorhanden (/etc/ssh/sshd_config.d/99-sf1-hardening.conf)"
else
  fail "SSH Hardening Drop-in fehlt!"
fi

# sshd Konfiguration testen
if sshd -t 2>/dev/null; then
  pass "sshd Konfiguration valide (sshd -t)"
else
  fail "sshd Konfiguration ungültig! Prüfe: sshd -t"
fi

# PermitRootLogin
ROOT_LOGIN=$(sshd -T 2>/dev/null | grep "^permitrootlogin" | awk '{print $2}' || echo "unknown")
case "$ROOT_LOGIN" in
  prohibit-password|without-password) pass "PermitRootLogin: ${ROOT_LOGIN} (nur Key-Auth)" ;;
  no)                                 pass "PermitRootLogin: no (vollständig deaktiviert)" ;;
  yes)                                fail "PermitRootLogin: yes! (Root-Login mit Passwort erlaubt)" ;;
  *)                 warn "PermitRootLogin: $ROOT_LOGIN" ;;
esac

# PasswordAuthentication
PW_AUTH=$(sshd -T 2>/dev/null | grep "^passwordauthentication" | awk '{print $2}' || echo "unknown")
case "$PW_AUTH" in
  no)  pass "PasswordAuthentication: no" ;;
  yes) fail "PasswordAuthentication: yes! (Passwort-Login erlaubt)" ;;
  *)   warn "PasswordAuthentication: $PW_AUTH" ;;
esac

# -- Fail2ban --
echo -e "  ${CYAN}Fail2ban:${NC}"
if systemctl is-active fail2ban &>/dev/null; then
  pass "Fail2ban: aktiv"
  BANNED=$(fail2ban-client status sshd 2>/dev/null | grep "Currently banned" | awk '{print $NF}' || echo "?")
  FAILED=$(fail2ban-client status sshd 2>/dev/null | grep "Currently failed" | awk '{print $NF}' || echo "?")
  info "  SSH: currently banned=$BANNED, failed=$FAILED"
  # Incremental banning prüfen
  if [ -f /etc/fail2ban/jail.d/sshd-local.conf ]; then
    if grep -q "bantime.increment" /etc/fail2ban/jail.d/sshd-local.conf; then
      pass "Incremental Banning konfiguriert"
    else
      warn "Incremental Banning nicht konfiguriert"
    fi
  fi
else
  fail "Fail2ban: nicht aktiv! (systemctl start fail2ban)"
fi

# -- Traefik BasicAuth --
echo -e "  ${CYAN}Traefik Dashboard:${NC}"
if grep -q "TRAEFIK_DASHBOARD_USERS" "$PROJECT_DIR/.env" 2>/dev/null; then
  HASH=$(grep "TRAEFIK_DASHBOARD_USERS" "$PROJECT_DIR/.env" | cut -d= -f2)
  if [[ "$HASH" == *"apr1"* || "$HASH" == *"\$2"* ]]; then
    pass "BasicAuth konfiguriert (Hash vorhanden)"
  else
    fail "TRAEFIK_DASHBOARD_USERS ist kein gültiger Hash!"
  fi
else
  fail "TRAEFIK_DASHBOARD_USERS nicht in .env!"
fi
fi # /sec


# ══════════════════════════════════════════════════════════════
# [MON] Monitoring Stack
# ══════════════════════════════════════════════════════════════
if run_section mon; then
header "MON  Monitoring Stack"

# Prometheus
if svc_check "sf1-prometheus" "9090" "/-/healthy" "Prometheus"; then
  pass "Prometheus: healthy"
else
  # Fallback: check if container is just running
  if docker inspect -f '{{.State.Status}}' sf1-prometheus 2>/dev/null | grep -q running; then
    warn "Prometheus läuft aber /-/healthy antwortet nicht (noch initialisierend?)"
  else
    fail "Prometheus nicht gestartet!"
  fi
fi

# Prometheus Config
if [ -f "$PROJECT_DIR/monitoring/prometheus/prometheus.yml" ]; then
  TARGET_COUNT=$(grep -c "targets:" "$PROJECT_DIR/monitoring/prometheus/prometheus.yml" 2>/dev/null || echo "0")
  pass "prometheus.yml vorhanden ($TARGET_COUNT Job-Gruppen)"
else
  fail "prometheus.yml fehlt!"
fi

# Alertmanager
if docker inspect -f '{{.State.Status}}' sf1-alertmanager 2>/dev/null | grep -q running; then
  # Telegram-Credentials prüfen
  BOT_TOKEN=$(grep "TELEGRAM_BOT_TOKEN" "$PROJECT_DIR/.env" 2>/dev/null | cut -d= -f2 || echo "")
  if [[ "$BOT_TOKEN" == "TODO"* || -z "$BOT_TOKEN" ]]; then
    warn "Alertmanager läuft, aber TELEGRAM_BOT_TOKEN nicht gesetzt (Alerts werden nicht zugestellt)"
  else
    pass "Alertmanager: läuft + Telegram-Credentials vorhanden"
  fi
else
  fail "Alertmanager nicht gestartet!"
fi

# Grafana
if svc_check "sf1-grafana" "3000" "/api/health" "ok"; then
  pass "Grafana: healthy"
  GRAFANA_PW=$(grep "GRAFANA_ADMIN_PASSWORD" "$PROJECT_DIR/.env" 2>/dev/null | cut -d= -f2 || echo "")
  if [ -n "$GRAFANA_PW" ]; then
    info "  Grafana Login: admin / $GRAFANA_PW"
  fi
else
  fail "Grafana nicht erreichbar (docker exec sf1-grafana wget localhost:3000/api/health)"
fi

# Node-Exporter
if docker inspect -f '{{.State.Status}}' sf1-node-exporter 2>/dev/null | grep -q running; then
  pass "Node-Exporter: läuft (Host-Metriken)"
else
  fail "Node-Exporter nicht gestartet!"
fi

# Dashboard-JSON
if [ -f "$PROJECT_DIR/monitoring/grafana/provisioning/dashboards/sf1-services.json" ]; then
  pass "Grafana Dashboard-JSON im Provisioning-Pfad vorhanden"
else
  warn "Dashboard-JSON fehlt unter monitoring/grafana/provisioning/dashboards/"
fi
fi # /mon


# ══════════════════════════════════════════════════════════════
# [BAK] Backup-Status
# ══════════════════════════════════════════════════════════════
if run_section bak; then
header "BAK  Backup-Status"

BACKUP_DIR="/root/backups/sf1-daily"
BACKUP_SCRIPT="/root/scripts/sf1-backup.sh"

# Script vorhanden und ausführbar
if [ -x "$BACKUP_SCRIPT" ]; then
  pass "Backup-Script vorhanden und ausführbar"
else
  fail "Backup-Script fehlt oder nicht ausführbar: $BACKUP_SCRIPT"
fi

# Letztes Backup
if [ -d "$BACKUP_DIR" ]; then
  LAST_BACKUP=$(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -1)
  if [ -n "$LAST_BACKUP" ]; then
    BACKUP_AGE_H=$(( ($(date +%s) - $(stat -c %Y "$LAST_BACKUP")) / 3600 ))
    BACKUP_SIZE=$(du -sh "$LAST_BACKUP" | cut -f1)
    if [ "$BACKUP_AGE_H" -lt 25 ]; then
      pass "Letztes Backup: $(basename "$LAST_BACKUP") (${BACKUP_AGE_H}h alt, ${BACKUP_SIZE})"
    elif [ "$BACKUP_AGE_H" -lt 49 ]; then
      warn "Letztes Backup: ${BACKUP_AGE_H}h alt (Cron läuft täglich?)"
    else
      fail "Letztes Backup ist ${BACKUP_AGE_H}h alt! Cron prüfen: crontab -l"
    fi

    # Integrität: ist die Datei lesbar?
    if tar -tzf "$LAST_BACKUP" &>/dev/null; then
      pass "Backup-Archiv integer (tar -tzf OK)"
    else
      fail "Backup-Archiv DEFEKT! (tar -tzf schlägt fehl)"
    fi
  else
    warn "Keine Backup-Dateien in $BACKUP_DIR (noch nicht gelaufen?)"
    info "  Manuell starten: bash $BACKUP_SCRIPT"
  fi
else
  warn "Backup-Verzeichnis $BACKUP_DIR existiert nicht (noch nie gelaufen)"
fi

# Cron-Eintrag
if crontab -l 2>/dev/null | grep -q "sf1-backup"; then
  CRON_ENTRY=$(crontab -l 2>/dev/null | grep "sf1-backup")
  pass "Cron-Job vorhanden: $CRON_ENTRY"
else
  fail "Kein Cron-Job für sf1-backup! (crontab -e)"
fi

# Offsite (rclone)
if command -v rclone &>/dev/null; then
  if rclone listremotes 2>/dev/null | grep -q "hetzner-backup"; then
    pass "rclone: Remote 'hetzner-backup' konfiguriert"
    # Verbindungstest (kurz)
    if rclone ls hetzner-backup: --max-depth 1 &>/dev/null 2>&1; then
      pass "rclone: Verbindung zu Hetzner OK"
    else
      warn "rclone: 'hetzner-backup' konfiguriert aber Verbindung fehlgeschlagen (Storage Box bestellt?)"
    fi
  else
    warn "rclone: Remote 'hetzner-backup' nicht konfiguriert → kein Offsite-Backup"
    info "  Einrichten: bash /root/scripts/setup-rclone-hetzner.sh"
  fi
else
  fail "rclone nicht installiert!"
fi
fi # /bak


# ══════════════════════════════════════════════════════════════
# [STG] Staging-Bereitschaft
# ══════════════════════════════════════════════════════════════
if run_section stg; then
header "STG  Staging-Umgebung"

# Dateien
STG_FILES=(
  "docker-compose.staging.yml"
  ".env.staging"
  "scripts/staging-up.sh"
  "scripts/staging-down.sh"
  "scripts/promote-to-prod.sh"
)
ALL_OK=true
for f in "${STG_FILES[@]}"; do
  if [ -f "$PROJECT_DIR/$f" ]; then
    pass "$f"
  else
    fail "$f fehlt!"
    ALL_OK=false
  fi
done

# Compose-Syntax
if $ALL_OK; then
  if docker-compose \
      -f "$PROJECT_DIR/docker-compose.staging.yml" \
      --env-file "$PROJECT_DIR/.env.staging" \
      config --quiet 2>/dev/null; then
    pass "docker-compose.staging.yml: Syntax korrekt"
  else
    fail "docker-compose.staging.yml: Syntaxfehler!"
  fi
fi

# Staging läuft gerade?
STG_RUNNING=$(docker ps --filter "name=sf1-.*-stg" -q 2>/dev/null | wc -l)
if [ "$STG_RUNNING" -gt 0 ]; then
  info "Staging läuft gerade ($STG_RUNNING Container aktiv)"
  docker ps --filter "name=sf1-.*-stg" --format "  → {{.Names}} ({{.Status}})" 2>/dev/null
else
  info "Staging gestoppt (on-demand starten: bash scripts/staging-up.sh)"
fi

# DNS-Check für staging.seedfinderpro.de
if command -v dig &>/dev/null; then
  STG_IP=$(dig +short staging.seedfinderpro.de 2>/dev/null | head -1)
  if [ -n "$STG_IP" ]; then
    pass "DNS staging.seedfinderpro.de → $STG_IP"
  else
    warn "DNS staging.seedfinderpro.de → kein Eintrag (A-Record fehlt)"
  fi
fi
fi # /stg


# ══════════════════════════════════════════════════════════════
# [DNS] DNS-Einträge
# ══════════════════════════════════════════════════════════════
if run_section dns || [[ -z "$ONLY_SECTION" ]]; then
header "DNS  DNS-Einträge"
if command -v dig &>/dev/null; then
  SERVER_IP=$(curl -s --max-time 3 https://api.ipify.org 2>/dev/null || ip route get 1 | awk '{print $NF; exit}')
  info "Server-IP: $SERVER_IP"
  for subdomain in "" "www." "traefik." "grafana." "prometheus." "staging."; do
    host="${subdomain}seedfinderpro.de"
    resolved=$(dig +short "$host" 2>/dev/null | head -1)
    if [ -n "$resolved" ]; then
      if [ "$resolved" = "$SERVER_IP" ]; then
        pass "$host → $resolved"
      else
        warn "$host → $resolved (erwartet: $SERVER_IP)"
      fi
    else
      warn "$host → kein A-Record"
    fi
  done
else
  info "dig nicht verfügbar, DNS-Check übersprungen"
  info "  Installieren: apt-get install dnsutils"
fi
fi # /dns


# ══════════════════════════════════════════════════════════════
# [CFG] Konfiguration / Secrets
# ══════════════════════════════════════════════════════════════
if run_section cfg || [[ -z "$ONLY_SECTION" ]]; then
header "CFG  Konfiguration & Secrets"

# Auf CHANGE_ME prüfen
CHANGE_ME_KEYS=()
while IFS= read -r line; do
  [[ "$line" =~ ^# || -z "$line" ]] && continue
  KEY="${line%%=*}"; VAL="${line#*=}"
  if [[ "$VAL" == CHANGE_ME* || "$VAL" == TODO* ]]; then
    CHANGE_ME_KEYS+=("$KEY")
  fi
done < "$PROJECT_DIR/.env"

if [ ${#CHANGE_ME_KEYS[@]} -eq 0 ]; then
  pass "Alle Secrets in .env gesetzt (keine CHANGE_ME/TODO-Werte)"
else
  for k in "${CHANGE_ME_KEYS[@]}"; do
    fail "Secret nicht gesetzt: $k (noch Platzhalter-Wert in .env)"
  done
fi
fi # /cfg


# ══════════════════════════════════════════════════════════════
# ZUSAMMENFASSUNG
# ══════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║                   ZUSAMMENFASSUNG                   ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}✓ Bestanden:  $PASS${NC}"
echo -e "  ${YELLOW}! Warnungen:  $WARN_COUNT${NC}"
echo -e "  ${RED}✗ Fehler:     $FAIL_COUNT${NC}"
echo ""

if [ ${#ISSUES[@]} -gt 0 ]; then
  echo -e "  ${BOLD}Offene Punkte:${NC}"
  for issue in "${ISSUES[@]}"; do
    if [[ "$issue" == FEHLER* ]]; then
      echo -e "  ${RED}▸ $issue${NC}"
    else
      echo -e "  ${YELLOW}▸ $issue${NC}"
    fi
  done
  echo ""
fi

if [ "$FAIL_COUNT" -eq 0 ] && [ "$WARN_COUNT" -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}System: ALLES OK ✓${NC}"
elif [ "$FAIL_COUNT" -eq 0 ]; then
  echo -e "  ${YELLOW}${BOLD}System: OK (mit $WARN_COUNT Warnungen)${NC}"
else
  echo -e "  ${RED}${BOLD}System: $FAIL_COUNT FEHLER müssen behoben werden!${NC}"
fi
echo ""
echo -e "  Debug-Modus: ${CYAN}bash scripts/health-check.sh --debug${NC}"
echo -e "  Nur Sektion: ${CYAN}bash scripts/health-check.sh sec${NC}"
echo -e "               ${CYAN}(sys|ctn|svc|cors|sec|mon|bak|stg|dns|cfg)${NC}"
echo ""

exit $FAIL_COUNT
