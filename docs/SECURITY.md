# 🔒 SF-1 Ultimate - Security Guide

Vollständige Dokumentation für Security Best Practices und Implementierung.

---

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Authentication & Authorization](#authentication--authorization)
- [Input Validation](#input-validation)
- [Rate Limiting](#rate-limiting)
- [Security Headers](#security-headers)
- [Data Protection](#data-protection)
- [Security Checklist](#security-checklist)

---

## 🎯 Übersicht

**Security Stack:**
- **Helmet.js** - Security Headers
- **Rate Limiting** - Brute Force Protection
- **Zod** - Input Validation
- **Argon2** - Password Hashing
- **JWT** - Token-based Auth
- **CORS** - Cross-Origin Protection

---

## 🔐 Authentication & Authorization

### JWT Token System

**Access Token:**
- Gültigkeit: 15 Minuten
- Stored: httpOnly Cookie oder localStorage
- Enthält: userId, role, permissions

**Refresh Token:**
- Gültigkeit: 7 Tage
- Stored: httpOnly Cookie (Secure)
- Rotation bei jedem Refresh

### Password Security

**Hashing: Argon2**

```typescript
import argon2 from 'argon2';

// Hash Password
const hashedPassword = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64 MB
  timeCost: 3,
  parallelism: 4
});

// Verify Password
const isValid = await argon2.verify(hashedPassword, password);
```

**Password Requirements:**
- Minimum 8 Zeichen
- Mindestens 1 Großbuchstabe
- Mindestens 1 Kleinbuchstabe
- Mindestens 1 Zahl
- Mindestens 1 Sonderzeichen

### OAuth 2.0

**Unterstützte Provider:**
- Google OAuth
- Discord OAuth
- GitHub OAuth (Optional)

**Flow:**
```
1. User klickt "Login with Google"
2. Redirect zu Google OAuth
3. User authorisiert
4. Callback mit Authorization Code
5. Exchange Code für Token
6. Create/Link User Account
7. Return JWT Token
```

### Role-Based Access Control (RBAC)

**Roles:**
- `user` - Standard User
- `moderator` - Community Moderator
- `admin` - Full Access

**Permissions:**
```typescript
const permissions = {
  user: ['read:own', 'write:own'],
  moderator: ['read:all', 'write:all', 'moderate'],
  admin: ['*']
};
```

### Authorization Middleware

```typescript
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../middleware/error-handler';

export const requireAuth = (req, res, next) => {
  const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

  if (!token) {
    throw new UnauthorizedError('No token provided');
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
};

export const requireRole = (roles: string[]) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
};
```

---

## ✅ Input Validation

### Zod Schemas

**User Registration:**

```typescript
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain special character'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
});

// Usage
app.post('/api/auth/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    // ... process registration
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
  }
});
```

### SQL Injection Prevention

**Prisma (Parameterized Queries):**

```typescript
// ✅ SICHER
const user = await prisma.user.findUnique({
  where: { email: userEmail }
});

// ❌ NIEMALS
const user = await prisma.$queryRaw`SELECT * FROM users WHERE email = '${userEmail}'`;
```

**MongoDB (Mongoose):**

```typescript
// ✅ SICHER
const user = await User.findOne({ email: userEmail });

// ❌ NIEMALS
const user = await User.find({ $where: `this.email == '${userEmail}'` });
```

### XSS Prevention

**Content Security Policy:**

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.seedfinderpro.de']
    }
  }
}));
```

**Output Encoding:**

```typescript
import DOMPurify from 'isomorphic-dompurify';

// Sanitize HTML
const sanitizedHtml = DOMPurify.sanitize(userInput);

// Escape für JSON
const escapedJson = JSON.stringify(userInput);
```

### NoSQL Injection Prevention

```typescript
// ✅ SICHER - Validate & Sanitize
const emailSchema = z.string().email();
const email = emailSchema.parse(req.body.email);

// ❌ UNSICHER - Direct Input
const user = await User.findOne({ email: req.body.email });
```

---

## 🚦 Rate Limiting

### Global Rate Limit

**Standard: 100 Requests / Minute**

```typescript
import { standardRateLimiter } from '../../shared/middleware';

app.use(standardRateLimiter(process.env.REDIS_URL));
```

### Endpoint-Specific Limits

**Login/Register: 5 Versuche / 15 Minuten**

```typescript
import { authRateLimiter } from '../../shared/middleware';

app.post('/api/auth/login', authRateLimiter(redisUrl), loginHandler);
app.post('/api/auth/register', authRateLimiter(redisUrl), registerHandler);
```

**Custom Rate Limits:**

```typescript
import { createRateLimiter } from '../../shared/middleware';

// AI Requests: 10 / Stunde
const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  max: 10,
  redisUrl: process.env.REDIS_URL,
  keyPrefix: 'rate-limit:ai'
});

