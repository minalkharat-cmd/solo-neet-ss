import { describe, it, expect } from 'vitest';
import {
    calculateNextReview,
    calculateQuality,
    getDueQuestions,
    getSRSStats,
    initSRSRecord,
    updateSRSRecord,
} from '../srs.js';
import type { SRSRecord } from '../types.js';

describe('SRS — SM-2 Algorithm', () => {
    describe('calculateNextReview', () => {
        it('resets on quality < 3 (failed review)', () => {
            const result = calculateNextReview(2, 5, 2.5, 10);
            expect(result.repetition).toBe(0);
            expect(result.interval).toBe(1);
            expect(result.easeFactor).toBe(2.5); // preserved on failure
        });

        it('returns interval=1 on first successful review', () => {
            const result = calculateNextReview(4, 0, 2.5, 0);
            expect(result.repetition).toBe(1);
            expect(result.interval).toBe(1);
        });

        it('returns interval=6 on second successful review', () => {
            const result = calculateNextReview(4, 1, 2.5, 1);
            expect(result.repetition).toBe(2);
            expect(result.interval).toBe(6);
        });

        it('calculates interval using easeFactor after 2nd repetition', () => {
            const result = calculateNextReview(5, 2, 2.5, 6);
            expect(result.repetition).toBe(3);
            // interval = round(6 * newEF)
            // newEF = 2.5 + (0.1 - 0 * (0.08 + 0 * 0.02)) = 2.6
            expect(result.interval).toBe(Math.round(6 * 2.6));
            expect(result.easeFactor).toBe(2.6);
        });

        it('clamps ease factor minimum to 1.3', () => {
            const result = calculateNextReview(3, 5, 1.3, 20);
            expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
        });

        it('clamps quality to 0-5 range', () => {
            const low = calculateNextReview(-1, 0, 2.5, 0);
            expect(low.quality).toBe(0);

            const high = calculateNextReview(10, 0, 2.5, 0);
            expect(high.quality).toBe(5);
        });

        it('returns a valid ISO date string for nextReview', () => {
            const result = calculateNextReview(4, 0, 2.5, 0);
            expect(result.nextReview).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('calculateQuality', () => {
        it('returns 0 for slow incorrect answer', () => {
            expect(calculateQuality(false, 20000, 15000)).toBe(0);
        });

        it('returns 1 for fast incorrect answer', () => {
            expect(calculateQuality(false, 5000, 15000)).toBe(1);
        });

        it('returns 5 for very fast correct answer', () => {
            expect(calculateQuality(true, 5000, 15000)).toBe(5);
        });

        it('returns 4 for fast correct answer', () => {
            expect(calculateQuality(true, 10000, 15000)).toBe(4);
        });

        it('returns 3 for normal-speed correct answer', () => {
            expect(calculateQuality(true, 15000, 15000)).toBe(3);
        });

        it('uses default avgTimeMs of 15000', () => {
            expect(calculateQuality(true, 3000)).toBe(5);
        });
    });

    describe('initSRSRecord', () => {
        it('creates a valid initial SRS record', () => {
            const record = initSRSRecord('q1', 'user1');
            expect(record.questionId).toBe('q1');
            expect(record.userId).toBe('user1');
            expect(record.repetition).toBe(0);
            expect(record.easeFactor).toBe(2.5);
            expect(record.interval).toBe(0);
            expect(record.lastAttempt).toBeNull();
            expect(record.attempts).toEqual([]);
            expect(record.nextReview).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('updateSRSRecord', () => {
        it('updates record on correct answer', () => {
            const record = initSRSRecord('q1', 'user1');
            const updated = updateSRSRecord(record, true, 5000);
            expect(updated.repetition).toBe(1);
            expect(updated.lastAttempt).toBeTruthy();
            expect(updated.attempts).toHaveLength(1);
            expect(updated.attempts[0].correct).toBe(true);
        });

        it('resets repetition on incorrect answer', () => {
            const record = { ...initSRSRecord('q1', 'user1'), repetition: 3, interval: 10, easeFactor: 2.5 };
            const updated = updateSRSRecord(record, false, 20000);
            expect(updated.repetition).toBe(0);
            expect(updated.interval).toBe(1);
        });

        it('keeps at most 10 attempts', () => {
            let record = initSRSRecord('q1', 'user1');
            for (let i = 0; i < 12; i++) {
                record = updateSRSRecord(record, true, 5000);
            }
            expect(record.attempts.length).toBeLessThanOrEqual(10);
        });
    });

    describe('getDueQuestions', () => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        const makeRecord = (overrides: Partial<SRSRecord>): SRSRecord => ({
            questionId: 'q1', userId: 'u1', repetition: 1, easeFactor: 2.5,
            interval: 1, nextReview: today, lastAttempt: null, attempts: [],
            createdAt: new Date().toISOString(), ...overrides,
        });

        it('returns records due today', () => {
            const records = [makeRecord({ nextReview: today })];
            const due = getDueQuestions(records, 'u1');
            expect(due).toHaveLength(1);
        });

        it('returns overdue records', () => {
            const records = [makeRecord({ nextReview: yesterday })];
            const due = getDueQuestions(records, 'u1');
            expect(due).toHaveLength(1);
        });

        it('excludes future records', () => {
            const records = [makeRecord({ nextReview: tomorrow })];
            const due = getDueQuestions(records, 'u1');
            expect(due).toHaveLength(0);
        });

        it('filters by userId', () => {
            const records = [
                makeRecord({ userId: 'u1' }),
                makeRecord({ userId: 'u2', questionId: 'q2' }),
            ];
            const due = getDueQuestions(records, 'u1');
            expect(due).toHaveLength(1);
            expect(due[0].userId).toBe('u1');
        });

        it('includes never-reviewed records', () => {
            const records = [makeRecord({ nextReview: undefined as unknown as string, repetition: 0 })];
            const due = getDueQuestions(records, 'u1');
            expect(due).toHaveLength(1);
        });
    });

    describe('getSRSStats', () => {
        const today = new Date().toISOString().split('T')[0];

        const makeRecord = (overrides: Partial<SRSRecord>): SRSRecord => ({
            questionId: 'q1', userId: 'u1', repetition: 0, easeFactor: 2.5,
            interval: 0, nextReview: today, lastAttempt: null, attempts: [],
            createdAt: new Date().toISOString(), ...overrides,
        });

        it('categorizes records correctly', () => {
            const records = [
                makeRecord({ questionId: 'q1', repetition: 0 }),           // new
                makeRecord({ questionId: 'q2', repetition: 2, interval: 5 }), // learning
                makeRecord({ questionId: 'q3', repetition: 5, interval: 30 }), // mastered
                makeRecord({ questionId: 'q4', repetition: 3, interval: 10 }), // review
            ];

            const stats = getSRSStats(records, 'u1');
            expect(stats.total).toBe(4);
            expect(stats.new).toBe(1);
            expect(stats.learning).toBe(1);
            expect(stats.mastered).toBe(1);
            expect(stats.review).toBe(1);
        });

        it('counts due today correctly', () => {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            const records = [
                makeRecord({ questionId: 'q1', nextReview: today }),
                makeRecord({ questionId: 'q2', nextReview: yesterday }),
            ];

            const stats = getSRSStats(records, 'u1');
            expect(stats.dueToday).toBe(2);
            expect(stats.overdue).toBe(1);
        });
    });
});
