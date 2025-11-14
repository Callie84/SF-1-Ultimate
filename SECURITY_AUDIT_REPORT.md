# 🔒 SF-1 Ultimate - Sicherheits- und Code-Qualitätsaudit

**Datum:** 2025-11-14
**Projekt:** SF-1 Ultimate (Microservices-Plattform)
**Codebase:** ~17.200 Zeilen TypeScript
**Services:** 11 Microservices + Frontend

---

## 📋 Executive Summary

Dieses Audit identifiziert **kritische Sicherheitslücken**, **Performance-Probleme**, **Code-Duplikate** und **Verbesserungspotenziale** in der SF-1 Ultimate Codebase. Die Analyse zeigt sowohl strukturelle Stärken als auch signifikante Schwachstellen, die **vor dem Produktionsstart** behoben werden müssen.

### Kritikalität

🔴 **KRITISCH:** 7 Sicherheitslücken erfordern sofortige Maßnahmen
🟡 **HOCH:** 12 Performance- und Qualitätsprobleme
🟢 **MITTEL:** 8 Verbesserungsvorschläge

---

## 🔴 KRITISCHE SICHERHEITSLÜCKEN

### 1. 🚨 .env-Datei mit Produktionspasswörtern in Git committed

**Datei:** `.env` (Zeilen 1-71)
**Schweregrad:** 🔴 KRITISCH
**CVSS Score:** 9.8 (Critical)

#### Problem
```bash
# Die .env-Datei enthält produktive Credentials und ist in Git committed
POSTGRES_PASSWORD=XXXXXXXXXXXXXXXXXXXXXXX
MONGO_PASSWORD=XXXXXXXXXXXXXXXXXXXXXXX
REDIS_PASSWORD=XXXXXXXXXXXXXXXXXXXXXXX
JWT_SECRET=XXXXXXXXXXXXXXXXXXXXXXX
OPENAI_API_KEY=XXXXXXXXXXXXXXXXXXXXXXX
```

#### Risiko
- **Alle Passwörter sind in der Git-History sichtbar**
- Jeder mit Repository-Zugriff kann Datenbanken kompromittieren
- Secrets können nicht ohne Datenbankwechsel rotiert werden

#### Lösung
```bash
# 1. SOFORT: .env aus Git entfernen
git rm --cached .env
echo ".env" >> .gitignore

# 2. ALLE Credentials rotieren
# - Neue Postgres/MongoDB/Redis Passwörter
# - Neue JWT Secrets generieren
# - Neue API Keys

# 3. .env.example erstellen (ohne echte Werte)
cp .env .env.example
# Dann alle Werte in .env.example mit Platzhaltern ersetzen

# 4. Git History bereinigen
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all
```

#### Best Practice
- Verwende **Secret Management** (HashiCorp Vault, AWS Secrets Manager, Doppler)
- Nutze **Environment-spezifische** Secrets (dev/staging/prod)
- Implementiere **Secret Rotation**

---

### 2. 🚨 Authentifizierung basiert nur auf unverifizierten Headers

**Dateien:**
- `apps/community-service/src/middleware/auth.ts:22-46`
- `apps/media-service/src/middleware/auth.ts` (ähnlich)
- `apps/journal-service/src/middleware/auth.ts` (ähnlich)

**Schweregrad:** 🔴 KRITISCH
**CVSS Score:** 9.1 (Critical)

#### Problem
```typescript
// apps/community-service/src/middleware/auth.ts
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string;      // ❌ KEINE Validierung
  const userRole = req.headers['x-user-role'] as string;  // ❌ KEINE Validierung
  const userPremium = req.headers['x-user-premium'] === 'true'; // ❌ KEINE Validierung

  if (!userId) {
    throw new AppError('UNAUTHORIZED', 401);
  }

  req.user = { id: userId, role: userRole, premium: userPremium };
  next();
}
```

#### Risiko
**Jeder Angreifer kann beliebige User impersonieren:**
```bash
# Angreifer wird zum Admin
curl -H "x-user-id: any-user-id" \
     -H "x-user-role: ADMIN" \
     -H "x-user-premium: true" \
     https://api.seedfinderpro.de/api/community/threads
```

- **Vollständiger Account-Übernahme** möglich
- **Privilege Escalation** zu Admin
- **Premium-Features** für alle zugänglich
- **Datenmanipulation** ohne Authentifizierung

