// Graceful Shutdown Handler
import { Server } from 'http';
import { createLogger } from './logger';

const logger = createLogger('shutdown');

export interface ShutdownHandler {
  name: string;
  handler: () => Promise<void>;
}

export class GracefulShutdown {
  private handlers: ShutdownHandler[] = [];
  private isShuttingDown = false;

  // Registriere Cleanup Handler
  register(name: string, handler: () => Promise<void>) {
    this.handlers.push({ name, handler });
  }

  // Setup Shutdown Listeners
  setup(server: Server) {
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

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
        } catch (error) {
          logger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled Rejection', { reason });
      process.exit(1);
    });
  }

  private async waitForConnections(server: Server, timeout: number): Promise<void> {
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

  private async executeHandlers() {
    logger.info(`Executing ${this.handlers.length} cleanup handlers...`);

    for (const { name, handler } of this.handlers) {
      try {
        logger.info(`Running cleanup: ${name}`);
        await handler();
        logger.info(`Cleanup completed: ${name}`);
      } catch (error) {
        logger.error(`Cleanup failed: ${name}`, { error });
      }
    }
  }
}

export const gracefulShutdown = new GracefulShutdown();
