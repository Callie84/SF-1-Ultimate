// Shared Structured Logging mit Winston
import winston from 'winston';
import path from 'path';

// Custom Log Format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console Format (nur für Development)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `[${timestamp}] [${service}] ${level}: ${message} ${metaStr}`;
  })
);

// Erstelle Logger Factory
export const createLogger = (serviceName: string) => {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: serviceName },
    transports: [
      // File Transport - Errors
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'error.log'),
        level: 'error',
        maxsize: 100 * 1024 * 1024, // 100MB
        maxFiles: 7, // 7 Tage Retention
        tailable: true
      }),
      // File Transport - Combined
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'combined.log'),
        maxsize: 100 * 1024 * 1024, // 100MB
        maxFiles: 7,
        tailable: true
      })
    ]
  });

  // Console Transport für Development
  if (process.env.NODE_ENV !== 'production') {
    logger.add(
      new winston.transports.Console({
        format: consoleFormat
      })
    );
  }

  return logger;
};

// Helper für Sensitive Data Masking
export const maskSensitiveData = (data: any): any => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'api_key',
    'apiKey',
    'accessToken',
    'refreshToken',
    'authorization'
  ];

  const masked = { ...data };

  for (const key in masked) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      masked[key] = '***MASKED***';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }

  return masked;
};

// Express Middleware für Request Logging
export const requestLogger = (logger: winston.Logger) => {
  return (req: any, res: any, next: any) => {
    const start = Date.now();

    // Log Request
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Response Handler
    res.on('finish', () => {
      const duration = Date.now() - start;

      logger.info('HTTP Response', {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`
      });
    });

    next();
  };
};
