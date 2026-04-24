#!/bin/bash
# SF-1 Weekly Content Check
# Vergleicht hardcodierte Zahlen in .tsx-Dateien mit echten DB-Werten
# Sendet Telegram-Alarm bei Abweichung > 10%
# Cron: 0 9 * * 1 (jeden Montag 09:00)

set -euo pipefail

ENV_FILE="/root/SF-1-Ultimate-/.env"
WEB_APP="/root/SF-1-Ultimate-/apps/web-app/src"
LOG_PREFIX="[SF-1 Content-Check $(date '+%Y-%m-%d %H:%M')]"

MONGO_PASSWORD=$(grep '^MONGO_PASSWORD=' "$ENV_FILE" | cut -d= -f2)
TELEGRAM_BOT_TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' "$ENV_FILE" | cut -d= -f2)
TELEGRAM_CHAT_ID=$(grep '^TELEGRAM_CHAT_ID=' "$ENV_FILE" | cut -d= -f2)
MONGO_URI="mongodb://sf1_admin:${MONGO_PASSWORD}@localhost:27017/admin?authSource=admin"

echo "$LOG_PREFIX Start"

send_telegram() {
  local msg="$1"
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${msg}" \
    -d "parse_mode=HTML" > /dev/null
}

# Prüft ob Abweichung > 10% und schickt ggf. Alarm
check_deviation() {
  local label="$1"
  local displayed="$2"
  local actual="$3"
  local file="$4"

  # Zahlen normalisieren (7.000+ → 7000)
  displayed_num=$(echo "$displayed" | tr -d '.+, ')
  actual_num=$(echo "$actual" | tr -d '.+, ')

  if [ -z "$displayed_num" ] || [ "$displayed_num" -eq 0 ]; then
    echo "$LOG_PREFIX SKIP $label (angezeigte Zahl nicht parsbar: '$displayed')"
    return
  fi
  if [ -z "$actual_num" ] || [ "$actual_num" -eq 0 ]; then
    echo "$LOG_PREFIX SKIP $label (DB-Wert 0 oder nicht parsbar)"
    return
  fi

  diff=$(( actual_num - displayed_num ))
  diff_abs=${diff#-}
  pct=$(( diff_abs * 100 / actual_num ))

  echo "$LOG_PREFIX $label: angezeigt=$displayed_num, DB=$actual_num, Abweichung=${pct}%"

  if [ "$pct" -gt 10 ]; then
    MSG="⚠️ SF-1 Content-Check — Abweichung erkannt
$(date '+%Y-%m-%d %H:%M')

${label}
Landing Page zeigt: ${displayed}
DB-Realwert: ${actual}
Abweichung: ${pct}%

→ ${file}

Bitte Datei manuell aktualisieren."
    send_telegram "$MSG"
    echo "$LOG_PREFIX ALARM: $label (${pct}% Abweichung) — Telegram gesendet"
  fi
}

# ─── DB-Werte abfragen ────────────────────────────────────────────────────────
SEEDS_ACTUAL=$(docker exec sf1-mongodb mongosh "$MONGO_URI" --quiet \
  --eval "print(db.getSiblingDB('sf1_price').seeds.countDocuments())" 2>/dev/null | tail -1)

SEEDBANKS_ACTUAL=$(docker exec sf1-mongodb mongosh "$MONGO_URI" --quiet \
  --eval "print(db.getSiblingDB('sf1_price').prices.distinct('seedbank').length)" 2>/dev/null | tail -1)

echo "$LOG_PREFIX DB: seeds=$SEEDS_ACTUAL, seedbanks=$SEEDBANKS_ACTUAL"

# ─── Landing Page parsen ──────────────────────────────────────────────────────
LANDING="$WEB_APP/app/landing/page.tsx"
LAYOUT="$WEB_APP/app/layout.tsx"

# value-Einträge aus dem Stats-Array in Reihenfolge: Samen, Strain-Profile, Seedbanks
SEEDS_DISPLAYED=$(grep -oP "value: '\K[0-9][^']*" "$LANDING" | sed -n '1p')
SEEDBANKS_DISPLAYED=$(grep -oP "value: '\K[0-9][^']*" "$LANDING" | sed -n '3p')

# ─── Vergleiche ───────────────────────────────────────────────────────────────
check_deviation "Cannabis-Samen" \
  "$SEEDS_DISPLAYED" "$SEEDS_ACTUAL" \
  "apps/web-app/src/app/landing/page.tsx"

check_deviation "Seedbanks" \
  "$SEEDBANKS_DISPLAYED" "$SEEDBANKS_ACTUAL" \
  "apps/web-app/src/app/landing/page.tsx"

# Meta-Description prüfen
META_SEEDS=$(grep -oP '\d[\d.]+\+ Cannabis Samen' "$LAYOUT" | head -1 | grep -oP '[\d.]+(?=\+)')
if [ -n "$META_SEEDS" ]; then
  check_deviation "Meta-Description Samen" \
    "${META_SEEDS}+" "$SEEDS_ACTUAL" \
    "apps/web-app/src/app/layout.tsx"
fi

echo "$LOG_PREFIX Fertig"
