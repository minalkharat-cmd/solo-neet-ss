// Request ID Middleware
// Assigns a unique ID to every request for tracing through logs.

import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const headerVal = req.headers['x-request-id'];
    req.id = (Array.isArray(headerVal) ? headerVal[0] : headerVal) || crypto.randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
}
