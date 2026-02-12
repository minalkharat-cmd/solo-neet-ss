import jwt from 'jsonwebtoken';

/**
 * Creates auth and admin middleware closures over shared dependencies.
 */
export function createAuthMiddleware(JWT_SECRET) {
    const authMiddleware = (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.auth_token;
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.userId = decoded.userId;
            next();
        } catch (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    };

    return authMiddleware;
}

export function createAdminMiddleware(dal) {
    const adminMiddleware = async (req, res, next) => {
        const user = await dal.users.findById(req.userId);
        if (!user?.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    };

    return adminMiddleware;
}
