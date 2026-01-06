# 🔒 Security Hardening Guide - SF-1 Ultimate

Comprehensive security implementation following OWASP Top 10 best practices.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Security Headers](#security-headers)
- [Rate Limiting](#rate-limiting)
- [CORS Configuration](#cors-configuration)
- [Input Validation](#input-validation)
- [Authentication Security](#authentication-security)
- [Database Security](#database-security)
- [Dependency Security](#dependency-security)
- [Environment Variables](#environment-variables)
- [Security Checklist](#security-checklist)

---

## 🎯 Overview

### Security Principles

✅ **Defense in Depth** - Multiple layers of security
✅ **Least Privilege** - Minimal necessary permissions
✅ **Fail Securely** - Secure defaults, explicit allow
✅ **Complete Mediation** - Check every access
✅ **Open Design** - Security through proper implementation, not obscurity

### OWASP Top 10 Coverage

| Vulnerability | Protection | Status |
|---------------|------------|--------|
| **A01: Broken Access Control** | JWT auth, role checks, rate limiting | ✅ |
| **A02: Cryptographic Failures** | Argon2id hashing, TLS, env secrets | ✅ |
| **A03: Injection** | Parameterized queries, input validation | ✅ |
| **A04: Insecure Design** | Threat modeling, secure architecture | ✅ |
| **A05: Security Misconfiguration** | Helmet headers, secure defaults | ✅ |
| **A06: Vulnerable Components** | npm audit, Dependabot, updates | ✅ |
| **A07: Auth Failures** | Argon2id, token rotation, rate limits | ✅ |
| **A08: Data Integrity Failures** | Signed JWTs, HTTPS, integrity checks | ✅ |
| **A09: Logging Failures** | Structured logging, monitoring | ✅ |
| **A10: SSRF** | URL validation, allowlists | ✅ |

---

## 🛡️ Security Headers

### Setup

**1. Install Helmet:**
```bash
npm install helmet
```

**2. Apply Security Headers:**
```typescript
import { setupSecurityHeaders } from './middleware/security-headers.middleware';

setupSecurityHeaders(app, {
  enableCSP: true,
  enableHSTS: process.env.NODE_ENV === 'production',
  hstsMaxAge: 31536000, // 1 year
});
// ✅ Security headers configured
//    → HSTS enabled (max-age: 31536000s)
//    → Content Security Policy enabled
```

### Headers Applied

**1. Content-Security-Policy (CSP)**
```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self';
frame-src 'none';
object-src 'none';
upgrade-insecure-requests;
```

**Purpose:** Prevents XSS attacks by controlling resource loading

**2. Strict-Transport-Security (HSTS)**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Purpose:** Forces HTTPS connections, prevents downgrade attacks

**3. X-Frame-Options**
```
X-Frame-Options: DENY
```

**Purpose:** Prevents clickjacking attacks

**4. X-Content-Type-Options**
```
X-Content-Type-Options: nosniff
```

**Purpose:** Prevents MIME-type sniffing

**5. X-XSS-Protection**
```
X-XSS-Protection: 1; mode=block
```

**Purpose:** Legacy XSS protection (still useful for old browsers)

**6. Referrer-Policy**
```
Referrer-Policy: strict-origin-when-cross-origin
```

**Purpose:** Controls referrer information leakage

**7. Permissions-Policy**
```
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Purpose:** Restricts browser features

### Custom CSP

```typescript
setupSecurityHeaders(app, {
  enableCSP: true,
  cspDirectives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://trusted-cdn.com"],
    styleSrc: ["'self'", "https://fonts.googleapis.com"],
    imgSrc: ["'self'", "data:", "https:"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    connectSrc: ["'self'", "https://api.example.com"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
  },
});
```

---

## ⏱️ Rate Limiting

### Protection Against

- ✅ **Brute Force Attacks** (login, password reset)
- ✅ **API Abuse** (excessive requests)
- ✅ **DDoS Attacks** (distributed attacks)
- ✅ **Scraping** (data harvesting)

### Setup

**1. Install Dependencies:**
```bash
npm install express-rate-limit rate-limit-redis ioredis
```

**2. Apply Rate Limiters:**
```typescript
import { rateLimiters } from './middleware/rate-limit.middleware';

// General API rate limiter (1000 req / 15 min)
app.use('/api', rateLimiters.api);

// Strict auth rate limiter (5 req / 15 min)
app.use('/api/auth/login', rateLimiters.strictAuth);
app.use('/api/auth/register', rateLimiters.registration);

// Password reset (3 req / hour)
app.use('/api/auth/reset-password', rateLimiters.passwordReset);

// Admin endpoints (100 req / 15 min)
app.use('/api/admin', rateLimiters.admin);

// Public endpoints (100 req / 15 min)
app.use('/api/public', rateLimiters.public);
```

### Rate Limit Tiers

| Endpoint Type | Limit | Window | Use Case |
|---------------|-------|--------|----------|
| **Auth (strict)** | 5 | 15 min | Login, password reset |
| **Registration** | 3 | 1 hour | Account creation |
| **API (authenticated)** | 1000 | 15 min | Normal API usage |
| **API (public)** | 100 | 15 min | Unauthenticated access |
| **Admin** | 100 | 15 min | Admin operations |

### Custom Rate Limiter

```typescript
import { createRateLimiter } from './middleware/rate-limit.middleware';

const customLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: 'Too many requests for this endpoint',
  prefix: 'rate_limit:custom:',
});

app.use('/api/expensive-operation', customLimiter, handler);
```

### Response Headers

**Within Limit:**
```
RateLimit-Limit: 1000
RateLimit-Remaining: 999
RateLimit-Reset: 1704478500
```

**Limit Exceeded:**
```
HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 1000
RateLimit-Remaining: 0
RateLimit-Reset: 1704478500

{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests, please try again later",
  "retryAfter": 900
}
```

---

## 🌐 CORS Configuration

### Setup

**1. Install CORS:**
```bash
npm install cors
```

**2. Configure CORS:**
```typescript
import { setupCORS } from './configs/cors.config';

setupCORS(app, {
  allowedOrigins: ['https://seedfinderpro.de', 'https://app.seedfinderpro.de'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
});
// ✅ CORS configured
//    → Allowed origins: https://seedfinderpro.de, https://app.seedfinderpro.de
//    → Credentials: true
```

### Environment-Based Configuration

```bash
# .env
CORS_ORIGIN=https://seedfinderpro.de,https://app.seedfinderpro.de
```

```typescript
// Automatically reads from CORS_ORIGIN
setupCORS(app);
```

### Development vs Production

**Development (Permissive):**
```typescript
import { devCORS } from './configs/cors.config';

if (process.env.NODE_ENV === 'development') {
  devCORS(app); // Allows all origins
}
```

**Production (Strict):**
```typescript
import { strictCORS } from './configs/cors.config';

if (process.env.NODE_ENV === 'production') {
  strictCORS(app, ['https://seedfinderpro.de']);
}
```

### API-Only CORS (No Credentials)

```typescript
import { apiCORS } from './configs/cors.config';

apiCORS(app, ['https://trusted-client.com']);
// No cookies, credentials: false
```

---

## ✅ Input Validation

### Validation Libraries

**express-validator:**
```bash
npm install express-validator
```

**Usage:**
```typescript
import { body, validationResult } from 'express-validator';

app.post(
  '/api/auth/register',
  [
    // Email validation
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email format'),

    // Password validation
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),

    // Name validation
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be 2-100 characters'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: errors.array(),
      });
    }

    // Validation passed, proceed
    registerUser(req, res);
  }
);
```

### Sanitization

**Prevent SQL Injection:**
```typescript
// ✅ GOOD: Parameterized queries (Prisma)
const user = await prisma.user.findUnique({
  where: { email: req.body.email }, // Automatically sanitized
});

// ❌ BAD: String concatenation (never do this!)
const query = `SELECT * FROM users WHERE email = '${req.body.email}'`;
```

**Prevent XSS:**
```typescript
import validator from 'validator';

// Escape HTML
const safeName = validator.escape(req.body.name);

// Sanitize input
import sanitizeHtml from 'sanitize-html';

const cleanHtml = sanitizeHtml(req.body.content, {
  allowedTags: ['b', 'i', 'em', 'strong'],
  allowedAttributes: {},
});
```

**Prevent NoSQL Injection:**
```typescript
// ✅ GOOD: Type checking
if (typeof req.body.userId !== 'string') {
  return res.status(400).json({ error: 'Invalid userId' });
}

// Validate ObjectId format (MongoDB)
import { ObjectId } from 'mongodb';

if (!ObjectId.isValid(req.body.id)) {
  return res.status(400).json({ error: 'Invalid ID format' });
}
```

---

## 🔐 Authentication Security

### Password Hashing (Argon2id)

**Why Argon2id:**
- ✅ **OWASP Recommended** (2023 guidelines)
- ✅ **Memory-Hard** (resistant to GPU attacks)
- ✅ **Side-Channel Resistant**
- ✅ **Winner of Password Hashing Competition (2015)**

**Configuration (apps/auth-service):**
```typescript
import argon2 from 'argon2';

// Hash password
const hashedPassword = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,       // 3 iterations
  parallelism: 4,    // 4 threads
});

// Verify password
const isValid = await argon2.verify(hashedPassword, password);
```

**Security Strength:**
- **Memory Cost:** 64 MB (prevents GPU attacks)
- **Time Cost:** 3 iterations (~100ms on modern CPU)
- **Parallelism:** 4 threads (optimized for multi-core)

### JWT Security

**Token Configuration:**
```typescript
// Access Token (short-lived)
const accessToken = jwt.sign(
  { userId, email, role, premium },
  process.env.JWT_SECRET,
  { expiresIn: '15m' } // 15 minutes
);

// Refresh Token (long-lived)
const refreshToken = jwt.sign(
  { userId, family: nanoid() },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' } // 7 days
);
```

**Token Rotation:**
```typescript
// On refresh, issue new tokens and invalidate old ones
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  // Verify refresh token
  const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

  // Issue new tokens
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user.id);

  // Invalidate old refresh token
  await invalidateRefreshToken(refreshToken);

  res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
});
```

**JWT Best Practices:**
- ✅ Short expiry for access tokens (15 minutes)
- ✅ Token rotation for refresh tokens
- ✅ Strong secrets (64+ characters, random)
- ✅ Algorithm: HS256 (HMAC with SHA-256)
- ✅ Store refresh tokens securely (HttpOnly cookies or database)

---

## 💾 Database Security

### Prisma (PostgreSQL)

**Parameterized Queries (Automatic):**
```typescript
// ✅ Automatically prevents SQL injection
const user = await prisma.user.findUnique({
  where: { email: req.body.email },
});
```

**Row-Level Security:**
```sql
-- Enable RLS in PostgreSQL
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY user_isolation ON users
  FOR SELECT
  USING (id = current_setting('app.current_user_id')::uuid);
