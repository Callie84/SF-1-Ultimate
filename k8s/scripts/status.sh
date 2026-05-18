#!/bin/bash
# ==========================================
# Kubernetes Status Check Script
# ==========================================
# Shows detailed status of SF-1 Ultimate deployment
#
# Usage:
#   ./k8s/scripts/status.sh
#   ./k8s/scripts/status.sh --namespace sf1-ultimate
# ==========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NAMESPACE="sf1-ultimate"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --namespace)
      NAMESPACE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

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

print_header "SF-1 Ultimate Status Check"

echo ""
echo "Namespace: $NAMESPACE"
echo "Cluster: $(kubectl config current-context)"
echo ""

# ==========================================
# 1. Pods
# ==========================================
print_header "Pods"

kubectl get pods -n $NAMESPACE -o wide

echo ""

# Check pod status
RUNNING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
TOTAL=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l)

if [ "$RUNNING" -eq "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
  print_success "All pods running ($RUNNING/$TOTAL)"
else
  print_error "Some pods not running ($RUNNING/$TOTAL)"
fi

echo ""

# ==========================================
# 2. Services
# ==========================================
print_header "Services"

kubectl get services -n $NAMESPACE

echo ""

# ==========================================
# 3. Deployments
# ==========================================
print_header "Deployments"

kubectl get deployments -n $NAMESPACE

echo ""

# Check deployment readiness
READY_DEPLOYMENTS=$(kubectl get deployments -n $NAMESPACE --no-headers 2>/dev/null | awk '{if ($2 == $3 && $2 > 0) print $1}' | wc -l)
TOTAL_DEPLOYMENTS=$(kubectl get deployments -n $NAMESPACE --no-headers 2>/dev/null | wc -l)

if [ "$READY_DEPLOYMENTS" -eq "$TOTAL_DEPLOYMENTS" ] && [ "$TOTAL_DEPLOYMENTS" -gt 0 ]; then
  print_success "All deployments ready ($READY_DEPLOYMENTS/$TOTAL_DEPLOYMENTS)"
else
  print_error "Some deployments not ready ($READY_DEPLOYMENTS/$TOTAL_DEPLOYMENTS)"
fi

echo ""

# ==========================================
# 4. StatefulSets
# ==========================================
print_header "StatefulSets (Databases)"

kubectl get statefulsets -n $NAMESPACE

echo ""

# ==========================================
# 5. HPA
# ==========================================
print_header "HorizontalPodAutoscalers"

kubectl get hpa -n $NAMESPACE

echo ""

# ==========================================
# 6. Ingress
# ==========================================
print_header "Ingress"

kubectl get ingress -n $NAMESPACE

echo ""

# ==========================================
# 7. PersistentVolumeClaims
# ==========================================
print_header "PersistentVolumeClaims"

kubectl get pvc -n $NAMESPACE

echo ""

# ==========================================
# 8. Resource Usage
# ==========================================
print_header "Resource Usage"

echo ""
echo "CPU & Memory:"
kubectl top pods -n $NAMESPACE 2>/dev/null || echo "Metrics server not available"

echo ""

# ==========================================
# 9. Recent Events
# ==========================================
print_header "Recent Events"

kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -20

echo ""

# ==========================================
# 10. Health Checks
# ==========================================
print_header "Health Checks"

echo ""
echo "Checking pod health..."

UNHEALTHY_PODS=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | grep -v Running | grep -v Completed || true)

if [ -z "$UNHEALTHY_PODS" ]; then
  print_success "All pods healthy"
else
  print_error "Unhealthy pods found:"
  echo "$UNHEALTHY_PODS"
fi

echo ""

# ==========================================
# Summary
# ==========================================
print_header "Summary"

echo ""
echo "Pods:        $RUNNING/$TOTAL running"
echo "Deployments: $READY_DEPLOYMENTS/$TOTAL_DEPLOYMENTS ready"
echo ""

if [ "$RUNNING" -eq "$TOTAL" ] && [ "$READY_DEPLOYMENTS" -eq "$TOTAL_DEPLOYMENTS" ] && [ "$TOTAL" -gt 0 ]; then
  print_success "All systems operational! ✅"
else
  print_error "Some issues detected. Check logs with: ./k8s/scripts/logs.sh"
fi

echo ""
