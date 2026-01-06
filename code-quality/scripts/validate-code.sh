#!/bin/bash
# ==========================================
# Code Quality Validation Script
# ==========================================
# Runs all code quality checks manually
#
# Usage:
#   ./code-quality/scripts/validate-code.sh
#   ./code-quality/scripts/validate-code.sh --fix
# ==========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
FIX_MODE=false
if [ "$1" = "--fix" ]; then
  FIX_MODE=true
fi

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

# Track failures
FAILED=0

print_header "SF-1 Ultimate Code Quality Check"

if [ "$FIX_MODE" = true ]; then
  echo "🔧 Fix mode enabled - will auto-fix issues"
else
  echo "🔍 Check mode - use --fix to auto-fix issues"
fi

echo ""

# ==========================================
# 1. ESLint
# ==========================================
print_header "Running ESLint"

if [ "$FIX_MODE" = true ]; then
  npm run lint:fix
else
  npm run lint
fi

if [ $? -eq 0 ]; then
  print_success "ESLint passed"
else
  print_error "ESLint failed"
  FAILED=1
fi

echo ""

# ==========================================
# 2. Prettier
# ==========================================
print_header "Checking Code Formatting"

if [ "$FIX_MODE" = true ]; then
  npm run format
  print_success "Code formatted with Prettier"
else
  npm run format:check

  if [ $? -eq 0 ]; then
    print_success "Code formatting passed"
  else
    print_error "Code formatting failed"
    echo ""
    echo "Run with --fix to auto-format: $0 --fix"
    FAILED=1
  fi
fi

echo ""

# ==========================================
# 3. TypeScript Type Checking
# ==========================================
print_header "Running TypeScript Type Checking"

# Check root
if [ -f "tsconfig.json" ]; then
  tsc --noEmit

  if [ $? -eq 0 ]; then
    print_success "Root TypeScript check passed"
  else
    print_error "Root TypeScript check failed"
    FAILED=1
  fi
fi

# Check each service
for service_dir in apps/*/; do
  if [ -f "$service_dir/tsconfig.json" ]; then
    service_name=$(basename "$service_dir")
    print_info "Checking: $service_name"

    (cd "$service_dir" && tsc --noEmit)

    if [ $? -eq 0 ]; then
      print_success "TypeScript check passed for $service_name"
    else
      print_error "TypeScript check failed for $service_name"
      FAILED=1
    fi
  fi
done

echo ""

# ==========================================
# 4. Tests
# ==========================================
print_header "Running Tests"

npm test -- --coverage --passWithNoTests

if [ $? -eq 0 ]; then
  print_success "Tests passed"
else
  print_error "Tests failed"
  FAILED=1
fi

echo ""

# ==========================================
# 5. Security Audit
# ==========================================
print_header "Running Security Audit"

npm audit --audit-level=moderate

if [ $? -eq 0 ]; then
  print_success "No security vulnerabilities found"
else
  print_error "Security vulnerabilities detected"
  echo ""
  echo "Run 'npm audit fix' to fix automatically"
  FAILED=1
fi

echo ""

# ==========================================
# 6. Dependency Check
# ==========================================
print_header "Checking Dependencies"

# Check for outdated dependencies
OUTDATED=$(npm outdated 2>/dev/null | wc -l)

if [ $OUTDATED -gt 1 ]; then
  print_error "$((OUTDATED - 1)) outdated dependencies found"
  npm outdated
  echo ""
  echo "Run 'npm update' to update dependencies"
else
  print_success "All dependencies up to date"
fi

echo ""

# ==========================================
# 7. Code Metrics
# ==========================================
print_header "Code Metrics"

# Count lines of code
if command -v cloc &> /dev/null; then
  cloc src apps --quiet --csv | tail -1 | awk -F, '{print "  Total Lines: " $5}'
else
  print_info "Install 'cloc' for code metrics: brew install cloc"
fi

# Test coverage
if [ -f "coverage/coverage-summary.json" ]; then
  COVERAGE=$(cat coverage/coverage-summary.json | grep -o '"lines":{"total":[0-9]*,"covered":[0-9]*' | head -1 | awk -F: '{print $4}')
  TOTAL=$(cat coverage/coverage-summary.json | grep -o '"lines":{"total":[0-9]*' | head -1 | awk -F: '{print $3}')

  if [ -n "$COVERAGE" ] && [ -n "$TOTAL" ]; then
    PERCENT=$(awk "BEGIN {printf \"%.1f\", ($COVERAGE/$TOTAL)*100}")
    echo "  Test Coverage: $PERCENT%"

    if (( $(echo "$PERCENT >= 80" | bc -l) )); then
      print_success "Coverage above 80%"
    else
      print_error "Coverage below 80% (target: 80%)"
    fi
  fi
fi

echo ""

# ==========================================
# Summary
# ==========================================
print_header "Summary"

if [ $FAILED -eq 0 ]; then
  echo ""
  print_success "All checks passed! ✨"
  echo ""
  echo "${GREEN}Your code is ready to commit! 🚀${NC}"
  echo ""
  exit 0
else
  echo ""
  print_error "Some checks failed"
  echo ""
  echo "Fix errors and run again"
  if [ "$FIX_MODE" = false ]; then
    echo "Or run with --fix to auto-fix: $0 --fix"
  fi
  echo ""
  exit 1
fi
