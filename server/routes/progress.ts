import { Router } from 'express';
import type { Request, Response, NextFunction, Router as RouterType } from 'express';
import logger from '../lib/logger.js';
import type { DAL, Progress } from '../types.js';

export function createProgressRoutes({ dal, authMiddleware }: {
    dal: DAL;
    authMiddleware: (req: Request, res: Response, next: NextFunction) => void;
}): RouterType {
    const router: RouterType = Router();

    // Get progress
    router.get('/', authMiddleware, async (req: Request, res: Response) => {
        try {
            const progress: Progress | null = await dal.progress.findByUserId(req.userId);
            if (!progress) return res.status(404).json({ error: 'No progress found' });
            res.json(progress);
        } catch (err: any) {
            logger.error('Failed to fetch progress', { error: err.message });
            res.status(500).json({ error: 'Failed to fetch progress' });
        }
    });

    // Save progress
    router.post('/', authMiddleware, async (req: Request, res: Response) => {
        try {
            const updates = req.body;
            const result: Progress | null = await dal.saveProgressAndLeaderboard(req.userId, {
                level: updates.level,
                currentXP: updates.currentXP,
                totalXP: updates.totalXP,
                questionsAnswered: updates.questionsAnswered,
                correctAnswers: updates.correctAnswers,
                currentStreak: updates.currentStreak,
                bestStreak: updates.bestStreak,
                dungeonsCleared: updates.dungeonsCleared,
                perfectDungeons: updates.perfectDungeons,
                unlockedAchievements: updates.unlockedAchievements,
                subjectProgress: updates.subjectProgress,
            } as Partial<Progress>);

            if (!result) return res.status(404).json({ error: 'User progress not found' });
            res.json({ success: true });
        } catch (err: any) {
            logger.error('Failed to save progress', { error: err.message });
            res.status(500).json({ error: 'Failed to save progress' });
        }
    });

    return router;
}
