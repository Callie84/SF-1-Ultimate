# 🚀 SF-1 Ultimate - Production Deployment Guide

Checkliste und Anleitung für sicheres Production-Deployment.

---

## ⚠️ VOR DEM DEPLOYMENT

### Kritische Security-Checks

```bash
# 1. NIEMALS Default-Werte verwenden!
grep -r "CHANGE_ME" .env
# → Sollte KEINE Ergebnisse liefern!

# 2. JWT_SECRET prüfen
echo $JWT_SECRET | wc -c
# → Sollte mindestens 64 Zeichen haben!

# 3. Alle Secrets verschieden?
if [ "$JWT_SECRET" = "$JWT_REFRESH_SECRET" ]; then
  echo "❌ ERROR: Secrets müssen unterschiedlich sein!"
fi

# 4. .env nicht in Git?
git ls-files | grep "^\.env$"
# → Sollte KEINE Ergebnisse liefern!
```

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### 1. Environment Configuration

```bash
[ ] JWT_SECRET generiert mit: openssl rand -base64 64
[ ] JWT_REFRESH_SECRET generiert (ANDERS als JWT_SECRET!)
[ ] POSTGRES_PASSWORD min. 16 Zeichen, komplex
[ ] MONGODB_ROOT_PASSWORD min. 16 Zeichen, komplex
[ ] MONGO_PASSWORD min. 16 Zeichen, komplex
[ ] REDIS_PASSWORD min. 16 Zeichen, komplex
[ ] MEILISEARCH_API_KEY generiert
[ ] MEILISEARCH_MASTER_KEY generiert
[ ] TRAEFIK_ADMIN_PASSWORD generiert
[ ] NODE_ENV=production gesetzt
[ ] CORS_ORIGIN auf Production-Domain gesetzt
[ ] NEXT_PUBLIC_API_URL auf Production-API-URL gesetzt
[ ] OPENAI_API_KEY gesetzt (falls AI-Features benötigt)
```

### 2. Code Quality

```bash
[ ] Alle Services compilieren ohne Fehler (npm run build)
[ ] TypeScript Errors behoben (npx tsc --noEmit)
[ ] Keine console.log() in Production-Code
[ ] Alle TODOs für MVP abgearbeitet
[ ] Git Branch ist sauber (git status)
[ ] Alle Tests bestehen (npm test)
```

### 3. Database Setup

```bash
[ ] PostgreSQL Backup-Strategie definiert
[ ] MongoDB Backup-Strategie definiert
[ ] Redis Persistence konfiguriert
[ ] Prisma Migrationen getestet
[ ] Database Indizes optimiert
[ ] Connection Pools konfiguriert
```

### 4. Security Hardening

```bash
[ ] Rate Limiting aktiviert (bereits implementiert)
[ ] CORS richtig konfiguriert
[ ] Helmet Security-Headers aktiviert (bereits implementiert)
[ ] SSL/TLS Zertifikate installiert
[ ] Firewall-Regeln konfiguriert
[ ] Secrets in Environment Variables (NICHT in Code!)
[ ] .gitignore enthält .env (bereits vorhanden)
[ ] Keine Secrets in Git-History
```

### 5. Monitoring & Logging

```bash
[ ] Prometheus Metrics aktiviert (bereits vorbereitet)
[ ] Grafana Dashboards konfiguriert
[ ] Alert-Rules definiert
[ ] Log-Aggregation eingerichtet (ELK/Loki)
[ ] Error-Tracking (Sentry o.ä.) integriert
[ ] Uptime-Monitoring konfiguriert
[ ] Health-Check Endpoints funktionieren
```

### 6. Performance Optimization

```bash
[ ] Redis Caching aktiviert
[ ] CDN für statische Assets konfiguriert
[ ] Image Optimization aktiviert (Next.js)
[ ] Database Query Optimization durchgeführt
[ ] Lazy Loading für Frontend-Components
[ ] Service Worker für PWA (optional)
```

---

## 🐳 DOCKER DEPLOYMENT

### Production docker-compose.yml verwenden

