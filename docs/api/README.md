# 📚 API Documentation - SF-1 Ultimate

Comprehensive API documentation with OpenAPI 3.0 specifications, Swagger UI, and Postman collections.

---

## 📋 Table of Contents

- [Overview](#overview)
- [API Services](#api-services)
- [Interactive Documentation](#interactive-documentation)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Postman Collections](#postman-collections)
- [Code Examples](#code-examples)

---

## 🎯 Overview

SF-1 Ultimate provides RESTful APIs for:

- **Authentication** - User management, JWT tokens, role-based access
- **Price Tracking** - Real-time crypto/stock prices, historical data
- **Journal** - Trading journal entries
- **Tools** - Trading tools and calculators
- **Chat** - Real-time messaging
- **Notifications** - Push notifications
- **Payment** - Subscription management
- **Analytics** - Usage analytics

### Architecture

```
┌──────────┐     ┌─────────────┐     ┌──────────────┐
│  Client  │────▶│ API Gateway │────▶│ Microservice │
│          │     │  (Traefik)  │     │   (Auth)     │
└──────────┘     └─────────────┘     └──────────────┘
                        │
                        ├────────────▶│ Microservice │
                        │              │   (Price)    │
                        │              └──────────────┘
                        │
                        └────────────▶│ Microservice │
                                       │  (Journal)   │
                                       └──────────────┘
```

**API Gateway:** All requests go through Traefik at `http://localhost:8080`
**Authentication:** ForwardAuth middleware validates JWT tokens
**Services:** Microservices accessible via `/api/<service>` prefix

---

## 🔌 API Services

### 1. Auth Service

**Base URL:** `http://localhost:8080/api/auth`
**OpenAPI Spec:** [auth-service.openapi.yaml](./auth-service.openapi.yaml)
**Swagger UI:** http://localhost:3001/api-docs

**Endpoints:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token (internal)
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /health` - Health check

**Authentication:** No auth required for register/login, JWT for others

---

### 2. Price Service

**Base URL:** `http://localhost:8080/api/prices`
**OpenAPI Spec:** [price-service.openapi.yaml](./price-service.openapi.yaml)
**Swagger UI:** http://localhost:3002/api-docs

**Endpoints:**
- `GET /api/prices/current/{symbol}` - Get current price
- `GET /api/prices/list` - List all tracked prices
- `GET /api/prices/history/{symbol}` - Get price history
- `GET /api/prices/stats/{symbol}` - Get market statistics
- `POST /api/prices/admin/scrape` - Trigger scraping (ADMIN only)
- `GET /health` - Health check

**Authentication:** Public endpoints, admin endpoints require ADMIN role

---

## 🌐 Interactive Documentation

### Swagger UI

Each service hosts interactive API documentation:

| Service | Swagger UI URL |
|---------|----------------|
| **Auth Service** | http://localhost:3001/api-docs |
| **Price Service** | http://localhost:3002/api-docs |

**Features:**
- ✅ Try-it-out directly in browser
- ✅ Request/response examples
- ✅ Schema validation
- ✅ Authentication testing
- ✅ Code generation

### How to Use Swagger UI

1. **Access Swagger UI** at http://localhost:3001/api-docs
2. **Click "Authorize"** button (top right)
3. **Enter JWT token:**
   ```
   Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. **Click endpoint** to expand
5. **Click "Try it out"** button
6. **Fill in parameters**
7. **Click "Execute"**
8. **View response** below

---

## 🔐 Authentication

### Getting JWT Token

**1. Register/Login:**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "12345",
    "email": "user@example.com",
    "role": "USER",
    "premium": false
  }
}
```

**2. Use Access Token:**
```bash
curl http://localhost:8080/api/prices/current/BTC \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**3. Refresh Token When Expired (15 minutes):**
```bash
curl -X POST http://localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### Token Lifecycle

| Token Type | Expiry | Purpose | Storage |
|------------|--------|---------|---------|
| **Access Token** | 15 minutes | API requests | Memory/localStorage |
| **Refresh Token** | 7 days | Renew access token | HttpOnly cookie (recommended) |

### Authorization Header Format

```
Authorization: Bearer <access-token>
```

---

## ⚡ Rate Limiting

**Default Limits:**
- **Authenticated Users:** 1000 requests / 15 minutes
- **Anonymous Users:** 100 requests / 15 minutes
- **Admin Users:** Unlimited

**Rate Limit Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1704478500
```

**429 Too Many Requests:**
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests, please try again later",
  "retryAfter": 900
}
```

---

## ❌ Error Handling

### Standard Error Response

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "email",
    "reason": "Invalid format"
  }
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| **200** | OK | Successful GET request |
| **201** | Created | Successful POST creation |
| **400** | Bad Request | Validation error, malformed request |
| **401** | Unauthorized | Missing or invalid JWT token |
| **403** | Forbidden | Insufficient permissions |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Duplicate resource (e.g., email exists) |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Server-side error |
| **503** | Service Unavailable | Service down or unhealthy |

### Common Error Codes

#### Auth Service
- `EMAIL_EXISTS` - Email already registered
- `INVALID_CREDENTIALS` - Wrong email/password
- `NO_AUTH_HEADER` - Missing Authorization header
- `INVALID_AUTH_FORMAT` - Malformed Authorization header
- `INVALID_TOKEN` - Invalid or expired JWT
- `VALIDATION_ERROR` - Request validation failed

#### Price Service
- `SYMBOL_NOT_FOUND` - Symbol doesn't exist in database
- `INVALID_TIMEFRAME` - Invalid historical timeframe
- `SCRAPING_IN_PROGRESS` - Scraping job already running

---

## 📮 Postman Collections

### Import Collection

1. **Download Collection:**
   - [SF-1 Auth Service.postman_collection.json](./postman/SF-1-Auth-Service.postman_collection.json)
   - [SF-1 Price Service.postman_collection.json](./postman/SF-1-Price-Service.postman_collection.json)

2. **Import to Postman:**
   - Open Postman
   - Click "Import" button
   - Drag & drop JSON file
   - Collection appears in sidebar

3. **Set Environment Variables:**
   ```json
   {
     "base_url": "http://localhost:8080",
     "access_token": "",
     "refresh_token": ""
   }
   ```

4. **Run Requests:**
   - Execute "Login" request first
   - Postman auto-saves tokens to environment
   - Other requests use `{{access_token}}` automatically

### Collection Structure

```
SF-1 Auth Service
├── Authentication
│   ├── Register User
│   ├── Login User
│   ├── Verify Token
│   ├── Refresh Token
│   └── Logout
└── Health
    └── Health Check

SF-1 Price Service
├── Prices
│   ├── Get Current Price (BTC)
│   ├── Get Current Price (ETH)
│   └── List All Prices
├── History
│   ├── 24h History
│   ├── 7d History
│   └── 30d History
├── Statistics
│   └── Market Stats (BTC)
└── Admin
    └── Trigger Scraping
```

---

## 💻 Code Examples

### JavaScript (Fetch API)

```javascript
// Login
const loginResponse = await fetch('http://localhost:8080/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!'
  })
});

const { accessToken, refreshToken } = await loginResponse.json();

// Get current price
const priceResponse = await fetch('http://localhost:8080/api/prices/current/BTC', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const priceData = await priceResponse.json();
console.log(`BTC Price: $${priceData.currentPrice}`);
```

### Python (requests)

```python
import requests

# Login
response = requests.post('http://localhost:8080/api/auth/login', json={
    'email': 'user@example.com',
    'password': 'SecurePassword123!'
})

tokens = response.json()
access_token = tokens['accessToken']

# Get current price
headers = {'Authorization': f'Bearer {access_token}'}
response = requests.get('http://localhost:8080/api/prices/current/BTC', headers=headers)

price_data = response.json()
print(f"BTC Price: ${price_data['currentPrice']}")
```

### cURL

```bash
# Login
ACCESS_TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePassword123!"}' \
  | jq -r '.accessToken')

# Get current price
curl http://localhost:8080/api/prices/current/BTC \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### TypeScript (axios)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080',
});

// Login
const loginResponse = await api.post('/api/auth/login', {
  email: 'user@example.com',
  password: 'SecurePassword123!'
});

const { accessToken } = loginResponse.data;

// Set default auth header
api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

// Get current price
const priceResponse = await api.get('/api/prices/current/BTC');
console.log(`BTC: $${priceResponse.data.currentPrice}`);
```

---

## 🔄 Pagination

For endpoints returning lists (e.g., `/api/prices/list`):

**Request:**
```
GET /api/prices/list?limit=50&offset=0
```

**Response:**
```json
{
  "data": [...],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

**Calculate Pages:**
```javascript
const totalPages = Math.ceil(response.total / response.limit);
const currentPage = Math.floor(response.offset / response.limit) + 1;
```

---

## 📊 Webhooks (Future)

Webhook support for real-time events (planned):

- `price.updated` - Price threshold crossed
- `user.upgraded` - User upgraded to premium
- `payment.succeeded` - Payment processed

---

## 🛠️ Development Tools

### OpenAPI Code Generation

Generate client SDKs from OpenAPI specs:

```bash
# TypeScript client
npx @openapitools/openapi-generator-cli generate \
  -i docs/api/auth-service.openapi.yaml \
  -g typescript-axios \
  -o clients/typescript

# Python client
npx @openapitools/openapi-generator-cli generate \
  -i docs/api/auth-service.openapi.yaml \
  -g python \
  -o clients/python
```

### Validate OpenAPI Specs

```bash
# Install validator
npm install -g @apidevtools/swagger-cli

# Validate
swagger-cli validate docs/api/auth-service.openapi.yaml
swagger-cli validate docs/api/price-service.openapi.yaml
```

---

## 📞 Support

- **Documentation Issues:** Create issue on GitHub
- **API Questions:** support@seedfinderpro.de
- **Bug Reports:** GitHub Issues

---

**Last Updated:** 2026-01-06
**API Version:** 1.1.0
**Maintainer:** SF-1 Ultimate Team
