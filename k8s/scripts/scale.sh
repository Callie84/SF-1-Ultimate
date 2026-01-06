#!/bin/bash
# ==========================================
# Kubernetes Scaling Script
# ==========================================
# Scale SF-1 Ultimate deployments
#
# Usage:
#   ./k8s/scripts/scale.sh auth-service 5
#   ./k8s/scripts/scale.sh price-service 3
# ==========================================

set -e

NAMESPACE="sf1-ultimate"

if [ $# -lt 2 ]; then
  echo "Usage: $0 <deployment-name> <replicas>"
  echo ""
  echo "Available deployments:"
  kubectl get deployments -n $NAMESPACE --no-headers 2>/dev/null | awk '{print "  - " $1}'
  exit 1
fi

DEPLOYMENT=$1
REPLICAS=$2

echo "Scaling $DEPLOYMENT to $REPLICAS replicas..."

kubectl scale deployment/$DEPLOYMENT --replicas=$REPLICAS -n $NAMESPACE

echo ""
echo "Waiting for rollout to complete..."
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE

echo ""
echo "✓ Scaled successfully!"
echo ""
kubectl get deployment/$DEPLOYMENT -n $NAMESPACE
