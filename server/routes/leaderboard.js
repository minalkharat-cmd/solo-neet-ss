import { Router } from 'express';

export function createLeaderboardRoutes({ db, authMiddleware }) {
    const router = Router();

    // Get top players
    router.get('/', async (req, res) => {
        try {
            await db.read();
            const limit = Math.min(parseInt(req.query.limit) || 50, 100);
            const sorted = [...db.data.leaderboard]
                .sort((a, b) => b.totalXP - a.totalXP)
                .slice(0, limit);
            res.json(sorted);
        } catch (err) {
            console.error('Leaderboard error:', err);
            res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
    });

    // Get current user's rank
    router.get('/me', authMiddleware, async (req, res) => {
        try {
            await db.read();
            const sorted = [...db.data.leaderboard].sort((a, b) => b.totalXP - a.totalXP);
            const rank = sorted.findIndex(l => l.userId === req.userId) + 1;
            const entry = sorted.find(l => l.userId === req.userId);

            res.json({
                rank: rank || null,
                entry: entry || null,
                totalPlayers: sorted.length
            });
        } catch (err) {
            console.error('Leaderboard me error:', err);
            res.status(500).json({ error: 'Failed to fetch rank' });
        }
    });

    return router;
}
