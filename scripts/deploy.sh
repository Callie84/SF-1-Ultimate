#!/usr/bin/env bash
# =============================================================================
#  SF-1 Deploy-Skript  –  Docker Compose, single host, sicher & rollbar
#  Ziel-Pfad im Repo / auf dem Server:  scripts/deploy.sh
#  Aufruf:  ./scripts/deploy.sh <staging|production> <git-ref>
#
#  Passt zur echten SF-1-Struktur:
#   - laufender Stack = docker-compose.yml  (Projektname: sf-1-ultimate-)
#   - App-Services werden aus Quellcode GEBAUT (build:) -> echtes Rebuild noetig
#   - Infra (postgres/mongodb/redis/meilisearch/traefik/monitoring) bleibt unberuehrt
#
#  Sicherheit:
#   - Verweigert Deploy bei GETRACKTEN, nicht committeten Aenderungen
#   - Build-Fehler beruehren den laufenden Stack NICHT (alter Stand bleibt online)
#   - Health-Check nach Deploy; bei Fehlschlag Auto-Rollback auf letzten guten ref
# =============================================================================
set -Eeuo pipefail

# ---------- Argumente --------------------------------------------------------
ENVIRONMENT="${1:?Aufruf: deploy.sh <staging|production> <git-ref>}"
GIT_REF="${2:?Aufruf: deploy.sh <staging|production> <git-ref>}"

