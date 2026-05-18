#!/bin/bash
# SF-1 Ultimate - Quick Start Script
# Automatisiertes Setup für Development

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "🌿 SF-1 Ultimate - Quick Start"
echo "=========================================="
echo ""

# Step 1: Check Prerequisites
echo -e "${BLUE}Step 1: Checking prerequisites...${NC}"
command -v node >/dev/null 2>&1 || { echo -e "${RED}❌ Node.js not found. Install Node.js 20+${NC}"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker not found. Install Docker${NC}"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}❌ Docker Compose not found${NC}"; exit 1; }
echo -e "${GREEN}✅ All prerequisites found${NC}"
echo ""

# Step 2: Environment Setup
echo -e "${BLUE}Step 2: Setting up environment...${NC}"
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env and set your secrets!${NC}"
    echo -e "${YELLOW}   Use: openssl rand -base64 64${NC}"
    echo ""
    read -p "Press Enter after you've configured .env..."
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# Run environment check
echo "Validating .env configuration..."
if [ -f scripts/check-env.sh ]; then
    ./scripts/check-env.sh || { echo -e "${RED}❌ Environment check failed${NC}"; exit 1; }
fi
echo ""

# Step 3: Start Docker Infrastructure
echo -e "${BLUE}Step 3: Starting Docker infrastructure...${NC}"
docker-compose up -d postgres mongodb redis meilisearch
echo "Waiting for databases to be ready (30 seconds)..."
sleep 30
echo -e "${GREEN}✅ Docker infrastructure started${NC}"
echo ""

# Step 4: Install Dependencies
echo -e "${BLUE}Step 4: Installing dependencies...${NC}"

install_service() {
    local service=$1
    echo "Installing $service..."
    cd apps/$service
    npm install --silent
    cd ../..
}

install_service "auth-service"
install_service "price-service"
install_service "journal-service"
install_service "tools-service"
install_service "community-service"
install_service "notification-service"
install_service "search-service"
install_service "media-service"
install_service "gamification-service"
install_service "ai-service"
install_service "web-app"

echo -e "${GREEN}✅ All dependencies installed${NC}"
echo ""

# Step 5: Setup Auth-Service Database
echo -e "${BLUE}Step 5: Setting up auth-service database...${NC}"
cd apps/auth-service
npm run prisma:generate
npm run prisma:migrate
cd ../..
echo -e "${GREEN}✅ Database setup complete${NC}"
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}🎉 Quick Start Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Start all services:"
echo "   ${BLUE}./scripts/start-all.sh${NC}"
echo ""
echo "2. Or start services individually:"
echo "   ${BLUE}cd apps/auth-service && npm run dev${NC}"
echo "   ${BLUE}cd apps/web-app && npm run dev${NC}"
echo ""
echo "3. Check health status:"
echo "   ${BLUE}./scripts/health-check.sh${NC}"
echo ""
echo "4. Open frontend:"
echo "   ${BLUE}http://localhost:3000${NC}"
echo ""
echo "For detailed instructions, see SETUP.md"
echo ""
