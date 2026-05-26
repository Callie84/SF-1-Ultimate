// Circuit Breaker Service
// Trackt Fehler pro Adapter und deaktiviert zu häufig fehlende Adapter temporär

import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export interface CircuitStatus {
  adapter: string;
  failureCount: number;
  isOpen: boolean;
  lastFailure?: Date;
}

export class CircuitBreakerService {
  private readonly FAILURE_THRESHOLD = 5; // Fehler bis zum Öffnen
  private readonly FAILURE_WINDOW = 3600; // 1 Stunde (Sekunden)

  /**
   * Record successful execution
   */
  async recordSuccess(adapter: string): Promise<void> {
    const failureKey = `circuit:failures:${adapter}`;
    await redis.del(failureKey);
    await redis.del(`circuit:lastFailure:${adapter}`);
    logger.debug(`[CircuitBreaker] ${adapter} erfolgreich — Fehler-Counter zurückgesetzt`);
  }

  /**
   * Record failed execution
   */
  async recordFailure(adapter: string, error: Error): Promise<void> {
    const failureKey = `circuit:failures:${adapter}`;
    const lastFailureKey = `circuit:lastFailure:${adapter}`;

    // Increment failure counter
    const failureCount = await redis.incr(failureKey);

    // Set expiration on first failure
    if (failureCount === 1) {
      await redis.expire(failureKey, this.FAILURE_WINDOW);
    }

    // Record timestamp of last failure
    await redis.set(lastFailureKey, new Date().toISOString(), { EX: this.FAILURE_WINDOW });

    logger.warn(
      `[CircuitBreaker] ${adapter} Fehler #${failureCount}/${this.FAILURE_THRESHOLD}: ${error.message}`
    );

    // If threshold reached, open the circuit
    if (failureCount >= this.FAILURE_THRESHOLD) {
      const openKey = `circuit:open:${adapter}`;
      await redis.setEx(openKey, this.FAILURE_WINDOW, '1');
      logger.error(
        `[CircuitBreaker] 🔴 ${adapter} Circuit OFFEN — ${this.FAILURE_WINDOW}s deaktiviert`
      );
    }
  }

  /**
   * Check if circuit is open (adapter should be skipped)
   */
  async isOpen(adapter: string): Promise<boolean> {
    const openKey = `circuit:open:${adapter}`;
    const isOpen = await redis.exists(openKey);
    return isOpen === 1;
  }

  /**
   * Get circuit status for all adapters
   */
  async getStatus(): Promise<CircuitStatus[]> {
    const pattern = 'circuit:failures:*';
    const keys = await redis.keys(pattern);

    const statuses: CircuitStatus[] = [];

    for (const key of keys) {
      const adapter = key.replace('circuit:failures:', '');
      const failureCount = parseInt(await redis.get(key) || '0', 10);
      const isOpen = (await redis.exists(`circuit:open:${adapter}`)) === 1;
      const lastFailureStr = await redis.get(`circuit:lastFailure:${adapter}`);

      statuses.push({
        adapter,
        failureCount,
        isOpen,
        lastFailure: lastFailureStr ? new Date(lastFailureStr) : undefined,
      });
    }

    return statuses.sort((a, b) => b.failureCount - a.failureCount);
  }

  /**
   * Manual reset for an adapter
   */
  async reset(adapter: string): Promise<void> {
    await redis.del(`circuit:failures:${adapter}`);
    await redis.del(`circuit:open:${adapter}`);
    await redis.del(`circuit:lastFailure:${adapter}`);
    logger.info(`[CircuitBreaker] ${adapter} Circuit zurückgesetzt`);
  }

  /**
   * Get summary statistics
   */
  async getSummary(): Promise<{ total: number; open: number; failures: number }> {
    const statuses = await this.getStatus();
    const openCount = statuses.filter(s => s.isOpen).length;
    const totalFailures = statuses.reduce((sum, s) => sum + s.failureCount, 0);

    return {
      total: statuses.length,
      open: openCount,
      failures: totalFailures,
    };
  }
}

export const circuitBreaker = new CircuitBreakerService();
