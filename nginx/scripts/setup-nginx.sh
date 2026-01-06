#!/bin/bash
# ==========================================
# Nginx Setup Script
# ==========================================
# Installs and configures Nginx reverse proxy
#
# Usage:
#   ./nginx/scripts/setup-nginx.sh
#   ./nginx/scripts/setup-nginx.sh --ssl-email your@email.com
# ==========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
DOMAIN="sf1.example.com"
SSL_EMAIL=""
STAGING=false

print_header() {
  echo -e "${BLUE}=========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}=========================================${NC}"
}

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
    --domain)
      DOMAIN="$2"
      shift 2
      ;;
    --ssl-email)
      SSL_EMAIL="$2"
      shift 2
      ;;
    --staging)
      STAGING=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

print_header "Nginx Reverse Proxy Setup"

# ==========================================
# 1. Check Prerequisites
# ==========================================
print_header "Checking Prerequisites"

if ! command -v docker &> /dev/null; then
  print_error "Docker not found"
  echo "Please install Docker first"
  exit 1
fi

print_success "Docker $(docker --version | cut -d' ' -f3)"

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
  print_error "Docker Compose not found"
  exit 1
fi

print_success "Docker Compose available"

echo ""

# ==========================================
# 2. Create Directory Structure
# ==========================================
print_header "Creating Directory Structure"

mkdir -p nginx/ssl
mkdir -p nginx/cache
mkdir -p nginx/logs
mkdir -p nginx/html

print_success "Directories created"

echo ""

# ==========================================
# 3. Create SSL Placeholder Certificates
# ==========================================
print_header "Creating Placeholder Certificates"

if [ ! -f "nginx/ssl/fullchain.pem" ]; then
  print_info "Generating self-signed certificate..."

  openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout nginx/ssl/privkey.pem \
    -out nginx/ssl/fullchain.pem \
    -days 365 \
    -subj "/CN=${DOMAIN}" \
    2>/dev/null

  cp nginx/ssl/fullchain.pem nginx/ssl/chain.pem

  print_success "Self-signed certificate created"
  print_info "Replace with real certificate for production"
else
  print_success "SSL certificates already exist"
fi

echo ""

# ==========================================
# 4. Set Permissions
# ==========================================
print_header "Setting Permissions"

chmod 755 nginx/conf.d
chmod 644 nginx/conf.d/*.conf
chmod 644 nginx/nginx.conf
chmod 600 nginx/ssl/*.pem

print_success "Permissions set"

echo ""

# ==========================================
# 5. Test Nginx Configuration
# ==========================================
print_header "Testing Nginx Configuration"

# Check if Nginx container is running
if docker ps -a | grep -q nginx; then
  docker-compose exec nginx nginx -t

  if [ $? -eq 0 ]; then
    print_success "Nginx configuration is valid"
  else
    print_error "Nginx configuration has errors"
    exit 1
  fi
else
  print_info "Nginx container not running, skipping test"
fi

echo ""

# ==========================================
# 6. Setup Let's Encrypt (Optional)
# ==========================================
if [ -n "$SSL_EMAIL" ]; then
  print_header "Setting up Let's Encrypt SSL"

  print_info "Email: $SSL_EMAIL"
  print_info "Domain: $DOMAIN"

  if [ "$STAGING" = true ]; then
    print_info "Using Let's Encrypt STAGING server"
    STAGING_FLAG="--staging"
  else
    STAGING_FLAG=""
  fi

  # Install certbot
  if ! command -v certbot &> /dev/null; then
    print_info "Installing certbot..."

    if command -v apt-get &> /dev/null; then
      sudo apt-get update
      sudo apt-get install -y certbot python3-certbot-nginx
    elif command -v yum &> /dev/null; then
      sudo yum install -y certbot python3-certbot-nginx
    else
      print_error "Cannot install certbot automatically"
      print_info "Please install certbot manually"
      exit 1
    fi
  fi

  print_success "Certbot installed"

  # Obtain certificate
  print_info "Obtaining SSL certificate..."

  sudo certbot certonly --webroot \
    -w nginx/html \
    -d "$DOMAIN" \
    -d "api.$DOMAIN" \
    -d "ws.$DOMAIN" \
    -d "admin.$DOMAIN" \
    --email "$SSL_EMAIL" \
    --agree-tos \
    --no-eff-email \
    $STAGING_FLAG

  if [ $? -eq 0 ]; then
    print_success "SSL certificate obtained"

    # Copy certificates to nginx/ssl
    sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" nginx/ssl/
    sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" nginx/ssl/
    sudo cp "/etc/letsencrypt/live/$DOMAIN/chain.pem" nginx/ssl/
    sudo chown $(whoami):$(whoami) nginx/ssl/*.pem

    print_success "Certificates copied to nginx/ssl/"

    # Setup auto-renewal
    print_info "Setting up auto-renewal..."

    echo "0 12 * * * certbot renew --quiet --deploy-hook 'docker-compose restart nginx'" | sudo crontab -

    print_success "Auto-renewal configured (daily at 12:00)"
  else
    print_error "Failed to obtain SSL certificate"
    print_info "Using self-signed certificate"
  fi

  echo ""
fi

# ==========================================
# 7. Start/Restart Nginx
# ==========================================
print_header "Starting Nginx"

if docker ps -a | grep -q nginx; then
  print_info "Restarting Nginx container..."
  docker-compose restart nginx
else
  print_info "Starting Nginx container..."
  docker-compose up -d nginx
fi

if [ $? -eq 0 ]; then
  print_success "Nginx is running"
else
  print_error "Failed to start Nginx"
  exit 1
fi

# Wait for Nginx to be ready
sleep 3

# Check if Nginx is responding
if curl -k -s -o /dev/null -w "%{http_code}" https://localhost | grep -q "200\|301\|302"; then
  print_success "Nginx is responding to requests"
else
  print_error "Nginx is not responding"
  print_info "Check logs: docker-compose logs nginx"
fi

echo ""

# ==========================================
# 8. Summary
# ==========================================
print_header "Setup Complete!"

echo ""
echo "✅ Nginx reverse proxy configured and running"
echo ""
echo "📋 Configuration Files:"
echo "  - nginx/nginx.conf           # Main configuration"
echo "  - nginx/conf.d/default.conf  # Default virtual host"
echo "  - nginx/conf.d/websocket.conf # WebSocket support"
echo "  - nginx/conf.d/admin.conf    # Admin panel"
echo ""
echo "🔒 SSL/TLS:"
if [ -n "$SSL_EMAIL" ]; then
  echo "  ✓ Let's Encrypt SSL enabled"
  echo "  ✓ Auto-renewal configured"
else
  echo "  ⚠ Using self-signed certificate"
  echo "  Run with --ssl-email to get real certificate"
fi
echo ""
echo "🌐 Endpoints:"
echo "  https://$DOMAIN/               # Frontend"
echo "  https://api.$DOMAIN/api/auth/  # Auth API"
echo "  https://api.$DOMAIN/api/prices/ # Prices API"
echo "  https://admin.$DOMAIN/         # Admin panel"
echo "  https://ws.$DOMAIN/ws          # WebSocket"
echo ""
echo "🔧 Useful Commands:"
echo "  docker-compose logs nginx      # View logs"
echo "  docker-compose restart nginx   # Restart Nginx"
echo "  docker exec nginx nginx -t     # Test config"
echo "  docker exec nginx nginx -s reload # Reload config"
echo ""
echo "📚 Documentation:"
echo "  See nginx/README.md for detailed usage"
echo ""
echo "${GREEN}Nginx is ready! 🚀${NC}"
echo ""
