#!/usr/bin/env bash
# =============================================================================
#  SF-1 Deploy-Skript v2  –  Docker Compose, single host, sicher & rollbar
#  Ziel-Pfad im Repo / auf dem Server:  scripts/deploy.sh
#  Aufruf:  ./scripts/deploy.sh <staging|production> <git-ref>
#
#  NEU in v2 gegenueber v1:
#   - Deckt ALLE App-Services ab, nicht nur die mit build:-Sektion:
#       * Build-Services (build:)       -> echtes Rebuild + Recreate
#       * Bind-Mount-Services (node:20) -> --force-recreate; laden neuen Code
#         aus dem gemounteten Verzeichnis (diese Services haben KEINEN Watch-Modus,
#         wuerden also ohne Recreate mit altem Code weiterlaufen).
#   - Git-diff-basiert: nur Services, deren Quellcode sich zwischen altem und
#     neuem Ref geaendert hat, werden angefasst (spart z.B. den Frontend-Neubau).
#   - Aendert sich die Compose-Datei selbst -> sicherheitshalber ALLE App-Services.
#   - Rollback faellt auf den letzten guten Ref ODER den vorherigen HEAD zurueck.
#   - Erzwingen aller Services optional: SF1_DEPLOY_FORCE_ALL=1
#
#  Sicherheit (wie v1):
#   - Verweigert Deploy bei GETRACKTEN, nicht committeten Aenderungen.
#   - Infra/DBs werden nie neu gebaut/recreatet (bleiben online).
#   - Health-Check nach Deploy; bei Fehlschlag Auto-Rollback.
#   - Baseline (last-good.ref) wird NUR nach erfolgreichem Health-Check gesetzt.
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
FORCE_ALL="${SF1_DEPLOY_FORCE_ALL:-0}"

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m  OK  %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m  HINWEIS  %s\033[0m\n' "$*"; }
err()  { printf '\033[1;31m  FEHLER  %s\033[0m\n' "$*" >&2; }
die()  { err "$*"; exit 1; }
trap 'err "Abbruch in Zeile $LINENO."' ERR

# ---------- Werkzeuge pruefen ------------------------------------------------
if docker compose version >/dev/null 2>&1; then
  DC_BIN=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC_BIN=(docker-compose)
else
  die "Weder 'docker compose' noch 'docker-compose' gefunden."
fi
command -v jq >/dev/null 2>&1 || die "jq wird fuer die Service-Erkennung benoetigt (apt-get install -y jq)."

# ---------- Compose-Datei + Projekt je Umgebung ------------------------------
detect_compose_file() { for f in "$@"; do [ -f "$f" ] && { echo "$f"; return 0; }; done; return 1; }

if [ "$ENVIRONMENT" = "production" ]; then
  COMPOSE_FILE="$(detect_compose_file docker-compose.yml docker-compose.yaml compose.yml compose.yaml)" \
    || die "Keine Compose-Datei in $ROOT_DIR gefunden."
  ENV_FILE=".env"
  # optional: echte Route pruefen, z.B. HEALTH_URL=https://seedfinderpro.de
  HEALTH_URL="${HEALTH_URL:-}"
  # KEIN Projektname -> nutzt den laufenden Stack 'sf-1-ultimate-'
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

# ---------- 1) Sauberkeit pruefen (schuetzt getrackte Aenderungen) -----------
# Bekannte Build-Artefakte, die Next.js/npm bei JEDEM Build automatisch neu
# schreiben (tsconfig.json: jsx/lib/paths-Umformatierung; package-lock.json:
# install-Drift). Ohne Behandlung blockieren sie den Deploy jedes Mal an der
# Dirty-Tree-Pruefung. Sie werden beim naechsten Build ohnehin neu erzeugt ->
# gefahrlos zuruecksetzen. WICHTIG: NUR diese explizit gelisteten Pfade; jede
# ANDERE getrackte Aenderung bleibt weiterhin ein harter Abbruch (Schutz bleibt).
KNOWN_BUILD_ARTIFACTS=(
  "apps/web-app/tsconfig.json"
  "apps/web-app/package-lock.json"
)
for _artifact in "${KNOWN_BUILD_ARTIFACTS[@]}"; do
  if ! git diff --quiet -- "$_artifact" 2>/dev/null; then
    warn "Build-Artefakt zurueckgesetzt (wird beim Build neu erzeugt): $_artifact"
    git checkout --quiet -- "$_artifact" 2>/dev/null || true
  fi
done

log "Pruefe Working-Tree auf getrackte, nicht committete Aenderungen"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  err "Getrackte, nicht committete Aenderungen vorhanden. Deploy abgebrochen (Schutz vor Datenverlust)."
  git status --short --untracked-files=no
  echo "  -> Sichern:  git diff > ~/sf1-server-diff-\$(date +%F).patch"
  echo "  -> Danach:   committen / git stash / verwerfen, dann erneut deployen"
  exit 1
fi
ok "Keine getrackten offenen Aenderungen"

# ---------- 2) Referenzen bestimmen + Ziel auschecken ------------------------
OLD_REF="$(git rev-parse HEAD)"                                   # aktuell laufender Stand
PREV_GOOD="$( [ -f "$STATE_FILE" ] && cat "$STATE_FILE" || true )" # letzter erfolgreicher Deploy
git fetch --tags --quiet origin 2>/dev/null || warn "git fetch fehlgeschlagen (fahre mit lokalem Stand fort)"
log "Checkout $GIT_REF"
git checkout --quiet "$GIT_REF"
NEW_REF="$(git rev-parse HEAD)"
SHORT_PREV="${PREV_GOOD:0:7}"; [ -n "$SHORT_PREV" ] || SHORT_PREV="<keiner>"
ok "Jetzt auf ${NEW_REF:0:7} (vorher ${OLD_REF:0:7}, letzter guter: $SHORT_PREV)"

# ---------- 3) Service-Landkarte aus Compose lesen (Typ + Quellpfad) ---------
log "Service-Landkarte aus Compose lesen"
CONFIG_JSON="$(dc config --format json)" || die "dc config fehlgeschlagen."

# Ausgabe je Zeile:  <service> \t <build|bind> \t <absoluter-oder-rel-Quellpfad>
mapfile -t SERVICE_MAP < <(
  printf '%s' "$CONFIG_JSON" | jq -r '
    .services | to_entries[]
    | .key as $name | .value as $svc
    | if ($svc.build != null) then
        [$name, "build", (($svc.build.context // $svc.build) | tostring)]
      elif ($svc.image == "node:20-alpine") then
        [$name, "bind", (($svc.volumes // []) | map(select(.target=="/app")) | (.[0].source // ""))]
      else empty end
    | select(.[2] != "") | @tsv
  '
)
[ "${#SERVICE_MAP[@]}" -gt 0 ] || die "Keine App-Services in Compose erkannt."

APP_SERVICES=()
declare -A SVC_KIND SVC_SRC
for line in "${SERVICE_MAP[@]}"; do
  IFS=$'\t' read -r s kind src <<<"$line"
  src="${src#"$ROOT_DIR"/}"   # absoluten Repo-Prefix entfernen
  src="${src#./}"             # evtl. fuehrendes ./ entfernen
  APP_SERVICES+=("$s"); SVC_KIND["$s"]="$kind"; SVC_SRC["$s"]="$src"
done
ok "App-Services (${#APP_SERVICES[@]}): ${APP_SERVICES[*]}"

# ---------- 4) Geaenderte Services per git-diff bestimmen --------------------
CHANGED=()
if [ "$FORCE_ALL" = "1" ]; then
  log "SF1_DEPLOY_FORCE_ALL=1 -> alle App-Services werden neu ausgerollt"
  CHANGED=("${APP_SERVICES[@]}")
elif [ "$OLD_REF" = "$NEW_REF" ]; then
  log "Kein Ref-Wechsel (gleicher Commit) -> keine Code-Aenderung, nur Health-Check + Baseline"
else
  log "Aenderungen zwischen ${OLD_REF:0:7} und ${NEW_REF:0:7} ermitteln"
  mapfile -t CHANGED_FILES < <(git diff --name-only "$OLD_REF" "$NEW_REF")
  ok "$(printf '%s\n' "${CHANGED_FILES[@]}" | grep -c . || true) geaenderte Datei(en)"

  if printf '%s\n' "${CHANGED_FILES[@]}" | grep -qE '^(docker-compose\.ya?ml|compose\.ya?ml)$'; then
    warn "Compose-Datei geaendert -> alle App-Services werden neu ausgerollt (sicher)"
    CHANGED=("${APP_SERVICES[@]}")
  else
    for s in "${APP_SERVICES[@]}"; do
      if printf '%s\n' "${CHANGED_FILES[@]}" | grep -q "^${SVC_SRC[$s]}/"; then
        CHANGED+=("$s")
      fi
    done
  fi
fi

if [ "${#CHANGED[@]}" -gt 0 ]; then
  ok "Neu auszurollen: ${CHANGED[*]}"
else
  ok "Kein App-Service betroffen (nur Nicht-App-Dateien geaendert)"
fi

# ---------- Listen aufteilen: Build vs. Recreate -----------------------------
BUILD_LIST=(); RECREATE_LIST=()
if [ "${#CHANGED[@]}" -gt 0 ]; then
  for s in "${CHANGED[@]}"; do
    [ "${SVC_KIND[$s]}" = "build" ] && BUILD_LIST+=("$s")
    RECREATE_LIST+=("$s")
  done
fi

# ---------- Health-Check-Funktion (alle App-Services) ------------------------
health_ok() {
  local s cid state health
  for s in "${APP_SERVICES[@]}"; do
    cid="$(dc ps -q "$s" 2>/dev/null | head -n1 || true)"
    [ -n "$cid" ] || { err "$s: kein Container"; return 1; }
    state="$(docker inspect --format '{{.State.Status}}' "$cid" 2>/dev/null || echo unknown)"
    health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null || echo none)"
    [ "$state" = "running" ] || { err "$s: status=$state"; return 1; }
    if [ "$health" != "none" ] && [ "$health" != "healthy" ]; then
      err "$s: health=$health"; return 1
    fi
  done
  if [ -n "$HEALTH_URL" ]; then
    curl -fsS --max-time 10 "$HEALTH_URL" >/dev/null 2>&1 || { err "Endpoint $HEALTH_URL nicht erreichbar"; return 1; }
  fi
  return 0
}

# ---------- 5) Build (nur geaenderte Build-Services) -------------------------
if [ "${#BUILD_LIST[@]}" -gt 0 ]; then
  log "Images bauen (Build-Services): ${BUILD_LIST[*]}"
  dc build "${BUILD_LIST[@]}"
  ok "Build erfolgreich"
else
  log "Keine Build-Services betroffen -> kein Image-Build noetig"
fi

# ---------- 6) Recreate (Build- + Bind-Services laden neuen Code) ------------
if [ "${#RECREATE_LIST[@]}" -gt 0 ]; then
  log "Services neu erstellen (--no-deps --force-recreate): ${RECREATE_LIST[*]}"
  dc up -d --no-deps --force-recreate "${RECREATE_LIST[@]}"
else
  log "Keine Services zu recreaten -> unveraenderter Code-Stand"
fi

# ---------- 7) Health-Check mit Warte-Fenster --------------------------------
log "Health-Check (max ~120s) fuer alle ${#APP_SERVICES[@]} App-Services"
DEPLOY_OK=0
for i in $(seq 1 12); do
  echo "  Versuch $i/12 ..."
  if health_ok; then DEPLOY_OK=1; break; fi
  sleep 10
done

# ---------- 8) Erfolg oder Rollback ------------------------------------------
if [ "$DEPLOY_OK" -eq 1 ]; then
  echo "$NEW_REF" > "$STATE_FILE"
  log "DEPLOY ERFOLGREICH ($ENVIRONMENT -> ${NEW_REF:0:7})"
  ok "Rollback-Basislinie gesetzt: $STATE_FILE -> ${NEW_REF:0:7}"
  exit 0
fi

err "Health-Check fehlgeschlagen"

# Wenn nichts geaendert wurde, wuerde ein Rollback nichts bringen:
if [ "${#RECREATE_LIST[@]}" -eq 0 ]; then
  die "System war bereits vor dem Deploy nicht gesund (es wurde nichts geaendert). KEIN Rollback, Baseline NICHT gesetzt. Pruefen: dc ps; dc logs --tail=200"
fi

# Rollback-Ziel: letzter guter Ref, sonst der vorherige HEAD
ROLLBACK_REF="${PREV_GOOD:-$OLD_REF}"
[ -n "$ROLLBACK_REF" ] || die "Kein Rollback-Ref bekannt. Manuell pruefen. Baseline NICHT gesetzt."

log "ROLLBACK auf ${ROLLBACK_REF:0:7}"
git checkout --quiet "$ROLLBACK_REF"
RB_BUILD=()
for s in "${RECREATE_LIST[@]}"; do [ "${SVC_KIND[$s]}" = "build" ] && RB_BUILD+=("$s"); done
[ "${#RB_BUILD[@]}" -gt 0 ] && dc build "${RB_BUILD[@]}"
dc up -d --no-deps --force-recreate "${RECREATE_LIST[@]}"

ROLLBACK_OK=0
for i in $(seq 1 12); do
  echo "  Rollback-Health $i/12 ..."
  if health_ok; then ROLLBACK_OK=1; break; fi
  sleep 10
done

if [ "$ROLLBACK_OK" -eq 1 ]; then
  err "Deploy fehlgeschlagen, aber Rollback auf ${ROLLBACK_REF:0:7} erfolgreich. Stack wieder stabil. Baseline unveraendert."
  exit 1
fi
die "Deploy UND Rollback fehlgeschlagen. SOFORT manuell pruefen: dc ps; dc logs --tail=200"
