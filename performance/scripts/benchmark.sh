#!/bin/bash
# ==========================================
# Performance Benchmarking Script
# ==========================================
# Tests API endpoints for response time and throughput
#
# Usage:
#   ./performance/scripts/benchmark.sh
#   ./performance/scripts/benchmark.sh <endpoint>
#   ./performance/scripts/benchmark.sh --all
# ==========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASE_URL=${BASE_URL:-"http://localhost:8080"}
CONCURRENT=${CONCURRENT:-100}
DURATION=${DURATION:-30}
TOOL=${TOOL:-"autocannon"}

# Endpoints to test
ENDPOINTS=(
  "GET /api/auth/health"
  "GET /api/prices/list?limit=50"
  "GET /api/prices/current/BTC"
)

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

check_dependencies() {
  print_header "Checking Dependencies"

  if command -v autocannon &> /dev/null; then
    print_success "autocannon installed"
    TOOL="autocannon"
  elif command -v ab &> /dev/null; then
    print_success "apache bench (ab) installed"
    TOOL="ab"
  else
    print_error "No benchmarking tool found"
    echo ""
    echo "Install one of:"
    echo "  npm install -g autocannon"
    echo "  apt-get install apache2-utils (for ab)"
    exit 1
  fi

  echo ""
}

benchmark_autocannon() {
  local url=$1
  local method=${2:-"GET"}

  print_info "Testing: $method $url"
  print_info "Config: $CONCURRENT connections, ${DURATION}s duration"
  echo ""

  autocannon -c $CONCURRENT -d $DURATION -m $method "$url" | tee /tmp/benchmark-result.txt

  # Parse results
  local avg_latency=$(grep "Avg:" /tmp/benchmark-result.txt | awk '{print $2}')
  local p95_latency=$(grep "p95:" /tmp/benchmark-result.txt | awk '{print $2}')
  local p99_latency=$(grep "p99:" /tmp/benchmark-result.txt | awk '{print $2}')
  local throughput=$(grep "Req/Sec" /tmp/benchmark-result.txt | awk '{print $2}')

  echo ""
  print_header "Results Summary"
  echo "Average Latency: $avg_latency"
  echo "95th Percentile: $p95_latency"
  echo "99th Percentile: $p99_latency"
  echo "Throughput:      $throughput req/s"
  echo ""

  # Check performance targets
  local p95_value=$(echo $p95_latency | sed 's/ms//')
  if (( $(echo "$p95_value < 100" | bc -l) )); then
    print_success "p95 latency < 100ms ✓"
  else
    print_error "p95 latency >= 100ms (target: <100ms)"
  fi

  echo ""
}

benchmark_ab() {
  local url=$1
  local total_requests=$((CONCURRENT * DURATION * 10))

  print_info "Testing: $url"
  print_info "Config: $total_requests requests, $CONCURRENT concurrent"
  echo ""

  ab -n $total_requests -c $CONCURRENT "$url" | tee /tmp/benchmark-result.txt

  # Parse results
  local rps=$(grep "Requests per second" /tmp/benchmark-result.txt | awk '{print $4}')
  local mean_time=$(grep "Time per request:" /tmp/benchmark-result.txt | head -1 | awk '{print $4}')

  echo ""
  print_header "Results Summary"
  echo "Throughput:     $rps req/s"
  echo "Mean Time:      ${mean_time}ms"
  echo ""
}

benchmark_endpoint() {
  local endpoint=$1
  local method=$(echo $endpoint | awk '{print $1}')
  local path=$(echo $endpoint | cut -d' ' -f2-)
  local url="$BASE_URL$path"

  echo ""
  print_header "Benchmarking: $endpoint"
  echo ""

  if [ "$TOOL" = "autocannon" ]; then
    benchmark_autocannon "$url" "$method"
  else
    benchmark_ab "$url"
  fi
}

benchmark_all() {
  print_header "SF-1 Ultimate Performance Benchmark"
  echo ""
  echo "Base URL:     $BASE_URL"
  echo "Tool:         $TOOL"
  echo "Concurrent:   $CONCURRENT"
  echo "Duration:     ${DURATION}s"
  echo ""

  local total_endpoints=${#ENDPOINTS[@]}
  local current=0

  for endpoint in "${ENDPOINTS[@]}"; do
    current=$((current + 1))
    echo ""
    print_info "Progress: $current/$total_endpoints"
    benchmark_endpoint "$endpoint"
    sleep 2  # Cool down between tests
  done

  print_header "Benchmark Complete"
  print_success "All endpoints tested"
}

show_usage() {
  cat <<EOF
${BLUE}SF-1 Ultimate Performance Benchmark${NC}

Usage:
  $0                         Benchmark all endpoints
  $0 <endpoint>             Benchmark specific endpoint
  $0 --all                  Benchmark all endpoints

Environment Variables:
  BASE_URL       Base URL (default: http://localhost:8080)
  CONCURRENT     Concurrent connections (default: 100)
  DURATION       Test duration in seconds (default: 30)

Examples:
  $0                                                    # All endpoints
  $0 "GET /api/prices/current/BTC"                     # Specific endpoint
  BASE_URL=https://api.example.com $0                  # Production
  CONCURRENT=200 DURATION=60 $0                        # Heavy load

EOF
}

main() {
  check_dependencies

  case "$1" in
    -h|--help)
      show_usage
      exit 0
      ;;
    --all|"")
      benchmark_all
      ;;
    *)
      benchmark_endpoint "$1"
      ;;
  esac
}

main "$@"
