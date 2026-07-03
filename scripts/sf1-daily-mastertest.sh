#!/bin/bash
# SF-1 Daily Mastertest — läuft täglich 06:00
# Führt volle 42-Test-Suite aus, schreibt Report + Vault-Log

set -e

ROOT="/root/SF-1-Ultimate-"
REPORTS_DIR="/root/SF-Brain/Logs/mastertest-reports"
VAULT_LOG="/root/SF-Brain/Logs/sf1-v1.md"
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M)
REPORT_FILE="$REPORTS_DIR/${DATE}_mastertest.md"

mkdir -p "$REPORTS_DIR"

echo "[$(date -Iseconds)] SF-1 Daily Mastertest startet..."

# Dynamische IP-Auflösung (Docker vergibt IPs bei Neustart neu)
get_ip() { docker inspect "$1" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null | head -1; }
export SF1_AUTH_BASE="http://$(get_ip sf1-auth-service):3001"
export SF1_COMM_BASE="http://$(get_ip sf1-community-service):3005"
export SF1_JOURN_BASE="http://$(get_ip sf1-journal-service):3003"
export SF1_MEDIA_BASE="http://$(get_ip sf1-media-service):3008"
export SF1_PRICE_BASE="http://$(get_ip sf1-price-service):3002"
export SF1_GAM_BASE="http://$(get_ip sf1-gamification-service):3009"
export SF1_SEARCH_BASE="http://$(get_ip sf1-search-service):3007"
export SF1_BACKUP_BASE="http://$(get_ip sf1-backup):3011"
export SF1_TOOLS_BASE="http://$(get_ip sf1-tools-service):3004"
export SF1_NOTIF_BASE="http://$(get_ip sf1-notification-service):3006"
echo "[$(date -Iseconds)] IPs aufgelöst: AUTH=$SF1_AUTH_BASE PRICE=$SF1_PRICE_BASE SEARCH=$SF1_SEARCH_BASE"

# Mastertest ausführen und Output erfassen
cd "$ROOT"
START_TS=$(date +%s)
MASTERTEST_OUTPUT=$(npm run mastertest 2>&1) || true
END_TS=$(date +%s)
DURATION=$(( END_TS - START_TS ))

# Ergebnis auswerten
PASSED=$(echo "$MASTERTEST_OUTPUT" | grep -oP '\d+(?= passed)' | tail -1)
PASSED=${PASSED:-0}
FAILED=$(echo "$MASTERTEST_OUTPUT" | grep -oP '\d+(?= failed)' | tail -1)
FAILED=${FAILED:-0}

if [ "$FAILED" = "0" ] && [ "$PASSED" -gt 0 ]; then
  STATUS="✅"
  STATUS_TEXT="alle grün"
  STATUS_LINE="✅ ${PASSED}/${PASSED} grün"
else
  STATUS="❌"
  STATUS_TEXT="${FAILED} fehlgeschlagen"
  STATUS_LINE="❌ ${PASSED} grün / ${FAILED} fehlgeschlagen"
fi

# Fehlgeschlagene Tests extrahieren
FAILED_TESTS=$(echo "$MASTERTEST_OUTPUT" | grep -E "✗|FAIL|× " | head -20 || echo "")

# Report schreiben
cat > "$REPORT_FILE" << EOF
# SF-1 Mastertest Report — $DATE

**Datum:** $DATE $TIME
**Status:** $STATUS $STATUS_TEXT
**Dauer:** ${DURATION}s
**Tests:** $PASSED bestanden / $FAILED fehlgeschlagen

## Ergebnis

$( [ "$FAILED" = "0" ] && echo "✅ Alle Tests grün." || echo "❌ Fehlgeschlagene Tests:" )

$( [ -n "$FAILED_TESTS" ] && echo "$FAILED_TESTS" || echo "" )

## Output (gekürzt)

\`\`\`
$(echo "$MASTERTEST_OUTPUT" | tail -30)
\`\`\`
EOF

echo "[$(date -Iseconds)] Report geschrieben: $REPORT_FILE"

# INDEX.md aktualisieren
INDEX_FILE="$REPORTS_DIR/INDEX.md"
if [ ! -f "$INDEX_FILE" ]; then
  echo "# Mastertest Reports — Index" > "$INDEX_FILE"
  echo "" >> "$INDEX_FILE"
fi

# Neuen Eintrag oben einfügen (nach Header)
TEMP=$(mktemp)
head -2 "$INDEX_FILE" > "$TEMP"
echo "- [$DATE ${TIME}](${DATE}_mastertest.md) — $STATUS_LINE (${DURATION}s)" >> "$TEMP"
tail -n +3 "$INDEX_FILE" >> "$TEMP"
mv "$TEMP" "$INDEX_FILE"

echo "[$(date -Iseconds)] INDEX.md aktualisiert"

# Vault-Log aktualisieren
cat >> "$VAULT_LOG" << EOF

---

### [$DATE $TIME] Daily Mastertest
**Typ:** automated-test
**Status:** $STATUS $STATUS_TEXT
**Tests:** $PASSED bestanden / $FAILED fehlgeschlagen | Dauer: ${DURATION}s
**Report:** \`$REPORT_FILE\`
---
EOF

echo "[$(date -Iseconds)] Vault-Log aktualisiert"
echo "[$(date -Iseconds)] SF-1 Daily Mastertest abgeschlossen — $STATUS_LINE"
