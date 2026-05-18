"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExternalServiceHealthCheck = exports.createRedisHealthCheck = exports.createDatabaseHealthCheck = exports.HealthCheckManager = void 0;
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)('health-check');
class HealthCheckManager {
    checks = [];
    // Registriere Health Check
    register(check) {
        this.checks.push(check);
    }
    // Basic Health Endpoint (immer healthy wenn Service läuft)
    basicHealth = (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    };
    // Readiness Endpoint (prüft Dependencies)
    readiness = async (req, res) => {
        const results = {};
        let isReady = true;
        // Execute alle Checks
        for (const check of this.checks) {
            try {
                const result = await Promise.race([
                    check.check(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                ]);
                results[check.name] = {
                    status: result ? 'healthy' : 'unhealthy',
                    timestamp: new Date().toISOString()
                };
                // Wenn Critical Check fehlschlägt
                if (!result && check.critical) {
                    isReady = false;
                }
            }
            catch (error) {
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
    liveness = (req, res) => {
        res.json({
            status: 'alive',
            timestamp: new Date().toISOString()
        });
    };
}
exports.HealthCheckManager = HealthCheckManager;
// Standard Health Checks
const createDatabaseHealthCheck = (name, checkFn) => ({
    name: `database_${name}`,
    check: checkFn,
    critical: true
});
exports.createDatabaseHealthCheck = createDatabaseHealthCheck;
const createRedisHealthCheck = (client) => ({
    name: 'redis',
    check: async () => {
        try {
            await client.ping();
            return true;
        }
        catch {
            return false;
        }
    },
    critical: true
});
exports.createRedisHealthCheck = createRedisHealthCheck;
const createExternalServiceHealthCheck = (name, checkFn) => ({
    name: `external_${name}`,
    check: checkFn,
    critical: false
});
exports.createExternalServiceHealthCheck = createExternalServiceHealthCheck;
