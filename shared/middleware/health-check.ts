// Health Check Utilities
import { Request, Response } from 'express';
import { createLogger } from './logger';

const logger = createLogger('health-check');

export interface HealthCheck {
  name: string;
  check: () => Promise<boolean>;
  critical?: boolean; // Wenn true, Service ist unhealthy wenn Check fehlschlägt
}

export class HealthCheckManager {
  private checks: HealthCheck[] = [];

  // Registriere Health Check
  register(check: HealthCheck) {
    this.checks.push(check);
  }

  // Basic Health Endpoint (immer healthy wenn Service läuft)
  basicHealth = (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  };

  // Readiness Endpoint (prüft Dependencies)
  readiness = async (req: Request, res: Response) => {
    const results: any = {};
    let isReady = true;

    // Execute alle Checks
    for (const check of this.checks) {
      try {
        const result = await Promise.race([
          check.check(),
          new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
        ]);

        results[check.name] = {
          status: result ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString()
        };

        // Wenn Critical Check fehlschlägt
        if (!result && check.critical) {
          isReady = false;
        }
      } catch (error: any) {
        results[check.name] = {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        };

        if (check.critical) {
          isReady = false;
        }
      }
    }

    const statusCode = isReady ? 200 : 503;

    res.status(statusCode).json({
      status: isReady ? 'ready' : 'not_ready',
      checks: results,
      timestamp: new Date().toISOString()
    });
  };

  // Liveness Endpoint (nur für Kubernetes)
  liveness = (req: Request, res: Response) => {
    res.json({
      status: 'alive',
      timestamp: new Date().toISOString()
    });
  };
}

// Standard Health Checks
export const createDatabaseHealthCheck = (
  name: string,
  checkFn: () => Promise<boolean>
): HealthCheck => ({
  name: `database_${name}`,
  check: checkFn,
  critical: true
});

export const createRedisHealthCheck = (
  client: any
): HealthCheck => ({
  name: 'redis',
  check: async () => {
    try {
      await client.ping();
      return true;
    } catch {
      return false;
    }
  },
  critical: true
});

export const createExternalServiceHealthCheck = (
  name: string,
  checkFn: () => Promise<boolean>
): HealthCheck => ({
  name: `external_${name}`,
  check: checkFn,
  critical: false
});
