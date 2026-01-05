# 🚀 SF-1 Ultimate - Setup Guide

Schnellanleitung für das erste Setup und Deployment.

---

## 📋 Voraussetzungen

Stelle sicher, dass folgendes installiert ist:

```bash
✅ Node.js 20+ (check: node -v)
✅ Docker & Docker Compose (check: docker --version)
✅ Git (check: git --version)
✅ OpenSSL (check: openssl version)
```

---

## 🔧 Schritt 1: Repository klonen

```bash
git clone https://github.com/Callie84/SF-1-Ultimate.git
cd SF-1-Ultimate
```

---

## 🔐 Schritt 2: Environment Variables konfigurieren

### 2.1 Erstelle .env Datei

```bash
cp .env.example .env
```

### 2.2 Generiere sichere Secrets

**KRITISCH:** Verwende NIEMALS die Default-Werte in Production!

```bash
# Generiere JWT_SECRET (64 Zeichen)
openssl rand -base64 64

# Generiere JWT_REFRESH_SECRET (64 Zeichen, ANDERS als JWT_SECRET!)
openssl rand -base64 64

# Generiere Database Passwords (32 Zeichen)
openssl rand -base64 32

# Generiere Meilisearch API Key
openssl rand -base64 32
```

### 2.3 Fülle .env Datei aus

Öffne `.env` und ersetze **ALLE** `CHANGE_ME` Werte:

```bash
# Beispiel:
JWT_SECRET=dein-generiertes-secret-von-openssl-64-zeichen
JWT_REFRESH_SECRET=anderes-generiertes-secret-von-openssl-64-zeichen
POSTGRES_PASSWORD=sicheres-postgres-passwort-16-zeichen-minimum
MONGODB_ROOT_PASSWORD=sicheres-mongodb-passwort-16-zeichen-minimum
MONGO_PASSWORD=sicheres-mongodb-passwort-16-zeichen-minimum
REDIS_PASSWORD=sicheres-redis-passwort-16-zeichen-minimum
```

### ⚠️ KRITISCHE Variablen (MÜSSEN gesetzt sein):

```bash
JWT_SECRET                  # ← Authentifizierung funktioniert NICHT ohne!
JWT_REFRESH_SECRET          # ← Token Rotation funktioniert NICHT ohne!
POSTGRES_PASSWORD           # ← Database kann nicht starten ohne!
MONGODB_ROOT_PASSWORD       # ← Database kann nicht starten ohne!
MONGO_PASSWORD              # ← Database kann nicht starten ohne!
REDIS_PASSWORD              # ← Redis kann nicht starten ohne!
```

---

## 🐳 Schritt 3: Docker Infrastructure starten

### 3.1 Starte alle Datenbanken

```bash
docker-compose up -d
```

Dies startet:
- PostgreSQL (Port 5432)
- MongoDB (Port 27017)
- Redis (Port 6379)
- Meilisearch (Port 7700)

### 3.2 Überprüfe, dass alle Container laufen

```bash
docker-compose ps
```

Alle Container sollten Status "Up" haben.

### 3.3 Warte auf Health-Checks

```bash
# Warte ~30 Sekunden, bis alle DBs bereit sind
docker-compose logs -f postgres mongodb redis meilisearch
# Drücke Ctrl+C wenn alle "ready" melden
```

---

## 📦 Schritt 4: Dependencies installieren

### 4.1 Installiere Backend Services

```bash
# Auth Service (KRITISCH - zuerst!)
cd apps/auth-service
npm install
cd ../..

# Price Service
cd apps/price-service
npm install
cd ../..

# Journal Service
cd apps/journal-service
npm install
cd ../..

# Tools Service
cd apps/tools-service
npm install
cd ../..

# Community Service
cd apps/community-service
npm install
cd ../..

# Notification Service
cd apps/notification-service
npm install
cd ../..

# Search Service
cd apps/search-service
npm install
cd ../..

# Media Service
cd apps/media-service
npm install
cd ../..

# Gamification Service
cd apps/gamification-service
npm install
cd ../..

# AI Service
cd apps/ai-service
npm install
cd ../..
```

### 4.2 Installiere Frontend

```bash
cd apps/web-app
npm install
cd ../..
```

---

## 🗄️ Schritt 5: Datenbank Setup (Auth-Service)

```bash
cd apps/auth-service

# Generiere Prisma Client
npm run prisma:generate

# Erstelle Datenbank-Schema
npm run prisma:migrate

# Zurück zum Root
cd ../..
```

---

## 🚀 Schritt 6: Services starten

### Option A: Alle Services parallel (empfohlen für Development)

Öffne **11 separate Terminal-Fenster/Tabs**:

```bash
# Terminal 1: Auth Service
cd apps/auth-service && npm run dev

# Terminal 2: Price Service
cd apps/price-service && npm run dev

# Terminal 3: Journal Service
cd apps/journal-service && npm run dev

# Terminal 4: Tools Service
cd apps/tools-service && npm run dev

# Terminal 5: Community Service
cd apps/community-service && npm run dev

# Terminal 6: Notification Service
cd apps/notification-service && npm run dev

# Terminal 7: Search Service
cd apps/search-service && npm run dev

# Terminal 8: Media Service
cd apps/media-service && npm run dev

# Terminal 9: Gamification Service
cd apps/gamification-service && npm run dev

# Terminal 10: AI Service
cd apps/ai-service && npm run dev

# Terminal 11: Frontend
cd apps/web-app && npm run dev
```

