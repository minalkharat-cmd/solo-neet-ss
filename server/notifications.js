// Solo NEET SS - Server-Side Push Notification Routes

/**
 * Register notification-related routes
 * @param {object} dal — Data Access Layer
 */
export const registerNotificationRoutes = (app, dal, authMiddleware) => {

    // Store FCM token for a user
    app.post('/api/notifications/register', authMiddleware, async (req, res) => {
        const { fcmToken } = req.body;
        if (!fcmToken) return res.status(400).json({ error: 'FCM token required' });

        const user = await dal.users.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Store FCM token on user
        if (!user.fcmTokens) user.fcmTokens = [];
        if (!user.fcmTokens.includes(fcmToken)) {
            const tokens = [...user.fcmTokens, fcmToken];
            // Keep max 5 tokens per user (multi-device)
            const trimmed = tokens.length > 5 ? tokens.slice(-5) : tokens;
            await dal.users.update(req.userId, { fcmTokens: trimmed });
        }

        res.json({ success: true });
    });

    // Get notification preferences
    app.get('/api/notifications/preferences', authMiddleware, async (req, res) => {
        const user = await dal.users.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            enabled: !!(user.fcmTokens?.length),
            dailyReminder: user.notificationPrefs?.dailyReminder ?? true,
            streakReminder: user.notificationPrefs?.streakReminder ?? true,
            challengeNotify: user.notificationPrefs?.challengeNotify ?? true,
            reminderHour: user.notificationPrefs?.reminderHour ?? 9
        });
    });

    // Update notification preferences
    app.put('/api/notifications/preferences', authMiddleware, async (req, res) => {
        const { dailyReminder, streakReminder, challengeNotify, reminderHour } = req.body;

        const user = await dal.users.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const prefs = {
            dailyReminder: dailyReminder ?? true,
            streakReminder: streakReminder ?? true,
            challengeNotify: challengeNotify ?? true,
            reminderHour: reminderHour ?? 9
        };
        await dal.users.update(req.userId, { notificationPrefs: prefs });

        res.json({ success: true, preferences: prefs });
    });
};
