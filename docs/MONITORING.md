# 📊 SF-1 Ultimate - Monitoring & Observability

Vollständige Dokumentation für Monitoring, Logging und Alerting.

---

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Prometheus Metrics](#prometheus-metrics)
- [Grafana Dashboards](#grafana-dashboards)
- [Logging](#logging)
- [Alerting](#alerting)
- [Health Checks](#health-checks)

---

## 🎯 Übersicht

**Monitoring Stack:**
- **Prometheus** - Metrics Collection
- **Grafana** - Visualization & Dashboards
- **Winston** - Structured Logging
- **Alertmanager** - Alert Management

---

## 📈 Prometheus Metrics

### Verfügbare Metrics

#### HTTP Metrics

```prometheus
# Request Duration (Histogram)
sf1_http_request_duration_seconds{service, method, route, status_code}

# Request Count (Counter)
sf1_http_requests_total{service, method, route, status_code}

# Active Connections (Gauge)
sf1_active_connections{service}

# Error Rate (Counter)
sf1_errors_total{service, type, endpoint}
```

#### Cache Metrics

```prometheus
# Cache Operations (Counter)
sf1_cache_operations_total{service, operation, result}

# Cache Hit Rate Berechnung
rate(sf1_cache_operations_total{result="hit"}[5m])
/ rate(sf1_cache_operations_total{operation="get"}[5m])
```

#### System Metrics (Node Exporter)

```prometheus
# CPU Usage
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory Usage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
/ node_memory_MemTotal_bytes * 100

# Disk Usage
(node_filesystem_size_bytes - node_filesystem_avail_bytes)
/ node_filesystem_size_bytes * 100
```

### Metrics Endpoint

Jeder Service stellt Metrics bereit:

```bash
# Auth Service
curl http://localhost:3001/metrics

# Price Service
curl http://localhost:3002/metrics
```

### Prometheus UI

**URL:** http://localhost:9090

**Nützliche Queries:**

```prometheus
# Top 5 langsamste Endpoints
topk(5, histogram_quantile(0.95,
  rate(sf1_http_request_duration_seconds_bucket[5m])
))

# Error Rate pro Service
rate(sf1_errors_total[5m])

# Request Rate pro Service
sum by(service) (rate(sf1_http_requests_total[5m]))
```

---

## 📊 Grafana Dashboards

### Setup

1. **Grafana starten:**
   ```bash
   docker-compose up -d grafana
   ```

2. **Login:**
   - URL: http://localhost:3000
   - User: admin
   - Password: admin (ändern nach erstem Login)

3. **Datasource hinzufügen:**
   - Configuration → Data Sources → Add Prometheus
   - URL: http://prometheus:9090
   - Save & Test

4. **Dashboard importieren:**
   - Create → Import
   - Upload `monitoring/grafana/dashboards/sf1-services.json`

### Verfügbare Dashboards

#### 1. Services Overview

**Panels:**
- Service Availability (Status aller Services)
- Request Rate (Requests pro Sekunde)
- Response Time (95th Percentile)
- Error Rate (Fehler pro Service)
- Active Connections
- Cache Hit Rate
- Memory Usage
- CPU Usage

#### 2. Database Dashboard

**Panels:**
- PostgreSQL Connections
- MongoDB Operations
- Redis Operations
- Query Duration
- Connection Pool Status

#### 3. Business Metrics

**Panels:**
- User Registrations
- Active Users
- Journal Entries
- Price Updates
- AI Requests

### Custom Dashboard erstellen

```json
{
  "panels": [
    {
      "title": "Request Rate",
      "targets": [
        {
          "expr": "rate(sf1_http_requests_total[5m])"
        }
      ]
    }
  ]
}
```

---

## 📝 Logging

### Structured Logging mit Winston

**Log-Levels:**
- `error` - Fehler die Attention brauchen
- `warn` - Warnings
- `info` - Informationen (Default)
- `debug` - Debug-Informationen

### Log-Format

```json
{
  "timestamp": "2024-01-15 14:30:45",
  "level": "info",
  "service": "auth-service",
  "message": "User registered successfully",
  "userId": "123",
  "email": "user@example.com"
}
```

### Log-Locations

```
/app/logs/
├── error.log      # Nur Errors
├── combined.log   # Alle Logs
└── ...
```

### Logs ansehen

```bash
# Live Logs (Docker)
docker logs -f sf1-auth-service

# Error Logs
docker exec sf1-auth-service tail -f /app/logs/error.log

# Combined Logs
docker exec sf1-auth-service tail -f /app/logs/combined.log

# Logs filtern (jq)
docker exec sf1-auth-service cat /app/logs/combined.log | jq 'select(.level=="error")'
```

### Log Rotation

**Konfiguration:**
- Max File Size: 100 MB
- Retention: 7 Tage
- Automatisch durch Winston

### Sensitive Data Masking

Automatisches Masking von:
- Passwords
- Tokens
- API Keys
- Authorization Headers

**Beispiel:**

```json
{
  "password": "***MASKED***",
  "token": "***MASKED***"
}
```

---

## 🚨 Alerting

### Alert Rules

**Location:** `monitoring/prometheus/alerts/service-alerts.yml`

### Kritische Alerts

#### Service Down

```yaml
- alert: ServiceDown
  expr: up{job=~".*-service"} == 0
  for: 1m
  severity: critical

Aktion: Sofort prüfen und Service neustarten
```

#### High Error Rate

```yaml
- alert: ServiceHighErrorRate
  expr: rate(sf1_errors_total[5m]) > 0.05
  for: 5m
  severity: warning

Aktion: Logs prüfen, Fehlerursache identifizieren
```

#### Critical Response Time

```yaml
- alert: CriticalResponseTime
  expr: histogram_quantile(0.95, ...) > 2
  for: 2m
  severity: critical

Aktion: Performance-Bottleneck identifizieren
```

#### High Memory Usage

```yaml
- alert: CriticalMemoryUsage
  expr: memory_usage > 0.9
  for: 2m
  severity: critical

Aktion: Memory Leak prüfen, Service neustarten
```

### Alert-Kanäle

**Konfiguration:** `monitoring/alertmanager/alertmanager.yml`

**Kanäle:**
- Email
- Slack
- PagerDuty (Optional)
- Webhook

**Beispiel Email Alert:**

```yaml
receivers:
  - name: 'email'
    email_configs:
      - to: 'alerts@seedfinderpro.de'
        from: 'monitoring@seedfinderpro.de'
        smarthost: 'smtp.gmail.com:587'
```

### Alert Testing

```bash
# Manuell Alert triggern (für Testing)
curl -X POST http://localhost:9093/api/v1/alerts -d '[{
  "labels": {
    "alertname": "TestAlert",
    "severity": "warning"
  },
  "annotations": {
    "summary": "Test Alert"
  }
}]'
```

---

## 🏥 Health Checks

### Endpoints

Jeder Service hat 3 Health-Check Endpoints:

#### 1. Basic Health (`/health`)

**Zweck:** Prüft ob Service läuft

```bash
curl http://localhost:3001/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T14:30:45.000Z",
  "uptime": 12345
}
```

#### 2. Readiness (`/ready`)

**Zweck:** Prüft ob Service ready ist (Dependencies OK)

```bash
curl http://localhost:3001/ready
```

**Response:**
```json
{
  "status": "ready",
  "checks": {
    "database_postgres": {
      "status": "healthy"
    },
    "redis": {
      "status": "healthy"
    }
  },
  "timestamp": "2024-01-15T14:30:45.000Z"
}
```

#### 3. Metrics (`/metrics`)

**Zweck:** Prometheus Scraping

```bash
curl http://localhost:3001/metrics
```

### Health Check Integration

**Docker Compose:**
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

**Kubernetes:**
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
```

---

## 🔧 Setup & Konfiguration

### Quick Start

```bash
# 1. Prometheus & Grafana starten
docker-compose up -d prometheus grafana

# 2. Grafana Dashboard importieren
# UI: http://localhost:3000

# 3. Alerts konfigurieren
vim monitoring/prometheus/alerts/service-alerts.yml

# 4. Prometheus neu laden
curl -X POST http://localhost:9090/-/reload
```

### Environment Variables

```bash
# Prometheus
PROMETHEUS_RETENTION=15d

# Grafana
GF_SECURITY_ADMIN_PASSWORD=secure_password
GF_INSTALL_PLUGINS=grafana-clock-panel

# Alertmanager
ALERTMANAGER_SLACK_WEBHOOK=https://hooks.slack.com/...
```

---

## 📚 Best Practices

### 1. Metric Naming

- Verwende Prefixes: `sf1_*`
- Verwende Snake Case: `http_request_duration_seconds`
- Füge Einheiten hinzu: `_seconds`, `_bytes`, `_total`

### 2. Labels

- Halte Cardinality niedrig (< 100 unique values)
- Vermeide high-cardinality labels (z.B. user_id)
- Nutze consistent labels über Services

### 3. Logging

- Logge strukturiert (JSON)
- Füge Context hinzu (user_id, request_id)
- Vermeide Sensitive Data
- Nutze passende Log-Levels

### 4. Alerting

- Alert auf Symptoms, nicht Causes
- Halte Alert-Fatigue niedrig
- Dokumentiere Runbooks
- Teste Alerts regelmäßig

---

## 🐛 Troubleshooting

### Prometheus kann Services nicht scrapen

```bash
# Check Network
docker exec prometheus ping auth-service

# Check Endpoint
curl http://auth-service:3001/metrics

# Check Prometheus Targets
# UI: http://localhost:9090/targets
```

### Grafana zeigt keine Daten

1. Check Datasource Connection
2. Check Prometheus hat Daten: http://localhost:9090
3. Check Time Range in Grafana

### Logs fehlen

```bash
# Check Log Directory
docker exec sf1-auth-service ls -la /app/logs

# Check Permissions
docker exec sf1-auth-service ls -la /app/logs
```

---

## 📚 Weitere Ressourcen

- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [Winston Docs](https://github.com/winstonjs/winston)
- [Alertmanager Docs](https://prometheus.io/docs/alerting/latest/alertmanager/)

---

**Made with 🌿 for SF-1 Ultimate**
