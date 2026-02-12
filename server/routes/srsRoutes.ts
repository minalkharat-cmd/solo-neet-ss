import { Router } from 'express';
import type { Request, Response, NextFunction, Router as RouterType } from 'express';
import { getDueQuestions, getSRSStats, initSRSRecord, updateSRSRecord } from '../srs.js';
import type { DAL, SRSRecord } from '../types.js';

export function createSRSRoutes({ dal, authMiddleware }: {
    dal: DAL;
    authMiddleware: (req: Request, res: Response, next: NextFunction) => void;
}): RouterType {
    const router: RouterType = Router();

    // Get due questions for today
    router.get('/due', authMiddleware, async (req: Request, res: Response) => {
        const allRecords: SRSRecord[] = await dal.srsRecords.getAll();
        const dueQuestions: SRSRecord[] = getDueQuestions(allRecords, req.userId);
        res.json({ count: dueQuestions.length, questions: dueQuestions.slice(0, 20) });
    });

    // Get SRS statistics
    router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
        const allRecords: SRSRecord[] = await dal.srsRecords.getAll();
        const stats = getSRSStats(allRecords, req.userId);
        res.json(stats);
    });

    // Record an answer and update SRS
    router.post('/answer', authMiddleware, async (req: Request, res: Response) => {
        const { questionId, correct, timeMs } = req.body;
        if (!questionId) {
            return res.status(400).json({ error: 'questionId required' });
        }

        let record: SRSRecord | null = await dal.srsRecords.findByUserAndQuestion(req.userId, questionId);
        if (!record) {
            record = initSRSRecord(questionId, req.userId);
        }

        const updatedRecord: SRSRecord = updateSRSRecord(record, correct, timeMs || 15000);
        await dal.srsRecords.upsert(req.userId, questionId, updatedRecord);

        res.json({
            success: true,
            nextReview: updatedRecord.nextReview,
            interval: updatedRecord.interval,
            easeFactor: updatedRecord.easeFactor
        });
    });

    // Initialize SRS for multiple questions (batch)
    router.post('/init-batch', authMiddleware, async (req: Request, res: Response) => {
        const { questionIds } = req.body;
        if (!questionIds || !Array.isArray(questionIds)) {
            return res.status(400).json({ error: 'questionIds array required' });
        }

        const newRecords: SRSRecord[] = [];
        for (const questionId of questionIds) {
            const exists: boolean = await dal.srsRecords.exists(req.userId, questionId);
            if (!exists) {
                newRecords.push(initSRSRecord(questionId, req.userId));
            }
        }

        if (newRecords.length > 0) {
            await dal.srsRecords.createBatch(newRecords);
        }

        res.json({ success: true, added: newRecords.length });
    });

    return router;
}
