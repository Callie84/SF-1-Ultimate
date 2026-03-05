#!/bin/bash
# ============================================================
# SF-1 Ultimate – Staging stoppen
# Usage: bash scripts/staging-down.sh
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.staging.yml"
ENV_FILE="$PROJECT_DIR/.env.staging"

echo "============================================"
echo " SF-1 Staging – Stop"
echo "============================================"

cd "$PROJECT_DIR"
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down

echo ""
echo "✓ Staging gestoppt. Daten bleiben erhalten (shared DB)."
echo "  Neu starten: bash scripts/staging-up.sh"
