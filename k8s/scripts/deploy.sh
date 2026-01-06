#!/bin/bash
# ==========================================
# Kubernetes Deployment Script
# ==========================================
# Deploys SF-1 Ultimate to Kubernetes cluster
#
# Usage:
#   ./k8s/scripts/deploy.sh
#   ./k8s/scripts/deploy.sh --namespace sf1-ultimate
#   ./k8s/scripts/deploy.sh --dry-run
# ==========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
NAMESPACE="sf1-ultimate"
DRY_RUN=false
SKIP_SECRETS=false

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
    --namespace)
      NAMESPACE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-secrets)
      SKIP_SECRETS=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

KUBECTL_ARGS=""
if [ "$DRY_RUN" = true ]; then
  KUBECTL_ARGS="--dry-run=client"
  print_info "DRY RUN MODE - No changes will be made"
fi

print_header "SF-1 Ultimate Kubernetes Deployment"

echo ""
echo "Namespace: $NAMESPACE"
echo "Dry Run: $DRY_RUN"
echo ""

# ==========================================
# 1. Check Prerequisites
# ==========================================
print_header "Checking Prerequisites"

if ! command -v kubectl &> /dev/null; then
  print_error "kubectl not found"
  echo "Install kubectl: https://kubernetes.io/docs/tasks/tools/"
  exit 1
fi

print_success "kubectl $(kubectl version --client --short 2>/dev/null | cut -d' ' -f3)"

# Check cluster connectivity
if ! kubectl cluster-info &> /dev/null; then
  print_error "Cannot connect to Kubernetes cluster"
  echo "Run: kubectl cluster-info"
  exit 1
fi

print_success "Connected to cluster: $(kubectl config current-context)"

echo ""

# ==========================================
# 2. Create Namespace
# ==========================================
print_header "Creating Namespace"

kubectl apply -f k8s/namespace.yaml $KUBECTL_ARGS

print_success "Namespace created/updated"

echo ""

# ==========================================
# 3. Create ConfigMaps
# ==========================================
print_header "Creating ConfigMaps"

kubectl apply -f k8s/configmap.yaml -n $NAMESPACE $KUBECTL_ARGS

print_success "ConfigMaps created/updated"

echo ""

# ==========================================
# 4. Create Secrets
# ==========================================
if [ "$SKIP_SECRETS" = false ]; then
  print_header "Creating Secrets"

  print_info "⚠️  WARNING: Default secrets are being used!"
  print_info "Please update secrets in production:"
  echo ""
  echo "  kubectl create secret generic database-secrets \\"
  echo "    --from-literal=postgres-password=\$(openssl rand -base64 32) \\"
  echo "    --from-literal=mongodb-password=\$(openssl rand -base64 32) \\"
  echo "    --from-literal=redis-password=\$(openssl rand -base64 32) \\"
  echo "    -n $NAMESPACE"
  echo ""

  kubectl apply -f k8s/secrets.yaml -n $NAMESPACE $KUBECTL_ARGS

  print_success "Secrets created/updated"
else
  print_info "Skipping secrets creation (--skip-secrets)"
fi

echo ""

# ==========================================
# 5. Deploy Databases (StatefulSets)
# ==========================================
print_header "Deploying Databases"

print_info "Deploying PostgreSQL..."
kubectl apply -f k8s/statefulsets/postgres.yaml -n $NAMESPACE $KUBECTL_ARGS

print_info "Deploying MongoDB..."
kubectl apply -f k8s/statefulsets/mongodb.yaml -n $NAMESPACE $KUBECTL_ARGS

print_info "Deploying Redis..."
kubectl apply -f k8s/statefulsets/redis.yaml -n $NAMESPACE $KUBECTL_ARGS

print_success "Database deployments created/updated"

if [ "$DRY_RUN" = false ]; then
  print_info "Waiting for databases to be ready..."
  kubectl wait --for=condition=ready pod -l tier=database -n $NAMESPACE --timeout=300s || true
fi

echo ""

# ==========================================
# 6. Deploy Services
# ==========================================
print_header "Deploying Services"

