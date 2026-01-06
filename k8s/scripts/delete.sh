#!/bin/bash
# ==========================================
# Kubernetes Deletion Script
# ==========================================
# Deletes SF-1 Ultimate from Kubernetes
#
# Usage:
#   ./k8s/scripts/delete.sh
#   ./k8s/scripts/delete.sh --confirm
# ==========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

NAMESPACE="sf1-ultimate"
CONFIRM=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --confirm)
      CONFIRM=true
      shift
      ;;
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

echo -e "${RED}=========================================${NC}"
echo -e "${RED}WARNING: This will DELETE all resources${NC}"
echo -e "${RED}=========================================${NC}"
echo ""
echo "Namespace: $NAMESPACE"
echo ""

if [ "$CONFIRM" = false ]; then
  echo "Resources that will be deleted:"
  echo ""
  kubectl get all -n $NAMESPACE 2>/dev/null || echo "No resources found"
  echo ""
  echo -e "${YELLOW}This action is IRREVERSIBLE!${NC}"
  echo ""
  read -p "Are you sure? Type 'yes' to continue: " RESPONSE

  if [ "$RESPONSE" != "yes" ]; then
    echo "Aborted."
    exit 1
  fi
fi

echo ""
echo "Deleting SF-1 Ultimate from Kubernetes..."

# Delete in reverse order
echo "Deleting Ingress..."
kubectl delete -f k8s/ingress.yaml -n $NAMESPACE --ignore-not-found=true

echo "Deleting HPA..."
kubectl delete -f k8s/hpa.yaml -n $NAMESPACE --ignore-not-found=true

echo "Deleting Deployments..."
kubectl delete -f k8s/deployments/ -n $NAMESPACE --ignore-not-found=true

echo "Deleting Services..."
kubectl delete -f k8s/services.yaml -n $NAMESPACE --ignore-not-found=true

echo "Deleting StatefulSets..."
kubectl delete -f k8s/statefulsets/ -n $NAMESPACE --ignore-not-found=true

echo "Deleting ConfigMaps..."
kubectl delete -f k8s/configmap.yaml -n $NAMESPACE --ignore-not-found=true

echo "Deleting Secrets..."
kubectl delete -f k8s/secrets.yaml -n $NAMESPACE --ignore-not-found=true

echo ""
read -p "Delete PersistentVolumeClaims (data will be LOST)? Type 'yes' to confirm: " DELETE_PVC

if [ "$DELETE_PVC" = "yes" ]; then
  echo "Deleting PVCs..."
  kubectl delete pvc --all -n $NAMESPACE
else
  echo "Keeping PVCs (data preserved)"
fi

echo ""
read -p "Delete namespace $NAMESPACE? Type 'yes' to confirm: " DELETE_NS

if [ "$DELETE_NS" = "yes" ]; then
  echo "Deleting namespace..."
  kubectl delete namespace $NAMESPACE
else
  echo "Keeping namespace"
fi

echo ""
echo -e "${GREEN}✓ Deletion complete${NC}"
echo ""