#### Lösung

**Option A: API Gateway JWT-Verifikation (Empfohlen)**
```yaml
# traefik.yml
http:
  middlewares:
    jwt-auth:
      plugin:
        jwt:
          secret: ${JWT_SECRET}
          jwksUrl: http://auth-service:3001/.well-known/jwks.json
          claims:
            userId: x-user-id
            role: x-user-role
            premium: x-user-premium
```

**Option B: JWT-Verifikation in jedem Service**
```typescript
// shared/middleware/auth.ts
import jwt from 'jsonwebtoken';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. JWT aus Header extrahieren
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      throw new AppError('NO_TOKEN', 401);
    }

    // 2. JWT verifizieren
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // 3. User aus verifiziertem Token
    req.user = {
      id: payload.userId,
      role: payload.role,
      premium: payload.premium
    };

    next();
  } catch (error) {
    throw new AppError('INVALID_TOKEN', 401);
  }
}
```

**Option C: Shared Auth Library**
```typescript
// packages/auth/src/middleware.ts
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('http://auth-service:3001/.well-known/jwks.json')
);

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new AppError('NO_TOKEN', 401);

  const { payload } = await jwtVerify(token, JWKS);
  req.user = payload as AuthUser;
  next();
}
```

---

### 3. 🚨 Admin-Endpunkte ohne Authentifizierung

**Datei:** `apps/price-service/src/index.ts:58-70`
**Schweregrad:** 🔴 KRITISCH

#### Problem
```typescript
// Manual scrape trigger (admin only - would need auth) ← ❌ Nur Kommentar
app.post('/admin/scrape/:seedbank', async (req, res) => {
  // KEINE Authentifizierung implementiert!
  const { seedbank } = req.params;
  await scheduleScrapeJob(seedbank);
  res.json({ success: true });
});
```

#### Risiko
- Jeder kann **ressourcenintensive Scraping-Jobs** starten
- **DoS-Angriff** durch massives Scraping möglich
- **Kosten** durch übermäßige externe Requests

#### Lösung
```typescript
import { adminMiddleware } from '../middleware/auth';

app.post('/admin/scrape/:seedbank',
  authMiddleware,           // ✅ JWT verifizieren
  adminMiddleware,          // ✅ Admin-Rolle prüfen
  async (req, res) => {
    const { seedbank } = req.params;

    // Validierung
    const allowedSeedbanks = ['sensi-seeds', 'rqs', 'zamnesia'];
    if (!allowedSeedbanks.includes(seedbank)) {
      return res.status(400).json({ error: 'Invalid seedbank' });
    }

    await scheduleScrapeJob(seedbank);
    res.json({ success: true, message: `Scrape job scheduled for ${seedbank}` });
  }
);
```

---

### 4. 🚨 CORS auf Wildcard (*) gesetzt

**Dateien:**
- `apps/price-service/src/index.ts:22`
- `apps/ai-service/src/index.ts:14`
- `apps/search-service/src/index.ts:15`

**Schweregrad:** 🔴 HOCH

#### Problem
```typescript
// apps/price-service/src/index.ts
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',  // ❌ Wildcard erlaubt ALLE Origins
  credentials: true                         // ❌ + Credentials = gefährlich
}));
```

#### Risiko
- **Cross-Site Request Forgery (CSRF)**
- **Session Hijacking** möglich
- Angreifer können von **beliebiger Domain** API aufrufen

#### Lösung
```typescript
// Whitelist für erlaubte Origins
const ALLOWED_ORIGINS = [
  'https://seedfinderpro.de',
  'https://www.seedfinderpro.de',
  'https://app.seedfinderpro.de',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

### 5. 🚨 Schwache JWT Fallback-Secrets

**Datei:** `apps/auth-service/src/services/jwt.service.ts:6-7`
**Schweregrad:** 🔴 HOCH

#### Problem
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
```

#### Risiko
- Bei fehlendem Environment-Variable wird **schwaches Secret** verwendet
- Angreifer können **JWTs fälschen**
- **Alle Benutzer-Sessions** kompromittiert

