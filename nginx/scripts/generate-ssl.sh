#!/bin/bash
# ==========================================
# SSL Certificate Generation Script
# ==========================================
# Generates SSL certificates using Let's Encrypt
#
# Usage:
#   ./nginx/scripts/generate-ssl.sh --email your@email.com --domain sf1.example.com
#   ./nginx/scripts/generate-ssl.sh --email your@email.com --domain sf1.example.com --staging
# ==========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
EMAIL=""
DOMAIN=""
STAGING=false
WILDCARD=false

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_info() {
  echo -e "${YELLOW}→${NC} $1"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --email)
      EMAIL="$2"
      shift 2
      ;;
    --domain)
      DOMAIN="$2"
      shift 2
      ;;
    --staging)
      STAGING=true
      shift
      ;;
    --wildcard)
      WILDCARD=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo ""
      echo "Usage:"
      echo "  $0 --email your@email.com --domain example.com [--staging] [--wildcard]"
      exit 1
      ;;
  esac
done

# Validate required arguments
if [ -z "$EMAIL" ] || [ -z "$DOMAIN" ]; then
  print_error "Missing required arguments"
  echo ""
  echo "Usage:"
  echo "  $0 --email your@email.com --domain example.com [--staging] [--wildcard]"
  echo ""
  echo "Options:"
  echo "  --email      Email for Let's Encrypt notifications"
  echo "  --domain     Domain name"
  echo "  --staging    Use Let's Encrypt staging server (for testing)"
  echo "  --wildcard   Generate wildcard certificate (requires DNS challenge)"
  exit 1
fi

echo "========================================="
echo "SSL Certificate Generation"
echo "========================================="
echo ""
echo "Email: $EMAIL"
echo "Domain: $DOMAIN"

if [ "$STAGING" = true ]; then
  echo "Mode: STAGING (testing)"
  STAGING_FLAG="--staging"
else
  echo "Mode: PRODUCTION"
  STAGING_FLAG=""
fi

if [ "$WILDCARD" = true ]; then
  echo "Type: Wildcard certificate"
else
  echo "Type: Standard certificate"
fi

echo ""

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
  print_info "Installing certbot..."

  if command -v apt-get &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y certbot
  elif command -v yum &> /dev/null; then
    sudo yum install -y certbot
  else
    print_error "Cannot install certbot automatically"
    echo "Please install certbot manually: https://certbot.eff.org/"
    exit 1
  fi

  print_success "Certbot installed"
fi

# Generate certificate
if [ "$WILDCARD" = true ]; then
  print_info "Obtaining wildcard certificate (requires DNS challenge)..."

  sudo certbot certonly \
    --manual \
    --preferred-challenges dns \
    -d "$DOMAIN" \
    -d "*.$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    $STAGING_FLAG
else
  print_info "Obtaining standard certificate (webroot challenge)..."

  # Ensure webroot directory exists
  mkdir -p nginx/html

  sudo certbot certonly \
    --webroot \
    -w nginx/html \
    -d "$DOMAIN" \
    -d "api.$DOMAIN" \
    -d "ws.$DOMAIN" \
    -d "admin.$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    $STAGING_FLAG
fi

if [ $? -eq 0 ]; then
  print_success "Certificate obtained successfully"

  # Copy certificates to nginx/ssl
  print_info "Copying certificates to nginx/ssl/..."

  mkdir -p nginx/ssl
  sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" nginx/ssl/
  sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" nginx/ssl/
  sudo cp "/etc/letsencrypt/live/$DOMAIN/chain.pem" nginx/ssl/
  sudo chown $(whoami):$(whoami) nginx/ssl/*.pem
  sudo chmod 600 nginx/ssl/*.pem

  print_success "Certificates copied"

  # Setup auto-renewal
  print_info "Setting up auto-renewal..."

  CRON_CMD="0 12 * * * certbot renew --quiet --deploy-hook 'docker-compose restart nginx'"

  (crontab -l 2>/dev/null | grep -v "certbot renew"; echo "$CRON_CMD") | crontab -

  print_success "Auto-renewal configured (daily at 12:00)"

  echo ""
  echo "========================================="
  echo "Certificate Information"
  echo "========================================="
  sudo certbot certificates -d "$DOMAIN"

  echo ""
  print_success "SSL certificate ready!"
  echo ""
  echo "Next steps:"
  echo "1. Restart Nginx: docker-compose restart nginx"
  echo "2. Test your SSL: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
  echo ""
else
  print_error "Failed to obtain certificate"
  exit 1
fi
