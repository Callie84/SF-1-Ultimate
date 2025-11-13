// Circuit Breaker Pattern für externe Services
import { createLogger } from './logger';

const logger = createLogger('circuit-breaker');

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Anzahl Fehler bevor Circuit öffnet
  successThreshold?: number; // Anzahl Erfolge um Circuit zu schließen
  timeout?: number; // Timeout in ms bevor Half-Open versucht wird
  monitoringPeriod?: number; // Zeitfenster für Fehler-Zählung
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttempt: number = Date.now();
  private failureTimestamps: number[] = [];

  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {}
  ) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      successThreshold: options.successThreshold || 2,
      timeout: options.timeout || 60000, // 60 Sekunden
      monitoringPeriod: options.monitoringPeriod || 120000 // 2 Minuten
    };
  }

  // Execute mit Circuit Breaker
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit Breaker [${this.name}] is OPEN`);
      }
      // Versuche Half-Open
      this.state = CircuitState.HALF_OPEN;
      logger.info(`Circuit Breaker [${this.name}] entering HALF_OPEN state`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.options.successThreshold!) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        logger.info(`Circuit Breaker [${this.name}] is now CLOSED`);
      }
    }
  }

  private onFailure() {
    const now = Date.now();
    this.failureTimestamps.push(now);

    // Entferne alte Timestamps außerhalb des Monitoring-Fensters
    this.failureTimestamps = this.failureTimestamps.filter(
      ts => now - ts < this.options.monitoringPeriod!
    );

    this.failureCount = this.failureTimestamps.length;

    if (this.failureCount >= this.options.failureThreshold!) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.timeout!;
      this.successCount = 0;

      logger.error(`Circuit Breaker [${this.name}] is now OPEN`, {
        failureCount: this.failureCount,
        nextAttempt: new Date(this.nextAttempt).toISOString()
      });
    }
  }

  // Status abrufen
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.state === CircuitState.OPEN ? new Date(this.nextAttempt).toISOString() : null
    };
  }
}

// Circuit Breaker Manager für mehrere Services
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();

  getBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name)!;
  }

  getAllStatus() {
    return Array.from(this.breakers.values()).map(breaker => breaker.getStatus());
  }
}

export const circuitBreakerManager = new CircuitBreakerManager();
