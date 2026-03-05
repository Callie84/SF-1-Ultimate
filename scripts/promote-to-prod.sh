#!/bin/bash
# ============================================================
# SF-1 Ultimate – Staging → Production promoten
# Mergt staging-Branch in main und deployt Production neu.
#
# Usage: bash scripts/promote-to-prod.sh
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "============================================"
echo " SF-1 – Staging → Production"
echo "============================================"
echo ""
echo "ACHTUNG: Diese Aktion:"
echo "  1. Merged 'staging' in 'main'"
echo "  2. Stoppt Staging"
echo "  3. Startet Production neu (Downtime ~30s)"
echo ""
read -r -p "Fortfahren? [y/N] " CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || { echo "Abgebrochen."; exit 0; }

# Git-Status prüfen
if git -C "$PROJECT_DIR" rev-parse --git-dir &>/dev/null; then
  # Sicherstellen dass staging committed ist
  if ! git -C "$PROJECT_DIR" diff-index --quiet HEAD --; then
    echo "FEHLER: Uncommitted Changes vorhanden!"
    echo "       git status zeigt:"
    git -C "$PROJECT_DIR" status --short
    exit 1
  fi

  echo "→ Wechsle zu main..."
  git -C "$PROJECT_DIR" checkout main
  git -C "$PROJECT_DIR" pull origin main

  echo "→ Merge staging → main..."
  git -C "$PROJECT_DIR" merge staging --no-ff -m "promote: staging → production $(date +%Y-%m-%d)"
  git -C "$PROJECT_DIR" push origin main

  echo "→ Tag erstellen..."
  TAG="release-$(date +%Y%m%d-%H%M)"
  git -C "$PROJECT_DIR" tag "$TAG"
  git -C "$PROJECT_DIR" push origin "$TAG"
  echo "   Tag: $TAG"
else
  echo "WARNUNG: Kein Git-Repository. Überspringe Git-Schritte."
fi

# Staging stoppen
echo "→ Stoppe Staging..."
docker-compose \
  -f "$PROJECT_DIR/docker-compose.staging.yml" \
  --env-file "$PROJECT_DIR/.env.staging" \
  down 2>/dev/null || true

# Production neu starten (rolling update)
echo "→ Starte Production-Services neu..."
cd "$PROJECT_DIR"
docker-compose pull --quiet 2>/dev/null || true
docker-compose up -d --remove-orphans

# Health-Check
echo "→ Warte auf Services..."
sleep 15

echo "→ Health-Check:"
HEALTHY=0
TOTAL=0
for service in frontend auth-service price-service journal-service tools-service community-service notification-service search-service media-service gamification-service ai-service; do
  TOTAL=$((TOTAL+1))
  STATUS=$(docker-compose ps "$service" 2>/dev/null | tail -1 | awk '{print $NF}' 2>/dev/null || echo "unknown")
  if docker ps --filter "name=sf1-${service}" --filter "status=running" -q | grep -q .; then
    echo "   ✓ $service"
    HEALTHY=$((HEALTHY+1))
  else
    echo "   ✗ $service (NICHT gestartet)"
  fi
done

echo ""
echo "============================================"
echo " Promotion abgeschlossen: $HEALTHY/$TOTAL Services healthy"
echo " Production: https://seedfinderpro.de"
echo "============================================"

if [ "$HEALTHY" -lt "$TOTAL" ]; then
  echo ""
  echo "WARNUNG: Nicht alle Services sind gestartet!"
  echo "         Prüfe: docker-compose logs <service-name>"
  exit 1
fi
