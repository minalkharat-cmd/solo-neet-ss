// Spaced Repetition System (SM-2 Algorithm)
// Optimal review scheduling for long-term retention

/**
 * SM-2 Algorithm Implementation
 * 
 * Quality ratings:
 * 0 - Complete blackout
 * 1 - Incorrect, but upon seeing correct answer, remembered
 * 2 - Incorrect, but correct answer seemed easy to recall
 * 3 - Correct with serious difficulty
 * 4 - Correct after hesitation
 * 5 - Perfect response
 */

/**
 * Calculate next review date and updated learning parameters
 * @param {number} quality - Response quality (0-5)
 * @param {number} repetition - Current repetition number
 * @param {number} easeFactor - Current ease factor (starts at 2.5)
 * @param {number} interval - Current interval in days
 * @returns {Object} - Updated SRS parameters
 */
export function calculateNextReview(quality, repetition = 0, easeFactor = 2.5, interval = 0) {
    // Ensure quality is within bounds
    quality = Math.max(0, Math.min(5, quality));

    let newRepetition, newInterval, newEaseFactor;

    if (quality < 3) {
        // Failed review - reset
        newRepetition = 0;
        newInterval = 1;
        newEaseFactor = easeFactor; // Keep ease factor on failure
    } else {
        // Successful review
        newRepetition = repetition + 1;

        // Calculate new ease factor
        newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        newEaseFactor = Math.max(1.3, newEaseFactor); // Minimum ease factor

        // Calculate new interval
        if (newRepetition === 1) {
            newInterval = 1;
        } else if (newRepetition === 2) {
            newInterval = 6;
        } else {
            newInterval = Math.round(interval * newEaseFactor);
        }
    }

    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + newInterval);

    return {
        repetition: newRepetition,
        interval: newInterval,
        easeFactor: Math.round(newEaseFactor * 100) / 100,
        nextReview: nextReview.toISOString().split('T')[0],
        quality
    };
}

/**
 * Map correct/incorrect to SM-2 quality rating
 * @param {boolean} correct - Whether answer was correct
 * @param {number} timeMs - Time taken to answer in milliseconds
 * @param {number} avgTimeMs - Average time for this question
 * @returns {number} - Quality rating (0-5)
 */
export function calculateQuality(correct, timeMs, avgTimeMs = 15000) {
    if (!correct) {
        // Incorrect answers
        return timeMs < avgTimeMs ? 1 : 0;
    }

    // Correct answers - rate based on speed
    const speedRatio = timeMs / avgTimeMs;

    if (speedRatio < 0.5) return 5;  // Very fast
    if (speedRatio < 0.8) return 4;  // Fast
    if (speedRatio < 1.2) return 3;  // Normal
    return 3; // Slow but correct
}

/**
 * Get questions due for review today
 * @param {Array} questions - All tracked questions
 * @param {string} userId - User ID
 * @returns {Array} - Questions due today
 */
export function getDueQuestions(questions, userId) {
    const today = new Date().toISOString().split('T')[0];

    return questions.filter(q => {
        if (q.userId !== userId) return false;
        if (!q.nextReview) return true; // Never reviewed
        return q.nextReview <= today;
    }).sort((a, b) => {
        // Prioritize: new questions, then overdue, then by ease (harder first)
        if (!a.repetition && b.repetition) return -1;
        if (a.repetition && !b.repetition) return 1;

        const aOverdue = a.nextReview < today;
        const bOverdue = b.nextReview < today;
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;

        return (a.easeFactor || 2.5) - (b.easeFactor || 2.5);
    });
}

/**
 * Get SRS statistics for a user
 * @param {Array} questions - All tracked questions
 * @param {string} userId - User ID
 * @returns {Object} - SRS statistics
 */
export function getSRSStats(questions, userId) {
    const userQuestions = questions.filter(q => q.userId === userId);
    const today = new Date().toISOString().split('T')[0];

    const stats = {
        total: userQuestions.length,
        new: 0,
        learning: 0,
        review: 0,
        mastered: 0,
        dueToday: 0,
        overdue: 0,
        streak: 0
    };

    userQuestions.forEach(q => {
        // Categorize by mastery level
        if (!q.repetition || q.repetition === 0) {
            stats.new++;
        } else if (q.repetition < 3) {
            stats.learning++;
        } else if (q.interval >= 21) {
            stats.mastered++;
        } else {
            stats.review++;
        }

        // Due status
        if (!q.nextReview || q.nextReview <= today) {
            stats.dueToday++;
            if (q.nextReview && q.nextReview < today) {
                stats.overdue++;
            }
        }
    });

    return stats;
}

/**
 * Initialize SRS tracking for a question
 * @param {string} questionId - Question ID
 * @param {string} userId - User ID
 * @returns {Object} - Initial SRS record
 */
export function initSRSRecord(questionId, userId) {
    return {
        questionId,
        userId,
        repetition: 0,
        easeFactor: 2.5,
        interval: 0,
        nextReview: new Date().toISOString().split('T')[0],
        lastAttempt: null,
        attempts: [],
        createdAt: new Date().toISOString()
    };
}

/**
 * Update SRS record after an attempt
 * @param {Object} record - Existing SRS record
 * @param {boolean} correct - Whether answer was correct
 * @param {number} timeMs - Time taken
 * @returns {Object} - Updated SRS record
 */
export function updateSRSRecord(record, correct, timeMs) {
    const quality = calculateQuality(correct, timeMs);
    const result = calculateNextReview(
        quality,
        record.repetition,
        record.easeFactor,
        record.interval
    );

    return {
        ...record,
        ...result,
        lastAttempt: new Date().toISOString(),
        attempts: [
            ...record.attempts.slice(-9), // Keep last 10 attempts
            { correct, timeMs, quality, date: new Date().toISOString() }
        ]
    };
}

export default {
    calculateNextReview,
    calculateQuality,
    getDueQuestions,
    getSRSStats,
    initSRSRecord,
    updateSRSRecord
};
