// Centralized Express Error Handler
// Catches all unhandled errors and returns consistent JSON responses.
// Logs full error details server-side; returns safe messages to clients.

import logger from '../lib/logger.js';

/**
 * Express error-handling middleware (must have 4 params).
 */
export function errorHandler(err, req, res, _next) {
    const requestId = req.id || 'unknown';
    const status = err.status || err.statusCode || 500;

    // Log full error details
    logger.error('Unhandled request error', {
        requestId,
        method: req.method,
        path: req.originalUrl,
        status,
        error: err.message,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });

    // Never leak internal error details in production
    const message = status >= 500 && process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message || 'Internal server error';

    res.status(status).json({
        error: message,
        requestId,
    });
}

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(req, res) {
    res.status(404).json({
        error: 'Not found',
        path: req.originalUrl,
    });
}
