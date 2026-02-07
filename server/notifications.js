// Solo NEET SS - Server-Side Push Notification Routes

/**
 * Register notification-related routes
 */
export const registerNotificationRoutes = (app, db, authMiddleware) => {

    // Store FCM token for a user
    app.post('/api/notifications/register', authMiddleware, async (req, res) => {
        const { fcmToken } = req.body;
        if (!fcmToken) return res.status(400).json({ error: 'FCM token required' });

        await db.read();
        const user = db.data.users.find(u => u.id === req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Store FCM token on user
        if (!user.fcmTokens) user.fcmTokens = [];
        if (!user.fcmTokens.includes(fcmToken)) {
            user.fcmTokens.push(fcmToken);
            // Keep max 5 tokens per user (multi-device)
            if (user.fcmTokens.length > 5) user.fcmTokens = user.fcmTokens.slice(-5);
            await db.write();
        }

        res.json({ success: true });
    });

    // Get notification preferences
    app.get('/api/notifications/preferences', authMiddleware, async (req, res) => {
        await db.read();
        const user = db.data.users.find(u => u.id === req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            enabled: !!(user.fcmTokens?.length),
            dailyReminder: user.notificationPrefs?.dailyReminder ?? true,
            streakReminder: user.notificationPrefs?.streakReminder ?? true,
            challengeNotify: user.notificationPrefs?.challengeNotify ?? true,
            reminderHour: user.notificationPrefs?.reminderHour ?? 9 // default 9 AM
        });
    });

    // Update notification preferences
    app.put('/api/notifications/preferences', authMiddleware, async (req, res) => {
        const { dailyReminder, streakReminder, challengeNotify, reminderHour } = req.body;

        await db.read();
        const user = db.data.users.find(u => u.id === req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.notificationPrefs = {
            dailyReminder: dailyReminder ?? true,
            streakReminder: streakReminder ?? true,
            challengeNotify: challengeNotify ?? true,
            reminderHour: reminderHour ?? 9
        };
        await db.write();

        res.json({ success: true, preferences: user.notificationPrefs });
    });
};
