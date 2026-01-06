#!/bin/bash
# ==========================================
# Kubernetes Rollback Script
# ==========================================
# Rollback SF-1 Ultimate deployments
#
# Usage:
#   ./k8s/scripts/rollback.sh auth-service
#   ./k8s/scripts/rollback.sh price-service --to-revision=2
# ==========================================

set -e

NAMESPACE="sf1-ultimate"
REVISION_ARG=""

if [ $# -lt 1 ]; then
  echo "Usage: $0 <deployment-name> [--to-revision=N]"
  echo ""
  echo "Available deployments:"
  kubectl get deployments -n $NAMESPACE --no-headers 2>/dev/null | awk '{print "  - " $1}'
  exit 1
fi

DEPLOYMENT=$1
shift

while [[ $# -gt 0 ]]; do
  case $1 in
    --to-revision=*)
      REVISION_ARG="$1"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

echo "Rolling back: $DEPLOYMENT"

# Show rollout history
echo ""
echo "Rollout history:"
kubectl rollout history deployment/$DEPLOYMENT -n $NAMESPACE

echo ""
echo "Rolling back..."

if [ -n "$REVISION_ARG" ]; then
  kubectl rollout undo deployment/$DEPLOYMENT -n $NAMESPACE $REVISION_ARG
else
  kubectl rollout undo deployment/$DEPLOYMENT -n $NAMESPACE
fi

echo ""
echo "Waiting for rollout to complete..."
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE

echo ""
echo "✓ Rollback successful!"
