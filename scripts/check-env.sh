#!/bin/bash
# SF-1 Ultimate - Environment Configuration Checker
# Prüft ob alle kritischen Environment-Variablen gesetzt sind

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "SF-1 Ultimate - Environment Check"
echo "=========================================="
echo ""

# Prüfe ob .env existiert
if [ ! -f .env ]; then
    echo -e "${RED}❌ ERROR: .env file not found!${NC}"
    echo "   Run: cp .env.example .env"
    exit 1
fi

# Source .env
set -a
source .env
set +a

echo "Checking critical environment variables..."
echo ""

ERRORS=0
WARNINGS=0

# Funktion zum Prüfen einer Variable
check_var() {
    local var_name=$1
    local var_value=${!var_name}
    local is_critical=$2
    local min_length=${3:-16}

    if [ -z "$var_value" ]; then
        if [ "$is_critical" = "critical" ]; then
            echo -e "${RED}❌ $var_name is NOT SET (CRITICAL!)${NC}"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠️  $var_name is not set (optional)${NC}"
            ((WARNINGS++))
        fi
    elif [[ "$var_value" == *"CHANGE_ME"* ]]; then
        echo -e "${RED}❌ $var_name still has default value 'CHANGE_ME'${NC}"
        ((ERRORS++))
    elif [ ${#var_value} -lt $min_length ]; then
        echo -e "${YELLOW}⚠️  $var_name is too short (${#var_value} chars, min $min_length recommended)${NC}"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✅ $var_name is set (${#var_value} chars)${NC}"
    fi
}

# KRITISCHE Variablen (MÜSSEN gesetzt sein)
echo "Critical Variables:"
check_var "JWT_SECRET" "critical" 32
check_var "JWT_REFRESH_SECRET" "critical" 32
check_var "POSTGRES_PASSWORD" "critical" 16
check_var "MONGODB_ROOT_PASSWORD" "critical" 16
check_var "MONGO_PASSWORD" "critical" 16
check_var "REDIS_PASSWORD" "critical" 16

echo ""
echo "Optional Variables:"
check_var "OPENAI_API_KEY" "optional" 20
check_var "MEILISEARCH_API_KEY" "optional" 16
check_var "TRAEFIK_ADMIN_PASSWORD" "optional" 16

echo ""
echo "Configuration Variables:"
check_var "NODE_ENV" "critical" 0
check_var "CORS_ORIGIN" "critical" 0
check_var "NEXT_PUBLIC_API_URL" "critical" 0

echo ""
echo "=========================================="

# Prüfe ob JWT_SECRET und JWT_REFRESH_SECRET unterschiedlich sind
if [ -n "$JWT_SECRET" ] && [ "$JWT_SECRET" = "$JWT_REFRESH_SECRET" ]; then
    echo -e "${RED}❌ ERROR: JWT_SECRET and JWT_REFRESH_SECRET must be different!${NC}"
    ((ERRORS++))
fi

# Zusammenfassung
echo ""
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All critical checks passed!${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found (non-critical)${NC}"
    fi
    echo ""
    echo "You can now start the services:"
    echo "  docker-compose up -d"
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) found!${NC}"
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found${NC}"
    echo ""
    echo "Please fix the errors before starting services."
    echo ""
    echo "Generate secure secrets with:"
    echo "  openssl rand -base64 64  # For JWT secrets"
    echo "  openssl rand -base64 32  # For passwords"
    exit 1
fi
