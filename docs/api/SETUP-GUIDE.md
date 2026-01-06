# 🚀 API Documentation Setup Guide

How to add Swagger UI to a microservice in 5 minutes.

---

## Quick Start

### 1. Install Dependencies

```bash
cd apps/your-service
npm install swagger-ui-express yamljs
npm install --save-dev @types/swagger-ui-express @types/yamljs
```

### 2. Copy Swagger Middleware

```bash
# Copy shared middleware to your service
cp ../../docs/api/swagger-middleware.ts src/middleware/
```

### 3. Add to Express App

```typescript
// src/index.ts
import express from 'express';
import { setupSwagger } from './middleware/swagger-middleware';

const app = express();

// ... your middleware and routes ...

// Setup Swagger UI (must be after routes for auto-discovery)
setupSwagger(app, 'your-service'); // Matches your-service.openapi.yaml

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
  // Swagger UI will log: ✅ Swagger UI available at: http://localhost:3000/api-docs
});
```

### 4. Access Swagger UI

Open browser: **http://localhost:3000/api-docs**

---

## Custom Configuration

### Custom Spec Path

```typescript
setupSwagger(app, {
  serviceName: 'your-service',
  specPath: '/custom/path/to/spec.yaml',
  path: '/docs', // Custom Swagger UI path
});
```

### Custom UI Options

```typescript
setupSwagger(app, {
  serviceName: 'your-service',
  uiOptions: {
    customCss: '.swagger-ui .topbar { background-color: #000; }',
    customSiteTitle: 'My Custom API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
    },
  },
});
```

---

## Creating OpenAPI Spec

### 1. Copy Template

```bash
cp docs/api/auth-service.openapi.yaml docs/api/your-service.openapi.yaml
```

### 2. Update Metadata

```yaml
openapi: 3.0.3
info:
  title: Your Service API
  description: Your service description
  version: 1.0.0

servers:
  - url: http://localhost:3005
    description: Local development
  - url: http://localhost:8080/api/your-service
    description: Via API Gateway
```

### 3. Define Endpoints

```yaml
paths:
  /api/your-service/resource:
    get:
      tags:
        - Resources
      summary: Get resource
      operationId: getResource
      parameters:
        - name: id
          in: query
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Resource'
```

### 4. Define Schemas

```yaml
components:
  schemas:
    Resource:
      type: object
      properties:
        id:
          type: string
          example: "12345"
        name:
          type: string
          example: "My Resource"
        createdAt:
          type: string
          format: date-time
```

---

## Validation

### Validate OpenAPI Spec

```bash
# Install validator
npm install -g @apidevtools/swagger-cli

# Validate
swagger-cli validate docs/api/your-service.openapi.yaml
```

### Expected Output

```
docs/api/your-service.openapi.yaml is valid
```

---

## Testing

### 1. Manual Testing in Swagger UI

1. Open http://localhost:3000/api-docs
2. Click "Authorize" button (if authentication required)
3. Enter JWT token: `Bearer eyJhbGciOi...`
4. Click endpoint → "Try it out"
5. Fill parameters → "Execute"
6. View response

### 2. Export as Postman Collection

1. Access raw spec: http://localhost:3000/api-docs.json
2. Copy JSON
3. Open Postman → Import → Raw Text
4. Paste JSON → Import

---

## Troubleshooting

### Swagger UI Not Showing

**Problem:** Accessing /api-docs shows 404

**Solutions:**
1. Check spec file exists: `ls docs/api/your-service.openapi.yaml`
2. Check serviceName matches filename
3. Check console for errors: `⚠️  Swagger spec not found`
4. Verify YAML syntax: `swagger-cli validate docs/api/your-service.openapi.yaml`

### Invalid YAML Syntax

**Problem:** `YAMLException: bad indentation`

**Solution:**
- Use 2 spaces for indentation (not tabs)
- Check alignment of keys
- Validate online: https://www.yamllint.com/

### Authorization Not Working

**Problem:** 401 Unauthorized even with token

**Solutions:**
1. Check token format: Must be `Bearer <token>`, not just `<token>`
2. Check token expiry: Access tokens expire after 15 minutes
3. Refresh token if expired: Use `/api/auth/refresh` endpoint
4. Check Authorization header is set in Swagger UI

### Spec Not Auto-Reloading

**Problem:** Changes to OpenAPI spec don't appear

**Solution:**
- Restart your service (Swagger loads spec once on startup)
- Or use nodemon/ts-node-dev for auto-restart:
  ```json
  // package.json
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts"
  }
  ```

---

## Best Practices

### 1. Keep Spec Updated

- Update OpenAPI spec whenever endpoints change
- Use semantic versioning for API versions
- Document breaking changes in spec description

### 2. Use Examples

```yaml
schema:
  type: object
  properties:
    email:
      type: string
      example: user@example.com  # Always include examples!
```

### 3. Use $ref for Reusability

```yaml
# Good: Reusable
responses:
  '404':
    $ref: '#/components/responses/NotFound'

# Bad: Duplicated
responses:
  '404':
    description: Not found
    content:
      application/json:
        schema:
          # ... repeated schema
```

### 4. Group Endpoints with Tags

```yaml
paths:
  /api/users:
    get:
      tags:
        - Users  # Groups in Swagger UI
```

### 5. Document Authentication

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

# Then use in endpoints
paths:
  /api/protected:
    get:
      security:
        - bearerAuth: []
```

---

## Advanced Features

### Request/Response Validation

```bash
npm install express-openapi-validator
```

```typescript
import * as OpenApiValidator from 'express-openapi-validator';

app.use(
  OpenApiValidator.middleware({
    apiSpec: './docs/api/your-service.openapi.yaml',
    validateRequests: true,
    validateResponses: true,
  })
);
```

### Auto-Generate from Code (JSDoc)

```bash
npm install swagger-jsdoc
```

```typescript
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Your Service API',
      version: '1.0.0',
    },
  },
  apis: ['./src/routes/*.ts'], // Files with JSDoc comments
};

const swaggerSpec = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

---

## Resources

- **OpenAPI 3.0 Specification:** https://swagger.io/specification/
- **Swagger Editor:** https://editor.swagger.io/ (online editor)
- **OpenAPI Generator:** https://openapi-generator.tech/ (client generation)
- **Swagger UI Docs:** https://swagger.io/tools/swagger-ui/

---

**Last Updated:** 2026-01-06
**Maintainer:** SF-1 Ultimate Team