#### Lösung
```typescript
// ✅ Keine Fallbacks - App soll NICHT starten ohne Secret
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set');
}

// ✅ Secret-Länge validieren
if (JWT_SECRET.length < 64 || JWT_REFRESH_SECRET.length < 64) {
  throw new Error('FATAL: JWT secrets must be at least 64 characters');
}

// ✅ Secrets generieren
// openssl rand -base64 64
```

---

### 6. 🚨 Traefik API im Insecure-Modus

**Datei:** `docker-compose.yml:92`
**Schweregrad:** 🔴 MITTEL

#### Problem
```yaml
api-gateway:
  command:
    - "--api.insecure=true"  # ❌ Dashboard ohne Auth
```

#### Risiko
- **Traefik Dashboard** öffentlich zugänglich
- Angreifer sehen **komplette Infrastruktur**
- **Routing-Regeln** einsehbar

#### Lösung
```yaml
api-gateway:
  command:
    - "--api.dashboard=true"
    - "--api.insecure=false"  # ✅ Dashboard sichern
  labels:
    - "traefik.http.routers.dashboard.rule=Host(`traefik.internal.seedfinderpro.de`)"
    - "traefik.http.routers.dashboard.service=api@internal"
    - "traefik.http.routers.dashboard.middlewares=dashboard-auth"
    - "traefik.http.middlewares.dashboard-auth.basicauth.users=admin:$$apr1$$..."
```

---

### 7. 🚨 Mime-Type-Validierung nur client-side

**Datei:** `apps/media-service/src/services/upload.service.ts:194`
**Schweregrad:** 🔴 MITTEL

#### Problem
```typescript
private validateFile(file: Express.Multer.File): void {
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', ...];

  if (!ALLOWED_TYPES.includes(file.mimetype)) {  // ❌ Nur client-gesetzter MIME-Type
    throw new AppError('INVALID_FILE_TYPE', 400);
  }
}
```

#### Risiko
- **MIME-Type-Spoofing**: Angreifer kann `.php`-Datei als `image/jpeg` hochladen
- **Malware-Upload** möglich
- **XSS** über SVG-Dateien

#### Lösung
```typescript
import { fileTypeFromBuffer } from 'file-type';
import crypto from 'crypto';

private async validateFile(file: Express.Multer.File): Promise<void> {
  // 1. Magic Number Detection (echte Datei-Signatur)
  const fileType = await fileTypeFromBuffer(file.buffer);

  const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'pdf'];

  if (!fileType || !ALLOWED_EXTENSIONS.includes(fileType.ext)) {
    throw new AppError('INVALID_FILE_TYPE', 400,
      `File type ${fileType?.ext || 'unknown'} not allowed`);
  }

  // 2. Additional: Content-Type muss matchen
  if (file.mimetype !== fileType.mime) {
    throw new AppError('MIME_TYPE_MISMATCH', 400);
  }

  // 3. Size Check
  if (file.size > 50 * 1024 * 1024) {
    throw new AppError('FILE_TOO_LARGE', 400);
  }

  // 4. SVG: XSS-Check
  if (fileType.ext === 'svg') {
    const content = file.buffer.toString('utf-8');
    if (content.match(/<script|on\w+=/i)) {
      throw new AppError('MALICIOUS_SVG', 400);
    }
  }
}

// Package installieren:
// npm install file-type
```

---

## 🟡 PERFORMANCE-PROBLEME

### 8. Fehlende Rate-Limiting

**Alle Services**
**Schweregrad:** 🟡 HOCH

#### Problem
- Keine Request-Limitierung implementiert
- **DoS-Angriffe** möglich
- **API-Missbrauch** nicht verhindert

#### Lösung
```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// Global Rate Limiter
const globalLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:global:'
  }),
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 1000, // 1000 Requests pro IP
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Auth-spezifisch (strenger)
const authLimiter = rateLimit({
  store: new RedisStore({ client: redis, prefix: 'rl:auth:' }),
  windowMs: 15 * 60 * 1000,
  max: 5, // Nur 5 Login-Versuche pro 15 Min
  skipSuccessfulRequests: true
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
```

---

### 9. N+1 Query-Problem in Services

**Dateien:**
- `apps/community-service/src/services/thread.service.ts`
- `apps/journal-service/src/services/feed.service.ts`

**Schweregrad:** 🟡 HOCH

#### Problem
```typescript
// ❌ N+1 Query
const threads = await Thread.find({ categoryId });
for (const thread of threads) {
  thread.author = await User.findById(thread.userId);  // N Queries!
}
```

