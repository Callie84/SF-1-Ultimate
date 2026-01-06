/**
 * Swagger UI Middleware for Express Services
 *
 * Automatically serves OpenAPI documentation at /api-docs endpoint
 *
 * Installation:
 * npm install swagger-ui-express yamljs
 *
 * Usage:
 * import { setupSwagger } from './middleware/swagger-middleware';
 * setupSwagger(app, 'auth-service');
 */

import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import fs from 'fs';

export interface SwaggerOptions {
  /**
   * Service name (must match OpenAPI spec filename)
   * Example: 'auth-service' → looks for 'auth-service.openapi.yaml'
   */
  serviceName: string;

  /**
   * Custom path to OpenAPI spec file (optional)
   * If not provided, defaults to docs/api/{serviceName}.openapi.yaml
   */
  specPath?: string;

  /**
   * Swagger UI mount path (default: /api-docs)
   */
  path?: string;

  /**
   * Custom Swagger UI options
   */
  uiOptions?: swaggerUi.SwaggerUiOptions;
}

/**
 * Setup Swagger UI for Express app
 *
 * @param app - Express app instance
 * @param options - Swagger configuration options
 */
export function setupSwagger(
  app: Express,
  options: SwaggerOptions | string
): void {
  // Handle simple string serviceName
  if (typeof options === 'string') {
    options = { serviceName: options };
  }

  const {
    serviceName,
    specPath,
    path: swaggerPath = '/api-docs',
    uiOptions = {},
  } = options;

  // Determine OpenAPI spec file path
  const specFilePath =
    specPath ||
    path.resolve(
      process.cwd(),
      `../../docs/api/${serviceName}.openapi.yaml`
    );

  // Check if spec file exists
  if (!fs.existsSync(specFilePath)) {
    console.warn(
      `⚠️  Swagger spec not found at: ${specFilePath}`
    );
    console.warn(`   Swagger UI will not be available`);
    return;
  }

  try {
    // Load OpenAPI spec
    const swaggerDocument = YAML.load(specFilePath);

    // Default Swagger UI options
    const defaultUiOptions: swaggerUi.SwaggerUiOptions = {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: `${serviceName} API Documentation`,
      swaggerOptions: {
        persistAuthorization: true, // Keep auth between page refreshes
        displayRequestDuration: true, // Show request duration
        filter: true, // Enable search filter
        tryItOutEnabled: true, // Enable "Try it out" by default
      },
    };

    // Merge options
    const finalUiOptions = {
      ...defaultUiOptions,
      ...uiOptions,
      swaggerOptions: {
        ...defaultUiOptions.swaggerOptions,
        ...uiOptions.swaggerOptions,
      },
    };

    // Setup Swagger UI middleware
    app.use(
      swaggerPath,
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument, finalUiOptions)
    );

    // Also serve raw spec at /api-docs.json
    app.get(`${swaggerPath}.json`, (req, res) => {
      res.json(swaggerDocument);
    });

    console.log(
      `✅ Swagger UI available at: http://localhost:${
        process.env.PORT || 3000
      }${swaggerPath}`
    );
  } catch (error) {
    console.error(`❌ Failed to load Swagger spec:`, error);
  }
}

/**
 * Middleware to add OpenAPI spec validation
 * (Optional enhancement - requires additional packages)
 */
export function validateOpenAPI() {
  // TODO: Implement request/response validation against OpenAPI spec
  // Use libraries like: express-openapi-validator
  return (req: any, res: any, next: any) => {
    next();
  };
}

/**
 * Generate OpenAPI spec from Express routes (auto-discovery)
 * (Advanced feature - requires route introspection)
 */
export function generateOpenAPISpec(app: Express) {
  // TODO: Implement automatic OpenAPI spec generation
  // Use libraries like: swagger-jsdoc
  throw new Error('Not implemented');
}

export default setupSwagger;
