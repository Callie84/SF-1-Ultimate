#!/usr/bin/env bash
# Löscht Test-User (username ~ '^mt') die älter als 1 Stunde sind.
# Cascade: Sessions + RefreshTokens werden automatisch mitgelöscht.
# Läuft täglich via cron um 02:30 Uhr.

set -euo pipefail

DB_URL="postgresql://sf1_user:6YvuKJA4T5jorkFKXvg55XRzM2c2Wlo@localhost:5432/sf1_db"

COUNT=$(docker exec sf1-postgres psql "$DB_URL" -t -c \
  "SELECT COUNT(*) FROM \"User\" WHERE username ~ '^mt' AND \"createdAt\" < NOW() - INTERVAL '1 hour';" \
  2>/dev/null | tr -d ' ')

if [ "$COUNT" -eq 0 ]; then
  echo "[$(date -Is)] cleanup-mt-users: keine alten mt-User gefunden"
  exit 0
fi

docker exec sf1-postgres psql "$DB_URL" -c \
  "DELETE FROM \"User\" WHERE username ~ '^mt' AND \"createdAt\" < NOW() - INTERVAL '1 hour';"

echo "[$(date -Is)] cleanup-mt-users: $COUNT mt-User gelöscht"
