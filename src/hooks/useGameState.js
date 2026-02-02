// Solo NEET SS - Game State Hook
import { useState, useEffect, useCallback } from 'react';
import { getXPForLevel, getRankFromLevel, achievements } from '../data';

const STORAGE_KEY = 'solo_neet_ss_state';

const initialState = {
    level: 1,
    xp: 0,
    totalXP: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    streak: 0,
    maxStreak: 0,
    subjectProgress: {},
    unlockedAchievements: [],
    dailyQuests: {
        questionsTarget: 20,
        questionsCompleted: 0,
        dungeonsTarget: 3,
        dungeonsCompleted: 0,
        lastReset: new Date().toDateString(),
    },
    loginStreak: 0,
    lastLogin: null,
    xpMultiplier: 1,
    studyTime: 0,
    mysteryBoxes: 3,
    wheelSpins: 1,
};

export const useGameState = () => {
    const [gameState, setGameState] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Reset daily quests if new day
                if (parsed.dailyQuests?.lastReset !== new Date().toDateString()) {
                    parsed.dailyQuests = {
                        ...initialState.dailyQuests,
                        lastReset: new Date().toDateString(),
                    };
                    parsed.wheelSpins = 1;
                }
                return { ...initialState, ...parsed };
            }
        } catch (e) {
            console.error('Failed to load game state:', e);
        }
        return initialState;
    });

    const [pendingAchievements, setPendingAchievements] = useState([]);
    const [levelUpData, setLevelUpData] = useState(null);

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    }, [gameState]);

    // Check achievements
    const checkAchievements = useCallback((state) => {
        const newAchievements = [];

        achievements.forEach((achievement) => {
            if (state.unlockedAchievements.includes(achievement.id)) return;

            let unlocked = false;
            switch (achievement.id) {
                case 'first_blood':
                    unlocked = state.correctAnswers >= 1;
                    break;
                case 'streak_5':
                    unlocked = state.maxStreak >= 5;
                    break;
                case 'streak_10':
                    unlocked = state.maxStreak >= 10;
                    break;
                case 'reach_d':
                    unlocked = state.level >= 11;
                    break;
                case 'reach_c':
                    unlocked = state.level >= 21;
                    break;
                case 'reach_b':
                    unlocked = state.level >= 41;
                    break;
                case 'reach_a':
                    unlocked = state.level >= 61;
                    break;
                case 'reach_s':
                    unlocked = state.level >= 81;
                    break;
                case 'xp_1000':
                    unlocked = state.totalXP >= 1000;
                    break;
                case 'xp_10000':
                    unlocked = state.totalXP >= 10000;
                    break;
                case 'critical_hit':
                    unlocked = state.unlockedAchievements.includes('critical_hit_pending');
                    break;
                default:
                    break;
            }

            if (unlocked) {
                newAchievements.push(achievement);
            }
        });

        return newAchievements;
    }, []);

    // Add XP and handle leveling
    const addXP = useCallback((amount, subjectId = null) => {
        setGameState((prev) => {
            const multipliedXP = Math.floor(amount * prev.xpMultiplier);
            let newXP = prev.xp + multipliedXP;
            let newLevel = prev.level;
            let newTotalXP = prev.totalXP + multipliedXP;

            // Check for level up
            let xpForNext = getXPForLevel(newLevel);
            while (newXP >= xpForNext) {
                newXP -= xpForNext;
                newLevel++;
                xpForNext = getXPForLevel(newLevel);

                // Trigger level up notification
                const rankInfo = getRankFromLevel(newLevel);
                setLevelUpData({
                    level: newLevel,
                    rank: rankInfo.rank,
                    rankName: rankInfo.name,
                });
            }

            // Update subject progress
            const subjectProgress = { ...prev.subjectProgress };
            if (subjectId) {
                if (!subjectProgress[subjectId]) {
                    subjectProgress[subjectId] = { answered: 0, correct: 0 };
                }
                subjectProgress[subjectId].answered++;
            }

            const newState = {
                ...prev,
                xp: newXP,
                level: newLevel,
                totalXP: newTotalXP,
                subjectProgress,
            };

            // Check for new achievements
            const newAchievements = checkAchievements(newState);
            if (newAchievements.length > 0) {
                newState.unlockedAchievements = [
                    ...prev.unlockedAchievements,
                    ...newAchievements.map((a) => a.id),
                ];
                setPendingAchievements((p) => [...p, ...newAchievements]);
            }

            return newState;
        });
    }, [checkAchievements]);

    // Record answer
    const recordAnswer = useCallback((isCorrect, subjectId) => {
        setGameState((prev) => {
            const subjectProgress = { ...prev.subjectProgress };
            if (!subjectProgress[subjectId]) {
                subjectProgress[subjectId] = { answered: 0, correct: 0 };
            }
            subjectProgress[subjectId].answered++;
            if (isCorrect) {
                subjectProgress[subjectId].correct++;
            }

            const newStreak = isCorrect ? prev.streak + 1 : 0;
            const maxStreak = Math.max(prev.maxStreak, newStreak);

            const dailyQuests = {
                ...prev.dailyQuests,
                questionsCompleted: prev.dailyQuests.questionsCompleted + 1,
            };

            return {
                ...prev,
                questionsAnswered: prev.questionsAnswered + 1,
                correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
                streak: newStreak,
                maxStreak,
                subjectProgress,
                dailyQuests,
            };
        });
    }, []);

    // Complete dungeon
    const completeDungeon = useCallback(() => {
        setGameState((prev) => ({
            ...prev,
            dailyQuests: {
                ...prev.dailyQuests,
                dungeonsCompleted: prev.dailyQuests.dungeonsCompleted + 1,
            },
        }));
    }, []);

    // Use wheel spin
    const useWheelSpin = useCallback(() => {
        setGameState((prev) => ({
            ...prev,
            wheelSpins: Math.max(0, prev.wheelSpins - 1),
        }));
    }, []);

    // Use mystery box
    const useMysteryBox = useCallback(() => {
        setGameState((prev) => ({
            ...prev,
            mysteryBoxes: Math.max(0, prev.mysteryBoxes - 1),
        }));
    }, []);

    // Add mystery boxes
    const addMysteryBoxes = useCallback((count) => {
        setGameState((prev) => ({
            ...prev,
            mysteryBoxes: prev.mysteryBoxes + count,
        }));
    }, []);

    // Set XP multiplier
    const setXPMultiplier = useCallback((multiplier, duration = 0) => {
        setGameState((prev) => ({
            ...prev,
            xpMultiplier: multiplier,
        }));

        if (duration > 0) {
            setTimeout(() => {
                setGameState((prev) => ({
                    ...prev,
                    xpMultiplier: 1,
                }));
            }, duration);
        }
    }, []);

    // Dismiss level up
    const dismissLevelUp = useCallback(() => {
        setLevelUpData(null);
    }, []);

    // Dismiss achievement
    const dismissAchievement = useCallback(() => {
        setPendingAchievements((prev) => prev.slice(1));
    }, []);

    // Get accuracy
    const getAccuracy = useCallback(() => {
        if (gameState.questionsAnswered === 0) return 0;
        return Math.round((gameState.correctAnswers / gameState.questionsAnswered) * 100);
    }, [gameState.questionsAnswered, gameState.correctAnswers]);

    // Get subject accuracy
    const getSubjectAccuracy = useCallback((subjectId) => {
        const progress = gameState.subjectProgress[subjectId];
        if (!progress || progress.answered === 0) return 0;
        return Math.round((progress.correct / progress.answered) * 100);
    }, [gameState.subjectProgress]);

    return {
        gameState,
        addXP,
        recordAnswer,
        completeDungeon,
        useWheelSpin,
        useMysteryBox,
        addMysteryBoxes,
        setXPMultiplier,
        getAccuracy,
        getSubjectAccuracy,
        levelUpData,
        dismissLevelUp,
        pendingAchievements,
        dismissAchievement,
    };
};
