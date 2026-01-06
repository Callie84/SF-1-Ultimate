# 🌐 Nginx Reverse Proxy

High-performance reverse proxy and load balancer for SF-1 Ultimate microservices architecture.

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [SSL/TLS Setup](#ssltls-setup)
- [Load Balancing](#load-balancing)
- [Rate Limiting](#rate-limiting)
- [Caching](#caching)
- [Monitoring](#monitoring)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Nginx serves as the single entry point for all HTTP/HTTPS traffic to the SF-1 Ultimate platform.

### Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Reverse Proxy** | Routes requests to microservices | ✅ |
| **Load Balancing** | Distributes traffic across instances | ✅ |
| **SSL/TLS** | HTTPS with Let's Encrypt | ✅ |
| **Rate Limiting** | Protects against abuse | ✅ |
| **Caching** | Reduces backend load | ✅ |
| **Compression** | Gzip/Brotli compression | ✅ |
| **WebSocket** | Real-time connections | ✅ |
| **Monitoring** | Prometheus metrics | ✅ |
| **Security** | Headers, CORS, DDoS protection | ✅ |

### Benefits

- 🚀 **Performance** - Caching, compression, connection pooling
- 🔒 **Security** - SSL/TLS, rate limiting, security headers
- ⚖️ **Scalability** - Load balancing across multiple instances
- 📊 **Observability** - Detailed metrics and logging
- 🛡️ **DDoS Protection** - Rate limiting and connection limits

---

## 🚀 Quick Start

### 1. Setup Nginx

```bash
# Run setup script
./nginx/scripts/setup-nginx.sh

# Or with SSL (Let's Encrypt)
./nginx/scripts/setup-nginx.sh --ssl-email your@email.com --domain sf1.example.com
```

### 2. Start with Docker Compose

```bash
# Start Nginx with all services
docker-compose -f docker-compose.yml -f nginx/docker-compose.nginx.yml up -d

# Or add to your existing docker-compose.yml
docker-compose up -d nginx
```

### 3. Verify Setup

```bash
# Check Nginx is running
docker ps | grep nginx

# Test configuration
docker exec sf1-nginx nginx -t

# Check health
curl http://localhost/health
```

---

## 🏗️ Architecture

### Request Flow

```
Internet
    ↓
[Nginx :80/:443]
    ↓
┌───────────┬──────────────┬────────────┐
│           │              │            │
Frontend  Auth API    Price API    WebSocket
:3000     :3001       :3002        :3006
```

### Virtual Hosts

| Domain | Purpose | Backend |
|--------|---------|---------|
| `sf1.example.com` | Main frontend | Frontend :3000 |
| `api.sf1.example.com` | API gateway | Various services |
| `ws.sf1.example.com` | WebSocket | Chat service :3006 |
| `admin.sf1.example.com` | Admin panel | Grafana/Prometheus |

### Load Balancing Strategy

```nginx
upstream auth_service {
    least_conn;  # Route to instance with fewest connections
    keepalive 32;

    server auth-service-1:3001 max_fails=3 fail_timeout=30s;
    server auth-service-2:3001 max_fails=3 fail_timeout=30s;
    server auth-service-3:3001 max_fails=3 fail_timeout=30s;
}
```

**Strategies available:**
- `least_conn` - Least connections (default)
- `ip_hash` - Session persistence
- `round_robin` - Simple rotation
- `least_time` - Fastest response (Nginx Plus)

---

## ⚙️ Configuration

### File Structure

```
nginx/
├── nginx.conf              # Main configuration
├── conf.d/
│   ├── default.conf        # Default virtual host (HTTPS)
│   ├── websocket.conf      # WebSocket support
│   ├── admin.conf          # Admin panel
│   └── status.conf         # Metrics endpoint
├── ssl/
│   ├── fullchain.pem       # SSL certificate
│   ├── privkey.pem         # Private key
│   └── chain.pem           # Certificate chain
├── scripts/
│   ├── setup-nginx.sh      # Setup script
│   ├── generate-ssl.sh     # SSL generation
│   ├── reload-nginx.sh     # Safe reload
│   └── test-load-balancing.sh  # Load test
└── README.md
```

### Main Configuration (nginx.conf)

**Key settings:**

```nginx
worker_processes auto;           # Auto-detect CPU cores
worker_connections 4096;         # 4096 connections per worker
keepalive_timeout 65;            # Keep connections alive
client_max_body_size 10m;        # Max upload size
gzip_comp_level 6;               # Compression level
```

### Virtual Host Configuration

**Example: API endpoint**

```nginx
location /api/auth/ {
    # Rate limiting
    limit_req zone=auth_limit burst=5 nodelay;

    # Proxy to backend
    proxy_pass http://auth_service;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Timeouts
    proxy_connect_timeout 30s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
}
```

### Reload Configuration

```bash
# Test configuration
docker exec sf1-nginx nginx -t

# Reload (zero-downtime)
./nginx/scripts/reload-nginx.sh

# Or manually
docker exec sf1-nginx nginx -s reload
```

---

## 🔒 SSL/TLS Setup

### Option 1: Let's Encrypt (Production)

```bash
# Generate SSL certificate
./nginx/scripts/generate-ssl.sh \
  --email your@email.com \
  --domain sf1.example.com

# Auto-renewal is configured automatically
```

### Option 2: Self-Signed (Development)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -days 365 \
  -subj "/CN=localhost"
```

### Option 3: Custom Certificate

```bash
# Copy your certificates
cp /path/to/fullchain.pem nginx/ssl/
cp /path/to/privkey.pem nginx/ssl/
cp /path/to/chain.pem nginx/ssl/

# Set permissions
chmod 600 nginx/ssl/*.pem

# Reload Nginx
./nginx/scripts/reload-nginx.sh
```

### SSL Configuration

```nginx
# TLS versions
ssl_protocols TLSv1.2 TLSv1.3;

# Strong ciphers
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256...';
ssl_prefer_server_ciphers off;

# Session settings
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
```

### Test SSL Configuration

```bash
# Test with SSL Labs
https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com

# Or with OpenSSL
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check certificate expiry
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | \
  openssl x509 -noout -dates
```

---

## ⚖️ Load Balancing

### Scaling Services

```bash
# Scale to 3 instances
docker-compose up -d --scale auth-service=3

# Nginx automatically load balances
```

### Load Balancing Configuration

```nginx
upstream auth_service {
    # Strategy
    least_conn;

    # Connection pooling
    keepalive 32;

    # Backend servers
    server auth-service-1:3001 max_fails=3 fail_timeout=30s weight=1;
    server auth-service-2:3001 max_fails=3 fail_timeout=30s weight=1;
    server auth-service-3:3001 max_fails=3 fail_timeout=30s weight=2;  # Higher weight

    # Backup server (only used if all others fail)
    server auth-service-backup:3001 backup;
}
```

### Health Checks

```nginx
# Active health checks (Nginx Plus only)
# Free version uses passive checks based on max_fails

server auth-service-1:3001 max_fails=3 fail_timeout=30s;
```

**Parameters:**
- `max_fails=3` - Mark server down after 3 failures
- `fail_timeout=30s` - Retry after 30 seconds
- `weight=2` - Receive 2x more traffic
- `backup` - Only use if all others fail

### Test Load Balancing

```bash
# Run load test
./nginx/scripts/test-load-balancing.sh --requests 1000 --concurrency 10

# Monitor distribution
docker stats --no-stream | grep auth-service
```

---

## 🚦 Rate Limiting

### Rate Limit Zones

```nginx
# API: 100 req/s per IP
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;

# Auth: 10 req/m per IP
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;

# Registration: 3 req/h per IP
limit_req_zone $binary_remote_addr zone=register_limit:10m rate=3r/h;

# Connections: 10 concurrent per IP
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
```

### Apply Rate Limits

```nginx
location /api/auth/login {
    # Apply rate limit with burst
    limit_req zone=auth_limit burst=5 nodelay;

    # Connection limit
    limit_conn conn_limit 10;

    proxy_pass http://auth_service;
}
```

**Parameters:**
- `burst=5` - Allow burst of 5 extra requests
- `nodelay` - Don't delay burst requests
- `delay=3` - Delay requests after 3

### Rate Limit Responses

```
# Normal request
HTTP/1.1 200 OK

# Rate limited
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

### Whitelist IPs

```nginx
# Geo-based whitelisting
geo $limit {
    default 1;
    10.0.0.0/8 0;      # Internal network - no limit
    192.168.1.0/24 0;  # Office network - no limit
}

map $limit $limit_key {
    0 "";
    1 $binary_remote_addr;
}

limit_req_zone $limit_key zone=api_limit:10m rate=100r/s;
```

---

## 💾 Caching

### Cache Configuration

```nginx
# API responses cache
proxy_cache_path /var/cache/nginx/api
    levels=1:2
    keys_zone=api_cache:10m
    max_size=1g
    inactive=60m
    use_temp_path=off;

# Static files cache
proxy_cache_path /var/cache/nginx/static
    levels=1:2
    keys_zone=static_cache:10m
    max_size=2g
    inactive=24h
    use_temp_path=off;
```

### Enable Caching

```nginx
location /api/prices/ {
    # Enable cache
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;       # Cache 200 responses for 5 minutes
    proxy_cache_valid 404 1m;       # Cache 404 for 1 minute
    proxy_cache_use_stale error timeout updating;
    proxy_cache_lock on;

    # Cache key
    proxy_cache_key "$scheme$request_method$host$request_uri";

    # Add cache status header
    add_header X-Cache-Status $upstream_cache_status;

    proxy_pass http://price_service;
}
```

### Cache Bypass

```nginx
# Bypass cache for logged-in users
set $skip_cache 0;

if ($http_authorization != "") {
    set $skip_cache 1;
}

proxy_cache_bypass $skip_cache;
proxy_no_cache $skip_cache;
```

### Cache Status

```bash
# Check cache status
curl -I https://api.sf1.example.com/api/prices/current/BTC

# Response headers:
# X-Cache-Status: HIT     # Served from cache
# X-Cache-Status: MISS    # Fetched from backend
# X-Cache-Status: BYPASS  # Cache bypassed
# X-Cache-Status: EXPIRED # Cache expired, updating
```

### Clear Cache

```bash
# Clear all caches
docker exec sf1-nginx rm -rf /var/cache/nginx/*

# Or specific cache
docker exec sf1-nginx find /var/cache/nginx/api -type f -delete
```

---

## 📊 Monitoring

### Prometheus Metrics

Nginx exports metrics via nginx-prometheus-exporter:

```bash
# Check metrics
curl http://localhost:9113/metrics
```

**Available metrics:**

```prometheus
# Requests
nginx_http_requests_total
nginx_http_request_duration_seconds

# Connections
nginx_connections_active
nginx_connections_accepted
nginx_connections_handled

# Upstream
nginx_upstream_response_time_seconds
nginx_upstream_requests_total
```

### Grafana Dashboard

1. **Import Dashboard:**
   - Dashboard ID: 12708 (Nginx Prometheus Exporter)
   - URL: `https://grafana.com/grafana/dashboards/12708`

2. **Access Grafana:**
   ```bash
   open http://localhost:3000/grafana
   ```

### Nginx Access Logs (JSON)

```json
{
  "time": "2024-01-06T12:00:00+00:00",
  "remote_addr": "192.168.1.100",
  "request_method": "GET",
  "request_uri": "/api/prices/current/BTC",
  "status": 200,
  "body_bytes_sent": 1234,
  "request_time": 0.045,
  "upstream_response_time": "0.042",
  "upstream_addr": "172.20.0.5:3002"
}
```

### Log Analysis

```bash
# Real-time log monitoring
docker-compose logs -f nginx

# Error rate
docker exec sf1-nginx cat /var/log/nginx/access.log | \
  jq -r '.status' | \
  grep -E '^[45]' | \
  wc -l

# Average response time
docker exec sf1-nginx cat /var/log/nginx/access.log | \
  jq -r '.request_time' | \
  awk '{sum+=$1; count++} END {print sum/count}'

# Top endpoints
docker exec sf1-nginx cat /var/log/nginx/access.log | \
  jq -r '.request_uri' | \
  sort | uniq -c | sort -rn | head -10
```

---

## 🛡️ Security

### Security Headers

```nginx
# Content Security Policy
add_header Content-Security-Policy "default-src 'self';" always;

# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Prevent clickjacking
add_header X-Frame-Options "SAMEORIGIN" always;

# MIME sniffing protection
add_header X-Content-Type-Options "nosniff" always;

# XSS protection
add_header X-XSS-Protection "1; mode=block" always;

# Referrer policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Permissions policy
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

### DDoS Protection

```nginx
# Connection limits
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
limit_conn conn_limit 10;

# Request rate limits
limit_req_zone $binary_remote_addr zone=ddos:10m rate=20r/s;
limit_req zone=ddos burst=40 nodelay;

# Slow request protection
client_body_timeout 12;
client_header_timeout 12;
send_timeout 10;
```

### IP Blacklisting

```nginx
# Create blacklist file
# /etc/nginx/blacklist.conf
deny 192.0.2.1;
deny 198.51.100.0/24;

# Include in server block
include /etc/nginx/blacklist.conf;
```

### Geographic Restrictions

```nginx
# Allow only specific countries
geo $allowed_country {
    default no;
    # IP ranges for allowed countries
    allow 1.0.0.0/8;  # Example range
}

server {
    if ($allowed_country = no) {
        return 403;
    }
}
```

### Hide Nginx Version

```nginx
server_tokens off;
```

---

## 🐛 Troubleshooting

### Nginx Won't Start

**Problem:** Nginx container fails to start

**Solution:**
```bash
# Check logs
docker-compose logs nginx

# Test configuration
docker run --rm -v $(pwd)/nginx:/etc/nginx nginx:alpine nginx -t

# Common issues:
# - Invalid syntax in config
# - Missing SSL certificates
# - Port already in use
```

### 502 Bad Gateway

**Problem:** Nginx returns 502 error

**Solution:**
```bash
# Check if backend services are running
docker-compose ps

# Check backend service logs
docker-compose logs auth-service

# Verify upstream configuration
docker exec sf1-nginx nginx -T | grep upstream

# Test backend directly
curl http://localhost:3001/health
```

### SSL Certificate Errors

**Problem:** SSL certificate invalid or expired

**Solution:**
```bash
# Check certificate
openssl x509 -in nginx/ssl/fullchain.pem -text -noout

# Renew Let's Encrypt certificate
docker-compose run --rm certbot renew

# Or manually
./nginx/scripts/generate-ssl.sh --email your@email.com --domain sf1.example.com
```

### Rate Limiting Issues

**Problem:** Legitimate users getting rate limited

**Solution:**
```bash
# Check rate limit zones
docker exec sf1-nginx cat /var/log/nginx/error.log | grep limiting

# Adjust limits in nginx.conf
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=200r/s;  # Increase rate

# Or whitelist specific IPs
geo $limit {
    default 1;
    192.168.1.0/24 0;  # No limit for this subnet
}
```

### Cache Issues

**Problem:** Stale content being served

**Solution:**
```bash
# Clear cache
docker exec sf1-nginx rm -rf /var/cache/nginx/*

# Or disable cache for specific endpoint
location /api/auth/ {
    proxy_cache_bypass 1;
    proxy_no_cache 1;
}

# Check cache status
curl -I https://api.sf1.example.com/api/prices/current/BTC | grep X-Cache-Status
```

### Performance Issues

**Problem:** Slow response times

**Solution:**
```bash
# Check worker processes
docker exec sf1-nginx ps aux | grep nginx

# Increase workers in nginx.conf
worker_processes auto;
worker_connections 4096;

# Enable keepalive
keepalive_timeout 65;
keepalive_requests 100;

# Check upstream timeouts
proxy_connect_timeout 30s;
proxy_read_timeout 30s;
```

### WebSocket Connection Failed

**Problem:** WebSocket connections not working

**Solution:**
```nginx
# Ensure proper headers
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

# Increase timeouts
proxy_connect_timeout 7d;
proxy_send_timeout 7d;
proxy_read_timeout 7d;

# Disable buffering
proxy_buffering off;
```

---

## 📚 Additional Resources

### Documentation

- [Nginx Official Docs](https://nginx.org/en/docs/)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Let's Encrypt](https://letsencrypt.org/docs/)

### Tools

- [SSL Labs Test](https://www.ssllabs.com/ssltest/)
- [Security Headers Check](https://securityheaders.com/)
- [Apache Bench](https://httpd.apache.org/docs/2.4/programs/ab.html)

### Performance Testing

```bash
# Apache Bench
ab -n 1000 -c 10 http://localhost/api/prices/current/BTC

# wrk
wrk -t4 -c100 -d30s http://localhost/api/prices/current/BTC

# hey
hey -n 1000 -c 10 http://localhost/api/prices/current/BTC
```

---

## ✅ Production Checklist

Before deploying to production:

- [ ] SSL certificate installed (not self-signed)
- [ ] SSL auto-renewal configured
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Access logs enabled (JSON format)
- [ ] Error logs monitored
- [ ] Prometheus metrics exported
- [ ] Grafana dashboard configured
- [ ] Load balancing tested
- [ ] Health checks configured
- [ ] Backup strategy in place
- [ ] DDoS protection enabled
- [ ] IP whitelisting configured (admin panel)
- [ ] SSL Labs grade A+

---

**Questions?** Check the [troubleshooting section](#troubleshooting) or open an issue.

**Performance issues?** See [monitoring](#monitoring) and [performance testing](#performance-testing).

