# 🔍 Monitoring Setup - SF-1 Ultimate

Comprehensive monitoring stack with **Prometheus** + **Grafana** for metrics visualization and alerting.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
- [Quick Start](#quick-start)
- [Service Integration](#service-integration)
- [Dashboards](#dashboards)
- [Alerts](#alerts)
- [Metrics Reference](#metrics-reference)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The monitoring stack provides:

- **Real-time metrics** from all microservices
- **Infrastructure monitoring** (CPU, memory, disk, network)
- **Database metrics** (PostgreSQL, MongoDB, Redis)
- **API Gateway metrics** (Traefik)
- **Custom business metrics** (cache hit rates, queue depths, etc.)
- **Pre-configured alerts** for critical issues
- **Beautiful dashboards** for visualization

### Key Features

✅ Auto-discovery of services
✅ Pre-built Grafana dashboards
✅ Alert rules for critical metrics
✅ Historical data retention (15 days)
✅ Low overhead (<5% CPU, <500MB RAM)

---

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│             │────▶│              │────▶│             │
│  Services   │     │  Prometheus  │     │   Grafana   │
│  (Metrics)  │     │  (Storage)   │     │   (Viz)     │
│             │◀────│              │◀────│             │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │
       ▼                    ▼
  ┌─────────┐         ┌──────────┐
  │ Exporters│         │  Alerts  │
  └─────────┘         └──────────┘
```

### Components

| Component | Purpose | Port | Image |
|-----------|---------|------|-------|
| **Prometheus** | Metrics storage & queries | 9090 | `prom/prometheus:latest` |
| **Grafana** | Visualization & dashboards | 3000 | `grafana/grafana:latest` |
| **Node Exporter** | System metrics (CPU, RAM, disk) | 9100 | `prom/node-exporter:latest` |
| **PostgreSQL Exporter** | PostgreSQL metrics | 9187 | `prometheuscommunity/postgres-exporter` |
| **Redis Exporter** | Redis cache metrics | 9121 | `oliver006/redis_exporter` |
| **MongoDB Exporter** | MongoDB metrics | 9216 | `percona/mongodb_exporter` |

---

## 🚀 Quick Start

### 1. Environment Configuration

Add to your `.env` file:

```bash
# Grafana Admin Credentials
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=<STRONG_PASSWORD_HERE>

# Already configured in other sections:
POSTGRES_PASSWORD=<your-postgres-password>
REDIS_PASSWORD=<your-redis-password>
MONGO_PASSWORD=<your-mongo-password>
```

### 2. Start Monitoring Stack

```bash
# Start all services including monitoring
docker-compose -f docker-compose.production.yml up -d

# Or start only monitoring services
docker-compose -f docker-compose.production.yml up -d prometheus grafana node-exporter postgres-exporter redis-exporter mongodb-exporter
```

### 3. Verify Services

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check Grafana health
curl http://localhost:3000/api/health

# View metrics from a service
curl http://localhost:3001/metrics  # auth-service
```

### 4. Access Dashboards

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000
  - Default login: `admin` / `<GF_SECURITY_ADMIN_PASSWORD>`
  - Dashboards → SF1 Ultimate → Services Overview

---

## 🔧 Service Integration

### Adding Metrics to a New Service

#### Step 1: Install Dependencies

```bash
cd apps/your-service
npm install prom-client
```

#### Step 2: Copy Middleware

```bash
# Copy the shared metrics middleware
cp ../../monitoring/middleware/metrics.middleware.ts src/middleware/
```

#### Step 3: Integrate in Express App

```typescript
// src/index.ts
import express from 'express';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics.middleware';

const app = express();

// Set service name for metrics labels
process.env.SERVICE_NAME = 'your-service';

// Add metrics middleware (before routes)
app.use(metricsMiddleware);

// Your routes here
app.use('/api/your-routes', yourRoutes);

// Metrics endpoint
app.get('/metrics', metricsEndpoint);

app.listen(3000);
```

#### Step 4: Add to Prometheus Config

Edit `monitoring/prometheus/prometheus.yml`:

```yaml
scrape_configs:
  # ... existing services ...

  - job_name: 'your-service'
    static_configs:
      - targets: ['your-service:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

#### Step 5: Restart Prometheus

```bash
docker-compose -f docker-compose.production.yml restart prometheus
```

### Custom Metrics Examples

#### Database Query Tracking

```typescript
import { recordDbQuery } from './middleware/metrics.middleware';

async function getUser(id: string) {
  const timer = recordDbQuery('SELECT', 'users');
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    return user;
  } finally {
    timer(); // Records duration
  }
}
```

#### Cache Operations

```typescript
import { recordCacheOperation } from './middleware/metrics.middleware';

async function getCached(key: string) {
  const value = await redis.get(key);

  if (value) {
    recordCacheOperation('get', 'hit');
    return value;
  }

  recordCacheOperation('get', 'miss');
  const freshValue = await fetchFromDB(key);
  await redis.set(key, freshValue);
  recordCacheOperation('set', 'success');

  return freshValue;
}
```

#### Custom Counter

```typescript
import { register } from './middleware/metrics.middleware';
import client from 'prom-client';

const loginCounter = new client.Counter({
  name: 'sf1_user_logins_total',
  help: 'Total number of user logins',
  labelNames: ['provider', 'service'],
  registers: [register],
});

// Usage
loginCounter.inc({ provider: 'local', service: 'auth-service' });
```

---

## 📊 Dashboards

### Pre-configured Dashboards

1. **SF-1 Services Overview** (`sf1-services.json`)
   - Service availability (up/down)
   - Request rate (req/s)
   - Response time (p95)
   - Error rate
   - Active requests

### Creating Custom Dashboards

1. Go to Grafana → Dashboards → New Dashboard
2. Add Panel → Select Prometheus datasource
3. Example queries:

```promql
# Request rate per service
rate(sf1_http_requests_total[5m])

# 95th percentile response time
histogram_quantile(0.95,
  rate(sf1_http_request_duration_seconds_bucket[5m])
)

# Error rate percentage
rate(sf1_errors_total[5m])
  / rate(sf1_http_requests_total[5m]) * 100

# Cache hit rate
rate(sf1_cache_operations_total{result="hit"}[5m])
  / rate(sf1_cache_operations_total{operation="get"}[5m])
```

---

## 🚨 Alerts

### Configured Alerts

Alerts are defined in `prometheus/alerts/service-alerts.yml`:

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| **ServiceDown** | Service unreachable >1min | Critical | Check service logs |
| **ServiceHighErrorRate** | Error rate >5% for 5min | Warning | Check error logs |
| **HighResponseTime** | p95 >500ms for 5min | Warning | Investigate performance |
| **CriticalResponseTime** | p95 >2s for 2min | Critical | Immediate action |
| **HighMemoryUsage** | Memory >80% for 5min | Warning | Check for leaks |
| **CriticalMemoryUsage** | Memory >90% for 2min | Critical | Scale up or restart |
| **HighCPUUsage** | CPU >80% for 5min | Warning | Check processes |
| **LowDiskSpace** | Disk <10% for 5min | Warning | Clean up or expand |
| **PostgreSQLDown** | DB unreachable >1min | Critical | Check DB container |
| **RedisDown** | Cache unreachable >1min | Critical | Check Redis container |
| **MongoDBDown** | DB unreachable >1min | Critical | Check MongoDB container |
| **LowCacheHitRate** | Hit rate <70% for 10min | Warning | Review caching strategy |

### Viewing Alerts

- **Prometheus**: http://localhost:9090/alerts
- **Grafana**: Alerting → Alert Rules

### Adding Custom Alerts

Edit `monitoring/prometheus/alerts/service-alerts.yml`:

```yaml
groups:
  - name: custom_alerts
    interval: 30s
    rules:
      - alert: HighLoginFailureRate
        expr: |
          rate(sf1_login_failures_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
          category: security
        annotations:
          summary: "High login failure rate detected"
          description: "{{ $value }} login failures per second"
```

Reload Prometheus:

```bash
docker-compose -f docker-compose.production.yml restart prometheus
```

---

## 📈 Metrics Reference

### Standard Metrics (All Services)

| Metric | Type | Description |
|--------|------|-------------|
| `sf1_http_requests_total` | Counter | Total HTTP requests |
| `sf1_http_request_duration_seconds` | Histogram | Request latency |
| `sf1_http_requests_active` | Gauge | Current active requests |
| `sf1_errors_total` | Counter | Total errors (4xx, 5xx) |
| `sf1_db_query_duration_seconds` | Histogram | Database query latency |
| `sf1_cache_operations_total` | Counter | Cache operations (hit/miss) |

### System Metrics (Node Exporter)

- `node_cpu_seconds_total` - CPU usage
- `node_memory_MemAvailable_bytes` - Available memory
- `node_filesystem_avail_bytes` - Disk space
- `node_network_receive_bytes_total` - Network in
- `node_network_transmit_bytes_total` - Network out

### Database Metrics

**PostgreSQL:**
- `pg_up` - DB availability
- `pg_stat_activity_count` - Active connections
- `pg_stat_database_tup_returned` - Rows returned

**Redis:**
- `redis_up` - Cache availability
- `redis_memory_used_bytes` - Memory usage
- `redis_connected_clients` - Client connections

**MongoDB:**
- `mongodb_up` - DB availability
- `mongodb_connections` - Connection pool
- `mongodb_op_counters_total` - Operations

### Traefik (API Gateway)

- `traefik_entrypoint_requests_total` - Total requests
- `traefik_entrypoint_request_duration_seconds` - Request latency
- `traefik_service_requests_total` - Requests per service

---

## 🔧 Troubleshooting

### Prometheus Can't Scrape Service

**Problem:** Service shows as DOWN in Prometheus targets

**Solutions:**
1. Check service is running: `docker ps | grep your-service`
2. Check metrics endpoint: `curl http://localhost:3001/metrics`
3. Verify network: Services must be on `sf1-network`
4. Check Prometheus logs: `docker logs sf1-prometheus`

### Grafana Shows "No Data"

**Problem:** Dashboards show no data or "No data points"

**Solutions:**
1. Check Prometheus datasource: Grafana → Configuration → Data Sources
2. Verify Prometheus is collecting data: http://localhost:9090/targets
3. Check time range in dashboard (top right)
4. Test query in Prometheus first

### High Memory Usage from Prometheus

**Problem:** Prometheus container using >2GB RAM

**Solutions:**
1. Reduce retention time (default: 15 days):
   ```yaml
   # docker-compose.production.yml
   command:
     - '--storage.tsdb.retention.time=7d'  # Change to 7 days
   ```
2. Reduce scrape frequency for heavy services
3. Limit metric cardinality (fewer label combinations)

### Metrics Not Showing for New Service

**Problem:** Added service but no metrics in Grafana

**Checklist:**
1. ✅ Service has `/metrics` endpoint
2. ✅ Service added to `prometheus.yml`
3. ✅ Prometheus restarted after config change
4. ✅ Service is accessible from Prometheus container
5. ✅ Metrics middleware is active

Test:
```bash
# From inside Prometheus container
docker exec -it sf1-prometheus wget -O- http://your-service:3000/metrics
```

### Alerts Not Firing

**Problem:** Expected alerts not showing in Prometheus

**Solutions:**
1. Check alert rules syntax: http://localhost:9090/rules
2. Verify PromQL query returns data in Graph view
3. Check alert is PENDING before FIRING (based on `for` duration)
4. Reload Prometheus: `docker-compose restart prometheus`

---

## 📚 Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
- [PromQL Query Examples](https://prometheus.io/docs/prometheus/latest/querying/examples/)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)

---

## 🎯 Best Practices

1. **Use Histograms for Latencies**, not Gauges
2. **Label Cardinality**: Keep label combinations <10,000
3. **Metric Naming**: Follow convention `sf1_<what>_<unit>_<type>`
4. **Alert Tuning**: Adjust `for` durations to avoid false positives
5. **Dashboard Organization**: Group by service or domain
6. **Regular Review**: Check metrics weekly for anomalies

---

**Last Updated:** 2025-01-06
**Maintainer:** SF-1 Ultimate Team
