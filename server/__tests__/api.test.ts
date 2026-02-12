import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { createServer, type Server as HttpServer } from 'http';
import request from 'supertest';
import { Low, Memory } from 'lowdb';

import { createDAL } from '../dal.js';
import { createAuthMiddleware, createAdminMiddleware } from '../middleware/auth.js';
import { requestIdMiddleware } from '../middleware/requestId.js';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';
import { createProgressRoutes } from '../routes/progress.js';
import { createLeaderboardRoutes } from '../routes/leaderboard.js';
import { createSRSRoutes } from '../routes/srsRoutes.js';
import type { DatabaseData, DAL } from '../types.js';

const JWT_SECRET = 'integration-test-secret-key';

function createTestApp() {
    const defaultData: DatabaseData = {
        users: [], progress: [], leaderboard: [], generatedQuestions: [],
    };
    const db = new Low<DatabaseData>(new Memory<DatabaseData>(), defaultData);
    const dal = createDAL(db);

    const app = express();
    app.use(express.json());
    app.use(requestIdMiddleware);

    const authMiddleware = createAuthMiddleware(JWT_SECRET);
    const adminMiddleware = createAdminMiddleware(dal);

    // Health check
    app.get('/api/health', (_req, res) => {
        res.json({ status: 'ok' });
    });

    const deps = { dal, JWT_SECRET, authMiddleware, adminMiddleware, authLimiter: (_req: any, _res: any, next: any) => next(), isProduction: false, FRONTEND_URL: 'http://localhost:5173' };

    app.use('/api/progress', createProgressRoutes(deps));
    app.use('/api/leaderboard', createLeaderboardRoutes(deps));
    app.use('/api/srs', createSRSRoutes(deps));

    app.use(notFoundHandler);
    app.use(errorHandler);

    return { app, dal };
}

function makeToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

