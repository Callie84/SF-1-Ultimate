# 🚀 SF-1 Ultimate - Deployment Guide

Vollständige Anleitung für Production Deployment.

---

## 📋 Inhaltsverzeichnis

- [Voraussetzungen](#voraussetzungen)
- [Docker Deployment](#docker-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Backup & Restore](#backup--restore)
- [Monitoring Setup](#monitoring-setup)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Voraussetzungen

### Server Requirements

**Minimum:**
- 4 CPU Cores
- 8 GB RAM
- 100 GB SSD Storage
- Ubuntu 20.04+ oder Debian 11+

**Empfohlen:**
- 8 CPU Cores
- 16 GB RAM
- 500 GB SSD Storage
- Ubuntu 22.04 LTS

### Software

```bash
# Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Git
sudo apt update && sudo apt install -y git

# Node.js (für lokale Entwicklung)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 🐳 Docker Deployment

### 1. Repository klonen

```bash
cd /opt
git clone https://github.com/Callie84/SF-1-Ultimate.git
cd SF-1-Ultimate
```

### 2. Environment konfigurieren

```bash
# .env erstellen
cp .env.example .env

# Bearbeite .env mit echten Values
vim .env
```

**Wichtige Variablen:**

```bash
# Datenbanken
POSTGRES_PASSWORD=secure_random_password
MONGO_PASSWORD=secure_random_password
REDIS_PASSWORD=secure_random_password
MEILISEARCH_MASTER_KEY=secure_random_key

# JWT
JWT_SECRET=very_secure_random_string_min_32_chars
JWT_REFRESH_SECRET=another_secure_random_string

# OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# AWS S3 (für Media)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# SMTP (für Emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# OpenAI
OPENAI_API_KEY=sk-your_openai_key
```

### 3. Services starten

```bash
# Development Mode
docker-compose up -d

# Production Mode (mit Production Dockerfile)
docker-compose -f docker-compose.production.yml up -d
```

### 4. Health Check

```bash
# Check alle Services
docker-compose ps

# Check Health Endpoints
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # Price Service
# ... etc
```

### 5. Logs überprüfen

```bash
# Alle Services
docker-compose logs -f

# Spezifischer Service
docker-compose logs -f auth-service

# Nur Errors
docker-compose logs -f | grep ERROR
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Setup

**Automatisch aktiviert** bei Push zu `main` oder `develop` Branch.

### Workflow

```
1. Code Push → GitHub
2. GitHub Actions triggered
3. Tests laufen (alle Services)
4. Linting
5. Docker Images bauen
6. Images zu Registry pushen
7. Deployment zu Server
8. Health Checks
9. Notification
```

### Secrets konfigurieren

**GitHub Repository → Settings → Secrets:**

```
SSH_PRIVATE_KEY     # SSH Key für Deployment
SSH_USER            # SSH Username
SSH_HOST            # Server IP/Domain
DOCKER_USERNAME     # Docker Hub Username
DOCKER_PASSWORD     # Docker Hub Password
```

### Manuell triggern

```bash
# Über GitHub UI
Actions → CI/CD Pipeline → Run workflow

# Oder mit gh CLI
gh workflow run ci-cd.yml
```

---

## 💾 Backup & Restore

### Automatische Backups

**Cron Job einrichten:**

```bash
# Crontab editieren
crontab -e

# Täglich um 3:00 Uhr
0 3 * * * /opt/SF-1-Ultimate/scripts/backup-database.sh >> /var/log/sf1-backup.log 2>&1
```

### Manuelles Backup

```bash
cd /opt/SF-1-Ultimate

# Backup erstellen
./scripts/backup-database.sh

# Backups sind in /backups/sf1-ultimate/
ls -lh /backups/sf1-ultimate/
```

### Restore

```bash
# Liste verfügbare Backups
ls -lh /backups/sf1-ultimate/

# Restore durchführen
./scripts/restore-database.sh \
  /backups/sf1-ultimate/postgres_20240115_030000.sql.gz \
  /backups/sf1-ultimate/mongodb_20240115_030000.tar.gz
```

### Backup zu S3/Cloud

```bash
# AWS S3
aws s3 sync /backups/sf1-ultimate/ s3://your-bucket/sf1-backups/

# Oder automatisch in Cron
0 4 * * * aws s3 sync /backups/sf1-ultimate/ s3://your-bucket/sf1-backups/
```

---

## 📊 Monitoring Setup

### Prometheus & Grafana

```bash
# Starten
docker-compose up -d prometheus grafana

# Grafana URL: http://your-server:3000
# Username: admin
# Password: admin (ändern nach erstem Login)
```

### Dashboards importieren

1. Login zu Grafana
2. Configuration → Data Sources → Add Prometheus
3. URL: `http://prometheus:9090`
4. Create → Import
5. Upload `monitoring/grafana/dashboards/sf1-services.json`

### Alerts konfigurieren

```bash
# Alert Rules editieren
vim monitoring/prometheus/alerts/service-alerts.yml

# Prometheus neu laden
docker-compose restart prometheus
```

---

## 🔒 SSL/TLS Setup

### Let's Encrypt (Empfohlen)

```bash
# Certbot installieren
sudo snap install --classic certbot

# Zertifikat erstellen
sudo certbot certonly --standalone -d seedfinderpro.de -d www.seedfinderpro.de

# Auto-Renewal Setup
sudo certbot renew --dry-run
```

### Traefik (im Stack enthalten)

Traefik (Service `api-gateway` in `docker-compose.yml`) übernimmt SSL/TLS automatisch per Let's-Encrypt-Resolver — kein separates Setup nötig:

```yaml
# Auszug docker-compose.yml
api-gateway:
  image: traefik:v2.10
  command:
    - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
    - "--certificatesresolvers.letsencrypt.acme.storage=/certs/acme.json"
    - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
```

---

## 🔧 Performance Tuning

### Docker Resource Limits

```yaml
services:
  auth-service:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### Database Tuning

**PostgreSQL:**
```bash
# postgresql.conf
shared_buffers = 2GB
effective_cache_size = 6GB
max_connections = 200
```

**MongoDB:**
```bash
# mongod.conf
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2
```

**Redis:**
```bash
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

---

## 🐛 Troubleshooting

### Service startet nicht

```bash
# Logs prüfen
docker-compose logs service-name

# Port bereits belegt?
sudo lsof -i :3001

# Permissions?
ls -la apps/service-name/
```

### Datenbank Connection Fehler

```bash
# Health Check
docker exec sf1-postgres pg_isready -U sf1_user
docker exec sf1-mongodb mongosh --eval "db.adminCommand('ping')"
docker exec sf1-redis redis-cli ping

# Network prüfen
docker network inspect sf1-network
```

### Out of Memory

```bash
# Memory Usage prüfen
docker stats

# Logs prüfen
docker logs service-name | grep "out of memory"

# Resource Limits erhöhen
# docker-compose.yml → deploy.resources.limits.memory
```

### High CPU Usage

```bash
# Top Processes
docker stats --no-stream

# Service Profiling
docker exec service-name node --prof app.js
```

---

## 📚 Rollback

### Docker Compose

```bash
# Zu vorheriger Version
docker-compose down
git checkout previous-commit
docker-compose up -d
```

---

## ✅ Deployment Checklist

Vor Production Deployment:

- [ ] Alle Environment Variablen gesetzt
- [ ] Secrets sind sicher (keine Defaults)
- [ ] SSL/TLS Zertifikate konfiguriert
- [ ] Firewall Rules konfiguriert
- [ ] Backup-Script getestet
- [ ] Monitoring läuft (Prometheus, Grafana)
- [ ] Alerts konfiguriert
- [ ] Health Checks funktionieren
- [ ] Load Tests durchgeführt
- [ ] Rollback-Plan vorhanden
- [ ] Team ist informiert

---

## 📚 Weitere Ressourcen

- [Docker Docs](https://docs.docker.com/)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Traefik Docs](https://doc.traefik.io/traefik/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Let's Encrypt Docs](https://letsencrypt.org/docs/)

---

**Made with 🌿 for SF-1 Ultimate**
