import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { createAuthMiddleware, createAdminMiddleware } from '../middleware/auth.js';
import { requestIdMiddleware } from '../middleware/requestId.js';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';
import type { Request, Response, NextFunction } from 'express';
import type { DAL } from '../types.js';

// Helper to create mock Express req/res/next
function mockReq(overrides: Record<string, unknown> = {}): Request {
    return {
        headers: {},
        cookies: {},
        originalUrl: '/api/test',
        method: 'GET',
        id: '',
        userId: '',
        ...overrides,
    } as unknown as Request;
}

function mockRes() {
    const res = {
        statusCode: 200,
        headers: {} as Record<string, string>,
        body: null as unknown,
        status(code: number) { res.statusCode = code; return res; },
        json(data: unknown) { res.body = data; return res; },
        setHeader(key: string, value: string) { res.headers[key] = value; },
    };
    return res as unknown as Response & { statusCode: number; body: unknown; headers: Record<string, string> };
}

describe('Auth Middleware', () => {
    const JWT_SECRET = 'test-secret-key-12345';
    const authMiddleware = createAuthMiddleware(JWT_SECRET);

    it('rejects requests without token', () => {
        const req = mockReq();
        const res = mockRes();
        const next = vi.fn();

        authMiddleware(req, res, next);

        expect(res.statusCode).toBe(401);
        expect((res.body as any).error).toBe('No token provided');
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects invalid token', () => {
        const req = mockReq({ headers: { authorization: 'Bearer invalid-token' } });
        const res = mockRes();
        const next = vi.fn();

        authMiddleware(req, res, next);

        expect(res.statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('accepts valid Bearer token and sets userId', () => {
        const token = jwt.sign({ userId: 'user123' }, JWT_SECRET);
        const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
        const res = mockRes();
        const next = vi.fn();

        authMiddleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.userId).toBe('user123');
    });

    it('accepts token from cookie', () => {
        const token = jwt.sign({ userId: 'user456' }, JWT_SECRET);
        const req = mockReq({ cookies: { auth_token: token } });
        const res = mockRes();
        const next = vi.fn();

        authMiddleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.userId).toBe('user456');
    });
});

describe('Admin Middleware', () => {
    it('rejects non-admin users', async () => {
        const dal = {
            users: { findById: vi.fn().mockResolvedValue({ id: 'u1', isAdmin: false }) },
        } as unknown as DAL;
        const middleware = createAdminMiddleware(dal);

        const req = mockReq({ userId: 'u1' });
        const res = mockRes();
        const next = vi.fn();

        await middleware(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('allows admin users', async () => {
        const dal = {
            users: { findById: vi.fn().mockResolvedValue({ id: 'u1', isAdmin: true }) },
        } as unknown as DAL;
        const middleware = createAdminMiddleware(dal);

        const req = mockReq({ userId: 'u1' });
        const res = mockRes();
        const next = vi.fn();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
    });
});

describe('Request ID Middleware', () => {
    it('generates a UUID when no header present', () => {
        const req = mockReq({ headers: {} });
        const res = mockRes();
        const next = vi.fn();

        requestIdMiddleware(req, res, next);

        expect(req.id).toBeTruthy();
        expect(req.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(res.headers['x-request-id']).toBe(req.id);
        expect(next).toHaveBeenCalled();
    });

    it('uses existing x-request-id header', () => {
        const req = mockReq({ headers: { 'x-request-id': 'upstream-id-123' } });
        const res = mockRes();
        const next = vi.fn();

        requestIdMiddleware(req, res, next);

        expect(req.id).toBe('upstream-id-123');
    });
});

describe('Error Handler', () => {
    it('logs and returns 500 for generic errors', () => {
        const err = new Error('Something broke');
        const req = mockReq({ id: 'req-123' });
        const res = mockRes();
        const next = vi.fn();

        errorHandler(err, req, res, next);

        expect(res.statusCode).toBe(500);
        expect((res.body as any).error).toBe('Something broke');
        expect((res.body as any).requestId).toBe('req-123');
    });

    it('uses error.status if present', () => {
        const err = Object.assign(new Error('Not found'), { status: 404 });
        const req = mockReq({ id: 'req-456' });
        const res = mockRes();
        const next = vi.fn();

        errorHandler(err, req, res, next);

        expect(res.statusCode).toBe(404);
    });
});

describe('Not Found Handler', () => {
    it('returns 404 with path', () => {
        const req = mockReq({ originalUrl: '/api/missing' });
        const res = mockRes();

        notFoundHandler(req, res);

        expect(res.statusCode).toBe(404);
        expect((res.body as any).error).toBe('Not found');
        expect((res.body as any).path).toBe('/api/missing');
    });
});