```

**Connection Security:**
```bash
# .env
DATABASE_URL="postgresql://user:pass@localhost:5432/db?sslmode=require"
```

### MongoDB

**Query Sanitization:**
```typescript
// ❌ BAD: Direct user input in query
const user = await collection.findOne({ email: req.body.email });

// ✅ GOOD: Validate input first
if (typeof req.body.email !== 'string') {
  throw new Error('Invalid email');
}
const user = await collection.findOne({ email: req.body.email });
```

**NoSQL Injection Prevention:**
```typescript
// ❌ BAD: Accepting objects
const query = req.body.query; // User could send { $ne: null }

// ✅ GOOD: Type validation
const email = String(req.body.email);
const query = { email }; // Safe
```

---

## 📦 Dependency Security

### npm Audit

**Regular Scans:**
```bash
# Check for vulnerabilities
npm audit

# Fix automatically (if possible)
npm audit fix

# Force fix (may introduce breaking changes)
npm audit fix --force
```

### Dependabot (GitHub)

**.github/dependabot.yml:**
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "security-team"
    labels:
      - "dependencies"
      - "security"
```

### Snyk

```bash
# Install Snyk
npm install -g snyk

# Test for vulnerabilities
snyk test

# Monitor project
snyk monitor
```

---

## 🔑 Environment Variables

