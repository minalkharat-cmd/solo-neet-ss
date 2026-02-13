import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import type { DAL } from '../types.js';

/**
 * Creates auth and admin middleware closures over shared dependencies.
 */
export function createAuthMiddleware(JWT_SECRET: string) {
    const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.auth_token;
        if (!token) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
            req.userId = decoded.userId;
            next();
        } catch (err) {
            res.status(401).json({ error: 'Invalid token' });
        }
    };

    return authMiddleware;
}

export function createAdminMiddleware(dal: DAL) {
    const adminMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const user = await dal.users.findById(req.userId);
        if (!user?.isAdmin) {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }
        next();
    };

    return adminMiddleware;
}
