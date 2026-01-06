#!/bin/bash
# ==========================================
# Load Balancing Test Script
# ==========================================
# Tests load balancing across multiple service instances
#
# Usage:
#   ./nginx/scripts/test-load-balancing.sh
#   ./nginx/scripts/test-load-balancing.sh --requests 1000
# ==========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
REQUESTS=100
CONCURRENCY=10
URL="http://localhost/api/prices/current/BTC"

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
    --requests)
      REQUESTS="$2"
      shift 2
      ;;
    --concurrency)
      CONCURRENCY="$2"
      shift 2
      ;;
    --url)
      URL="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "========================================="
echo "Load Balancing Test"
echo "========================================="
echo ""
echo "URL: $URL"
echo "Requests: $REQUESTS"
echo "Concurrency: $CONCURRENCY"
echo ""

# ==========================================
# 1. Check Dependencies
# ==========================================
if ! command -v ab &> /dev/null; then
  print_error "Apache Bench (ab) not found"
  echo ""
  echo "Install with:"
  echo "  Ubuntu/Debian: sudo apt-get install apache2-utils"
  echo "  macOS: brew install httpd"
  exit 1
fi

# ==========================================
# 2. Scale Service Instances
# ==========================================
print_info "Scaling price-service to 3 instances..."

docker-compose up -d --scale price-service=3

sleep 5

print_success "Service scaled"

echo ""

# ==========================================
# 3. Run Load Test
# ==========================================
print_info "Running load test..."

ab -n $REQUESTS -c $CONCURRENCY -g /tmp/load-test.tsv "$URL" > /tmp/load-test-results.txt 2>&1

if [ $? -eq 0 ]; then
  print_success "Load test completed"
else
  print_error "Load test failed"
  cat /tmp/load-test-results.txt
  exit 1
fi

echo ""

# ==========================================
# 4. Analyze Results
# ==========================================
echo "========================================="
echo "Results"
echo "========================================="
echo ""

# Extract key metrics
REQUESTS_PER_SEC=$(grep "Requests per second" /tmp/load-test-results.txt | awk '{print $4}')
TIME_PER_REQUEST=$(grep "Time per request.*mean" /tmp/load-test-results.txt | head -1 | awk '{print $4}')
FAILED_REQUESTS=$(grep "Failed requests" /tmp/load-test-results.txt | awk '{print $3}')

echo "Requests per second: $REQUESTS_PER_SEC"
echo "Time per request: ${TIME_PER_REQUEST}ms"
echo "Failed requests: $FAILED_REQUESTS"

echo ""

# Percentiles
echo "Response Time Percentiles:"
grep "50%\|66%\|75%\|80%\|90%\|95%\|98%\|99%\|100%" /tmp/load-test-results.txt

echo ""

# ==========================================
# 5. Check Load Distribution
# ==========================================
print_info "Checking load distribution across instances..."

echo ""
echo "Container Request Counts:"

docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep price-service

echo ""

# Check Nginx access logs for upstream distribution
print_info "Upstream distribution from Nginx logs:"

docker exec sf1-nginx cat /var/log/nginx/access.log | \
  grep -o '"upstream_addr":"[^"]*"' | \
  sort | uniq -c | sort -rn

echo ""

# ==========================================
# 6. Summary
# ==========================================
if [ "$FAILED_REQUESTS" = "0" ]; then
  print_success "All requests successful!"

  if (( $(echo "$REQUESTS_PER_SEC > 100" | bc -l) )); then
    print_success "High throughput: ${REQUESTS_PER_SEC} req/s"
  else
    print_info "Throughput: ${REQUESTS_PER_SEC} req/s"
  fi
else
  print_error "$FAILED_REQUESTS requests failed"
fi

echo ""
print_success "Load balancing test complete! ✨"
echo ""
echo "Full results: /tmp/load-test-results.txt"
echo "Raw data: /tmp/load-test.tsv"
echo ""
