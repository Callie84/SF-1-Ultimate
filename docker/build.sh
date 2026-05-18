#!/bin/bash
# ==========================================
# SF-1 Ultimate - Docker Build Helper Script
# ==========================================
# Optimized build script with BuildKit, caching, and parallel builds
#
# Usage:
#   ./docker/build.sh                    # Build all services
#   ./docker/build.sh auth-service       # Build specific service
#   ./docker/build.sh auth-service v1.0.0 # Build with tag
#
# Environment Variables:
#   REGISTRY    - Docker registry (default: ghcr.io/sf1-ultimate)
#   TAG         - Image tag (default: latest)
#   NO_CACHE    - Set to 1 to disable cache
#   PARALLEL    - Set to 1 to build in parallel
# ==========================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGISTRY=${REGISTRY:-"ghcr.io/sf1-ultimate"}
TAG=${TAG:-"latest"}
DOCKER_BUILDKIT=${DOCKER_BUILDKIT:-1}

# Services to build
SERVICES=(
  "auth-service"
  "price-service"
)

# ==========================================
# Functions
# ==========================================

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

build_service() {
  local service=$1
  local tag=${2:-$TAG}
  local service_path="./apps/$service"

  if [ ! -d "$service_path" ]; then
    print_error "Service directory not found: $service_path"
    return 1
  fi

  print_header "Building $service:$tag"

  local build_args=(
    "--build-arg" "BUILDKIT_INLINE_CACHE=1"
    "--build-arg" "NODE_ENV=production"
    "--target" "production"
    "-t" "$REGISTRY/$service:$tag"
    "-t" "$REGISTRY/$service:latest"
  )

  # Add cache options
  if [ "$NO_CACHE" != "1" ]; then
    build_args+=(
      "--cache-from" "$REGISTRY/$service:latest"
    )
  else
    build_args+=("--no-cache")
  fi

  # Build command
  print_info "Building with BuildKit..."
  if DOCKER_BUILDKIT=1 docker build "${build_args[@]}" "$service_path"; then
    print_success "Successfully built $service:$tag"

    # Show image size
    local size=$(docker images --format "{{.Size}}" "$REGISTRY/$service:$tag" | head -1)
    print_info "Image size: $size"

    return 0
  else
    print_error "Failed to build $service:$tag"
    return 1
  fi
}

build_all() {
  print_header "Building All Services"

  local failed=()

  if [ "$PARALLEL" == "1" ]; then
    print_info "Building services in parallel..."

    # Build in parallel using background jobs
    local pids=()
    for service in "${SERVICES[@]}"; do
      build_service "$service" &
      pids+=($!)
    done

    # Wait for all builds
    for i in "${!pids[@]}"; do
      if ! wait ${pids[$i]}; then
        failed+=("${SERVICES[$i]}")
      fi
    done
  else
    # Build sequentially
    for service in "${SERVICES[@]}"; do
      if ! build_service "$service"; then
        failed+=("$service")
      fi
    done
  fi

  # Summary
  echo
  print_header "Build Summary"

  local success_count=$((${#SERVICES[@]} - ${#failed[@]}))
  print_success "Successfully built: $success_count/${#SERVICES[@]} services"

  if [ ${#failed[@]} -gt 0 ]; then
    print_error "Failed builds: ${failed[*]}"
    return 1
  fi

  return 0
}

show_usage() {
  cat <<EOF
${BLUE}SF-1 Ultimate Docker Build Script${NC}

Usage:
  $0                         Build all services
  $0 <service>              Build specific service
  $0 <service> <tag>        Build service with custom tag

Services:
  $(printf "  - %s\n" "${SERVICES[@]}")

Environment Variables:
  REGISTRY       Docker registry (default: $REGISTRY)
  TAG            Image tag (default: $TAG)
  NO_CACHE       Disable build cache (set to 1)
  PARALLEL       Build services in parallel (set to 1)

Examples:
  $0                                  # Build all services
  $0 auth-service                    # Build auth-service:latest
  $0 auth-service v1.0.0             # Build auth-service:v1.0.0
  NO_CACHE=1 $0 auth-service         # Build without cache
  PARALLEL=1 $0                      # Parallel build
  REGISTRY=myregistry.com $0         # Custom registry

EOF
}

# ==========================================
# Main
# ==========================================

main() {
  # Check Docker is available
  if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
  fi

  # Check BuildKit
  if [ "$DOCKER_BUILDKIT" != "1" ]; then
    print_info "Enabling Docker BuildKit..."
    export DOCKER_BUILDKIT=1
  fi

  # Parse arguments
  case "$1" in
    -h|--help)
      show_usage
      exit 0
      ;;
    "")
      build_all
      ;;
    *)
      local service=$1
      local tag=${2:-$TAG}

      # Check if service exists
      if [[ ! " ${SERVICES[@]} " =~ " ${service} " ]]; then
        print_error "Unknown service: $service"
        echo "Available services: ${SERVICES[*]}"
        exit 1
      fi

      build_service "$service" "$tag"
      ;;
  esac
}

# Run main
main "$@"
