# API Gateway - SF-1 Ultimate

**Traefik 3.x** als zentraler Reverse-Proxy für alle Microservices.

## Features

✅ **Auto-Routing** - Alle 11 Services automatisch geroutet
✅ **Circuit-Breaker** - Auto-Failover bei Service-Ausfällen  
✅ **Rate-Limiting** - Redis-basiert, pro Service konfigurierbar
✅ **TLS/SSL** - Let's Encrypt Auto-Renewal
✅ **Health-Checks** - Kontinuierliche Backend-Überwachung
✅ **Prometheus Metrics** - Monitoring-Ready
✅ **CORS** - Vorkonfiguriert für Frontend

## Routing

```
POST   /api/auth/*             → auth-service:3001
GET    /api/prices/*           → price-service:3002
POST   /api/journal/*          → journal-service:3003
POST   /api/tools/*            → tools-service:3004
GET    /api/community/*        → community-service:3005
GET    /api/notifications/*    → notification-service:3006
GET    /api/search/*           → search-service:3007
POST   /api/media/*            → media-service:3008
GET    /api/gamification/*     → gamification-service:3009
POST   /api/ai/*               → ai-service:3010
```

## Rate Limits

- **Auth**: 10 req/min
- **Standard**: 100 req/min
- **Search**: 50 req/min
- **Upload**: 20 req/min
- **AI**: 5 req/min

## Health Check

```bash
bash scripts/health-check.sh
```

## Deployment

```bash
docker-compose up -d api-gateway
```

## Monitoring

Prometheus Metrics verfügbar auf Port **8082**.

```
http://api-gateway:8082/metrics
```
