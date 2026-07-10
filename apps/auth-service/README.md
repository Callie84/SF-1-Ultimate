# Auth Service - SF-1 Ultimate

JWT-based Authentication mit PostgreSQL, Redis und OAuth2.

## Features

✅ **JWT Tokens** - Access Token (15min) + Refresh Token (7d)
✅ **Token Rotation** - Security gegen Token-Diebstahl
✅ **Argon2id** - Moderne Password-Hashing
✅ **OAuth2** - Google & Discord Integration
✅ **RBAC** - 4 Rollen (USER, PREMIUM, MODERATOR, ADMIN)
✅ **Redis Sessions** - Schnelle Token-Verification

## Database Schema

```prisma
User {
  id, email, username, passwordHash
  role: USER | PREMIUM | MODERATOR | ADMIN
  provider: LOCAL | GOOGLE | DISCORD
  premiumUntil
}

Session {
  userId, token, expiresAt
}

RefreshToken {
  userId, token, family, expiresAt
}
```

## API Endpoints

```
POST   /api/auth/register       - Registrierung
POST   /api/auth/login          - Login
POST   /api/auth/refresh        - Token erneuern
POST   /api/auth/logout         - Logout
GET    /api/auth/me             - Aktueller User
GET    /api/auth/verify         - Token-Check (für Gateway)
```

## Setup

```bash
# Install
npm install

# Prisma
npm run prisma:generate
npm run prisma:migrate

# Dev
npm run dev

# Build
npm run build
npm start
```

## ENV Variables

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/sf1
REDIS_URL=redis://localhost:6379
JWT_SECRET=<64+ chars random>
JWT_REFRESH_SECRET=<64+ chars random>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
```

## Deployment

```bash
docker-compose up -d auth-service
```
