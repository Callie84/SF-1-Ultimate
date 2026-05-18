#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# SF-1 Tägliche automatische Tests
# Läuft täglich per Cron um 03:30 Uhr (nach Backup um 02:00 Uhr)
# Ergebnisse: /root/Dokumente/testreports/
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H-%M-%S)
REPORT_DIR="/root/Dokumente/testreports"
LOG_FILE="/tmp/sf1-test-run-${DATE}-${TIME}.log"
REPORT_FILE="${REPORT_DIR}/testbericht-${DATE}-${TIME}.md"

mkdir -p "${REPORT_DIR}"
mkdir -p "${SCRIPT_DIR}/reports"

echo "═══════════════════════════════════════════════════" | tee "${LOG_FILE}"
echo " SF-1 Automatische Tests — ${DATE} ${TIME//-/:}" | tee -a "${LOG_FILE}"
echo "═══════════════════════════════════════════════════" | tee -a "${LOG_FILE}"

HEALTH_EXIT=0
FUNCTIONAL_EXIT=0
LOAD_EXIT=0
WRK_RESULTS=""

# ─── 1. HEALTH CHECK ────────────────────────────────────────────────────
echo "" | tee -a "${LOG_FILE}"
echo "▶ [1/4] Health Check läuft..." | tee -a "${LOG_FILE}"
echo "" | tee -a "${LOG_FILE}"

node "${SCRIPT_DIR}/health-check.mjs" 2>&1 | tee -a "${LOG_FILE}" || HEALTH_EXIT=$?

if [ "$HEALTH_EXIT" -eq 0 ]; then
  echo "✅ Health Check bestanden" | tee -a "${LOG_FILE}"
else
  echo "❌ Health Check: Fehler gefunden (Exit ${HEALTH_EXIT})" | tee -a "${LOG_FILE}"
fi

# ─── 2. FUNCTIONAL TESTS ────────────────────────────────────────────────
echo "" | tee -a "${LOG_FILE}"
echo "▶ [2/4] Functional Tests laufen..." | tee -a "${LOG_FILE}"
echo "" | tee -a "${LOG_FILE}"

# JWT-Secret aus Auth-Service Container holen (für node:test Runner)
export SF1_JWT_SECRET="$(docker exec sf1-auth-service printenv JWT_SECRET 2>/dev/null || echo 'fallback-for-ci')"

node "${SCRIPT_DIR}/suites/runner.mjs" 2>&1 | tee -a "${LOG_FILE}" || FUNCTIONAL_EXIT=$?

if [ "$FUNCTIONAL_EXIT" -eq 0 ]; then
  echo "✅ Functional Tests bestanden" | tee -a "${LOG_FILE}"
else
  echo "❌ Functional Tests: Fehler gefunden (Exit ${FUNCTIONAL_EXIT})" | tee -a "${LOG_FILE}"
fi

# ─── 3. WRK STRESS TEST ─────────────────────────────────────────────────
echo "" | tee -a "${LOG_FILE}"
echo "▶ [3/4] wrk HTTP-Stress Test läuft..." | tee -a "${LOG_FILE}"
echo "" | tee -a "${LOG_FILE}"

# IPs dynamisch ermitteln
COMMUNITY_IP=$(docker inspect sf1-community-service 2>/dev/null | python3 -c "import sys,json; print(list(json.load(sys.stdin)[0]['NetworkSettings']['Networks'].values())[0]['IPAddress'])" 2>/dev/null || echo "")
SEARCH_IP=$(docker inspect sf1-search-service 2>/dev/null | python3 -c "import sys,json; print(list(json.load(sys.stdin)[0]['NetworkSettings']['Networks'].values())[0]['IPAddress'])" 2>/dev/null || echo "")
PRICE_IP=$(docker inspect sf1-price-service 2>/dev/null | python3 -c "import sys,json; print(list(json.load(sys.stdin)[0]['NetworkSettings']['Networks'].values())[0]['IPAddress'])" 2>/dev/null || echo "")

echo "--- WRK ERGEBNIS ---" | tee -a "${LOG_FILE}"

if [ -n "$COMMUNITY_IP" ] && command -v wrk &> /dev/null; then
  echo "[Feed-Szenario — 500 Connections, 30s]" | tee -a "${LOG_FILE}"
  wrk -t8 -c500 -d30s \
      --script "${SCRIPT_DIR}/wrk-scenarios/feed.lua" \
      "http://${COMMUNITY_IP}:3005" 2>&1 | tee -a "${LOG_FILE}" || true
  echo "" | tee -a "${LOG_FILE}"
fi

if [ -n "$SEARCH_IP" ] && command -v wrk &> /dev/null; then
  echo "[Such-Szenario — 300 Connections, 30s]" | tee -a "${LOG_FILE}"
  wrk -t8 -c300 -d30s \
      --script "${SCRIPT_DIR}/wrk-scenarios/search.lua" \
      "http://${SEARCH_IP}:3007" 2>&1 | tee -a "${LOG_FILE}" || true
  echo "" | tee -a "${LOG_FILE}"
