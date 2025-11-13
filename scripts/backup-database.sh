#!/bin/bash

# SF-1 Ultimate Database Backup Script
# Erstellt Backups von PostgreSQL und MongoDB

set -e

# Konfiguration
BACKUP_DIR="/backups/sf1-ultimate"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)

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

# Erstelle Backup-Verzeichnis
mkdir -p "$BACKUP_DIR"

# ==========================================
# POSTGRESQL BACKUP
# ==========================================

log_info "Starting PostgreSQL backup..."

POSTGRES_BACKUP_FILE="$BACKUP_DIR/postgres_sf1_auth_$DATE.sql.gz"

docker exec sf1-postgres pg_dump -U sf1_user sf1_auth | gzip > "$POSTGRES_BACKUP_FILE"

if [ $? -eq 0 ]; then
    log_info "PostgreSQL backup completed: $POSTGRES_BACKUP_FILE"
    POSTGRES_SIZE=$(du -h "$POSTGRES_BACKUP_FILE" | cut -f1)
    log_info "Backup size: $POSTGRES_SIZE"
else
    log_error "PostgreSQL backup failed!"
    exit 1
fi

# ==========================================
# MONGODB BACKUP
# ==========================================

log_info "Starting MongoDB backup..."

MONGO_BACKUP_DIR="$BACKUP_DIR/mongodb_$DATE"
mkdir -p "$MONGO_BACKUP_DIR"

# Backup alle Datenbanken
for db in sf1_prices sf1_journals sf1_community sf1_notifications sf1_search sf1_media sf1_gamification; do
    log_info "Backing up database: $db"

    docker exec sf1-mongodb mongodump \
        --username=sf1_admin \
        --password="${MONGO_PASSWORD}" \
        --authenticationDatabase=admin \
        --db="$db" \
        --out="/tmp/backup"

    docker cp sf1-mongodb:/tmp/backup/"$db" "$MONGO_BACKUP_DIR/"

    if [ $? -eq 0 ]; then
        log_info "MongoDB backup for $db completed"
    else
        log_error "MongoDB backup for $db failed!"
    fi
done

# Komprimiere MongoDB Backup
cd "$BACKUP_DIR"
tar -czf "mongodb_$DATE.tar.gz" "mongodb_$DATE"
rm -rf "mongodb_$DATE"

MONGO_SIZE=$(du -h "mongodb_$DATE.tar.gz" | cut -f1)
log_info "MongoDB backup completed: mongodb_$DATE.tar.gz"
log_info "Backup size: $MONGO_SIZE"

# ==========================================
# REDIS BACKUP (RDB Snapshot)
# ==========================================

log_info "Starting Redis backup..."

REDIS_BACKUP_FILE="$BACKUP_DIR/redis_$DATE.rdb"

docker exec sf1-redis redis-cli --pass "${REDIS_PASSWORD}" BGSAVE
sleep 5
docker cp sf1-redis:/data/dump.rdb "$REDIS_BACKUP_FILE"

if [ $? -eq 0 ]; then
    log_info "Redis backup completed: $REDIS_BACKUP_FILE"
    REDIS_SIZE=$(du -h "$REDIS_BACKUP_FILE" | cut -f1)
    log_info "Backup size: $REDIS_SIZE"
else
    log_warn "Redis backup failed (non-critical)"
fi

# ==========================================
# CLEANUP OLD BACKUPS
# ==========================================

log_info "Cleaning up old backups (older than $RETENTION_DAYS days)..."

find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -type f -name "*.rdb" -mtime +$RETENTION_DAYS -delete

REMAINING_BACKUPS=$(find "$BACKUP_DIR" -type f | wc -l)
log_info "Cleanup completed. Remaining backups: $REMAINING_BACKUPS"

# ==========================================
# BACKUP VERIFICATION
# ==========================================

log_info "Verifying backups..."

if [ -f "$POSTGRES_BACKUP_FILE" ] && [ -s "$POSTGRES_BACKUP_FILE" ]; then
    log_info "✓ PostgreSQL backup verified"
else
    log_error "✗ PostgreSQL backup verification failed"
    exit 1
fi

if [ -f "$BACKUP_DIR/mongodb_$DATE.tar.gz" ] && [ -s "$BACKUP_DIR/mongodb_$DATE.tar.gz" ]; then
    log_info "✓ MongoDB backup verified"
else
    log_error "✗ MongoDB backup verification failed"
    exit 1
fi

# ==========================================
# SUMMARY
# ==========================================

TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log_info "========================================="
log_info "Backup completed successfully!"
log_info "Date: $(date)"
log_info "Total backup size: $TOTAL_SIZE"
log_info "Backup location: $BACKUP_DIR"
log_info "========================================="

exit 0
