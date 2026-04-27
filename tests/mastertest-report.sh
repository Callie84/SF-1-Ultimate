#!/usr/bin/env bash
# SF-1 Mastertest Runner — fuehrt Vitest aus und speichert JSON-Ergebnis
# Aufruf: bash tests/mastertest-report.sh
# JSON-Ergebnis: /tmp/sf1-mastertest-result.json (wird vom mastertest-Skill gelesen)

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export JSON_OUT="/tmp/sf1-mastertest-result.json"

cd "$SCRIPT_DIR"

echo "SF-1 Mastertest startet..."
echo "================================================"

# Beide Reporter: verbose fuer Konsolenausgabe, json fuer Report-Parsing
npx vitest run services/ \
  --reporter=verbose \
  --reporter=json \
  --outputFile="$JSON_OUT" \
  2>&1 || true

echo ""
echo "================================================"

if [ -f "$JSON_OUT" ]; then
  PASSED=$(jq '.numPassedTests' "$JSON_OUT" 2>/dev/null || echo "?")
  FAILED=$(jq '.numFailedTests' "$JSON_OUT" 2>/dev/null || echo "?")
  FILES_PASS=$(jq '.numPassedTestSuites' "$JSON_OUT" 2>/dev/null || echo "?")
  FILES_FAIL=$(jq '.numFailedTestSuites' "$JSON_OUT" 2>/dev/null || echo "?")
  echo "Ergebnis: ${PASSED} bestanden | ${FAILED} fehlgeschlagen | Suites: ${FILES_PASS} ok / ${FILES_FAIL} fail"
  echo "JSON: $JSON_OUT"
else
  echo "WARNUNG: JSON-Output nicht gefunden ($JSON_OUT)"
fi
