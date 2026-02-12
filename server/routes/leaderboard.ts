import { Router } from 'express';
import type { Request, Response, NextFunction, Router as RouterType } from 'express';
import logger from '../lib/logger.js';
import type { DAL, LeaderboardEntry } from '../types.js';

export function createLeaderboardRoutes({ dal, authMiddleware }: {
    dal: DAL;
    authMiddleware: (req: Request, res: Response, next: NextFunction) => void;
}): RouterType {
    const router: RouterType = Router();

    // Get top players
    router.get('/', async (req: Request, res: Response) => {
        try {
            const limit: number = Math.min(parseInt(req.query.limit as string) || 50, 100);
            const sorted: LeaderboardEntry[] = await dal.leaderboard.getTopPlayers(limit);
            res.json(sorted);
        } catch (err: any) {
            logger.error('Failed to fetch leaderboard', { error: err.message });
            res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
    });

    // Get current user's rank
    router.get('/me', authMiddleware, async (req: Request, res: Response) => {
        try {
            const { rank, entry, totalPlayers } = await dal.leaderboard.getRank(req.userId);
            res.json({ rank, entry, totalPlayers });
        } catch (err: any) {
            logger.error('Failed to fetch user rank', { error: err.message });
            res.status(500).json({ error: 'Failed to fetch rank' });
        }
    });

    return router;
}