kubectl apply -f k8s/services.yaml -n $NAMESPACE $KUBECTL_ARGS

print_success "Services created/updated"

echo ""

# ==========================================
# 7. Deploy Applications
# ==========================================
print_header "Deploying Applications"

print_info "Deploying Auth Service..."
kubectl apply -f k8s/deployments/auth-service.yaml -n $NAMESPACE $KUBECTL_ARGS

print_info "Deploying Price Service..."
kubectl apply -f k8s/deployments/price-service.yaml -n $NAMESPACE $KUBECTL_ARGS

print_info "Deploying Frontend..."
kubectl apply -f k8s/deployments/frontend.yaml -n $NAMESPACE $KUBECTL_ARGS

print_success "Application deployments created/updated"

if [ "$DRY_RUN" = false ]; then
  print_info "Waiting for applications to be ready..."
  kubectl wait --for=condition=ready pod -l tier=backend -n $NAMESPACE --timeout=300s || true
  kubectl wait --for=condition=ready pod -l tier=frontend -n $NAMESPACE --timeout=300s || true
fi

echo ""

# ==========================================
# 8. Deploy Ingress
# ==========================================
print_header "Deploying Ingress"

kubectl apply -f k8s/ingress.yaml -n $NAMESPACE $KUBECTL_ARGS

print_success "Ingress created/updated"

echo ""

# ==========================================
# 9. Deploy HPA
# ==========================================
print_header "Deploying HorizontalPodAutoscalers"

kubectl apply -f k8s/hpa.yaml -n $NAMESPACE $KUBECTL_ARGS

print_success "HPAs created/updated"

echo ""

# ==========================================
# 10. Deploy Monitoring (Optional)
# ==========================================
if [ -f "k8s/monitoring/prometheus.yaml" ]; then
  print_header "Deploying Monitoring"

  kubectl apply -f k8s/monitoring/prometheus.yaml -n $NAMESPACE $KUBECTL_ARGS || {
    print_info "Monitoring deployment skipped (Prometheus Operator not installed)"
  }

  echo ""
fi

# ==========================================
# 11. Verify Deployment
# ==========================================
if [ "$DRY_RUN" = false ]; then
  print_header "Deployment Status"

  echo ""
  echo "Pods:"
  kubectl get pods -n $NAMESPACE

  echo ""
  echo "Services:"
  kubectl get services -n $NAMESPACE

  echo ""
  echo "Ingress:"
  kubectl get ingress -n $NAMESPACE

  echo ""
  echo "HPA:"
  kubectl get hpa -n $NAMESPACE

  echo ""
fi

# ==========================================
# Summary
# ==========================================
print_header "Deployment Complete!"

echo ""

if [ "$DRY_RUN" = false ]; then
  print_success "SF-1 Ultimate deployed to Kubernetes!"

  echo ""
  echo "📋 Quick Commands:"
  echo "  kubectl get all -n $NAMESPACE              # View all resources"
  echo "  kubectl logs -f deployment/auth-service -n $NAMESPACE  # View logs"
  echo "  kubectl exec -it deployment/auth-service -n $NAMESPACE -- sh  # Shell access"
  echo "  kubectl port-forward svc/frontend 3000:3000 -n $NAMESPACE  # Port forward"
  echo ""
  echo "🌐 Access Application:"
  echo "  Frontend: http://localhost:3000 (after port-forward)"
  echo "  Or configure DNS for your Ingress"
  echo ""
  echo "📊 Monitoring:"
  echo "  kubectl port-forward -n monitoring svc/grafana 3000:3000"
  echo "  kubectl port-forward -n monitoring svc/prometheus 9090:9090"
  echo ""
  echo "🔧 Troubleshooting:"
  echo "  ./k8s/scripts/status.sh                    # Check status"
  echo "  ./k8s/scripts/logs.sh auth-service         # View logs"
  echo ""
else
  print_success "Dry run complete - no changes made"
  echo ""
  echo "Run without --dry-run to apply changes"
fi

echo ""
print_success "Deployment script finished! ✨"
echo ""
