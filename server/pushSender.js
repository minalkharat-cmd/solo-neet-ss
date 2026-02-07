// Solo NEET SS - Server-Side Push Notification Engine
// Sends study reminders, streak alerts, and challenge notifications
//
// Config: Set FIREBASE_SERVICE_ACCOUNT_JSON env var to the JSON string
//         of the service account key downloaded from Firebase Console.

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
            console.log(`🔑 Env var FIREBASE_SERVICE_ACCOUNT_JSON found (${envJson.length} chars)`);
            try {
                // Handle potential wrapping in extra quotes
                let cleaned = envJson.trim();
                if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
                    cleaned = cleaned.slice(1, -1);
                }
                serviceAccount = JSON.parse(cleaned);
                // Fix double-escaped newlines in private_key
                if (serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }
                console.log(`🔑 Firebase key parsed — project: ${serviceAccount.project_id}`);
            } catch (parseErr) {
                console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', parseErr.message);
                console.error('   First 100 chars:', envJson.substring(0, 100));
                return;
            }
        } else {
            // 2. Try local file (development)
            try {
                const keyPath = join(__dirname, 'firebase-service-account.json');
                const raw = readFileSync(keyPath, 'utf-8');
                serviceAccount = JSON.parse(raw);
                console.log('🔑 Firebase key loaded from local file');
            } catch {
                console.log('⚠️  No Firebase service account key found — push notifications disabled');
                console.log('   Set FIREBASE_SERVICE_ACCOUNT_JSON env var or create server/firebase-service-account.json');
                return;
            }
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        fcmEnabled = true;
        console.log('🔔 Firebase Admin initialized — push notifications enabled');
    } catch (err) {
        console.error('❌ Firebase Admin init failed:', err.message);
    }
};

/**
 * Send a push notification to a specific user
 */
export const sendPushToUser = async (db, userId, notification) => {
    if (!fcmEnabled) return { sent: 0 };

    await db.read();
    const user = db.data.users.find(u => u.id === userId);
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
            console.error(`Push error for ${userId}:`, err.code || err.message);
        }
    }

    // Remove invalid tokens
    if (invalidTokens.length) {
        user.fcmTokens = user.fcmTokens.filter(t => !invalidTokens.includes(t));
        await db.write();
    }

    return { sent };
};

/**
 * Broadcast to all users with FCM tokens
 */
const broadcastToAll = async (db, notification) => {
    if (!fcmEnabled) return;
    await db.read();
    const usersWithTokens = db.data.users.filter(u => u.fcmTokens?.length > 0);
    let totalSent = 0;

    for (const user of usersWithTokens) {
        const { sent } = await sendPushToUser(db, user.id, notification);
        totalSent += sent;
    }

    console.log(`📤 Broadcast sent to ${totalSent} device(s) across ${usersWithTokens.length} user(s)`);
};

// ============ SCHEDULED NOTIFICATIONS ============

/**
 * Check and send daily study reminders
 * Runs every hour; sends to users whose preferred hour matches current hour
 */
const sendDailyReminders = async (db) => {
    if (!fcmEnabled) return;
    const currentHour = new Date().getHours();

    await db.read();
    const users = db.data.users.filter(u =>
        u.fcmTokens?.length > 0 &&
        (u.notificationPrefs?.dailyReminder !== false) &&
        (u.notificationPrefs?.reminderHour ?? 9) === currentHour
    );

    const motivation = [
        '🔥 Rise and grind, Hunter! Your daily quests await.',
        '⚡ A true Hunter never skips their training!',
        '💎 Every question you crush levels you up!',
        '🏆 Your rivals are studying. Are you?',
        '📚 15 minutes of practice = 1 level closer to S-Rank!',
        '🎯 Time to dominate some MCQs, Hunter!'
    ];

    for (const user of users) {
        await sendPushToUser(db, user.id, {
            title: '📖 Daily Study Reminder',
            body: motivation[Math.floor(Math.random() * motivation.length)],
            tag: 'daily-reminder',
            data: { type: 'daily-reminder' }
        });
    }

    if (users.length) console.log(`📖 Sent daily reminders to ${users.length} user(s) at hour ${currentHour}`);
};

/**
 * Check for users at risk of losing their streak (no activity in 20+ hours)
 * Runs every 2 hours
 */
const sendStreakAlerts = async (db) => {
    if (!fcmEnabled) return;
    await db.read();

    const now = Date.now();
    const TWENTY_HOURS_MS = 20 * 60 * 60 * 1000;

    const atRisk = db.data.users.filter(u => {
        if (!u.fcmTokens?.length) return false;
        if (u.notificationPrefs?.streakReminder === false) return false;
        if (!u.lastActive) return false;

        const lastActive = new Date(u.lastActive).getTime();
        const timeSince = now - lastActive;

        // Between 20-24 hours of inactivity (don't spam past 24h)
        return timeSince >= TWENTY_HOURS_MS && timeSince < 24 * 60 * 60 * 1000;
    });

    for (const user of atRisk) {
        const streak = user.streak || 0;
        await sendPushToUser(db, user.id, {
            title: '🔥 Streak at Risk!',
            body: streak > 0
                ? `Your ${streak}-day streak is about to break! Quick, solve 1 question to save it!`
                : `Don't let your progress slip! Come back and study now.`,
            tag: 'streak-alert',
            data: { type: 'streak-alert' }
        });
    }

    if (atRisk.length) console.log(`🔥 Sent streak alerts to ${atRisk.length} user(s)`);
};

/**
 * Send challenge notifications when someone joins/creates
 */
export const sendChallengeNotification = async (db, targetUserId, challengerName, subject) => {
    return sendPushToUser(db, targetUserId, {
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
 */
export const startNotificationScheduler = (db) => {
    if (!fcmEnabled) {
        console.log('⏭️  Notification scheduler skipped (Firebase Admin not initialized)');
        return;
    }

    // Daily reminders — check every hour
    reminderInterval = setInterval(() => sendDailyReminders(db), 60 * 60 * 1000);

    // Streak alerts — check every 2 hours
    streakInterval = setInterval(() => sendStreakAlerts(db), 2 * 60 * 60 * 1000);

    console.log('⏰ Notification scheduler started (reminders: hourly, streaks: every 2h)');
};

/**
 * Stop the notification scheduler
 */
export const stopNotificationScheduler = () => {
    if (reminderInterval) clearInterval(reminderInterval);
    if (streakInterval) clearInterval(streakInterval);
};