app.post('/api/ai/diagnose', aiRateLimiter, aiHandler);
```

### Bypass für Trusted IPs

```typescript
const rateLimiter = createRateLimiter({
  skip: (req) => {
    const trustedIPs = ['192.168.1.1', '10.0.0.1'];
    return trustedIPs.includes(req.ip);
  }
});
```

---

## 🛡️ Security Headers

### Helmet Configuration

```typescript
app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.seedfinderpro.de'],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 Jahr
    includeSubDomains: true,
    preload: true
  },

  // X-Frame-Options
  frameguard: {
    action: 'deny'
  },

  // X-Content-Type-Options
  noSniff: true,

  // X-XSS-Protection
  xssFilter: true,

  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));
```

### CORS Configuration

```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://seedfinderpro.de',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 Stunden
}));
```

---

## 🔐 Data Protection

### Encryption at Rest

**Sensitive Fields:**

```typescript
import crypto from 'crypto';

// Encrypt
function encrypt(text: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Decrypt
function decrypt(text: string, key: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Usage
const encryptedApiKey = encrypt(apiKey, process.env.ENCRYPTION_KEY);
```

### File Upload Security

**Image Upload:**

```typescript
import multer from 'multer';
import sharp from 'sharp';

const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  },
  fileFilter: (req, file, cb) => {
    // Nur Bilder erlauben
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only images allowed'));
    }
    cb(null, true);
  }
});

app.post('/upload', upload.single('image'), async (req, res) => {
  // EXIF Data entfernen
  const buffer = await sharp(req.file.buffer)
    .rotate() // Auto-rotate basierend auf EXIF
    .resize(1200, 1200, { fit: 'inside' })
    .jpeg({ quality: 90 })
    .toBuffer();

  // Virus Scan (ClamAV)
  // await scanFile(buffer);

  // Upload to S3
  // ...
});
```

### Sensitive Data Masking

Automatisches Masking in Logs:

```typescript
import { maskSensitiveData } from '../../shared/middleware';

logger.info('User data', maskSensitiveData({
  email: 'user@example.com',
  password: 'secret123', // → ***MASKED***
  token: 'jwt_token',     // → ***MASKED***
  name: 'John Doe'        // → John Doe
}));
```

---

## 🔍 Security Monitoring

### Suspicious Activity Detection

```typescript
// Track Failed Login Attempts
const failedLoginKey = `failed-login:${email}`;
const attempts = await redis.incr(failedLoginKey);
await redis.expire(failedLoginKey, 900); // 15 Minuten

if (attempts > 5) {
  // Account temporär sperren
  logger.warn('Multiple failed login attempts', { email, attempts });
  throw new Error('Account temporarily locked');
}
```

### Audit Logging

```typescript
interface AuditLog {
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
}

async function logAudit(log: AuditLog) {
  await prisma.auditLog.create({
    data: log
  });
}

// Usage
await logAudit({
  userId: req.user.id,
  action: 'USER_UPDATE',
  resource: 'profile',
  timestamp: new Date(),
  ip: req.ip,
  userAgent: req.get('user-agent')
});
```

---

## ✅ Security Checklist

### Development

- [ ] Alle Dependencies aktuell (npm audit)
- [ ] Keine Secrets im Code
- [ ] Input Validation mit Zod
- [ ] Output Encoding
- [ ] Parameterized Queries
- [ ] Error Handling (keine Stack Traces in Production)

### Deployment

- [ ] HTTPS/TLS aktiviert
- [ ] Security Headers gesetzt
- [ ] Rate Limiting aktiv
- [ ] CORS konfiguriert
- [ ] Firewall Rules gesetzt
- [ ] Secrets in Environment Variablen
- [ ] Database Backups konfiguriert
- [ ] Monitoring & Alerting aktiv

### Production

- [ ] Regular Security Audits
- [ ] Dependency Updates
- [ ] Log Monitoring
- [ ] Penetration Testing
- [ ] Incident Response Plan
- [ ] Security Training für Team

---

## 🐛 Vulnerability Response

### Bei Security Issue:

1. **Isolieren:** Betroffener Service stoppen
2. **Patchen:** Fix entwickeln und testen
3. **Deployen:** Hotfix deployen
4. **Kommunizieren:** User informieren (wenn nötig)
5. **Dokumentieren:** Post-Mortem erstellen

### Security Updates

```bash
# Check für Vulnerabilities
npm audit

# Auto-Fix
npm audit fix

# Force Fix (Breaking Changes möglich)
npm audit fix --force
```

---

## 📚 Best Practices

### 1. Principle of Least Privilege

- Minimale Permissions für Services
- Service Accounts statt Root
- Read-Only wo möglich

### 2. Defense in Depth

- Mehrere Security-Layer
- Nicht auf eine Maßnahme verlassen
- Redundante Controls

### 3. Secure Defaults

- Sichere Standard-Konfiguration
- Explizit Unsicheres aktivieren
- Fail-Secure (im Fehlerfall sicher)

### 4. Zero Trust

- Nie vertrauen, immer verifizieren
- Authentifizierung überall
- Encryption everywhere

---

## 📚 Weitere Ressourcen

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Helmet.js Docs](https://helmetjs.github.io/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)

---

**Made with 🌿 for SF-1 Ultimate**