#### Lösung
```typescript
// ✅ Aggregation Pipeline mit Lookup
const threads = await Thread.aggregate([
  { $match: { categoryId, isDeleted: false } },
  {
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'author'
    }
  },
  { $unwind: '$author' },
  { $sort: { isPinned: -1, lastActivityAt: -1 } },
  { $limit: 50 }
]);

// Oder: Populate mit Lean
const threads = await Thread.find({ categoryId })
  .populate('userId', 'username avatar')
  .lean();
```

---

### 10. Fehlende Caching-Strategie

**Alle Services**
**Schweregrad:** 🟡 HOCH

#### Problem
- Keine Redis-Caching-Nutzung
- Jeder Request trifft Datenbank
- **Langsame API-Responses**

#### Lösung
```typescript
// Cache-Wrapper
export async function cached<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // 1. Cache Check
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Fetch Data
  const data = await fetcher();

  // 3. Cache Set
  await redis.setex(key, ttl, JSON.stringify(data));

  return data;
}

// Verwendung
const threads = await cached(
  `threads:category:${categoryId}`,
  300, // 5 Minuten
  async () => {
    return await Thread.find({ categoryId }).lean();
  }
);
```

---

### 11. Keine Connection Pooling Konfiguration

**Dateien:** Alle `mongodb.ts` und `database.ts`
**Schweregrad:** 🟡 MITTEL

#### Problem
```typescript
// ❌ Default Connection Pool
await mongoose.connect(MONGODB_URL);
```

#### Lösung
```typescript
await mongoose.connect(MONGODB_URL, {
  maxPoolSize: 10,        // ✅ Max 10 Connections
  minPoolSize: 2,         // ✅ Min 2 Connections
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  family: 4 // IPv4
});
```

---

### 12. Fehlende Database-Indizes

**Dateien:** Diverse Models
**Schweregrad:** 🟡 MITTEL

#### Problem
Einige häufig genutzte Queries haben keine Indizes:

```typescript
// ❌ Slow Query ohne Index
const notifications = await Notification.find({
  userId,
  isRead: false
}).sort({ createdAt: -1 });
```

#### Lösung
```typescript
// models/Notification.model.ts
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

// Check bestehende Indizes
db.threads.getIndexes()
```

**Fehlende Indizes:**
- `Notification.model.ts`: `userId + isRead + createdAt`
- `Entry.model.ts`: `growId + createdAt`
- `Reply.model.ts`: `threadId + createdAt`

---

## 🔄 CODE-DUPLIKATE

### 13. Identische DB-Connection-Logik (26x)

**Dateien:** Alle `config/mongodb.ts` und `config/redis.ts`
**Schweregrad:** 🟡 MITTEL

#### Problem
Identischer Code in 26 Dateien:
```typescript
// ❌ Duplikat in jedem Service
export async function connectMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URL!);
    logger.info('[MongoDB] Connected');
  } catch (error) {
    logger.error('[MongoDB] Connection failed:', error);
    process.exit(1);
  }
}
```

#### Lösung
**Option A: Shared Package**
```bash
# packages/database/src/index.ts
export { connectMongoDB, disconnectMongoDB } from './mongodb';
export { connectRedis, disconnectRedis } from './redis';

# In Services:
npm install @sf1/database
import { connectMongoDB, connectRedis } from '@sf1/database';
```

**Option B: Docker Entrypoint Script**
```bash
# scripts/wait-for-db.sh
#!/bin/sh
until nc -z mongodb 27017; do
  echo "Waiting for MongoDB..."
  sleep 2
done
echo "MongoDB ready"
exec "$@"
```

---

### 14. Duplizierte Middleware (Auth, Validate)

**Dateien:**
- `apps/*/src/middleware/auth.ts` (8x ähnlich)
- `apps/*/src/middleware/validate.ts` (7x ähnlich)

**Schweregrad:** 🟡 MITTEL

#### Lösung
```bash
# packages/middleware/src/index.ts
export { authMiddleware, optionalAuthMiddleware } from './auth';
export { validate } from './validate';
export { errorHandler } from './error-handler';

# In Services:
npm install @sf1/middleware
import { authMiddleware, validate } from '@sf1/middleware';
```

---

### 15. Logger-Setup wiederholt

