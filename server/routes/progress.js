import { Router } from 'express';

export function createProgressRoutes({ db, authMiddleware }) {
    const router = Router();

    // Get progress
    router.get('/', authMiddleware, async (req, res) => {
        try {
            await db.read();
            const progress = db.data.progress.find(p => p.userId === req.userId);
            if (!progress) return res.status(404).json({ error: 'No progress found' });
            res.json(progress);
        } catch (err) {
            console.error('Get progress error:', err);
            res.status(500).json({ error: 'Failed to fetch progress' });
        }
    });

    // Save progress
    router.post('/', authMiddleware, async (req, res) => {
        try {
            await db.read();
            const progressIndex = db.data.progress.findIndex(p => p.userId === req.userId);

            if (progressIndex === -1) {
                return res.status(404).json({ error: 'User progress not found' });
            }

            const updates = req.body;
            const current = db.data.progress[progressIndex];

            db.data.progress[progressIndex] = {
                ...current,
                level: updates.level ?? current.level,
                currentXP: updates.currentXP ?? current.currentXP,
                totalXP: updates.totalXP ?? current.totalXP,
                questionsAnswered: updates.questionsAnswered ?? current.questionsAnswered,
                correctAnswers: updates.correctAnswers ?? current.correctAnswers,
                currentStreak: updates.currentStreak ?? current.currentStreak,
                bestStreak: updates.bestStreak ?? current.bestStreak,
                dungeonsCleared: updates.dungeonsCleared ?? current.dungeonsCleared,
                perfectDungeons: updates.perfectDungeons ?? current.perfectDungeons,
                unlockedAchievements: updates.unlockedAchievements ?? current.unlockedAchievements ?? [],
                subjectProgress: updates.subjectProgress ?? current.subjectProgress ?? {},
                lastUpdated: new Date().toISOString()
            };

            // Update leaderboard
            const leaderboardEntry = db.data.leaderboard.find(l => l.userId === req.userId);
            if (leaderboardEntry) {
                leaderboardEntry.level = db.data.progress[progressIndex].level;
                leaderboardEntry.totalXP = db.data.progress[progressIndex].totalXP;
            }

            // Update user last active timestamp
            const user = db.data.users.find(u => u.id === req.userId);
            if (user) user.lastActive = new Date().toISOString();

            await db.write();
            res.json({ success: true });
        } catch (err) {
            console.error('Save progress error:', err);
            res.status(500).json({ error: 'Failed to save progress' });
        }
    });

    return router;
}
