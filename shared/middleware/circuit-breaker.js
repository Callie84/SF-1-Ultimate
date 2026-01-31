"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.circuitBreakerManager = exports.CircuitBreakerManager = exports.CircuitBreaker = exports.CircuitState = void 0;
// Circuit Breaker Pattern für externe Services
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)('circuit-breaker');
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitState || (exports.CircuitState = CircuitState = {}));
class CircuitBreaker {
    name;
    options;
    state = CircuitState.CLOSED;
    failureCount = 0;
    successCount = 0;
    nextAttempt = Date.now();
    failureTimestamps = [];
    constructor(name, options = {}) {
        this.name = name;
        this.options = options;
        this.options = {
            failureThreshold: options.failureThreshold || 5,
            successThreshold: options.successThreshold || 2,
            timeout: options.timeout || 60000, // 60 Sekunden
            monitoringPeriod: options.monitoringPeriod || 120000 // 2 Minuten
        };
    }
    // Execute mit Circuit Breaker
    async execute(fn) {
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
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        this.failureCount = 0;
        if (this.state === CircuitState.HALF_OPEN) {
            this.successCount++;
            if (this.successCount >= this.options.successThreshold) {
                this.state = CircuitState.CLOSED;
                this.successCount = 0;
                logger.info(`Circuit Breaker [${this.name}] is now CLOSED`);
            }
        }
    }
    onFailure() {
        const now = Date.now();
        this.failureTimestamps.push(now);
        // Entferne alte Timestamps außerhalb des Monitoring-Fensters
        this.failureTimestamps = this.failureTimestamps.filter(ts => now - ts < this.options.monitoringPeriod);
        this.failureCount = this.failureTimestamps.length;
        if (this.failureCount >= this.options.failureThreshold) {
            this.state = CircuitState.OPEN;
            this.nextAttempt = Date.now() + this.options.timeout;
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
exports.CircuitBreaker = CircuitBreaker;
// Circuit Breaker Manager für mehrere Services
class CircuitBreakerManager {
    breakers = new Map();
    getBreaker(name, options) {
        if (!this.breakers.has(name)) {
            this.breakers.set(name, new CircuitBreaker(name, options));
        }
        return this.breakers.get(name);
    }
    getAllStatus() {
        return Array.from(this.breakers.values()).map(breaker => breaker.getStatus());
    }
}
exports.CircuitBreakerManager = CircuitBreakerManager;
exports.circuitBreakerManager = new CircuitBreakerManager();
