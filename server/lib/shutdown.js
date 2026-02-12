// Graceful Shutdown Handler
// Ensures clean shutdown on SIGTERM/SIGINT — closes HTTP server, DB, timers.
// Prevents data corruption from mid-write kills.

import logger from './logger.js';

const shutdownCallbacks = [];
let isShuttingDown = false;

/**
 * Register a cleanup function to run on shutdown.
 * @param {string} name — label for logging
 * @param {function} fn — async cleanup function
 */
export function onShutdown(name, fn) {
    shutdownCallbacks.push({ name, fn });
}

/**
 * Install SIGTERM/SIGINT handlers. Call once at startup.
 */
export function installShutdownHandlers() {
    const shutdown = async (signal) => {
        if (isShuttingDown) return;
        isShuttingDown = true;

        logger.info(`Received ${signal} — starting graceful shutdown`, { signal });

        for (const { name, fn } of shutdownCallbacks) {
            try {
                await Promise.race([
                    fn(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
                ]);
                logger.info(`Shutdown: ${name} completed`);
            } catch (err) {
                logger.error(`Shutdown: ${name} failed`, { error: err.message });
            }
        }

        logger.info('Graceful shutdown complete');
        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Catch unhandled errors at process level
    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled promise rejection', {
            error: reason instanceof Error ? reason.message : String(reason),
            stack: reason instanceof Error ? reason.stack : undefined
        });
    });

    process.on('uncaughtException', (err) => {
        logger.error('Uncaught exception — shutting down', {
            error: err.message,
            stack: err.stack
        });
        process.exit(1);
    });
}
