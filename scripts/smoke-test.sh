#!/bin/bash
# SF-1 Smoke-Test — kritische Flows prüfen
# Verwendung: bash scripts/smoke-test.sh
# Exit 0 = alles grün | Exit 1 = mindestens ein Test fehlgeschlagen
# Laufzeit: ~30–60 Sekunden

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILED=0

echo "🔍 SF-1 Smoke-Test — $(date '+%Y-%m-%d %H:%M')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Voraussetzung: kritische Container laufen
for svc in sf1-auth-service sf1-search-service sf1-backup; do
  if ! docker ps --format "{{.Names}}" | grep -q "^${svc}$"; then
    echo "❌ ABORT: Container '$svc' läuft nicht."
    echo "   Prüfen: docker ps | grep sf1"
    exit 1
  fi
done

run_test() {
  local name="$1"
  local script="$2"
  echo -n "  $name ... "
  if cd "$ROOT/tests" && npm run "$script" --silent 2>&1 | grep -q "passed"; then
    echo "✅"
  else
    echo "❌"
    FAILED=$((FAILED + 1))
  fi
}

# Container-IPs dynamisch ermitteln (IPs ändern sich bei Docker-Restart)
SEARCH_IP=$(docker inspect sf1-search-service --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null)
BACKUP_IP=$(docker inspect sf1-backup --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null)
export SF1_SEARCH_BASE="http://${SEARCH_IP}:3007"
export SF1_BACKUP_BASE="http://${BACKUP_IP}:3011"

run_test "Auth-Service   (login/register/verify)" "test:auth"
run_test "Search-Service (strain-suche)"          "test:search"
run_test "Backup-Service (health/trigger)"        "test:backup"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$FAILED" -eq 0 ]; then
  echo "✅ Smoke-Test bestanden — commit wird fortgesetzt"
  exit 0
else
  echo "❌ $FAILED Test(s) fehlgeschlagen — Task ist NICHT fertig"
  echo "   Details: cd /root/SF-1-Ultimate-/tests && npm run test:auth"
  exit 1
fi