### Option B: Mit tmux (Fortgeschrittene)

```bash
# Starte alle Services in einem tmux-Session
./scripts/start-all-services.sh  # (falls vorhanden)
```

---

## ✅ Schritt 7: Verifizierung

### 7.1 Health-Checks

Öffne Browser und teste:

```
✅ Auth Service:         http://localhost:3001/health
✅ Price Service:        http://localhost:3002/health
✅ Journal Service:      http://localhost:3003/health
✅ Tools Service:        http://localhost:3004/health
✅ Community Service:    http://localhost:3005/health
✅ Notification Service: http://localhost:3006/health
✅ Search Service:       http://localhost:3007/health
✅ Media Service:        http://localhost:3008/health
✅ Gamification Service: http://localhost:3009/health
✅ AI Service:           http://localhost:3010/health
✅ Frontend:             http://localhost:3000
```

Alle sollten `{"status":"healthy"}` zurückgeben.

### 7.2 Test Authentication Flow

1. Öffne Frontend: http://localhost:3000
2. Klicke auf "Registrieren"
3. Erstelle Test-Account
4. Login sollte funktionieren
5. Du wirst zum Dashboard weitergeleitet

---

## 🔍 Troubleshooting

### Problem: "JWT_SECRET is not defined"

**Lösung:**
```bash
# Überprüfe .env Datei
cat .env | grep JWT_SECRET

# Stelle sicher, dass JWT_SECRET gesetzt ist (nicht leer)
# Generiere neuen Secret:
openssl rand -base64 64
```

### Problem: "Database connection failed"

**Lösung:**
```bash
# Überprüfe ob Docker Container laufen
docker-compose ps

# Starte neu wenn nötig
docker-compose restart postgres mongodb redis

# Prüfe Logs
docker-compose logs postgres
```

### Problem: "Cannot find module 'express'"

**Lösung:**
```bash
# Dependencies erneut installieren
cd apps/auth-service  # (oder betroffener Service)
rm -rf node_modules package-lock.json
npm install
```

### Problem: "Port already in use"

**Lösung:**
```bash
# Finde welcher Prozess Port nutzt
lsof -i :3001  # (oder betroffener Port)

# Beende Prozess
kill -9 <PID>

# Oder ändere Port in Service
# Setze PORT=3011 in .env für diesen Service
```

---

## 📊 Port-Übersicht

| Service | Port | URL |
|---------|------|-----|
| Auth | 3001 | http://localhost:3001 |
| Price | 3002 | http://localhost:3002 |
| Journal | 3003 | http://localhost:3003 |
| Tools | 3004 | http://localhost:3004 |
| Community | 3005 | http://localhost:3005 |
| Notification | 3006 | http://localhost:3006 |
| Search | 3007 | http://localhost:3007 |
| Media | 3008 | http://localhost:3008 |
| Gamification | 3009 | http://localhost:3009 |
| AI | 3010 | http://localhost:3010 |
| **Frontend** | **3000** | **http://localhost:3000** |
| **Traefik** | **8080** | **http://localhost:8080** |
| PostgreSQL | 5432 | localhost:5432 |
| MongoDB | 27017 | localhost:27017 |
| Redis | 6379 | localhost:6379 |
| Meilisearch | 7700 | http://localhost:7700 |

---

## 🔐 Security Checklist (vor Production!)

```bash
[ ] JWT_SECRET mit openssl generiert (64 Zeichen)
[ ] JWT_REFRESH_SECRET mit openssl generiert (64 Zeichen)
[ ] Alle Database Passwords geändert (min 16 Zeichen)
[ ] TRAEFIK_ADMIN_PASSWORD geändert
[ ] CORS_ORIGIN auf Production-Domain gesetzt
[ ] NODE_ENV=production gesetzt
[ ] Alle Secrets aus Git-History entfernt
[ ] .env in .gitignore (ist bereits drin!)
[ ] SSL/TLS Zertifikate konfiguriert
[ ] Rate Limiting aktiviert
[ ] Logs-Monitoring eingerichtet
```

---

## 📚 Weitere Dokumentation

- **README.md** - Projekt-Übersicht & Features
- **FINAL_HANDOVER.md** - Feature-Status & Roadmap
- **BUG_TRACKER.md** - Bekannte Bugs & Fixes
- **PRODUCTION_HARDENING_REPORT.md** - Production Best Practices

---

## 🆘 Hilfe & Support

**Problem mit Setup?**

1. Prüfe Logs: `docker-compose logs`
2. Prüfe Service-Logs: `npm run dev` Output
3. Erstelle Issue: https://github.com/Callie84/SF-1-Ultimate/issues

---

## 🎉 Geschafft!

Dein SF-1 Ultimate System läuft jetzt!

**Nächste Schritte:**
1. Erstelle ersten Test-User
2. Erkunde alle Features
3. Konfiguriere OPENAI_API_KEY für AI-Features (optional)
4. Teste alle Endpoints
5. Bereite Production-Deployment vor

**Happy Growing! 🌿**