### Secrets Management

**Never Commit:**
- ❌ `.env` files
- ❌ `credentials.json`
- ❌ Private keys (`.pem`, `.key`)
- ❌ API keys, tokens

**.gitignore:**
```
.env
.env.local
.env.*.local
*.key
*.pem
credentials.json
secrets/
```

### Secret Generation

```bash
# JWT Secret (64 characters)
openssl rand -base64 64

# JWT Refresh Secret (different from JWT_SECRET!)
openssl rand -base64 64

# API Key
openssl rand -hex 32

# Encryption Key
openssl rand -base64 32
```

### Environment Validation

```typescript
// Check required environment variables on startup
const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Validate JWT secrets
if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
  console.error('❌ JWT_SECRET and JWT_REFRESH_SECRET must be different!');
  process.exit(1);
}

if (process.env.JWT_SECRET!.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters!');
  process.exit(1);
}
```

---

## ✅ Security Checklist

### Before Production Deployment

**Authentication & Authorization:**
- [ ] Argon2id password hashing configured (64MB, 3 iterations)
- [ ] JWT tokens with short expiry (15 min access, 7d refresh)
- [ ] Token rotation implemented
- [ ] Role-based access control (RBAC) implemented
- [ ] Rate limiting on auth endpoints (5 req / 15 min)

