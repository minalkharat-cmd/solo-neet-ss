import { Router } from 'express';
import { getDueQuestions, getSRSStats, initSRSRecord, updateSRSRecord } from '../srs.js';

export function createSRSRoutes({ db, authMiddleware }) {
    const router = Router();

    // Get due questions for today
    router.get('/due', authMiddleware, async (req, res) => {
        await db.read();
        db.data.srsRecords = db.data.srsRecords || [];
        const dueQuestions = getDueQuestions(db.data.srsRecords, req.userId);
        res.json({ count: dueQuestions.length, questions: dueQuestions.slice(0, 20) });
    });

    // Get SRS statistics
    router.get('/stats', authMiddleware, async (req, res) => {
        await db.read();
        db.data.srsRecords = db.data.srsRecords || [];
        const stats = getSRSStats(db.data.srsRecords, req.userId);
        res.json(stats);
    });

    // Record an answer and update SRS
    router.post('/answer', authMiddleware, async (req, res) => {
        const { questionId, correct, timeMs } = req.body;
        if (!questionId) {
            return res.status(400).json({ error: 'questionId required' });
        }

        await db.read();
        db.data.srsRecords = db.data.srsRecords || [];

        let recordIndex = db.data.srsRecords.findIndex(
            r => r.questionId === questionId && r.userId === req.userId
        );

        let record;
        if (recordIndex === -1) {
            record = initSRSRecord(questionId, req.userId);
            db.data.srsRecords.push(record);
            recordIndex = db.data.srsRecords.length - 1;
        } else {
            record = db.data.srsRecords[recordIndex];
        }

        const updatedRecord = updateSRSRecord(record, correct, timeMs || 15000);
        db.data.srsRecords[recordIndex] = updatedRecord;
        await db.write();

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

        await db.read();
        db.data.srsRecords = db.data.srsRecords || [];

        let added = 0;
        for (const questionId of questionIds) {
            const exists = db.data.srsRecords.some(
                r => r.questionId === questionId && r.userId === req.userId
            );
            if (!exists) {
                db.data.srsRecords.push(initSRSRecord(questionId, req.userId));
                added++;
            }
        }

        await db.write();
        res.json({ success: true, added });
    });

    return router;
}