describe('API Integration Tests', () => {
    let app: express.Express;
    let dal: DAL;
    const userId = 'test-user-1';
    let token: string;

    beforeAll(async () => {
        const result = createTestApp();
        app = result.app;
        dal = result.dal;
        token = makeToken(userId);

        // Seed a user, progress, and leaderboard entry
        await dal.users.create({
            id: userId, username: 'testuser', email: 'test@test.com',
            password: 'hashed', hunterName: 'TestHunter', createdAt: new Date().toISOString(),
        });
        await dal.progress.create({
            userId, level: 5, currentXP: 200, totalXP: 1200,
            questionsAnswered: 50, correctAnswers: 35, currentStreak: 3,
            bestStreak: 10, dungeonsCleared: 2, perfectDungeons: 1,
            achievements: ['first_blood'], subjectProgress: {
                cardiology: { answered: 20, correct: 15 },
                neurology: { answered: 10, correct: 7 },
            },
        });
        await dal.leaderboard.create({
            userId, username: 'testuser', hunterName: 'TestHunter',
            level: 5, totalXP: 1200, rank: 'D',
        });
    });

    // ======================== HEALTH ========================

    describe('GET /api/health', () => {
        it('returns ok status', async () => {
            const res = await request(app).get('/api/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });

        it('includes x-request-id header', async () => {
            const res = await request(app).get('/api/health');
            expect(res.headers['x-request-id']).toBeTruthy();
        });
    });

    // ======================== AUTH GUARD ========================

    describe('Auth Guard', () => {
        it('rejects unauthenticated requests', async () => {
            const res = await request(app).get('/api/progress');
            expect(res.status).toBe(401);
        });

        it('rejects invalid token', async () => {
            const res = await request(app)
                .get('/api/progress')
                .set('Authorization', 'Bearer invalid');
            expect(res.status).toBe(401);
        });
    });

    // ======================== PROGRESS ========================

    describe('GET /api/progress', () => {
        it('returns user progress', async () => {
            const res = await request(app)
                .get('/api/progress')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.level).toBe(5);
            expect(res.body.totalXP).toBe(1200);
            expect(res.body.subjectProgress.cardiology).toBeDefined();
        });

        it('returns 404 for user with no progress', async () => {
            const otherToken = makeToken('nonexistent-user');
            const res = await request(app)
                .get('/api/progress')
                .set('Authorization', `Bearer ${otherToken}`);
            expect(res.status).toBe(404);
        });
    });

    describe('POST /api/progress', () => {
        it('saves updated progress', async () => {
            const res = await request(app)
                .post('/api/progress')
                .set('Authorization', `Bearer ${token}`)
                .send({ level: 6, totalXP: 1500, currentXP: 100 });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Verify the update persisted
            const progress = await dal.progress.findByUserId(userId);
            expect(progress!.level).toBe(6);
            expect(progress!.totalXP).toBe(1500);
        });
    });

    // ======================== LEADERBOARD ========================

    describe('GET /api/leaderboard', () => {
        it('returns sorted leaderboard', async () => {
            // Add a second player
            await dal.leaderboard.create({
                userId: 'u2', username: 'rival', hunterName: 'Rival',
                level: 10, totalXP: 5000, rank: 'B',
            });

            const res = await request(app).get('/api/leaderboard');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(res.body[0].totalXP).toBeGreaterThan(res.body[1].totalXP);
        });

        it('respects limit query param', async () => {
            const res = await request(app).get('/api/leaderboard?limit=1');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
        });
    });

    describe('GET /api/leaderboard/me', () => {
        it('returns user rank', async () => {
            const res = await request(app)
                .get('/api/leaderboard/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.rank).toBeGreaterThan(0);
            expect(res.body.totalPlayers).toBeGreaterThan(0);
        });
    });

    // ======================== SRS ========================

    describe('SRS Routes', () => {
        it('GET /api/srs/due returns due questions', async () => {
            const res = await request(app)
                .get('/api/srs/due')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.count).toBeDefined();
            expect(Array.isArray(res.body.questions)).toBe(true);
        });

        it('GET /api/srs/stats returns stats', async () => {
            const res = await request(app)
                .get('/api/srs/stats')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.total).toBeDefined();
            expect(res.body.dueToday).toBeDefined();
        });

        it('POST /api/srs/answer creates and updates SRS record', async () => {
            const res = await request(app)
                .post('/api/srs/answer')
                .set('Authorization', `Bearer ${token}`)
                .send({ questionId: 'q-test-1', correct: true, timeMs: 5000 });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.nextReview).toBeTruthy();
            expect(res.body.interval).toBe(1);

            // Verify record was created
            const record = await dal.srsRecords.findByUserAndQuestion(userId, 'q-test-1');
            expect(record).not.toBeNull();
            expect(record!.repetition).toBe(1);
        });

        it('POST /api/srs/answer rejects missing questionId', async () => {
            const res = await request(app)
                .post('/api/srs/answer')
                .set('Authorization', `Bearer ${token}`)
                .send({ correct: true });

            expect(res.status).toBe(400);
        });

        it('POST /api/srs/init-batch initializes multiple records', async () => {
            const res = await request(app)
                .post('/api/srs/init-batch')
                .set('Authorization', `Bearer ${token}`)
                .send({ questionIds: ['q-batch-1', 'q-batch-2', 'q-batch-3'] });

            expect(res.status).toBe(200);
            expect(res.body.added).toBe(3);

            // Second call should not add duplicates
            const res2 = await request(app)
                .post('/api/srs/init-batch')
                .set('Authorization', `Bearer ${token}`)
                .send({ questionIds: ['q-batch-1', 'q-batch-2'] });
            expect(res2.body.added).toBe(0);
        });
    });

    // ======================== 404 ========================

    describe('404 Handler', () => {
        it('returns 404 for unknown routes', async () => {
            const res = await request(app).get('/api/nonexistent');
            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Not found');
        });
    });
});