**Headers & CORS:**
- [ ] Helmet.js security headers configured
- [ ] HSTS enabled (production only)
- [ ] Content-Security-Policy configured
- [ ] CORS restricted to specific origins
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff

**Input Validation:**
- [ ] express-validator on all inputs
- [ ] Email validation
- [ ] Password strength requirements
- [ ] XSS prevention (sanitize HTML)
- [ ] SQL injection prevention (parameterized queries)
- [ ] NoSQL injection prevention (type validation)

**Rate Limiting:**
- [ ] General API rate limiter (1000 req / 15 min)
- [ ] Auth endpoints rate limiter (5 req / 15 min)
- [ ] Registration rate limiter (3 req / hour)
- [ ] Redis-based distributed rate limiting

**Database:**
- [ ] Connection pooling configured
- [ ] SSL/TLS enabled (sslmode=require)
- [ ] Parameterized queries (Prisma automatic)
- [ ] Database credentials in environment variables
- [ ] Regular backups configured

**Secrets:**
- [ ] All secrets in environment variables
- [ ] No secrets committed to git
- [ ] JWT secrets >32 characters
- [ ] Different JWT_SECRET and JWT_REFRESH_SECRET
- [ ] Secrets rotated regularly

**Dependencies:**
- [ ] npm audit run and fixed
- [ ] Dependabot enabled
- [ ] No known vulnerabilities
- [ ] Dependencies updated regularly

**HTTPS:**
- [ ] TLS 1.2+ enforced
- [ ] Valid SSL certificate
- [ ] HTTP redirects to HTTPS
- [ ] HSTS header enabled

**Logging & Monitoring:**
- [ ] Security events logged
- [ ] Failed login attempts logged
- [ ] Rate limit violations logged
- [ ] Prometheus metrics enabled
- [ ] Alerting configured

**Error Handling:**
- [ ] No sensitive data in error messages
- [ ] Generic error messages for users
- [ ] Detailed errors logged server-side
- [ ] 500 errors don't expose stack traces

---

**Last Updated:** 2026-01-06
**Maintainer:** SF-1 Ultimate Team
