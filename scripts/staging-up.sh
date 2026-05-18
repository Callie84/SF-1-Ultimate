#!/bin/bash
# ============================================================
# SF-1 Ultimate – Staging starten
# Usage: bash scripts/staging-up.sh [--branch <branch-name>]
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.staging.yml"
ENV_FILE="$PROJECT_DIR/.env.staging"
BRANCH="staging"

# Argumente parsen
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --branch) BRANCH="$2"; shift ;;
    *) echo "Unbekanntes Argument: $1"; exit 1 ;;
  esac
  shift
done

echo "============================================"
echo " SF-1 Staging – Start"
echo " Branch: $BRANCH"
echo " Domain: https://staging.seedfinderpro.de"
echo "============================================"

# Prüfen ob .env.staging existiert
if [ ! -f "$ENV_FILE" ]; then
  echo "FEHLER: $ENV_FILE nicht gefunden!"
  exit 1
fi

# Prüfen ob Production-Netzwerk existiert
NETWORK_NAME="sf-1-ultimate-_sf1-network"
if ! docker network inspect "$NETWORK_NAME" &>/dev/null; then
  echo "FEHLER: Production-Netzwerk '$NETWORK_NAME' nicht gefunden!"
  echo "       Starte zuerst den Production-Stack: docker-compose up -d"
  exit 1
fi

# Optional: Git-Branch wechseln
if git -C "$PROJECT_DIR" rev-parse --git-dir &>/dev/null; then
  CURRENT_BRANCH=$(git -C "$PROJECT_DIR" branch --show-current)
  if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    echo "→ Git: Wechsle zu Branch '$BRANCH'..."
    git -C "$PROJECT_DIR" fetch --quiet origin

    if git -C "$PROJECT_DIR" show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
      git -C "$PROJECT_DIR" checkout "$BRANCH" 2>/dev/null || git -C "$PROJECT_DIR" checkout -b "$BRANCH" "origin/$BRANCH"
      git -C "$PROJECT_DIR" pull --quiet origin "$BRANCH"
    else
      echo "WARNUNG: Branch '$BRANCH' nicht gefunden. Nutze aktuellen Stand."
    fi
  else
    echo "→ Git: Bereits auf Branch '$BRANCH', pull..."
    git -C "$PROJECT_DIR" pull --quiet origin "$BRANCH" 2>/dev/null || echo "   (kein Remote für Branch, verwende lokalen Stand)"
  fi
else
  echo "→ Git: Kein Git-Repository, überspringe Branch-Wechsel"
fi

# RAM-Check
AVAILABLE_MB=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)
echo "→ Verfügbarer RAM: ${AVAILABLE_MB} MB"
if [ "$AVAILABLE_MB" -lt 1500 ]; then
  echo "WARNUNG: Weniger als 1.5 GB RAM verfügbar!"
  echo "         Staging-Start könnte Production destabilisieren."
  read -r -p "Trotzdem starten? [y/N] " CONFIRM
  [[ "$CONFIRM" =~ ^[Yy]$ ]] || { echo "Abgebrochen."; exit 0; }
fi

# Staging starten
echo "→ Starte Staging-Stack..."
cd "$PROJECT_DIR"
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo ""
echo "→ Container-Status:"
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo ""
echo "============================================"
echo " Staging läuft!"
echo " URL: https://staging.seedfinderpro.de"
echo " User: staging"
echo " Pass: siehe .env.staging (STAGING_BASICAUTH_USERS)"
echo ""
echo " Logs:  docker-compose -f docker-compose.staging.yml --env-file .env.staging logs -f"
echo " Stop:  bash scripts/staging-down.sh"
echo "============================================"