# ---------- Pfade / State ----------------------------------------------------
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
STATE_DIR="${SF1_STATE_DIR:-$HOME/.sf1-deploy}"
mkdir -p "$STATE_DIR"
STATE_FILE="$STATE_DIR/last-good-${ENVIRONMENT}.ref"

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m  OK  %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m  HINWEIS  %s\033[0m\n' "$*"; }
err()  { printf '\033[1;31m  FEHLER  %s\033[0m\n' "$*" >&2; }
die()  { err "$*"; exit 1; }
trap 'err "Abbruch in Zeile $LINENO."' ERR

# ---------- Docker-Compose-Befehl erkennen (v2 bevorzugt, v1 als Fallback) ----
if docker compose version >/dev/null 2>&1; then
  DC_BIN=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC_BIN=(docker-compose)
else
  die "Weder 'docker compose' noch 'docker-compose' gefunden."
fi

# ---------- Compose-Datei + Projekt je Umgebung ------------------------------
detect_compose_file() { for f in "$@"; do [ -f "$f" ] && { echo "$f"; return 0; }; done; return 1; }

if [ "$ENVIRONMENT" = "production" ]; then
  COMPOSE_FILE="$(detect_compose_file docker-compose.yml docker-compose.yaml compose.yml compose.yaml)" \
    || die "Keine Compose-Datei in $ROOT_DIR gefunden."
  ENV_FILE=".env"
  # leer = nur Container-Status pruefen; optional echte Traefik-Route eintragen,
  # z.B. HEALTH_URL=https://seedfinderpro.de/api/auth/health
  HEALTH_URL="${HEALTH_URL:-}"
  # KEIN Projektname setzen -> Compose nutzt den laufenden Stack 'sf-1-ultimate-'
  PROJECT_ARGS=()
elif [ "$ENVIRONMENT" = "staging" ]; then
  COMPOSE_FILE="$(detect_compose_file docker-compose.staging.yml docker-compose.yml docker-compose.yaml)" \
    || die "Keine Compose-Datei in $ROOT_DIR gefunden."
  ENV_FILE=".env.staging"
  HEALTH_URL="${HEALTH_URL:-}"
  PROJECT_ARGS=(-p sf1-staging)
else
  die "Unbekannte Umgebung '$ENVIRONMENT' (erlaubt: staging|production)."
fi

[ -f "$ENV_FILE" ] || die "Env-Datei '$ENV_FILE' fehlt im Projektverzeichnis."

dc() { "${DC_BIN[@]}" "${PROJECT_ARGS[@]}" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

log "Umgebung: $ENVIRONMENT | Compose: $COMPOSE_FILE | Env: $ENV_FILE | Ref: $GIT_REF | DC: ${DC_BIN[*]}"

# ---------- 1) Sauberkeit pruefen (schuetzt GETRACKTE Aenderungen) -----------
log "Pruefe Working-Tree auf getrackte, nicht committete Aenderungen"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  err "Es gibt getrackte, nicht committete Aenderungen. Deploy abgebrochen (Schutz vor Datenverlust)."
  echo "  -> Sichern:  git diff > ~/sf1-server-diff-\$(date +%F).patch"
  echo "  -> Danach:   gezielt committen / git stash / verwerfen"
  git status --short --untracked-files=no
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  warn "untracked Dateien vorhanden (werden nicht deployt, blockieren aber nicht):"
  git status --short | grep '^??' || true
fi
ok "Keine getrackten offenen Aenderungen"

# ---------- 2) Ziel-Ref auschecken (ohne --force) ----------------------------
log "Checkout $GIT_REF"
git checkout "$GIT_REF"
DEPLOYED_REF="$(git rev-parse HEAD)"
PREV_REF="$( [ -f "$STATE_FILE" ] && cat "$STATE_FILE" || true )"
ok "Jetzt auf $DEPLOYED_REF (vorher gut: ${PREV_REF:-<keiner>})"

# ---------- 3) App-Services ermitteln (alles mit build:-Sektion) -------------
log "App-Services aus Compose ermitteln (mit build:-Sektion)"
APP_SERVICES=()
if command -v jq >/dev/null 2>&1 && dc config --format json >/dev/null 2>&1; then
  mapfile -t APP_SERVICES < <(dc config --format json \
    | jq -r '.services | to_entries[] | select(.value.build != null) | .key')
else
  INFRA_RE='^(mongo|mongodb|postgres|postgresql|redis|meilisearch|api-gateway|traefik|caddy|prometheus|grafana|.*-exporter|node-exporter|alertmanager|loki|plausible.*|unleash.*)$'
  while IFS= read -r s; do
    [[ "$s" =~ $INFRA_RE ]] || APP_SERVICES+=("$s")
  done < <(dc config --services)
fi
[ "${#APP_SERVICES[@]}" -gt 0 ] || die "Keine App-Services (mit build:) gefunden."
ok "App-Services: ${APP_SERVICES[*]}"

# ---------- Health-Check-Funktion --------------------------------------------
health_ok() {
  local s cid state health
  for s in "${APP_SERVICES[@]}"; do
    cid="$(dc ps -q "$s" 2>/dev/null | head -n1 || true)"
    [ -n "$cid" ] || { err "$s: kein Container"; return 1; }
    state="$(docker inspect --format '{{.State.Status}}' "$cid")"
    health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid")"
    [ "$state" = "running" ] || { err "$s: status=$state"; return 1; }
    if [ "$health" != "none" ] && [ "$health" != "healthy" ]; then
      err "$s: health=$health"; return 1
    fi
    ok "$s (running${health:+/$health})"
  done
  if [ -n "$HEALTH_URL" ]; then
    if ! curl -fsS --max-time 10 "$HEALTH_URL" >/dev/null 2>&1; then
      err "Externer Endpoint $HEALTH_URL nicht erreichbar"; return 1
    fi
    ok "Externer Endpoint $HEALTH_URL"
  fi
  return 0
}

# ---------- 4) Build (Fehler hier = laufender Stack bleibt unberuehrt) --------
log "Images bauen: ${APP_SERVICES[*]}"
dc build "${APP_SERVICES[@]}"
ok "Build erfolgreich"

# ---------- 5) Rolling-Update (Infra/DBs unberuehrt) -------------------------
log "Services neu erstellen (--no-deps, DBs/Infra bleiben online)"
dc up -d --no-deps "${APP_SERVICES[@]}"

# ---------- 6) Health-Check mit Warte-Fenster --------------------------------
log "Health-Check (max ~120s)"
DEPLOY_OK=0
for i in $(seq 1 12); do
  echo "  Versuch $i/12 ..."
  if health_ok; then DEPLOY_OK=1; break; fi
  sleep 10
done

# ---------- 7) Erfolg oder Rollback ------------------------------------------
if [ "$DEPLOY_OK" -eq 1 ]; then
  echo "$DEPLOYED_REF" > "$STATE_FILE"
  log "DEPLOY ERFOLGREICH ($ENVIRONMENT -> $DEPLOYED_REF)"
  exit 0
fi

err "Health-Check fehlgeschlagen – starte Rollback"
[ -n "$PREV_REF" ] || die "Kein bekannter Vorgaenger-Ref. KEIN Auto-Rollback. Manuell pruefen: dc ps; dc logs --tail=200"

log "Rollback auf $PREV_REF"
git checkout "$PREV_REF"
dc build "${APP_SERVICES[@]}"
dc up -d --no-deps "${APP_SERVICES[@]}"

ROLLBACK_OK=0
for i in $(seq 1 12); do
  echo "  Rollback-Health $i/12 ..."
  if health_ok; then ROLLBACK_OK=1; break; fi
  sleep 10
done

if [ "$ROLLBACK_OK" -eq 1 ]; then
  err "Deploy fehlgeschlagen, aber Rollback auf $PREV_REF erfolgreich. Stack wieder stabil."
  exit 1
fi
die "Deploy UND Rollback fehlgeschlagen. SOFORT manuell pruefen: dc ps; dc logs --tail=200"
