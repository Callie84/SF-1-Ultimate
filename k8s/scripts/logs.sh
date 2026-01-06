#!/bin/bash
# ==========================================
# Kubernetes Logs Script
# ==========================================
# View logs from SF-1 Ultimate services
#
# Usage:
#   ./k8s/scripts/logs.sh auth-service
#   ./k8s/scripts/logs.sh price-service --follow
#   ./k8s/scripts/logs.sh --all
# ==========================================

set -e

NAMESPACE="sf1-ultimate"
SERVICE=""
FOLLOW=false
ALL=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --namespace)
      NAMESPACE="$2"
      shift 2
      ;;
    --follow|-f)
      FOLLOW=true
      shift
      ;;
    --all)
      ALL=true
      shift
      ;;
    *)
      SERVICE="$1"
      shift
      ;;
  esac
done

if [ "$ALL" = false ] && [ -z "$SERVICE" ]; then
  echo "Usage: $0 <service-name> [--follow] [--namespace <namespace>]"
  echo ""
  echo "Available services:"
  kubectl get deployments -n $NAMESPACE --no-headers 2>/dev/null | awk '{print "  - " $1}'
  echo ""
  echo "Or use --all to view logs from all services"
  exit 1
fi

FOLLOW_ARG=""
if [ "$FOLLOW" = true ]; then
  FOLLOW_ARG="-f"
fi

if [ "$ALL" = true ]; then
  echo "Viewing logs from all services in namespace: $NAMESPACE"
  echo "Press Ctrl+C to stop"
  echo ""

  kubectl logs -l tier=backend -n $NAMESPACE $FOLLOW_ARG --all-containers=true --prefix=true
else
  echo "Viewing logs from: $SERVICE"
  echo "Namespace: $NAMESPACE"
  echo ""

  kubectl logs deployment/$SERVICE -n $NAMESPACE $FOLLOW_ARG --tail=100
fi
