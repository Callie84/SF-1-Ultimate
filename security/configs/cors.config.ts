/**
 * CORS Configuration
 *
 * Secure Cross-Origin Resource Sharing configuration
 *
 * Installation:
 * npm install cors
 *
 * Usage:
 * import { setupCORS } from './configs/cors.config';
 * setupCORS(app);
 */

import { Express } from 'express';
import cors from 'cors';

export interface CORSOptions {
  /** Allowed origins (default: from CORS_ORIGIN env) */
  allowedOrigins?: string[];
  /** Allow credentials (default: true) */
  credentials?: boolean;
  /** Allowed methods (default: GET, POST, PUT, DELETE, PATCH) */
  methods?: string[];
  /** Allowed headers (default: standard headers) */
  allowedHeaders?: string[];
}

/**
 * Setup CORS with security best practices
 *
 * @param app - Express app instance
 * @param options - CORS configuration options
 */
export function setupCORS(app: Express, options: CORSOptions = {}): void {
  const {
    allowedOrigins = getAllowedOrigins(),
    credentials = true,
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders = [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
  } = options;

  app.use(
    cors({
      // Origin validation
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) {
          return callback(null, true);
        }

        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          console.warn(`⚠️  CORS blocked: ${origin}`);
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },

      // Allow credentials (cookies, authorization headers)
      credentials,

      // Allowed methods
      methods,

      // Allowed headers
      allowedHeaders,

      // Exposed headers (headers that client can access)
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Total-Count',
      ],

      // Preflight cache duration (24 hours)
      maxAge: 86400,

      // Success status for preflight requests
      optionsSuccessStatus: 204,
    })
  );

  console.log('✅ CORS configured');
  console.log(`   → Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`   → Credentials: ${credentials}`);
}

/**
 * Get allowed origins from environment
 */
function getAllowedOrigins(): string[] {
  const corsOrigin = process.env.CORS_ORIGIN;

  if (!corsOrigin) {
    console.warn('⚠️  CORS_ORIGIN not set, using localhost defaults');
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
    ];
  }

  // Support comma-separated origins
  return corsOrigin.split(',').map((origin) => origin.trim());
}

/**
 * Strict CORS for production
 *
 * Only allows specific origins, no wildcards
 */
export function strictCORS(app: Express, allowedOrigins: string[]): void {
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          // Reject requests with no origin in production
          if (process.env.NODE_ENV === 'production') {
            return callback(new Error('Origin required'));
          }
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.error(`🚨 CORS violation: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    })
  );

  console.log('✅ Strict CORS configured');
  console.log(`   → Allowed origins: ${allowedOrigins.join(', ')}`);
}

/**
 * Development CORS (permissive)
 *
 * Allows all origins - USE ONLY IN DEVELOPMENT
 */
export function devCORS(app: Express): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('devCORS should not be used in production!');
  }

  app.use(
    cors({
      origin: true, // Allow all origins
      credentials: true,
    })
  );

  console.log('⚠️  Development CORS: All origins allowed');
}

/**
 * API-specific CORS
 *
 * For API-only services without cookies
 */
export function apiCORS(app: Express, allowedOrigins: string[]): void {
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: false, // No cookies for APIs
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-Total-Count',
      ],
      maxAge: 86400,
    })
  );

  console.log('✅ API CORS configured (no credentials)');
}

export default setupCORS;
