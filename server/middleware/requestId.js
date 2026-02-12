// Request ID Middleware
// Assigns a unique ID to every request for tracing through logs.

import crypto from 'crypto';

export function requestIdMiddleware(req, res, next) {
    req.id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
}
