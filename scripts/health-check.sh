#!/bin/bash
# SF-1 Ultimate - Health Check Script
# Prüft alle Services und Datenbanken

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "SF-1 Ultimate - System Health Check"
echo "=========================================="
echo ""

HEALTHY=0
UNHEALTHY=0

# Funktion zum Prüfen eines HTTP-Endpoints
check_http() {
    local name=$1
    local url=$2
    local expected=${3:-"healthy"}

    echo -n "Checking $name... "

    if response=$(curl -s -f "$url" 2>/dev/null); then
        if echo "$response" | grep -q "$expected"; then
            echo -e "${GREEN}✅ Healthy${NC}"
            ((HEALTHY++))
        else
            echo -e "${YELLOW}⚠️  Unexpected response${NC}"
            ((UNHEALTHY++))
        fi
    else
        echo -e "${RED}❌ Not reachable${NC}"
        ((UNHEALTHY++))
    fi
}

# Funktion zum Prüfen eines Docker-Containers
check_docker() {
    local name=$1
    local container=$2

    echo -n "Checking Docker: $name... "

    if docker ps --format '{{.Names}}' | grep -q "^$container$"; then
        local status=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null)
        if [ "$status" = "running" ]; then
            echo -e "${GREEN}✅ Running${NC}"
            ((HEALTHY++))
        else
            echo -e "${RED}❌ Status: $status${NC}"
            ((UNHEALTHY++))
        fi
    else
        echo -e "${RED}❌ Not found${NC}"
        ((UNHEALTHY++))
    fi
}

echo -e "${BLUE}=== Docker Infrastructure ===${NC}"
check_docker "PostgreSQL" "sf1-postgres"
check_docker "MongoDB" "sf1-mongodb"
check_docker "Redis" "sf1-redis"
check_docker "Meilisearch" "sf1-meilisearch"

echo ""
echo -e "${BLUE}=== Backend Services ===${NC}"
check_http "Auth Service" "http://localhost:3001/health"
check_http "Price Service" "http://localhost:3002/health"
check_http "Journal Service" "http://localhost:3003/health"
check_http "Tools Service" "http://localhost:3004/health"
check_http "Community Service" "http://localhost:3005/health"
check_http "Notification Service" "http://localhost:3006/health"
check_http "Search Service" "http://localhost:3007/health"
check_http "Media Service" "http://localhost:3008/health"
check_http "Gamification Service" "http://localhost:3009/health"
check_http "AI Service" "http://localhost:3010/health"

echo ""
echo -e "${BLUE}=== Frontend & Gateway ===${NC}"
check_http "Frontend" "http://localhost:3000" "DOCTYPE"
check_http "API Gateway" "http://localhost:8080/api/health" "healthy"

echo ""
echo "=========================================="
echo "Summary:"
echo -e "${GREEN}✅ Healthy: $HEALTHY${NC}"
echo -e "${RED}❌ Unhealthy: $UNHEALTHY${NC}"
echo "=========================================="

if [ $UNHEALTHY -eq 0 ]; then
    echo -e "${GREEN}🎉 All systems operational!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some services are not healthy${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check Docker containers: docker-compose ps"
    echo "  2. Check logs: docker-compose logs <service-name>"
    echo "  3. Verify .env configuration: ./scripts/check-env.sh"
    exit 1
fi
