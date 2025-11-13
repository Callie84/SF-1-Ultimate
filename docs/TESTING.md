# 🧪 SF-1 Ultimate - Testing Guide

Vollständige Dokumentation für Testing, Coverage und Quality Assurance.

---

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Test-Setup](#test-setup)
- [Test-Ausführung](#test-ausführung)
- [Test-Typen](#test-typen)
- [Coverage-Ziele](#coverage-ziele)
- [Best Practices](#best-practices)

---

## 🎯 Übersicht

**Test-Framework:** Jest mit ts-jest
**Assertion Library:** Jest (built-in)
**HTTP Testing:** Supertest
**Coverage Target:** Minimum 80%

### Statistiken

- **Test-Dateien:** 100+
- **Test-Cases:** 500+
- **Coverage:** >80% (Lines, Functions, Branches)

---

## ⚙️ Test-Setup

### Installation

```bash
# Für alle Services
cd apps/[service-name]
npm install

# Test-Dependencies sind bereits in package.json
```

### Konfiguration

Jeder Service hat:
- `jest.config.js` - Jest Konfiguration
- `jest.setup.ts` - Test Setup (Mocks, etc.)
- `.env.test` - Test Environment Variablen

---

## 🚀 Test-Ausführung

### Alle Tests

```bash
# In einem Service
cd apps/auth-service
npm test

# Mit Coverage
npm run test -- --coverage

# Mit Watch Mode (Development)
npm run test:watch
```

### Spezifische Test-Typen

```bash
# Nur Unit Tests
npm run test:unit

# Nur Integration Tests
npm run test:integration

# Spezifische Test-Datei
npm test -- auth.test.ts

# Mit Pattern
npm test -- --testPathPattern=user
```

### Alle Services testen

```bash
# Root-Level Script
./scripts/test-all-services.sh

# Oder manuell
for service in apps/*-service; do
  echo "Testing $service..."
  cd $service && npm test && cd ../..
done
```

---

## 🧩 Test-Typen

### 1. Unit Tests

**Ziel:** Einzelne Funktionen/Klassen isoliert testen

**Beispiel:** `apps/auth-service/src/__tests__/unit/auth.test.ts`

```typescript
import { hashPassword, verifyPassword } from '../../utils/password';

describe('Password Utils', () => {
  it('should hash password correctly', async () => {
    const password = 'test123';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
  });

  it('should verify password correctly', async () => {
    const password = 'test123';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);

    expect(isValid).toBe(true);
  });
});
```

### 2. Integration Tests

**Ziel:** API Endpoints und Service-Interaktionen testen

**Beispiel:** `apps/auth-service/src/__tests__/integration/auth.test.ts`

```typescript
import request from 'supertest';
import { app } from '../../index';

describe('POST /api/auth/register', () => {
  it('should register new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test123!',
        username: 'testuser'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
  });

  it('should reject duplicate email', async () => {
    // First registration
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test123!',
        username: 'testuser'
      });

    // Second registration (should fail)
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test456!',
        username: 'testuser2'
      });

    expect(response.status).toBe(400);
  });
});
```

### 3. Performance Tests

**Ziel:** Performance und Skalierbarkeit testen

**Beispiel:** `apps/price-service/src/__tests__/performance/scraping.test.ts`

```typescript
describe('Price Scraping Performance', () => {
  it('should process 1000 seeds in under 60 seconds', async () => {
    const start = Date.now();

    // Simuliere 1000 Scraping-Operationen
    const promises = Array.from({ length: 1000 }, () =>
      scrapeSeed('test-seed-' + Math.random())
    );

    await Promise.all(promises);

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(60000); // 60 Sekunden
  }, 70000); // Timeout: 70 Sekunden
});
```

### 4. E2E Tests (Optional)

**Tool:** Playwright oder Cypress (für Frontend)

```bash
cd apps/web-app
npm run test:e2e
```

---

## 📊 Coverage-Ziele

### Globale Ziele

```json
{
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

### Coverage Report anzeigen

```bash
# Terminal Output
npm test -- --coverage

# HTML Report (öffnet automatisch im Browser)
npm test -- --coverage --coverageReporters=html
open coverage/index.html
```

### Coverage ignorieren

Bestimmte Dateien/Zeilen ausschließen:

```typescript
/* istanbul ignore next */
function debugOnly() {
  console.log('Debug info');
}
```

---

## ✅ Best Practices

### 1. Test-Struktur

```
apps/auth-service/src/
├── __tests__/
│   ├── unit/
│   │   ├── utils.test.ts
│   │   └── validators.test.ts
│   ├── integration/
│   │   ├── auth.test.ts
│   │   └── users.test.ts
│   └── performance/
│       └── load.test.ts
└── ...
```

### 2. Naming Convention

- Test-Dateien: `*.test.ts`
- Unit Tests: `__tests__/unit/`
- Integration Tests: `__tests__/integration/`
- Beschreibende Namen: `should register new user when valid data`

### 3. AAA Pattern

```typescript
it('should do something', async () => {
  // Arrange
  const input = { ... };

  // Act
  const result = await doSomething(input);

  // Assert
  expect(result).toBe(expected);
});
```

### 4. Mocking

```typescript
// Mock externe Services
jest.mock('../../services/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}));

// Mock Database
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      create: jest.fn().mockResolvedValue(mockUser)
    }
  }))
}));
```

### 5. Test Cleanup

```typescript
afterEach(async () => {
  // Cleanup Database
  await prisma.user.deleteMany();

  // Clear Mocks
  jest.clearAllMocks();
});

afterAll(async () => {
  // Disconnect Database
  await prisma.$disconnect();
});
```

---

## 🐛 Debugging Tests

### VSCode Launch Configuration

`.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Einzelnen Test debuggen

```bash
# Mit --inspect flag
node --inspect-brk node_modules/.bin/jest --runInBand auth.test.ts
```

---

## 📈 Continuous Integration

Tests werden automatisch bei jedem Push ausgeführt:

```yaml
# .github/workflows/ci-cd.yml
- name: Run Tests
  run: npm test

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

---

## 🔧 Troubleshooting

### Tests schlagen fehl

1. **Dependencies installieren:**
   ```bash
   npm ci
   ```

2. **Cache löschen:**
   ```bash
   jest --clearCache
   ```

3. **Environment Variablen prüfen:**
   ```bash
   cp .env.example .env.test
   ```

### Timeout Errors

```typescript
// Erhöhe Timeout für langsame Tests
jest.setTimeout(30000); // 30 Sekunden
```

### Memory Issues

```bash
# Erhöhe Node Memory
NODE_OPTIONS=--max_old_space_size=4096 npm test
```

---

## 📚 Weitere Ressourcen

- [Jest Dokumentation](https://jestjs.io/docs/getting-started)
- [Supertest GitHub](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**Made with 🌿 for SF-1 Ultimate**
