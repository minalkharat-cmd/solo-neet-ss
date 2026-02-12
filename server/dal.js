// Data Access Layer (DAL) — abstracts all database operations
// Swap the underlying adapter (Lowdb → SQLite/Postgres) without touching routes.

import crypto from 'crypto';

/**
 * @param {import('lowdb').Low} db — Lowdb instance
 */
export function createDAL(db) {

    // ======================== USERS ========================

    const users = {
        async findById(id) {
            await db.read();
            return db.data.users.find(u => u.id === id) || null;
        },

        async findByEmail(email) {
            await db.read();
            return db.data.users.find(u => u.email === email) || null;
        },

        async findByGoogleId(googleId) {
            await db.read();
            return db.data.users.find(u => u.googleId === googleId) || null;
        },

        async findByEmailOrUsername(email, username) {
            await db.read();
            return db.data.users.find(u => u.email === email || u.username === username) || null;
        },

        async create(userData) {
            await db.read();
            db.data.users.push(userData);
            await db.write();
            return userData;
        },

        async update(id, updates) {
            await db.read();
            const user = db.data.users.find(u => u.id === id);
            if (!user) return null;
            Object.assign(user, updates);
            await db.write();
            return user;
        },

        async getAll() {
            await db.read();
            return db.data.users || [];
        },

        /** Users with registered FCM tokens */
        async findWithFCMTokens() {
            await db.read();
            return db.data.users.filter(u => u.fcmTokens?.length > 0);
        },

        /** Users eligible for daily reminders at a given hour */
        async findDailyReminderEligible(hour) {
            await db.read();
            return db.data.users.filter(u =>
                u.fcmTokens?.length > 0 &&
                (u.notificationPrefs?.dailyReminder !== false) &&
                (u.notificationPrefs?.reminderHour ?? 9) === hour
            );
        },

        /** Users at risk of losing streak (inactive 20-24h) */
        async findStreakAtRisk() {
            await db.read();
            const now = Date.now();
            const TWENTY_HOURS = 20 * 60 * 60 * 1000;
            const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
            return db.data.users.filter(u => {
                if (!u.fcmTokens?.length) return false;
                if (u.notificationPrefs?.streakReminder === false) return false;
                if (!u.lastActive) return false;
                const timeSince = now - new Date(u.lastActive).getTime();
                return timeSince >= TWENTY_HOURS && timeSince < TWENTY_FOUR_HOURS;
            });
        },

        /** New users in last N days */
        async countNewSince(days) {
            await db.read();
            const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
            return db.data.users.filter(u => new Date(u.createdAt).getTime() > cutoff).length;
        },
    };

    // ======================== PROGRESS ========================

    const progress = {
        async findByUserId(userId) {
            await db.read();
            return db.data.progress.find(p => p.userId === userId) || null;
        },

        async create(record) {
            await db.read();
            db.data.progress.push(record);
            await db.write();
            return record;
        },

        async update(userId, updates) {
            await db.read();
            const idx = db.data.progress.findIndex(p => p.userId === userId);
            if (idx === -1) return null;
            const current = db.data.progress[idx];
            db.data.progress[idx] = { ...current, ...updates, lastUpdated: new Date().toISOString() };
            await db.write();
            return db.data.progress[idx];
        },

        async getAll() {
            await db.read();
            return db.data.progress || [];
        },
    };

    // ======================== LEADERBOARD ========================

    const leaderboard = {
        async getTopPlayers(limit = 50) {
            await db.read();
            return [...db.data.leaderboard]
                .sort((a, b) => b.totalXP - a.totalXP)
                .slice(0, limit);
        },

        async findByUserId(userId) {
            await db.read();
            return db.data.leaderboard.find(l => l.userId === userId) || null;
        },

        async getRank(userId) {
            await db.read();
            const sorted = [...db.data.leaderboard].sort((a, b) => b.totalXP - a.totalXP);
            const rank = sorted.findIndex(l => l.userId === userId) + 1;
            const entry = sorted.find(l => l.userId === userId) || null;
            return { rank: rank || null, entry, totalPlayers: sorted.length };
        },

        async create(entry) {
            await db.read();
            db.data.leaderboard.push(entry);
            await db.write();
            return entry;
        },

        async update(userId, updates) {
            await db.read();
            const entry = db.data.leaderboard.find(l => l.userId === userId);
            if (!entry) return null;
            Object.assign(entry, updates);
            await db.write();
            return entry;
        },

        async getAll() {
            await db.read();
            return db.data.leaderboard || [];
        },
    };

    // ======================== GENERATED QUESTIONS ========================

    const generatedQuestions = {
        async add(question) {
            await db.read();
            db.data.generatedQuestions = db.data.generatedQuestions || [];
            db.data.generatedQuestions.push(question);
            await db.write();
            return question;
        },

        async addBatch(questions) {
            await db.read();
            db.data.generatedQuestions = db.data.generatedQuestions || [];
            db.data.generatedQuestions.push(...questions);
            await db.write();
        },

        async findById(id) {
            await db.read();
            return (db.data.generatedQuestions || []).find(q => q.id === id) || null;
        },

        async list({ reviewed } = {}) {
            await db.read();
            const all = db.data.generatedQuestions || [];
            if (reviewed === undefined) return all;
            return all.filter(q => q.reviewed === reviewed);
        },

        async review(id, { approved, reviewedBy, specialty }) {
            await db.read();
            const idx = (db.data.generatedQuestions || []).findIndex(q => q.id === id);
            if (idx === -1) return null;
            const q = db.data.generatedQuestions[idx];
            q.reviewed = true;
            q.approved = approved;
            q.reviewedAt = new Date().toISOString();
            q.reviewedBy = reviewedBy;
            if (specialty) q.specialty = specialty;
            await db.write();
            return q;
        },

        async count() {
            await db.read();
            return (db.data.generatedQuestions || []).length;
        },

        /** Get all PMIDs already processed (for dedup in background generator) */
        async getProcessedPmids() {
            await db.read();
            const pmids = new Set();
            for (const q of db.data.generatedQuestions || []) {
                if (q.source?.pmid) pmids.add(q.source.pmid);
            }
            return pmids;
        },
    };

    // ======================== SRS RECORDS ========================

    const srsRecords = {
        async findByUserAndQuestion(userId, questionId) {
            await db.read();
            db.data.srsRecords = db.data.srsRecords || [];
            return db.data.srsRecords.find(
                r => r.questionId === questionId && r.userId === userId
            ) || null;
        },

        async findByUser(userId) {
            await db.read();
            return (db.data.srsRecords || []).filter(r => r.userId === userId);
        },

        async getAll(userId) {
            await db.read();
            db.data.srsRecords = db.data.srsRecords || [];
            return db.data.srsRecords;
        },

        async create(record) {
            await db.read();
            db.data.srsRecords = db.data.srsRecords || [];
            db.data.srsRecords.push(record);
            await db.write();
            return record;
        },

        async upsert(userId, questionId, recordOrUpdate) {
            await db.read();
            db.data.srsRecords = db.data.srsRecords || [];
            const idx = db.data.srsRecords.findIndex(
                r => r.questionId === questionId && r.userId === userId
            );
            if (idx === -1) {
                db.data.srsRecords.push(recordOrUpdate);
            } else {
                db.data.srsRecords[idx] = recordOrUpdate;
            }
            await db.write();
            return recordOrUpdate;
        },

        async exists(userId, questionId) {
            await db.read();
            return (db.data.srsRecords || []).some(
                r => r.questionId === questionId && r.userId === userId
            );
        },

        async createBatch(records) {
            await db.read();
            db.data.srsRecords = db.data.srsRecords || [];
            db.data.srsRecords.push(...records);
            await db.write();
        },
    };

    // ======================== PAYMENTS ========================

    const payments = {
        async create(payment) {
            await db.read();
            if (!db.data.payments) db.data.payments = [];
            db.data.payments.push(payment);
            await db.write();
            return payment;
        },

        async count() {
            await db.read();
            return (db.data.payments || []).length;
        },
    };

    // ======================== GROUPS ========================

    const groups = {
        async getAll() {
            await db.read();
            return db.data.groups || [];
        },

        async findById(id) {
            await db.read();
            return (db.data.groups || []).find(g => g.id === id) || null;
        },

        async create(group) {
            await db.read();
            if (!db.data.groups) db.data.groups = [];
            db.data.groups.push(group);
            await db.write();
            return group;
        },

        async addMember(groupId, userId) {
            await db.read();
            const group = (db.data.groups || []).find(g => g.id === groupId);
            if (!group) return null;
            group.memberIds.push(userId);
            await db.write();
            return group;
        },

        async removeMember(groupId, userId) {
            await db.read();
            const group = (db.data.groups || []).find(g => g.id === groupId);
            if (!group) return null;
            group.memberIds = group.memberIds.filter(id => id !== userId);
            await db.write();
            return group;
        },
    };

    // ======================== CHALLENGES ========================

    const challenges = {
        async create(challenge) {
            await db.read();
            if (!db.data.challenges) db.data.challenges = [];
            db.data.challenges.push(challenge);
            await db.write();
            return challenge;
        },

        async findByCode(code) {
            await db.read();
            return (db.data.challenges || []).find(
                c => c.code === code.toUpperCase() && c.status === 'waiting'
            ) || null;
        },

        async activate(code, opponentId) {
            await db.read();
            const challenge = (db.data.challenges || []).find(
                c => c.code === code.toUpperCase() && c.status === 'waiting'
            );
            if (!challenge) return null;
            challenge.opponentId = opponentId;
            challenge.status = 'active';
            await db.write();
            return challenge;
        },
    };

    // ======================== COMPOSITE OPERATIONS ========================

    /**
     * Create a full user with progress + leaderboard entries (registration).
     * Runs as a single write transaction.
     */
    const createUserWithProgress = async (userData, progressData, leaderboardData) => {
        await db.read();
        db.data.users.push(userData);
        db.data.progress.push(progressData);
        db.data.leaderboard.push(leaderboardData);
        await db.write();
        return userData;
    };

    /**
     * Save progress + update leaderboard + touch lastActive — single write.
     */
    const saveProgressAndLeaderboard = async (userId, progressUpdates) => {
        await db.read();
        const pIdx = db.data.progress.findIndex(p => p.userId === userId);
        if (pIdx === -1) return null;

        const current = db.data.progress[pIdx];
        db.data.progress[pIdx] = { ...current, ...progressUpdates, lastUpdated: new Date().toISOString() };

        // Sync leaderboard
        const lbEntry = db.data.leaderboard.find(l => l.userId === userId);
        if (lbEntry) {
            lbEntry.level = db.data.progress[pIdx].level;
            lbEntry.totalXP = db.data.progress[pIdx].totalXP;
        }

        // Touch user lastActive
        const user = db.data.users.find(u => u.id === userId);
        if (user) user.lastActive = new Date().toISOString();

        await db.write();
        return db.data.progress[pIdx];
    };

    /**
     * Verify payment + activate subscription + record payment — single write.
     */
    const activateSubscription = async (userId, { planId, paymentId, orderId, amount, subscriptionEnd }) => {
        await db.read();
        const user = db.data.users.find(u => u.id === userId);
        if (!user) return null;

        user.isPremium = true;
        user.subscriptionPlan = planId;
        user.subscriptionEnd = subscriptionEnd;
        user.subscriptionId = paymentId;

        if (!db.data.payments) db.data.payments = [];
        db.data.payments.push({
            id: crypto.randomUUID(),
            userId, orderId, paymentId, planId, amount,
            status: 'completed',
            createdAt: new Date().toISOString()
        });

        await db.write();
        return user;
    };

    return {
        users,
        progress,
        leaderboard,
        generatedQuestions,
        srsRecords,
        payments,
        groups,
        challenges,
        // composite
        createUserWithProgress,
        saveProgressAndLeaderboard,
        activateSubscription,
        // escape hatch for analytics / push sender that need raw reads
        raw: db,
    };
}