```bash
# Verwende production-spezifische Compose-Datei
docker-compose -f docker-compose.production.yml up -d

# Oder mit eigenem Production-Override
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Kritische Docker-Settings

```yaml
# In docker-compose.production.yml

services:
  postgres:
    restart: always  # Nicht "unless-stopped"
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
    volumes:
      - /var/sf1-data/postgres:/var/lib/postgresql/data  # Persistenter Pfad!

  redis:
    command: redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru

  # Alle Services:
  # - Setze restart: always
  # - Konfiguriere Resource-Limits
  # - Verwende persistente Volumes
```

---

## 🔧 SERVICE DEPLOYMENT

### Option A: Einzelne Services (Development/Staging)

```bash
# Pro Service:
cd apps/auth-service
npm run build
NODE_ENV=production npm start

# Mit PM2 (empfohlen):
pm2 start dist/index.js --name auth-service
pm2 save
pm2 startup  # Auto-Start nach Reboot
```

### Option B: Docker Swarm (Production)

```bash
# Swarm initialisieren
docker swarm init

# Services deployen
docker stack deploy -c docker-compose.production.yml sf1

# Status prüfen
docker stack services sf1
docker service logs sf1_auth-service
```

### Option C: Kubernetes (Enterprise)

```bash
# Helm Chart verwenden (falls vorhanden)
helm install sf1-ultimate ./charts/sf1-ultimate \
  --set env.JWT_SECRET=$JWT_SECRET \
  --set env.DATABASE_URL=$DATABASE_URL

# Oder mit kubectl
kubectl apply -f k8s/
```

---

## 🔍 POST-DEPLOYMENT VERIFICATION

### 1. Health Checks

```bash
# Alle Services prüfen
curl http://your-domain.com:3001/health  # Auth
curl http://your-domain.com:3002/health  # Price
curl http://your-domain.com:3003/health  # Journal
# ... für alle Services

# Erwartete Response:
# {"status":"healthy","service":"auth-service","timestamp":"..."}
```

### 2. Authentication Flow

```bash
# Test-User registrieren
curl -X POST http://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'

# Login testen
curl -X POST http://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'

# Sollte accessToken und refreshToken zurückgeben
```

### 3. Database Connections

```bash
# PostgreSQL
docker exec -it sf1-postgres psql -U sf1_user -d sf1_auth -c "SELECT COUNT(*) FROM \"User\";"

# MongoDB
docker exec -it sf1-mongodb mongosh -u sf1_admin -p $MONGO_PASSWORD --eval "db.getMongo().getDBNames()"

# Redis
docker exec -it sf1-redis redis-cli -a $REDIS_PASSWORD PING
# Erwartete Response: PONG
```

### 4. Frontend Access

```bash
# Frontend erreichbar?
curl -I http://your-domain.com
# Sollte 200 OK zurückgeben

# API Gateway?
curl -I http://your-domain.com:8080
```

---

## 🚨 ROLLBACK PROCEDURE

Falls Deployment fehlschlägt:

```bash
# 1. Services stoppen
docker-compose down

# 2. Vorherige Version wiederherstellen
git checkout <previous-working-commit>

# 3. Services neu starten
docker-compose up -d

# 4. Database Rollback (falls nötig)
cd apps/auth-service
npm run prisma:migrate -- --to <previous-migration>

# 5. Logs prüfen
docker-compose logs -f
```

---

## 📊 MONITORING SETUP

### Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'sf1-services'
    static_configs:
      - targets:
        - 'auth-service:3001'
        - 'price-service:3002'
        - 'journal-service:3003'
        # ... alle Services
    metrics_path: '/metrics'
```

### Grafana Dashboards

```bash
# Import vorgefertigte Dashboards
# - Node.js Application Metrics (Dashboard ID: 11159)
# - PostgreSQL Database (Dashboard ID: 9628)
# - Redis (Dashboard ID: 11835)
# - MongoDB (Dashboard ID: 2583)
```

### Alert Rules

