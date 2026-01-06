#!/bin/bash
# ==========================================
# Nginx Reload Script
# ==========================================
# Safely reloads Nginx configuration without downtime
#
# Usage:
#   ./nginx/scripts/reload-nginx.sh
# ==========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_info() {
  echo -e "${YELLOW}→${NC} $1"
}

echo "========================================="
echo "Nginx Configuration Reload"
echo "========================================="
echo ""

# ==========================================
# 1. Test Configuration
# ==========================================
print_info "Testing Nginx configuration..."

if docker exec sf1-nginx nginx -t 2>&1 | grep -q "successful"; then
  print_success "Configuration is valid"
else
  print_error "Configuration has errors"
  docker exec sf1-nginx nginx -t
  exit 1
fi

echo ""

# ==========================================
# 2. Backup Current Configuration
# ==========================================
print_info "Creating backup..."

BACKUP_DIR="nginx/backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

cp -r nginx/conf.d "$BACKUP_DIR/"
cp nginx/nginx.conf "$BACKUP_DIR/"

print_success "Backup created: $BACKUP_DIR"

echo ""

# ==========================================
# 3. Reload Nginx
# ==========================================
print_info "Reloading Nginx..."

if docker exec sf1-nginx nginx -s reload; then
  print_success "Nginx reloaded successfully"
else
  print_error "Failed to reload Nginx"
  print_info "Restoring backup..."

  cp -r "$BACKUP_DIR/conf.d/"* nginx/conf.d/
  cp "$BACKUP_DIR/nginx.conf" nginx/

  docker exec sf1-nginx nginx -s reload

  print_error "Restored previous configuration"
  exit 1
fi

# Wait for reload to complete
sleep 2

# Test if Nginx is responding
if curl -k -s -o /dev/null -w "%{http_code}" http://localhost/health | grep -q "200"; then
  print_success "Nginx is responding correctly"
else
  print_error "Nginx health check failed"
  exit 1
fi

echo ""
print_success "Nginx configuration reloaded! ✨"
echo ""
echo "Check logs: docker-compose logs -f nginx"
echo ""
