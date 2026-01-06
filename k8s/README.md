---
# ☸️ Kubernetes Manifests

Production-ready Kubernetes deployment for SF-1 Ultimate microservices platform.

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Scaling](#scaling)
- [Monitoring](#monitoring)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Kubernetes deployment with production-grade features:

| Feature | Description | Status |
|---------|-------------|--------|
| **High Availability** | Multi-replica deployments | ✅ |
| **Auto-scaling** | HPA based on CPU/Memory | ✅ |
| **Zero-downtime** | Rolling updates | ✅ |
| **Persistent Storage** | StatefulSets with PVCs | ✅ |
| **Load Balancing** | Ingress with SSL/TLS | ✅ |
| **Health Checks** | Liveness/Readiness probes | ✅ |
| **Resource Limits** | CPU/Memory quotas | ✅ |
| **Monitoring** | Prometheus/Grafana | ✅ |
| **Security** | RBAC, Network Policies | ✅ |

---

## 🚀 Quick Start

### 1. Deploy to Kubernetes

```bash
# Deploy everything
./k8s/scripts/deploy.sh

# Or step by step
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/statefulsets/
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
```

### 2. Check Status

```bash
# View deployment status
./k8s/scripts/status.sh

# Check pods
kubectl get pods -n sf1-ultimate

# View logs
./k8s/scripts/logs.sh auth-service
```

### 3. Access Application

```bash
# Port forward (local access)
kubectl port-forward svc/frontend 3000:3000 -n sf1-ultimate

# Or configure DNS for Ingress
# Point sf1.example.com to your LoadBalancer IP
```

---

## 🏗️ Architecture

### Cluster Layout

```
Ingress (LoadBalancer)
    ↓
┌─────────────────────────────────────┐
│         Ingress Controller          │
│    (Nginx Ingress / Traefik)        │
└─────────────────────────────────────┘
    ↓           ↓           ↓
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Frontend │ │   Auth   │ │  Price   │
│  (2-6)   │ │  (3-10)  │ │  (2-8)   │
└──────────┘ └──────────┘ └──────────┘
    ↓           ↓           ↓
┌─────────────────────────────────────┐
│        Databases (StatefulSets)     │
│  PostgreSQL │ MongoDB  │  Redis     │
│     (1)     │   (1)    │   (1)      │
└─────────────────────────────────────┘
```

### File Structure

```
k8s/
├── namespace.yaml           # Namespace, quotas, limits
├── configmap.yaml           # Environment variables
├── secrets.yaml             # Sensitive data
├── services.yaml            # Kubernetes services
├── ingress.yaml             # Ingress rules
├── hpa.yaml                 # Auto-scaling rules
├── deployments/
│   ├── auth-service.yaml    # Auth deployment (3-10 replicas)
│   ├── price-service.yaml   # Price deployment (2-8 replicas)
│   └── frontend.yaml        # Frontend deployment (2-6 replicas)
├── statefulsets/
│   ├── postgres.yaml        # PostgreSQL (1 replica)
│   ├── mongodb.yaml         # MongoDB (1 replica)
│   └── redis.yaml           # Redis (1 replica)
├── monitoring/
│   └── prometheus.yaml      # ServiceMonitors, PrometheusRules
└── scripts/
    ├── deploy.sh            # Deployment script
    ├── status.sh            # Status check
    ├── logs.sh              # View logs
    ├── scale.sh             # Manual scaling
    ├── rollback.sh          # Rollback deployments
    └── delete.sh            # Cleanup script
```

---

## 📦 Prerequisites

### 1. Kubernetes Cluster

**Minimum requirements:**
- Kubernetes 1.24+
- 4 nodes (recommended)
- 16 GB RAM total
- 50 GB storage

**Supported platforms:**
- GKE (Google Kubernetes Engine)
- EKS (Amazon Elastic Kubernetes Service)
- AKS (Azure Kubernetes Service)
- Minikube (development)
- Kind (local testing)

### 2. Required Tools

```bash
# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Helm (optional, for cert-manager)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### 3. Ingress Controller

**Install Nginx Ingress:**

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
```

**Or Traefik:**

```bash
helm repo add traefik https://traefik.github.io/charts
helm install traefik traefik/traefik -n traefik-system --create-namespace
```

### 4. Cert-Manager (SSL/TLS)

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### 5. Metrics Server (for HPA)

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

---

## 🚀 Deployment

### Option 1: Automated Deployment

```bash
# Full deployment
./k8s/scripts/deploy.sh

# Dry run (test without applying)
./k8s/scripts/deploy.sh --dry-run

# Custom namespace
./k8s/scripts/deploy.sh --namespace my-namespace

# Skip secrets (use existing)
./k8s/scripts/deploy.sh --skip-secrets
```

### Option 2: Manual Deployment

```bash
# 1. Create namespace
kubectl apply -f k8s/namespace.yaml

# 2. Create ConfigMaps
kubectl apply -f k8s/configmap.yaml -n sf1-ultimate

# 3. Create Secrets (update first!)
kubectl apply -f k8s/secrets.yaml -n sf1-ultimate

# 4. Deploy Databases
kubectl apply -f k8s/statefulsets/ -n sf1-ultimate

# Wait for databases
kubectl wait --for=condition=ready pod -l tier=database -n sf1-ultimate --timeout=300s

# 5. Deploy Services
kubectl apply -f k8s/services.yaml -n sf1-ultimate

# 6. Deploy Applications
kubectl apply -f k8s/deployments/ -n sf1-ultimate

# 7. Deploy Ingress
kubectl apply -f k8s/ingress.yaml -n sf1-ultimate

# 8. Deploy HPA
kubectl apply -f k8s/hpa.yaml -n sf1-ultimate
```

### Verify Deployment

```bash
# Check all resources
kubectl get all -n sf1-ultimate

# Check status
./k8s/scripts/status.sh

# View logs
./k8s/scripts/logs.sh auth-service
```

---

## ⚙️ Configuration

### ConfigMaps

**Edit environment variables:**

```bash
kubectl edit configmap sf1-config -n sf1-ultimate
```

**Or update file and reapply:**

```yaml
# k8s/configmap.yaml
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  # ... other variables
```

```bash
kubectl apply -f k8s/configmap.yaml -n sf1-ultimate
kubectl rollout restart deployment -n sf1-ultimate
```

### Secrets

**Generate secure secrets:**

```bash
# Generate random passwords
openssl rand -base64 32

# Create secret
kubectl create secret generic database-secrets \
  --from-literal=postgres-password=$(openssl rand -base64 32) \
  --from-literal=mongodb-password=$(openssl rand -base64 32) \
  --from-literal=redis-password=$(openssl rand -base64 32) \
  --from-literal=jwt-access-secret=$(openssl rand -base64 32) \
  --from-literal=jwt-refresh-secret=$(openssl rand -base64 32) \
  -n sf1-ultimate
```

**Update existing secrets:**

```bash
kubectl edit secret database-secrets -n sf1-ultimate
```

### Resource Limits

**Per container:**

```yaml
resources:
  requests:
    cpu: 500m      # 0.5 CPU cores
    memory: 512Mi  # 512 MB
  limits:
    cpu: 1000m     # 1 CPU core
    memory: 1Gi    # 1 GB
```

**Per namespace:**

```yaml
# k8s/namespace.yaml
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi
```

---

## 📊 Scaling

### Manual Scaling

```bash
# Scale deployment
./k8s/scripts/scale.sh auth-service 5

# Or with kubectl
kubectl scale deployment/auth-service --replicas=5 -n sf1-ultimate
```

### Auto-scaling (HPA)

**View HPA status:**

```bash
kubectl get hpa -n sf1-ultimate
```

**Example output:**

```
NAME               REFERENCE                 TARGETS    MINPODS   MAXPODS   REPLICAS
auth-service-hpa   Deployment/auth-service   45%/70%    3         10        5
```

**Configure HPA:**

```yaml
# k8s/hpa.yaml
spec:
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70  # Scale up at 70% CPU
```

### Cluster Autoscaler

**GKE:**

```bash
gcloud container clusters update CLUSTER_NAME \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 10
```

**EKS:**

```bash
eksctl create nodegroup \
  --cluster=CLUSTER_NAME \
  --name=autoscaling-group \
  --node-type=t3.medium \
  --nodes-min=2 \
  --nodes-max=10 \
  --asg-access
```

---

## 📈 Monitoring

### Prometheus & Grafana

**Deploy Prometheus Operator:**

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```

**Apply ServiceMonitors:**

```bash
kubectl apply -f k8s/monitoring/prometheus.yaml -n sf1-ultimate
```

**Access Grafana:**

```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Default credentials:
# Username: admin
# Password: prom-operator
```

### Metrics

**View pod metrics:**

```bash
kubectl top pods -n sf1-ultimate
kubectl top nodes
```

**Custom metrics:**

```bash
# HTTP request rate
rate(http_requests_total[5m])

# Response time p95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status=~"5.."}[5m])
```

### Alerts

**Configure alerts in:**

```yaml
# k8s/monitoring/prometheus.yaml
spec:
  groups:
    - name: sf1-alerts
      rules:
        - alert: HighErrorRate
          expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
          for: 5m
```

---

## 🔧 Maintenance

### Updates & Rollouts

**Update image:**

```bash
kubectl set image deployment/auth-service \
  auth-service=sf1/auth-service:v2.0.0 \
  -n sf1-ultimate

# Watch rollout
kubectl rollout status deployment/auth-service -n sf1-ultimate
```

**Rollout history:**

```bash
kubectl rollout history deployment/auth-service -n sf1-ultimate
```

**Rollback:**

```bash
# Rollback to previous version
./k8s/scripts/rollback.sh auth-service

# Rollback to specific revision
./k8s/scripts/rollback.sh auth-service --to-revision=3
```

### Backups

**Database backups:**

```bash
# PostgreSQL
kubectl exec -it postgres-0 -n sf1-ultimate -- \
  pg_dump -U sf1_user sf1_auth > backup-$(date +%Y%m%d).sql

# MongoDB
kubectl exec -it mongodb-0 -n sf1-ultimate -- \
  mongodump --out=/backup --db=sf1_prices

# Copy backup
kubectl cp sf1-ultimate/mongodb-0:/backup ./mongodb-backup
```

**Velero (cluster-wide backups):**

```bash
# Install Velero
velero install --provider aws --bucket my-backup-bucket

# Create backup
velero backup create sf1-backup --include-namespaces sf1-ultimate

# Restore
velero restore create --from-backup sf1-backup
```

### Logs

**View logs:**

```bash
# Specific service
./k8s/scripts/logs.sh auth-service

# Follow logs
./k8s/scripts/logs.sh auth-service --follow

# All services
./k8s/scripts/logs.sh --all

# Last 1000 lines
kubectl logs deployment/auth-service --tail=1000 -n sf1-ultimate
```

**Centralized logging (ELK/EFK):**

```bash
# Install Elasticsearch + Fluentd + Kibana
helm install elasticsearch elastic/elasticsearch -n logging --create-namespace
helm install kibana elastic/kibana -n logging
helm install fluentd fluent/fluentd -n logging
```

---

## 🐛 Troubleshooting

### Pod Issues

**Pod not starting:**

```bash
# Check pod status
kubectl describe pod POD_NAME -n sf1-ultimate

# Check events
kubectl get events -n sf1-ultimate --sort-by='.lastTimestamp'

# View logs
kubectl logs POD_NAME -n sf1-ultimate
```

**Common issues:**

```bash
# ImagePullBackOff - Image not found
kubectl describe pod POD_NAME -n sf1-ultimate | grep -A 5 "Events:"

# CrashLoopBackOff - Application crashing
kubectl logs POD_NAME -n sf1-ultimate --previous

# Pending - No resources available
kubectl describe nodes
kubectl top nodes
```

### Service Issues

**Service not reachable:**

```bash
# Check service
kubectl get svc -n sf1-ultimate
kubectl describe svc SERVICE_NAME -n sf1-ultimate

# Check endpoints
kubectl get endpoints SERVICE_NAME -n sf1-ultimate

# Test from within cluster
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  wget -O- http://auth-service:3001/health
```

### Ingress Issues

**Ingress not working:**

```bash
# Check ingress
kubectl describe ingress sf1-ingress -n sf1-ultimate

# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Test backend
kubectl port-forward svc/frontend 3000:3000 -n sf1-ultimate
```

### Database Issues

**Database connection errors:**

```bash
# Check StatefulSet
kubectl get statefulsets -n sf1-ultimate
kubectl describe statefulset postgres -n sf1-ultimate

# Check PVC
kubectl get pvc -n sf1-ultimate

# Test connection
kubectl exec -it postgres-0 -n sf1-ultimate -- psql -U sf1_user -d sf1_auth
```

### Resource Issues

**Out of memory:**

```bash
# Check resource usage
kubectl top pods -n sf1-ultimate

# Increase limits
kubectl edit deployment auth-service -n sf1-ultimate

# Add resources:
#   limits:
#     memory: 2Gi
```

**CPU throttling:**

```bash
# Check CPU usage
kubectl top pods -n sf1-ultimate

# Increase CPU limits
kubectl edit deployment auth-service -n sf1-ultimate
```

---

## 📚 Additional Resources

### Documentation

- [Kubernetes Official Docs](https://kubernetes.io/docs/)
- [Kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)

### Tools

- [k9s](https://k9scli.io/) - Terminal UI for Kubernetes
- [Lens](https://k8slens.dev/) - Kubernetes IDE
- [kubectl-tree](https://github.com/ahmetb/kubectl-tree) - Show hierarchy of resources
- [kubectx](https://github.com/ahmetb/kubectx) - Fast context switching

### Commands

```bash
# Install useful tools
brew install k9s kubectx stern

# Use k9s (interactive UI)
k9s -n sf1-ultimate

# Use stern (multi-pod logs)
stern -n sf1-ultimate auth-service

# Switch context quickly
kubectx                    # List contexts
kubectx production         # Switch to production
kubens sf1-ultimate        # Switch namespace
```

---

## ✅ Production Checklist

Before deploying to production:

- [ ] Update all secrets (no default passwords)
- [ ] Configure resource limits properly
- [ ] Enable HPA for all services
- [ ] Configure Ingress with real domain
- [ ] Install cert-manager for SSL/TLS
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure log aggregation
- [ ] Enable cluster autoscaling
- [ ] Configure backup strategy (Velero)
- [ ] Set up alerting (PagerDuty/Slack)
- [ ] Configure Network Policies
- [ ] Enable RBAC
- [ ] Test disaster recovery
- [ ] Document runbooks

---

**Questions?** Check the [troubleshooting section](#troubleshooting) or open an issue.

**Need help?** Run `./k8s/scripts/status.sh` to diagnose issues.

