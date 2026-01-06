/**
 * Security Headers Middleware
 *
 * Implements comprehensive HTTP security headers using Helmet.js
 *
 * Installation:
 * npm install helmet
 *
 * Usage:
 * import { setupSecurityHeaders } from './middleware/security-headers.middleware';
 * setupSecurityHeaders(app);
 */

import { Express } from 'express';
import helmet from 'helmet';

export interface SecurityHeadersOptions {
  /** Enable Content Security Policy (default: true) */
  enableCSP?: boolean;
  /** CSP directives (custom configuration) */
  cspDirectives?: Record<string, string[]>;
  /** Enable HSTS (default: true in production) */
  enableHSTS?: boolean;
  /** HSTS max age in seconds (default: 1 year) */
  hstsMaxAge?: number;
}

/**
 * Setup comprehensive security headers
 *
 * @param app - Express app instance
 * @param options - Security configuration options
 */
export function setupSecurityHeaders(
  app: Express,
  options: SecurityHeadersOptions = {}
): void {
  const {
    enableCSP = true,
    cspDirectives,
    enableHSTS = process.env.NODE_ENV === 'production',
    hstsMaxAge = 31536000, // 1 year
  } = options;

  // ==========================================
  // Helmet.js - Comprehensive Security Headers
  // ==========================================
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: enableCSP
        ? {
            directives: cspDirectives || {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"], // Adjust for your needs
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              fontSrc: ["'self'", 'data:'],
              connectSrc: ["'self'"],
              frameSrc: ["'none'"],
              objectSrc: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,

      // HTTP Strict Transport Security (HSTS)
      // Forces HTTPS connections
      hsts: enableHSTS
        ? {
            maxAge: hstsMaxAge,
            includeSubDomains: true,
            preload: true,
          }
        : false,

      // X-Frame-Options: Prevents clickjacking
      frameguard: {
        action: 'deny', // Don't allow framing at all
      },

      // X-Content-Type-Options: Prevents MIME sniffing
      noSniff: true,

      // X-XSS-Protection: Legacy XSS protection (deprecated but still useful)
      xssFilter: true,

      // Referrer-Policy: Controls referrer information
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },

      // X-Permitted-Cross-Domain-Policies: Adobe products policy
      permittedCrossDomainPolicies: {
        permittedPolicies: 'none',
      },

      // X-Download-Options: Prevents IE from executing downloads
      ieNoOpen: true,

      // X-DNS-Prefetch-Control: Controls DNS prefetching
      dnsPrefetchControl: {
        allow: false,
      },

      // Expect-CT: Certificate Transparency
      expectCt: {
        maxAge: 86400, // 24 hours
        enforce: true,
      },

      // Hide X-Powered-By header
      hidePoweredBy: true,
    })
  );

  console.log('✅ Security headers configured');
  if (enableHSTS) {
    console.log(`   → HSTS enabled (max-age: ${hstsMaxAge}s)`);
  }
  if (enableCSP) {
    console.log('   → Content Security Policy enabled');
  }
}

/**
 * Additional security middleware
 */
export function additionalSecurityMiddleware(app: Express): void {
  // Remove X-Powered-By header (if not using helmet)
  app.disable('x-powered-by');

  // Set X-Content-Type-Options header
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // Set X-Frame-Options header
  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  // Set Permissions-Policy header
  app.use((req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()'
    );
    next();
  });

  console.log('✅ Additional security middleware configured');
}

/**
 * Security headers for API responses
 */
export function apiSecurityHeaders() {
  return (req: any, res: any, next: any) => {
    // Prevent caching of sensitive data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // API-specific headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    next();
  };
}

export default setupSecurityHeaders;