fi

if [ -n "$PRICE_IP" ] && command -v wrk &> /dev/null; then
  echo "[Preis-Szenario — 200 Connections, 30s]" | tee -a "${LOG_FILE}"
  wrk -t4 -c200 -d30s \
      --script "${SCRIPT_DIR}/wrk-scenarios/prices.lua" \
      "http://${PRICE_IP}:3002" 2>&1 | tee -a "${LOG_FILE}" || true
fi

echo "--- WRK ENDE ---" | tee -a "${LOG_FILE}"

# ─── 4. LOAD TEST (1000 VUs, Node.js) ──────────────────────────────────
echo "" | tee -a "${LOG_FILE}"
echo "▶ [4/4] Load Test (1000 virtuelle Nutzer) läuft..." | tee -a "${LOG_FILE}"
echo "" | tee -a "${LOG_FILE}"

node "${SCRIPT_DIR}/load-test.mjs" 2>&1 | tee -a "${LOG_FILE}" || LOAD_EXIT=$?

if [ "$LOAD_EXIT" -eq 0 ]; then
  echo "✅ Load Test bestanden" | tee -a "${LOG_FILE}"
else
  echo "⚠️  Load Test: Erhöhte Fehlerrate (Exit ${LOAD_EXIT})" | tee -a "${LOG_FILE}"
fi

# ─── REPORT GENERIEREN ──────────────────────────────────────────────────
echo "" | tee -a "${LOG_FILE}"
echo "▶ Bericht wird erstellt..." | tee -a "${LOG_FILE}"
node "${SCRIPT_DIR}/report-generator.mjs" "${LOG_FILE}" "${REPORT_FILE}" 2>&1 | tee -a "${LOG_FILE}"

# Auch ins tests/automated/reports/ kopieren
cp "${REPORT_FILE}" "${SCRIPT_DIR}/reports/testbericht-${DATE}-${TIME}.md"

# Alte Berichte aufräumen (nur letzten 30 behalten)
ls -t "${REPORT_DIR}"/testbericht-*.md 2>/dev/null | tail -n +31 | xargs rm -f 2>/dev/null || true
ls -t "${SCRIPT_DIR}/reports"/testbericht-*.md 2>/dev/null | tail -n +31 | xargs rm -f 2>/dev/null || true

# ─── TELEGRAM BENACHRICHTIGUNG bei Fehlern ─────────────────────────────
TOTAL_FAILURES=$((HEALTH_EXIT + FUNCTIONAL_EXIT))
if [ "$TOTAL_FAILURES" -gt 0 ] || [ "$LOAD_EXIT" -gt 0 ]; then
  BOT_TOKEN="8682775025:AAFzOVljDSOif8ZdQSn1EAGUAUiSpLls8xE"
  CHAT_ID="8430091807"
  HEALTH_STATUS=$([ "$HEALTH_EXIT" -eq 0 ] && echo "✅" || echo "❌")
  FUNC_STATUS=$([ "$FUNCTIONAL_EXIT" -eq 0 ] && echo "✅" || echo "❌")
  LOAD_STATUS=$([ "$LOAD_EXIT" -eq 0 ] && echo "✅" || echo "⚠️")
  MESSAGE="⚠️ SF-1 Tagestest ${DATE} — Fehler gefunden!

${HEALTH_STATUS} Health Check
${FUNC_STATUS} Functional Tests
${LOAD_STATUS} Load Test (1000 VUs)

Bericht: ${REPORT_FILE}"
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -d "chat_id=${CHAT_ID}" \
    --data-urlencode "text=${MESSAGE}" > /dev/null 2>&1 || true
  echo "📱 Telegram-Benachrichtigung gesendet" | tee -a "${LOG_FILE}"
fi

# ─── ABSCHLUSS ──────────────────────────────────────────────────────────
echo "" | tee -a "${LOG_FILE}"
echo "═══════════════════════════════════════════════════" | tee -a "${LOG_FILE}"
OVERALL=$((HEALTH_EXIT + FUNCTIONAL_EXIT))
if [ "$OVERALL" -eq 0 ]; then
  echo " ✅ ALLE TESTS BESTANDEN — ${DATE}" | tee -a "${LOG_FILE}"
else
  echo " ❌ FEHLER GEFUNDEN — ${DATE} — Bericht: ${REPORT_FILE}" | tee -a "${LOG_FILE}"
fi
echo "═══════════════════════════════════════════════════" | tee -a "${LOG_FILE}"
echo " 📄 Bericht: ${REPORT_FILE}" | tee -a "${LOG_FILE}"
echo " 📝 Log:     ${LOG_FILE}" | tee -a "${LOG_FILE}"
echo "═══════════════════════════════════════════════════" | tee -a "${LOG_FILE}"

# Log auch ins Dokumente-Verzeichnis
cp "${LOG_FILE}" "${REPORT_DIR}/testlog-${DATE}-${TIME}.txt"

exit $OVERALL
