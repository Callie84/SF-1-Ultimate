#!/bin/bash

# SF-1 Ultimate Database Restore Script
# Stellt Backups von PostgreSQL und MongoDB wieder her

set -e

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Überprüfe Parameter
if [ $# -lt 2 ]; then
    echo "Usage: $0 <postgres_backup_file> <mongodb_backup_file>"
    echo "Example: $0 /backups/postgres_20240101_120000.sql.gz /backups/mongodb_20240101_120000.tar.gz"
    exit 1
fi

POSTGRES_BACKUP=$1
MONGO_BACKUP=$2

# Überprüfe ob Backups existieren
if [ ! -f "$POSTGRES_BACKUP" ]; then
    log_error "PostgreSQL backup file not found: $POSTGRES_BACKUP"
    exit 1
fi

if [ ! -f "$MONGO_BACKUP" ]; then
    log_error "MongoDB backup file not found: $MONGO_BACKUP"
    exit 1
fi

# Warnung
log_warn "========================================="
log_warn "WARNUNG: Dieser Vorgang wird die bestehenden Datenbanken überschreiben!"
log_warn "PostgreSQL Backup: $POSTGRES_BACKUP"
log_warn "MongoDB Backup: $MONGO_BACKUP"
log_warn "========================================="
read -p "Fortfahren? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    log_info "Restore abgebrochen."
    exit 0
fi

# ==========================================
# POSTGRESQL RESTORE
# ==========================================

log_info "Starting PostgreSQL restore..."

# Drop und recreate database
docker exec sf1-postgres psql -U sf1_user -c "DROP DATABASE IF EXISTS sf1_auth;"
docker exec sf1-postgres psql -U sf1_user -c "CREATE DATABASE sf1_auth;"

# Restore backup
gunzip -c "$POSTGRES_BACKUP" | docker exec -i sf1-postgres psql -U sf1_user -d sf1_auth

if [ $? -eq 0 ]; then
    log_info "PostgreSQL restore completed successfully"
else
    log_error "PostgreSQL restore failed!"
    exit 1
fi

# ==========================================
# MONGODB RESTORE
# ==========================================

log_info "Starting MongoDB restore..."

# Extrahiere Backup
TEMP_DIR="/tmp/mongo_restore_$$"
mkdir -p "$TEMP_DIR"
tar -xzf "$MONGO_BACKUP" -C "$TEMP_DIR"

# Restore jede Datenbank
for db_dir in "$TEMP_DIR"/*; do
    db_name=$(basename "$db_dir")
    log_info "Restoring database: $db_name"

    # Drop existing database
    docker exec sf1-mongodb mongosh \
        --username=sf1_admin \
        --password="${MONGO_PASSWORD}" \
        --authenticationDatabase=admin \
        --eval "db.getSiblingDB('$db_name').dropDatabase()"

    # Copy backup to container
    docker cp "$db_dir" sf1-mongodb:/tmp/

    # Restore
    docker exec sf1-mongodb mongorestore \
        --username=sf1_admin \
        --password="${MONGO_PASSWORD}" \
        --authenticationDatabase=admin \
        --db="$db_name" \
        "/tmp/$(basename $db_dir)"

    if [ $? -eq 0 ]; then
        log_info "MongoDB restore for $db_name completed"
    else
        log_error "MongoDB restore for $db_name failed!"
    fi
done

# Cleanup
rm -rf "$TEMP_DIR"

# ==========================================
# VERIFICATION
# ==========================================

log_info "Verifying restore..."

# Check PostgreSQL
PG_TABLES=$(docker exec sf1-postgres psql -U sf1_user -d sf1_auth -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

if [ "$PG_TABLES" -gt 0 ]; then
    log_info "✓ PostgreSQL restore verified ($PG_TABLES tables)"
else
    log_error "✗ PostgreSQL restore verification failed"
    exit 1
fi

# Check MongoDB
MONGO_DBS=$(docker exec sf1-mongodb mongosh --quiet --username=sf1_admin --password="${MONGO_PASSWORD}" --authenticationDatabase=admin --eval "db.adminCommand('listDatabases').databases.length")

if [ "$MONGO_DBS" -gt 0 ]; then
    log_info "✓ MongoDB restore verified ($MONGO_DBS databases)"
else
    log_error "✗ MongoDB restore verification failed"
    exit 1
fi

# ==========================================
# SUMMARY
# ==========================================

log_info "========================================="
log_info "Restore completed successfully!"
log_info "Date: $(date)"
log_info "========================================="

exit 0
