#!/usr/bin/env bash
# Löscht Test-User (username ~ '^mt') die älter als 1 Stunde sind.
# Cascade: Sessions + RefreshTokens werden automatisch mitgelöscht.
# Läuft täglich via cron um 02:30 Uhr.

set -euo pipefail

DB_URL="postgresql://sf1_user:6YvuKJA4T5jorkFKXvg55XRzM2c2Wlo@localhost:5432/sf1_db"

COUNT=$(docker exec sf1-postgres psql "$DB_URL" -t -c \
  "SELECT COUNT(*) FROM \"User\" WHERE (username ~ '^mt' OR username ~ '^testuser' OR email LIKE '%@mastertest.invalid' OR email LIKE '%@sf1-test.de') AND \"createdAt\" < NOW() - INTERVAL '2 hours';" \
  2>/dev/null | tr -d ' ')

if [ -z "$COUNT" ] || [ "$COUNT" -eq 0 ]; then
  echo "[$(date -Is)] cleanup-mt-users: keine alten Test-User gefunden"
  exit 0
fi

docker exec sf1-postgres psql "$DB_URL" -c \
  "DELETE FROM \"User\" WHERE (username ~ '^mt' OR username ~ '^testuser' OR email LIKE '%@mastertest.invalid' OR email LIKE '%@sf1-test.de') AND \"createdAt\" < NOW() - INTERVAL '2 hours';"

echo "[$(date -Is)] cleanup-mt-users: $COUNT Test-User gelöscht"
