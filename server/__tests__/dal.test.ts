import { describe, it, expect, beforeEach } from 'vitest';
import { Low, Memory } from 'lowdb';
import { createDAL } from '../dal.js';
import type { DatabaseData, DAL } from '../types.js';

function createTestDAL(): DAL {
    const defaultData: DatabaseData = {
        users: [], progress: [], leaderboard: [], generatedQuestions: [],
    };
    const db = new Low<DatabaseData>(new Memory<DatabaseData>(), defaultData);
    return createDAL(db);
}

describe('DAL — Data Access Layer', () => {
    let dal: DAL;

    beforeEach(() => {
        dal = createTestDAL();
    });

    // ======================== USERS ========================

    describe('users', () => {
        const makeUser = (overrides = {}) => ({
            id: 'u1', username: 'testuser', email: 'test@example.com',
            password: 'hashed', hunterName: 'Hunter', createdAt: new Date().toISOString(),
            ...overrides,
        });

        it('create and findById', async () => {
            const user = makeUser();
            await dal.users.create(user);
            const found = await dal.users.findById('u1');
            expect(found).not.toBeNull();
            expect(found!.username).toBe('testuser');
        });

        it('findByEmail', async () => {
            await dal.users.create(makeUser());
            const found = await dal.users.findByEmail('test@example.com');
            expect(found).not.toBeNull();
            expect(found!.id).toBe('u1');
        });

        it('findByGoogleId', async () => {
            await dal.users.create(makeUser({ googleId: 'g123' }));
            const found = await dal.users.findByGoogleId('g123');
            expect(found).not.toBeNull();
        });

        it('findByEmailOrUsername', async () => {
            await dal.users.create(makeUser());
            const byEmail = await dal.users.findByEmailOrUsername('test@example.com', 'nope');
            expect(byEmail).not.toBeNull();
            const byUsername = await dal.users.findByEmailOrUsername('nope@x.com', 'testuser');
            expect(byUsername).not.toBeNull();
        });

        it('returns null when not found', async () => {
            expect(await dal.users.findById('nonexistent')).toBeNull();
            expect(await dal.users.findByEmail('nope')).toBeNull();
            expect(await dal.users.findByGoogleId('nope')).toBeNull();
        });

        it('update modifies user in place', async () => {
            await dal.users.create(makeUser());
            const updated = await dal.users.update('u1', { hunterName: 'S-Rank Hunter' });
            expect(updated!.hunterName).toBe('S-Rank Hunter');

            const refetch = await dal.users.findById('u1');
            expect(refetch!.hunterName).toBe('S-Rank Hunter');
        });

        it('update returns null for missing user', async () => {
            expect(await dal.users.update('nonexistent', { hunterName: 'x' })).toBeNull();
        });

        it('getAll returns all users', async () => {
            await dal.users.create(makeUser({ id: 'u1' }));
            await dal.users.create(makeUser({ id: 'u2', username: 'user2', email: 'u2@x.com' }));
            const all = await dal.users.getAll();
            expect(all).toHaveLength(2);
        });

        it('findWithFCMTokens filters correctly', async () => {
            await dal.users.create(makeUser({ id: 'u1', fcmTokens: ['token1'] }));
            await dal.users.create(makeUser({ id: 'u2', username: 'u2', email: 'u2@x.com', fcmTokens: [] }));
            const result = await dal.users.findWithFCMTokens();
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('u1');
        });

        it('countNewSince counts recent users', async () => {
            await dal.users.create(makeUser({ id: 'u1', createdAt: new Date().toISOString() }));
            await dal.users.create(makeUser({
                id: 'u2', username: 'u2', email: 'u2@x.com',
                createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
            }));
            const count = await dal.users.countNewSince(7);
            expect(count).toBe(1);
        });
    });

    // ======================== PROGRESS ========================

    describe('progress', () => {
        const makeProgress = (overrides = {}) => ({
            userId: 'u1', level: 1, currentXP: 0, totalXP: 0,
            questionsAnswered: 0, correctAnswers: 0, currentStreak: 0,
            bestStreak: 0, dungeonsCleared: 0, perfectDungeons: 0,
            achievements: [], subjectProgress: {},
            ...overrides,
        });

        it('create and findByUserId', async () => {
            await dal.progress.create(makeProgress());
            const found = await dal.progress.findByUserId('u1');
            expect(found).not.toBeNull();
            expect(found!.userId).toBe('u1');
        });

        it('update modifies progress', async () => {
            await dal.progress.create(makeProgress());
            const updated = await dal.progress.update('u1', { level: 5, totalXP: 1000 });
            expect(updated!.level).toBe(5);
            expect(updated!.totalXP).toBe(1000);
            expect(updated!.lastUpdated).toBeTruthy();
        });

        it('update returns null for missing user', async () => {
            expect(await dal.progress.update('nonexistent', { level: 5 })).toBeNull();
        });

        it('getAll returns all records', async () => {
            await dal.progress.create(makeProgress({ userId: 'u1' }));
            await dal.progress.create(makeProgress({ userId: 'u2' }));
            const all = await dal.progress.getAll();
            expect(all).toHaveLength(2);
        });
    });

    // ======================== LEADERBOARD ========================

    describe('leaderboard', () => {
        const makeEntry = (overrides = {}) => ({
            userId: 'u1', username: 'user1', hunterName: 'Hunter',
            level: 1, totalXP: 100, rank: 'E', ...overrides,
        });

        it('getTopPlayers returns sorted by XP', async () => {
            await dal.leaderboard.create(makeEntry({ userId: 'u1', totalXP: 100 }));
            await dal.leaderboard.create(makeEntry({ userId: 'u2', username: 'user2', totalXP: 500 }));
            await dal.leaderboard.create(makeEntry({ userId: 'u3', username: 'user3', totalXP: 300 }));

            const top = await dal.leaderboard.getTopPlayers(2);
            expect(top).toHaveLength(2);
            expect(top[0].totalXP).toBe(500);
            expect(top[1].totalXP).toBe(300);
        });

        it('getRank returns correct rank', async () => {
            await dal.leaderboard.create(makeEntry({ userId: 'u1', totalXP: 100 }));
            await dal.leaderboard.create(makeEntry({ userId: 'u2', username: 'u2', totalXP: 500 }));

            const { rank, entry, totalPlayers } = await dal.leaderboard.getRank('u1');
            expect(rank).toBe(2);
            expect(entry).not.toBeNull();
            expect(totalPlayers).toBe(2);
        });

        it('getRank returns null for missing user', async () => {
            const { rank } = await dal.leaderboard.getRank('nonexistent');
            expect(rank).toBeNull();
        });
    });

    // ======================== GENERATED QUESTIONS ========================

    describe('generatedQuestions', () => {
        const makeQuestion = (overrides = {}) => ({
            id: 'q1', question: 'What is X?', options: ['A', 'B', 'C', 'D'],
            correct: 0, difficulty: 'medium' as const, xp: 25,
            explanation: 'Because X.', reviewed: false, ...overrides,
        });

        it('add and findById', async () => {
            await dal.generatedQuestions.add(makeQuestion());
            const found = await dal.generatedQuestions.findById('q1');
            expect(found).not.toBeNull();
            expect(found!.question).toBe('What is X?');
        });

        it('list filters by reviewed status', async () => {
            await dal.generatedQuestions.add(makeQuestion({ id: 'q1', reviewed: false }));
            await dal.generatedQuestions.add(makeQuestion({ id: 'q2', reviewed: true }));

            const unreviewed = await dal.generatedQuestions.list({ reviewed: false });
            expect(unreviewed).toHaveLength(1);
            expect(unreviewed[0].id).toBe('q1');

            const all = await dal.generatedQuestions.list();
            expect(all).toHaveLength(2);
        });

        it('review marks question as reviewed', async () => {
            await dal.generatedQuestions.add(makeQuestion());
            const reviewed = await dal.generatedQuestions.review('q1', {
                approved: true, reviewedBy: 'admin1',
            });
            expect(reviewed!.reviewed).toBe(true);
            expect(reviewed!.approved).toBe(true);
            expect(reviewed!.reviewedBy).toBe('admin1');
        });

        it('count returns total', async () => {
            await dal.generatedQuestions.add(makeQuestion({ id: 'q1' }));
            await dal.generatedQuestions.add(makeQuestion({ id: 'q2' }));
            expect(await dal.generatedQuestions.count()).toBe(2);
        });

        it('getProcessedPmids returns set of PMIDs', async () => {
            await dal.generatedQuestions.add(makeQuestion({ id: 'q1', source: { pmid: 'PM001' } }));
            await dal.generatedQuestions.add(makeQuestion({ id: 'q2', source: { pmid: 'PM002' } }));
            const pmids = await dal.generatedQuestions.getProcessedPmids();
            expect(pmids.size).toBe(2);
            expect(pmids.has('PM001')).toBe(true);
        });

        it('addBatch adds multiple questions', async () => {
            await dal.generatedQuestions.addBatch([
                makeQuestion({ id: 'q1' }),
                makeQuestion({ id: 'q2' }),
            ]);
            expect(await dal.generatedQuestions.count()).toBe(2);
        });
    });

    // ======================== SRS RECORDS ========================

    describe('srsRecords', () => {
        const makeRecord = (overrides = {}) => ({
            questionId: 'q1', userId: 'u1', repetition: 0, easeFactor: 2.5,
            interval: 0, nextReview: '2024-01-01', lastAttempt: null,
            attempts: [], createdAt: new Date().toISOString(), ...overrides,
        });

        it('create and findByUserAndQuestion', async () => {
            await dal.srsRecords.create(makeRecord());
            const found = await dal.srsRecords.findByUserAndQuestion('u1', 'q1');
            expect(found).not.toBeNull();
        });

        it('upsert creates new or updates existing', async () => {
            await dal.srsRecords.upsert('u1', 'q1', makeRecord());
            expect(await dal.srsRecords.exists('u1', 'q1')).toBe(true);

            await dal.srsRecords.upsert('u1', 'q1', makeRecord({ repetition: 5 }));
            const found = await dal.srsRecords.findByUserAndQuestion('u1', 'q1');
            expect(found!.repetition).toBe(5);
        });

        it('findByUser returns user records', async () => {
            await dal.srsRecords.create(makeRecord({ userId: 'u1', questionId: 'q1' }));
            await dal.srsRecords.create(makeRecord({ userId: 'u1', questionId: 'q2' }));
            await dal.srsRecords.create(makeRecord({ userId: 'u2', questionId: 'q3' }));

            const records = await dal.srsRecords.findByUser('u1');
            expect(records).toHaveLength(2);
        });

        it('createBatch adds multiple records', async () => {
            await dal.srsRecords.createBatch([
                makeRecord({ questionId: 'q1' }),
                makeRecord({ questionId: 'q2' }),
            ]);
            const all = await dal.srsRecords.getAll();
            expect(all).toHaveLength(2);
        });
    });

    // ======================== COMPOSITE OPERATIONS ========================

    describe('composite operations', () => {
        it('createUserWithProgress creates all three records', async () => {
            const user = await dal.createUserWithProgress(
                { id: 'u1', username: 'user', email: 'u@x.com', password: 'hash', hunterName: 'H', createdAt: new Date().toISOString() },
                { userId: 'u1', level: 1, currentXP: 0, totalXP: 0, questionsAnswered: 0, correctAnswers: 0, currentStreak: 0, bestStreak: 0, dungeonsCleared: 0, perfectDungeons: 0, achievements: [], subjectProgress: {} },
                { userId: 'u1', username: 'user', hunterName: 'H', level: 1, totalXP: 0, rank: 'E' },
            );
            expect(user.id).toBe('u1');

            const foundUser = await dal.users.findById('u1');
            expect(foundUser).not.toBeNull();

            const foundProgress = await dal.progress.findByUserId('u1');
            expect(foundProgress).not.toBeNull();

            const foundLeaderboard = await dal.leaderboard.findByUserId('u1');
            expect(foundLeaderboard).not.toBeNull();
        });

        it('saveProgressAndLeaderboard syncs leaderboard', async () => {
            await dal.users.create({ id: 'u1', username: 'u', email: 'u@x.com', password: null, hunterName: 'H', createdAt: new Date().toISOString() });
            await dal.progress.create({ userId: 'u1', level: 1, currentXP: 0, totalXP: 0, questionsAnswered: 0, correctAnswers: 0, currentStreak: 0, bestStreak: 0, dungeonsCleared: 0, perfectDungeons: 0, achievements: [], subjectProgress: {} });
            await dal.leaderboard.create({ userId: 'u1', username: 'u', hunterName: 'H', level: 1, totalXP: 0, rank: 'E' });

            await dal.saveProgressAndLeaderboard('u1', { level: 10, totalXP: 5000 });

            const lb = await dal.leaderboard.findByUserId('u1');
            expect(lb!.level).toBe(10);
            expect(lb!.totalXP).toBe(5000);

            const user = await dal.users.findById('u1');
            expect(user!.lastActive).toBeTruthy();
        });

        it('activateSubscription records payment', async () => {
            await dal.users.create({ id: 'u1', username: 'u', email: 'u@x.com', password: null, hunterName: 'H', createdAt: new Date().toISOString() });

            const user = await dal.activateSubscription('u1', {
                planId: 'monthly', paymentId: 'pay_123', orderId: 'order_123',
                amount: 29900, subscriptionEnd: '2025-01-01T00:00:00Z',
            });

            expect(user!.isPremium).toBe(true);
            expect(user!.subscriptionPlan).toBe('monthly');
            expect(await dal.payments.count()).toBe(1);
        });
    });
});
