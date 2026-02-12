// Solo NEET SS - Server-Side Push Notification Engine
// Sends study reminders, streak alerts, and challenge notifications
//
// Config: Set FIREBASE_SERVICE_ACCOUNT_JSON env var to the JSON string
//         of the service account key downloaded from Firebase Console.

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger from './lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let fcmEnabled = false;

/**
 * Initialize Firebase Admin SDK
 * Supports:
 *   1. FIREBASE_SERVICE_ACCOUNT_JSON env var (JSON string — for Render/production)
 *   2. Local file: server/firebase-service-account.json (for local dev)
 */
export const initFirebaseAdmin = () => {
    try {
        let serviceAccount = null;

        // 1. Try env var first (production)
        const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        if (envJson) {
            logger.info('Firebase service account env var found', { length: envJson.length });
            try {
                let cleaned = envJson.trim();
                if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
                    cleaned = cleaned.slice(1, -1);
                }
                serviceAccount = JSON.parse(cleaned);
                if (serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }
                logger.info('Firebase key parsed', { projectId: serviceAccount.project_id });
            } catch (parseErr) {
                logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON', { error: parseErr.message, preview: envJson.substring(0, 100) });
                return;
            }
        } else {
            // 2. Try local file (development)
            try {
                const keyPath = join(__dirname, 'firebase-service-account.json');
                const raw = readFileSync(keyPath, 'utf-8');
                serviceAccount = JSON.parse(raw);
                logger.info('Firebase key loaded from local file');
            } catch {
                logger.warn('No Firebase service account key found, push notifications disabled', { hint: 'Set FIREBASE_SERVICE_ACCOUNT_JSON env var or create server/firebase-service-account.json' });
                return;
            }
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        fcmEnabled = true;
        logger.info('Firebase Admin initialized, push notifications enabled');
    } catch (err) {
        logger.error('Firebase Admin init failed', { error: err.message });
    }
};

/**
 * Send a push notification to a specific user
 * @param {object} dal — Data Access Layer
 */
export const sendPushToUser = async (dal, userId, notification) => {
    if (!fcmEnabled) return { sent: 0 };

    const user = await dal.users.findById(userId);
    if (!user?.fcmTokens?.length) return { sent: 0 };

    let sent = 0;
    const invalidTokens = [];

    for (const token of user.fcmTokens) {
        try {
            await admin.messaging().send({
                token,
                notification: {
                    title: notification.title || '🏥 Solo NEET SS',
                    body: notification.body || 'Time to study, Hunter!'
                },
                data: notification.data || {},
                webpush: {
                    fcmOptions: { link: notification.link || '/' },
                    notification: {
                        icon: '/vite.svg',
                        badge: '/vite.svg',
                        tag: notification.tag || 'solo-neet-ss'
                    }
                }
            });
            sent++;
        } catch (err) {
            if (err.code === 'messaging/registration-token-not-registered' ||
                err.code === 'messaging/invalid-registration-token') {
                invalidTokens.push(token);
            }
            logger.error('Push notification send failed', { userId, error: err.code || err.message });
        }
    }

    // Remove invalid tokens
    if (invalidTokens.length) {
        const validTokens = user.fcmTokens.filter(t => !invalidTokens.includes(t));
        await dal.users.update(userId, { fcmTokens: validTokens });
    }

    return { sent };
};

/**
 * Broadcast to all users with FCM tokens
 */
const broadcastToAll = async (dal, notification) => {
    if (!fcmEnabled) return;
    const usersWithTokens = await dal.users.findWithFCMTokens();
    let totalSent = 0;

    for (const user of usersWithTokens) {
        const { sent } = await sendPushToUser(dal, user.id, notification);
        totalSent += sent;
    }

    logger.info('Broadcast sent', { devicesSent: totalSent, totalUsers: usersWithTokens.length });
};

// ============ SCHEDULED NOTIFICATIONS ============

/**
 * Check and send daily study reminders
 */
const sendDailyReminders = async (dal) => {
    if (!fcmEnabled) return;
    const currentHour = new Date().getHours();

    const users = await dal.users.findDailyReminderEligible(currentHour);

    const motivation = [
        '🔥 Rise and grind, Hunter! Your daily quests await.',
        '⚡ A true Hunter never skips their training!',
        '💎 Every question you crush levels you up!',
        '🏆 Your rivals are studying. Are you?',
        '📚 15 minutes of practice = 1 level closer to S-Rank!',
        '🎯 Time to dominate some MCQs, Hunter!'
    ];

    for (const user of users) {
        await sendPushToUser(dal, user.id, {
            title: '📖 Daily Study Reminder',
            body: motivation[Math.floor(Math.random() * motivation.length)],
            tag: 'daily-reminder',
            data: { type: 'daily-reminder' }
        });
    }

    if (users.length) logger.info('Sent daily reminders', { userCount: users.length, hour: currentHour });
};

/**
 * Check for users at risk of losing their streak (no activity in 20+ hours)
 */
const sendStreakAlerts = async (dal) => {
    if (!fcmEnabled) return;

    const atRisk = await dal.users.findStreakAtRisk();

    for (const user of atRisk) {
        const streak = user.streak || 0;
        await sendPushToUser(dal, user.id, {
            title: '🔥 Streak at Risk!',
            body: streak > 0
                ? `Your ${streak}-day streak is about to break! Quick, solve 1 question to save it!`
                : `Don't let your progress slip! Come back and study now.`,
            tag: 'streak-alert',
            data: { type: 'streak-alert' }
        });
    }

    if (atRisk.length) logger.info('Sent streak alerts', { userCount: atRisk.length });
};

/**
 * Send challenge notifications when someone joins/creates
 */
export const sendChallengeNotification = async (dal, targetUserId, challengerName, subject) => {
    return sendPushToUser(dal, targetUserId, {
        title: '⚔️ Challenge Received!',
        body: `${challengerName} challenged you in ${subject}! Accept now?`,
        tag: 'challenge',
        data: { type: 'challenge', subject }
    });
};

// ============ SCHEDULER ============

let reminderInterval = null;
let streakInterval = null;

/**
 * Start the notification scheduler
 * @param {object} dal — Data Access Layer
 */
export const startNotificationScheduler = (dal) => {
    if (!fcmEnabled) {
        logger.info('Notification scheduler skipped', { reason: 'Firebase Admin not initialized' });
        return;
    }

    // Daily reminders — check every hour
    reminderInterval = setInterval(() => sendDailyReminders(dal), 60 * 60 * 1000);

    // Streak alerts — check every 2 hours
    streakInterval = setInterval(() => sendStreakAlerts(dal), 2 * 60 * 60 * 1000);

    logger.info('Notification scheduler started', { reminders: 'hourly', streaks: 'every 2h' });
};

/**
 * Stop the notification scheduler
 */
export const stopNotificationScheduler = () => {
    if (reminderInterval) clearInterval(reminderInterval);
    if (streakInterval) clearInterval(streakInterval);
};