**Dateien:** `apps/*/src/utils/logger.ts` (11x identisch)

#### Lösung
```bash
# packages/logger/src/index.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

---

## ⚠️ ERROR-HANDLING PROBLEME

### 16. Unspezifische Error-Handling

**Alle Services**
**Schweregrad:** 🟡 MITTEL

#### Problem
```typescript
// ❌ Catch-All ohne Details
try {
  await someOperation();
} catch (error) {
  logger.error('Operation failed:', error);
  // Was jetzt? Retry? Fail? User benachrichtigen?
}
```

#### Lösung
```typescript
// ✅ Spezifische Error-Behandlung
try {
  await someOperation();
} catch (error) {
  if (error instanceof ValidationError) {
    throw new AppError('VALIDATION_FAILED', 400, error.message);
  } else if (error instanceof MongoError && error.code === 11000) {
    throw new AppError('DUPLICATE_KEY', 409, 'Resource already exists');
  } else if (error instanceof TimeoutError) {
    // Retry mit Exponential Backoff
    await retryWithBackoff(someOperation, 3);
  } else {
    logger.error('Unexpected error:', error);
    throw new AppError('INTERNAL_ERROR', 500);
  }
}
```

---

### 17. Fehlende Input-Sanitization

**Mehrere Routes**
**Schweregrad:** 🟡 HOCH

#### Problem
```typescript
// ❌ Keine Sanitization
router.get('/search', async (req, res) => {
  const { q } = req.query;
  const results = await Thread.find({ $text: { $search: q } });  // NoSQL Injection?
});
```

#### Lösung
```typescript
import { z } from 'zod';
import mongoSanitize from 'express-mongo-sanitize';

// Global: NoSQL Injection Prevention
app.use(mongoSanitize());

// Per-Route: Zod Validation
const searchSchema = z.object({
  q: z.string().min(2).max(100).regex(/^[a-zA-Z0-9\s]+$/),
  limit: z.coerce.number().min(1).max(100).default(20),
  skip: z.coerce.number().min(0).default(0)
});

router.get('/search', validate(searchSchema), async (req, res) => {
  const { q, limit, skip } = req.query;
  // Jetzt sicher
});
```

---

## 🔧 VERBESSERUNGSPOTENZIALE

### 18. Keine Tests vorhanden

**Schweregrad:** 🟢 MITTEL

#### Lösung
```bash
# Unit Tests mit Vitest
npm install -D vitest @vitest/ui

# E2E Tests mit Playwright
npm install -D @playwright/test

# Test-Struktur
apps/
  auth-service/
    src/
    tests/
      unit/
        jwt.service.test.ts
        password.service.test.ts
      integration/
        auth.routes.test.ts
```

**Beispiel-Test:**
```typescript
// tests/unit/jwt.service.test.ts
import { describe, it, expect } from 'vitest';
import { JWTService } from '../../src/services/jwt.service';

describe('JWTService', () => {
  const jwtService = new JWTService();

  it('should generate valid access token', () => {
    const user = { id: '123', email: 'test@example.com', role: 'USER' };
    const token = jwtService.generateAccessToken(user);

    expect(token).toBeDefined();
    const payload = jwtService.verifyAccessToken(token);
    expect(payload?.userId).toBe('123');
  });

  it('should reject expired token', async () => {
    // ...
  });
});
```

---

### 19. Fehlende API-Dokumentation

**Schweregrad:** 🟢 MITTEL

#### Lösung
```typescript
// OpenAPI/Swagger
npm install swagger-jsdoc swagger-ui-express

// apps/auth-service/src/index.ts
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SF-1 Auth Service API',
      version: '1.0.0'
    }
  },
  apis: ['./src/routes/*.ts']
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// In Routes:
/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 */
router.post('/login', ...);
```

---

### 20. Kein Monitoring/Observability

**Schweregrad:** 🟢 HOCH

#### Lösung
```yaml
# docker-compose.yml - Monitoring Stack
  prometheus:
    image: prom/prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana

  loki:
    image: grafana/loki
    ports:
      - "3100:3100"
```

**Metrics:**
```typescript
import promClient from 'prom-client';

const register = new promClient.Registry();

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

register.registerMetric(httpRequestDuration);

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.labels(req.method, req.route?.path, res.statusCode).observe(duration);
  });
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

