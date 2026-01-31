"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gracefulShutdown = exports.GracefulShutdown = void 0;
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)('shutdown');
class GracefulShutdown {
    handlers = [];
    isShuttingDown = false;
    // Registriere Cleanup Handler
    register(name, handler) {
        this.handlers.push({ name, handler });
    }
    // Setup Shutdown Listeners
    setup(server) {
        const signals = ['SIGTERM', 'SIGINT'];
        signals.forEach(signal => {
            process.on(signal, async () => {
                if (this.isShuttingDown) {
                    logger.warn('Shutdown already in progress...');
                    return;
                }
                this.isShuttingDown = true;
                logger.info(`${signal} received, starting graceful shutdown...`);
                try {
                    // Stop accepting new connections
                    server.close(() => {
                        logger.info('HTTP server closed');
                    });
                    // Warte auf bestehende Requests (max 30 Sekunden)
                    await this.waitForConnections(server, 30000);
                    // Execute alle Cleanup Handlers
                    await this.executeHandlers();
                    logger.info('Graceful shutdown completed');
                    process.exit(0);
                }
                catch (error) {
                    logger.error('Error during shutdown', { error });
                    process.exit(1);
                }
            });
        });
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
            process.exit(1);
        });
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason) => {
            logger.error('Unhandled Rejection', { reason });
            process.exit(1);
        });
    }
    async waitForConnections(server, timeout) {
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                logger.warn('Shutdown timeout reached, forcing close');
                resolve();
            }, timeout);
            server.once('close', () => {
                clearTimeout(timeoutId);
                resolve();
            });
        });
    }
    async executeHandlers() {
        logger.info(`Executing ${this.handlers.length} cleanup handlers...`);
        for (const { name, handler } of this.handlers) {
            try {
                logger.info(`Running cleanup: ${name}`);
                await handler();
                logger.info(`Cleanup completed: ${name}`);
            }
            catch (error) {
                logger.error(`Cleanup failed: ${name}`, { error });
            }
        }
    }
}
exports.GracefulShutdown = GracefulShutdown;
exports.gracefulShutdown = new GracefulShutdown();
