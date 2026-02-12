import { Router } from 'express';
import { getDueQuestions, getSRSStats, initSRSRecord, updateSRSRecord } from '../srs.js';

export function createSRSRoutes({ dal, authMiddleware }) {
    const router = Router();

    // Get due questions for today
    router.get('/due', authMiddleware, async (req, res) => {
        const allRecords = await dal.srsRecords.getAll();
        const dueQuestions = getDueQuestions(allRecords, req.userId);
        res.json({ count: dueQuestions.length, questions: dueQuestions.slice(0, 20) });
    });

    // Get SRS statistics
    router.get('/stats', authMiddleware, async (req, res) => {
        const allRecords = await dal.srsRecords.getAll();
        const stats = getSRSStats(allRecords, req.userId);
        res.json(stats);
    });

    // Record an answer and update SRS
    router.post('/answer', authMiddleware, async (req, res) => {
        const { questionId, correct, timeMs } = req.body;
        if (!questionId) {
            return res.status(400).json({ error: 'questionId required' });
        }

        let record = await dal.srsRecords.findByUserAndQuestion(req.userId, questionId);
        if (!record) {
            record = initSRSRecord(questionId, req.userId);
        }

        const updatedRecord = updateSRSRecord(record, correct, timeMs || 15000);
        await dal.srsRecords.upsert(req.userId, questionId, updatedRecord);

        res.json({
            success: true,
            nextReview: updatedRecord.nextReview,
            interval: updatedRecord.interval,
            easeFactor: updatedRecord.easeFactor
        });
    });

    // Initialize SRS for multiple questions (batch)
    router.post('/init-batch', authMiddleware, async (req, res) => {
        const { questionIds } = req.body;
        if (!questionIds || !Array.isArray(questionIds)) {
            return res.status(400).json({ error: 'questionIds array required' });
        }

        const newRecords = [];
        for (const questionId of questionIds) {
            const exists = await dal.srsRecords.exists(req.userId, questionId);
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