### 21. NODE_ENV=production mit npm run dev

**Datei:** `docker-compose.yml` (alle Services)
**Schweregrad:** 🟢 MITTEL

#### Problem
```yaml
environment:
  NODE_ENV: production  # ❌
command: sh -c "npm install && npm run dev"  # ❌
```

#### Lösung
```yaml
# Development:
environment:
  NODE_ENV: development
command: sh -c "npm install && npm run dev"

# Production:
environment:
  NODE_ENV: production
command: sh -c "npm ci --production && npm run build && npm start"
```

---

### 22. Fehlende Health-Checks für Dependencies

**Alle Services**
**Schweregrad:** 🟢 MITTEL

#### Lösung
```typescript
app.get('/health', async (req, res) => {
  const checks = {
    mongodb: false,
    redis: false,
    meilisearch: false
  };

  try {
    await mongoose.connection.db.admin().ping();
    checks.mongodb = true;
  } catch {}

  try {
    await redis.ping();
    checks.redis = true;
  } catch {}

  const allHealthy = Object.values(checks).every(Boolean);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  });
});
```

---

## 📊 ZUSAMMENFASSUNG & PRIORISIERUNG

### Sofort-Maßnahmen (vor Produktionsstart)

1. ✅ `.env` aus Git entfernen + Credentials rotieren
2. ✅ JWT-Verifikation in Services implementieren
3. ✅ Admin-Endpunkte mit Auth sichern
4. ✅ CORS-Whitelist konfigurieren
5. ✅ Rate-Limiting implementieren
6. ✅ Mime-Type-Validierung mit Magic Numbers

### Kurzfristig (1-2 Wochen)

7. ✅ Shared Packages für Middleware/Logger erstellen
8. ✅ Caching-Strategie implementieren
9. ✅ Input-Sanitization überall hinzufügen
10. ✅ Health-Checks erweitern
11. ✅ Error-Handling verbessern

### Mittelfristig (1-2 Monate)

12. ✅ Unit + Integration Tests schreiben
13. ✅ API-Dokumentation mit OpenAPI
14. ✅ Monitoring Stack (Prometheus + Grafana)
15. ✅ Performance-Optimierung (N+1, Indizes)

### Langfristig (3-6 Monate)

16. ✅ Secret Management (Vault/AWS Secrets Manager)
17. ✅ CI/CD Pipeline mit Security Scans
18. ✅ Load Testing + Performance Monitoring
19. ✅ Automated Security Audits

---

## 🛠️ TOOLS & EMPFEHLUNGEN

### Security Tools
```bash
# Static Analysis
npm install -D eslint-plugin-security

# Dependency Scanning
npm audit
npm install -g snyk
snyk test

# Secret Detection
git-secrets --install
trufflehog git file://. --json
```

### Performance Tools
```bash
# Database Query Profiling
db.setProfilingLevel(2)
db.system.profile.find().pretty()

# Load Testing
npm install -g artillery
artillery quick --count 100 --num 10 https://api.seedfinderpro.de/health
```

### Quality Tools
```bash
# Code Quality
npm install -D eslint prettier
npm install -D @typescript-eslint/parser

# Test Coverage
npm install -D @vitest/coverage-v8
vitest --coverage
```

---

## 📝 NEXT STEPS

### Woche 1: Kritische Sicherheitslücken
- [ ] .env aus Git entfernen
- [ ] Alle Credentials rotieren
- [ ] JWT-Verifikation implementieren
- [ ] Admin-Endpunkte sichern

### Woche 2: Performance & Stabilität
- [ ] Rate-Limiting hinzufügen
- [ ] CORS-Whitelist konfigurieren
- [ ] Caching implementieren
- [ ] Database-Indizes optimieren

### Woche 3-4: Code-Qualität
- [ ] Shared Packages erstellen
- [ ] Error-Handling standardisieren
- [ ] Input-Validation überall
- [ ] Tests schreiben (min. 70% Coverage)

---

## 📞 KONTAKT & SUPPORT

Bei Fragen zu diesem Audit:
- **GitHub Issues:** https://github.com/Callie84/SF-1-Ultimate/issues
- **Dokumentation:** Siehe `README.md` und Service-spezifische READMEs

---

**Audit durchgeführt von:** Claude Code
**Datum:** 2025-11-14
**Version:** 1.0
