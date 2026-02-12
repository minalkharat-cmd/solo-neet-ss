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
import type { DAL, PushNotification, User } from './types.js';

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = dirname(__filename);

let fcmEnabled: boolean = false;

/**
 * Initialize Firebase Admin SDK
 * Supports:
 *   1. FIREBASE_SERVICE_ACCOUNT_JSON env var (JSON string — for Render/production)
 *   2. Local file: server/firebase-service-account.json (for local dev)
 */
export const initFirebaseAdmin = (): void => {
    try {
        let serviceAccount: any = null;

        // 1. Try env var first (production)
        const envJson: string | undefined = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        if (envJson) {
            logger.info('Firebase service account env var found', { length: envJson.length });
            try {
                let cleaned: string = envJson.trim();
                if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
                    cleaned = cleaned.slice(1, -1);
                }
                serviceAccount = JSON.parse(cleaned);
                if (serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }
                logger.info('Firebase key parsed', { projectId: serviceAccount.project_id });
            } catch (parseErr: any) {
                logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON', { error: parseErr.message, preview: envJson.substring(0, 100) });
                return;
            }
        } else {
            // 2. Try local file (development)
            try {
                const keyPath: string = join(__dirname, 'firebase-service-account.json');
                const raw: string = readFileSync(keyPath, 'utf-8');
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
    } catch (err: any) {
        logger.error('Firebase Admin init failed', { error: err.message });
    }
};

/**
 * Send a push notification to a specific user
 * @param {object} dal — Data Access Layer
 */
export const sendPushToUser = async (dal: DAL, userId: string, notification: PushNotification): Promise<{ sent: number }> => {
    if (!fcmEnabled) return { sent: 0 };

    const user: User | null = await dal.users.findById(userId);
    if (!user?.fcmTokens?.length) return { sent: 0 };

    let sent: number = 0;
    const invalidTokens: string[] = [];

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
        } catch (err: any) {
            if (err.code === 'messaging/registration-token-not-registered' ||
                err.code === 'messaging/invalid-registration-token') {
                invalidTokens.push(token);
            }
            logger.error('Push notification send failed', { userId, error: err.code || err.message });
        }
    }

    // Remove invalid tokens
    if (invalidTokens.length) {
        const validTokens: string[] = user.fcmTokens.filter(t => !invalidTokens.includes(t));
        await dal.users.update(userId, { fcmTokens: validTokens });
    }

    return { sent };
};

/**
 * Broadcast to all users with FCM tokens
 */
const broadcastToAll = async (dal: DAL, notification: PushNotification): Promise<void> => {
    if (!fcmEnabled) return;
    const usersWithTokens: User[] = await dal.users.findWithFCMTokens();
    let totalSent: number = 0;

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
const sendDailyReminders = async (dal: DAL): Promise<void> => {
    if (!fcmEnabled) return;
    const currentHour: number = new Date().getHours();

    const users: User[] = await dal.users.findDailyReminderEligible(currentHour);

    const motivation: string[] = [
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
const sendStreakAlerts = async (dal: DAL): Promise<void> => {
    if (!fcmEnabled) return;

    const atRisk: User[] = await dal.users.findStreakAtRisk();

    for (const user of atRisk) {
        const streak: number = (user as any).streak || 0;
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
export const sendChallengeNotification = async (dal: DAL, targetUserId: string, challengerName: string, subject: string): Promise<{ sent: number }> => {
    return sendPushToUser(dal, targetUserId, {
        title: '⚔️ Challenge Received!',
        body: `${challengerName} challenged you in ${subject}! Accept now?`,
        tag: 'challenge',
        data: { type: 'challenge', subject }
    });
};

// ============ SCHEDULER ============

let reminderInterval: ReturnType<typeof setInterval> | null = null;
let streakInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the notification scheduler
 * @param {object} dal — Data Access Layer
 */
export const startNotificationScheduler = (dal: DAL): void => {
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
export const stopNotificationScheduler = (): void => {
    if (reminderInterval) clearInterval(reminderInterval);
    if (streakInterval) clearInterval(streakInterval);
};