```yaml
# Kritische Alerts:
- Alert: ServiceDown
  expr: up{job="sf1-services"} == 0
  for: 2m

- Alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05

- Alert: DatabaseConnectionPoolExhausted
  expr: postgres_connections_used / postgres_connections_max > 0.9
```

---

## 🔐 SECURITY BEST PRACTICES

### 1. SSL/TLS Configuration

```nginx
# Nginx SSL Config
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
ssl_prefer_server_ciphers off;
add_header Strict-Transport-Security "max-age=63072000" always;
```

### 2. Firewall Rules

```bash
# UFW (Ubuntu)
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 22/tcp    # SSH (nur von bestimmten IPs!)
ufw deny 5432/tcp   # PostgreSQL (nur intern!)
ufw deny 27017/tcp  # MongoDB (nur intern!)
ufw deny 6379/tcp   # Redis (nur intern!)
ufw enable
```

### 3. Secrets Management

```bash
# Verwende externe Secret-Manager:
# - AWS Secrets Manager
# - HashiCorp Vault
# - Azure Key Vault
# - Google Secret Manager

# Beispiel mit AWS:
aws secretsmanager get-secret-value --secret-id sf1/jwt-secret
```

---

## 📈 SCALING

### Horizontal Scaling

```bash
# Docker Swarm - Services replizieren
docker service scale sf1_auth-service=3
docker service scale sf1_price-service=2

# Kubernetes - Replicas anpassen
kubectl scale deployment auth-service --replicas=3
```

### Load Balancing

```yaml
# Traefik Load Balancing (bereits konfiguriert)
# Nginx Load Balancing:
upstream auth_backend {
    least_conn;
    server auth-service-1:3001;
    server auth-service-2:3001;
    server auth-service-3:3001;
}
```

---

## 🧪 TESTING IN PRODUCTION

### Smoke Tests

```bash
# Nach Deployment ausführen:
npm run test:e2e -- --env=production

# Oder manuelle Smoke Tests:
./scripts/smoke-test.sh
```

### Canary Deployment

```bash
# 10% Traffic auf neue Version
kubectl set image deployment/auth-service auth=sf1/auth:v2.0
kubectl rollout pause deployment/auth-service

# Metrics beobachten...

# Falls OK: Rollout fortsetzen
kubectl rollout resume deployment/auth-service
```

---

## 📞 SUPPORT & TROUBLESHOOTING

### Logs prüfen

```bash
# Docker
docker-compose logs -f --tail=100 auth-service

# PM2
pm2 logs auth-service

# Kubernetes
kubectl logs -f deployment/auth-service
```

### Häufige Probleme

1. **"JWT_SECRET is not defined"**
   - → Prüfe .env Datei
   - → Stelle sicher, dass Environment-Variable geladen wird

2. **"Database connection failed"**
   - → Prüfe Database Container: `docker-compose ps`
   - → Prüfe Credentials in .env
   - → Prüfe Network-Konnektivität

3. **"Port already in use"**
   - → Finde Prozess: `lsof -i :3001`
   - → Beende oder ändere Port

4. **"Rate limit exceeded"**
   - → Prüfe Redis Connection
   - → Erhöhe Limits falls legitim

---

## ✅ DEPLOYMENT VERIFICATION CHECKLIST

```bash
[ ] Alle Health-Checks grün
[ ] Frontend erreichbar und funktioniert
[ ] Login/Register funktioniert
[ ] Alle 11 Services laufen
[ ] Datenbanken erreichbar
[ ] Logs zeigen keine Errors
[ ] Monitoring aktiv
[ ] Alerts konfiguriert
[ ] Backup läuft
[ ] SSL-Zertifikate gültig
[ ] Performance akzeptabel
[ ] Security-Scan durchgeführt
```

---

## 🎉 SUCCESS!

Dein SF-1 Ultimate System ist jetzt live in Production!

**Next Steps:**
- Überwache Metrics in Grafana
- Prüfe Logs regelmäßig
- Teste alle Features
- Sammle User-Feedback
- Plane weitere Features

**Happy Growing! 🌿**
