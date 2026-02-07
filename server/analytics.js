// Solo NEET SS - Analytics Module
// Computes user engagement and performance metrics

/**
 * Get personal analytics for a specific user
 */
export const getPersonalAnalytics = (db, userId) => {
    const progress = db.data.progress.find(p => p.userId === userId);
    const user = db.data.users.find(u => u.id === userId);
    const srsRecords = (db.data.srsRecords || []).filter(r => r.userId === userId);

    if (!progress) return null;

    // Subject mastery breakdown
    const subjectMastery = {};
    const subjectProgress = progress.subjectProgress || {};
    for (const [subject, data] of Object.entries(subjectProgress)) {
        const accuracy = data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : 0;
        subjectMastery[subject] = {
            answered: data.answered,
            correct: data.correct,
            accuracy,
            mastery: accuracy >= 80 ? 'mastered' : accuracy >= 60 ? 'proficient' : accuracy >= 40 ? 'learning' : 'beginner'
        };
    }

    // XP progression (simulated daily data from total)
    const totalXP = progress.totalXP || 0;
    const level = progress.level || 1;
    const daysActive = Math.max(1, Math.ceil((Date.now() - new Date(user?.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)));
    const avgDailyXP = Math.round(totalXP / daysActive);

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
    const weeksActive = Math.max(1, Math.ceil(daysActive / 7));
    const weeklyXP = [];
    for (let i = 0; i < Math.min(weeksActive, 8); i++) {
        // Simulate slight variation
        const weekXP = Math.round(avgDailyXP * 7 * (0.7 + Math.random() * 0.6));
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
 */
export const getEngagementMetrics = (db) => {
    const users = db.data.users || [];
    const progressData = db.data.progress || [];

    const totalUsers = users.length;
    const now = Date.now();
    const dayMs = 1000 * 60 * 60 * 24;

    // Active users (anyone with progress > 0)
    const activeUsers = progressData.filter(p => (p.questionsAnswered || 0) > 0).length;

    // Users created in last 7 days
    const newUsersThisWeek = users.filter(u => {
        const created = new Date(u.createdAt).getTime();
        return (now - created) < 7 * dayMs;
    }).length;

    // Top specialties by engagement
    const specialtyEngagement = {};
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
    const topPlayers = [...(db.data.leaderboard || [])]
        .sort((a, b) => b.totalXP - a.totalXP)
        .slice(0, 5)
        .map((entry, i) => ({
            rank: i + 1,
            hunterName: entry.hunterName,
            level: entry.level,
            totalXP: entry.totalXP,
            hunterRank: entry.rank
        }));

    return {
        totalUsers,
        activeUsers,
        newUsersThisWeek,
        specialtyEngagement,
        topPlayers,
        generatedQuestions: (db.data.generatedQuestions || []).length,
        totalPayments: (db.data.payments || []).length
    };
};
