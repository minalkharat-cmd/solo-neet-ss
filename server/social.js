// Solo NEET SS - Social Features (Groups + Challenges)
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

/**
 * Register social routes on the Express app
 */
export const registerSocialRoutes = (app, db, authMiddleware) => {

    // ============ STUDY GROUPS ============

    // List all groups
    app.get('/api/groups', async (req, res) => {
        await db.read();
        const groups = db.data.groups || [];
        const enriched = groups.map(g => ({
            ...g,
            members: g.memberIds.map(id => {
                const u = db.data.users.find(u => u.id === id);
                return u ? { id: u.id, hunterName: u.hunterName, avatar: u.avatar } : { id, hunterName: 'Unknown' };
            })
        }));
        res.json(enriched);
    });

    // Create group
    app.post('/api/groups', authMiddleware, async (req, res) => {
        const { name, description } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: 'Group name required' });

        await db.read();
        if (!db.data.groups) db.data.groups = [];

        const group = {
            id: generateId(),
            name: name.trim(),
            description: description?.trim() || '',
            ownerId: req.userId,
            memberIds: [req.userId],
            maxMembers: 20,
            createdAt: new Date().toISOString()
        };

        db.data.groups.push(group);
        await db.write();
        res.json(group);
    });

    // Join group
    app.post('/api/groups/:id/join', authMiddleware, async (req, res) => {
        await db.read();
        const group = (db.data.groups || []).find(g => g.id === req.params.id);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.memberIds.includes(req.userId)) return res.status(400).json({ error: 'Already a member' });
        if (group.memberIds.length >= group.maxMembers) return res.status(400).json({ error: 'Group is full' });

        group.memberIds.push(req.userId);
        await db.write();
        res.json({ success: true });
    });

    // Leave group
    app.post('/api/groups/:id/leave', authMiddleware, async (req, res) => {
        await db.read();
        const group = (db.data.groups || []).find(g => g.id === req.params.id);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.ownerId === req.userId) return res.status(400).json({ error: 'Owner cannot leave. Delete the group instead.' });

        group.memberIds = group.memberIds.filter(id => id !== req.userId);
        await db.write();
        res.json({ success: true });
    });

    // ============ FRIEND CHALLENGES ============

    // Create challenge
    app.post('/api/challenge/create', authMiddleware, async (req, res) => {
        const { subject, questionCount = 10 } = req.body;
        await db.read();
        if (!db.data.challenges) db.data.challenges = [];

        const code = generateId().slice(0, 6).toUpperCase();

        const challenge = {
            id: generateId(),
            code,
            creatorId: req.userId,
            opponentId: null,
            subject: subject || 'cardiology',
            questionCount,
            status: 'waiting', // waiting | active | completed
            createdAt: new Date().toISOString()
        };

        db.data.challenges.push(challenge);
        await db.write();
        res.json({ code, challengeId: challenge.id });
    });

    // Join challenge
    app.post('/api/challenge/join', authMiddleware, async (req, res) => {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Challenge code required' });

        await db.read();
        const challenge = (db.data.challenges || []).find(c => c.code === code.toUpperCase() && c.status === 'waiting');
        if (!challenge) return res.status(404).json({ error: 'Challenge not found or already started' });
        if (challenge.creatorId === req.userId) return res.status(400).json({ error: 'Cannot join your own challenge' });

        challenge.opponentId = req.userId;
        challenge.status = 'active';
        await db.write();

        res.json({
            challengeId: challenge.id,
            subject: challenge.subject,
            questionCount: challenge.questionCount,
            status: 'active'
        });
    });
};
