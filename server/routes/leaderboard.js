import { Router } from 'express';
import logger from '../lib/logger.js';

export function createLeaderboardRoutes({ dal, authMiddleware }) {
    const router = Router();

    // Get top players
    router.get('/', async (req, res) => {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 50, 100);
            const sorted = await dal.leaderboard.getTopPlayers(limit);
            res.json(sorted);
        } catch (err) {
            logger.error('Failed to fetch leaderboard', { error: err.message });
            res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
    });

    // Get current user's rank
    router.get('/me', authMiddleware, async (req, res) => {
        try {
            const { rank, entry, totalPlayers } = await dal.leaderboard.getRank(req.userId);
            res.json({ rank, entry, totalPlayers });
        } catch (err) {
            logger.error('Failed to fetch user rank', { error: err.message });
            res.status(500).json({ error: 'Failed to fetch rank' });
        }
    });

    return router;
}
