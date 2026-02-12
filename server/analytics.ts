// Solo NEET SS - Analytics Module
// Computes user engagement and performance metrics

import type { DAL } from './types.js';

interface SubjectMasteryEntry {
    answered: number;
    correct: number;
    accuracy: number;
    mastery: string;
}

interface PersonalAnalytics {
    overview: {
        level: number;
        totalXP: number;
        questionsAnswered: number;
        correctAnswers: number;
        accuracy: number;
        currentStreak: number;
        bestStreak: number;
        dungeonsCleared: number;
        perfectDungeons: number;
        daysActive: number;
        avgDailyXP: number;
        achievementsUnlocked: number;
    };
    subjectMastery: Record<string, SubjectMasteryEntry>;
    srsStats: {
        totalCards: number;
        mastered: number;
        learning: number;
        new: number;
        avgEaseFactor: number;
    };
    weeklyXP: { week: number; xp: number }[];
}

interface EngagementMetrics {
    totalUsers: number;
    activeUsers: number;
    newUsersThisWeek: number;
    specialtyEngagement: Record<string, { totalAnswered: number; totalCorrect: number; users: number }>;
    topPlayers: { rank: number; hunterName: string; level: number; totalXP: number; hunterRank: string }[];
    generatedQuestions: number;
    totalPayments: number;
}

/**
 * Get personal analytics for a specific user
 * @param {object} dal — Data Access Layer
 */
export const getPersonalAnalytics = async (dal: DAL, userId: string): Promise<PersonalAnalytics | null> => {
    const progress = await dal.progress.findByUserId(userId);
    const user = await dal.users.findById(userId);
    const srsRecords = await dal.srsRecords.findByUser(userId);

    if (!progress) return null;

    // Subject mastery breakdown
    const subjectMastery: Record<string, SubjectMasteryEntry> = {};
    const subjectProgress = progress.subjectProgress || {};
    for (const [subject, data] of Object.entries(subjectProgress)) {
        const accuracy: number = data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : 0;
        subjectMastery[subject] = {
            answered: data.answered,
            correct: data.correct,
            accuracy,
            mastery: accuracy >= 80 ? 'mastered' : accuracy >= 60 ? 'proficient' : accuracy >= 40 ? 'learning' : 'beginner'
        };
    }

    // XP progression (simulated daily data from total)
    const totalXP: number = progress.totalXP || 0;
    const level: number = progress.level || 1;
    const daysActive: number = Math.max(1, Math.ceil((Date.now() - new Date(user?.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)));
    const avgDailyXP: number = Math.round(totalXP / daysActive);

    // SRS performance
    const srsStats = {
        totalCards: srsRecords.length,
        mastered: srsRecords.filter(r => r.interval >= 21).length,
        learning: srsRecords.filter(r => r.interval >= 1 && r.interval < 21).length,
        new: srsRecords.filter(r => r.interval < 1).length,
        avgEaseFactor: srsRecords.length > 0
            ? Math.round((srsRecords.reduce((sum, r) => sum + (r.easeFactor || 2.5), 0) / srsRecords.length) * 100) / 100
            : 2.5
    };

    // Weekly XP estimate (distribute total across simulated weeks)
    const weeksActive: number = Math.max(1, Math.ceil(daysActive / 7));
    const weeklyXP: { week: number; xp: number }[] = [];
    for (let i: number = 0; i < Math.min(weeksActive, 8); i++) {
        const weekXP: number = Math.round(avgDailyXP * 7 * (0.7 + Math.random() * 0.6));
        weeklyXP.push({ week: i + 1, xp: Math.min(weekXP, totalXP) });
    }

    return {
        overview: {
            level,
            totalXP,
            questionsAnswered: progress.questionsAnswered || 0,
            correctAnswers: progress.correctAnswers || 0,
            accuracy: progress.questionsAnswered > 0
                ? Math.round((progress.correctAnswers / progress.questionsAnswered) * 100) : 0,
            currentStreak: progress.currentStreak || 0,
            bestStreak: progress.bestStreak || 0,
            dungeonsCleared: progress.dungeonsCleared || 0,
            perfectDungeons: progress.perfectDungeons || 0,
            daysActive,
            avgDailyXP,
            achievementsUnlocked: (progress.achievements || []).length
        },
        subjectMastery,
        srsStats,
        weeklyXP
    };
};

/**
 * Get platform-wide engagement metrics
 * @param {object} dal — Data Access Layer
 */
export const getEngagementMetrics = async (dal: DAL): Promise<EngagementMetrics> => {
    const users = await dal.users.getAll();
    const progressData = await dal.progress.getAll();

    const totalUsers: number = users.length;
    const now: number = Date.now();
    const dayMs: number = 1000 * 60 * 60 * 24;

    // Active users (anyone with progress > 0)
    const activeUsers: number = progressData.filter(p => (p.questionsAnswered || 0) > 0).length;

    // Users created in last 7 days
    const newUsersThisWeek: number = users.filter(u => {
        const created: number = new Date(u.createdAt).getTime();
        return (now - created) < 7 * dayMs;
    }).length;

    // Top specialties by engagement
    const specialtyEngagement: Record<string, { totalAnswered: number; totalCorrect: number; users: number }> = {};
    for (const p of progressData) {
        for (const [subject, data] of Object.entries(p.subjectProgress || {})) {
            if (!specialtyEngagement[subject]) {
                specialtyEngagement[subject] = { totalAnswered: 0, totalCorrect: 0, users: 0 };
            }
            if (data.answered > 0) {
                specialtyEngagement[subject].totalAnswered += data.answered;
                specialtyEngagement[subject].totalCorrect += data.correct;
                specialtyEngagement[subject].users += 1;
            }
        }
    }

    // Leaderboard snapshot
    const topPlayers = (await dal.leaderboard.getTopPlayers(5))
        .map((entry, i) => ({
            rank: i + 1,
            hunterName: entry.hunterName,
            level: entry.level,
            totalXP: entry.totalXP,
            hunterRank: entry.rank
        }));

    const generatedQuestions: number = await dal.generatedQuestions.count();
    const totalPayments: number = await dal.payments.count();

    return {
        totalUsers,
        activeUsers,
        newUsersThisWeek,
        specialtyEngagement,
        topPlayers,
        generatedQuestions,
        totalPayments
    };
};
