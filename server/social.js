// Solo NEET SS - Social Features (Groups + Challenges)
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

import { sendChallengeNotification } from './pushSender.js';

/**
 * Register social routes on the Express app
 * @param {object} dal — Data Access Layer
 */
export const registerSocialRoutes = (app, dal, authMiddleware) => {

    // ============ STUDY GROUPS ============

    // List all groups
    app.get('/api/groups', async (req, res) => {
        const groups = await dal.groups.getAll();
        const enriched = await Promise.all(groups.map(async g => {
            const members = await Promise.all(g.memberIds.map(async id => {
                const u = await dal.users.findById(id);
                return u ? { id: u.id, hunterName: u.hunterName, avatar: u.avatar } : { id, hunterName: 'Unknown' };
            }));
            return { ...g, members };
        }));
        res.json(enriched);
    });

    // Create group
    app.post('/api/groups', authMiddleware, async (req, res) => {
        const { name, description } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: 'Group name required' });

        const group = await dal.groups.create({
            id: generateId(),
            name: name.trim(),
            description: description?.trim() || '',
            ownerId: req.userId,
            memberIds: [req.userId],
            maxMembers: 20,
            createdAt: new Date().toISOString()
        });

        res.json(group);
    });

    // Join group
    app.post('/api/groups/:id/join', authMiddleware, async (req, res) => {
        const group = await dal.groups.findById(req.params.id);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.memberIds.includes(req.userId)) return res.status(400).json({ error: 'Already a member' });
        if (group.memberIds.length >= group.maxMembers) return res.status(400).json({ error: 'Group is full' });

        await dal.groups.addMember(req.params.id, req.userId);
        res.json({ success: true });
    });

    // Leave group
    app.post('/api/groups/:id/leave', authMiddleware, async (req, res) => {
        const group = await dal.groups.findById(req.params.id);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.ownerId === req.userId) return res.status(400).json({ error: 'Owner cannot leave. Delete the group instead.' });

        await dal.groups.removeMember(req.params.id, req.userId);
        res.json({ success: true });
    });

    // ============ FRIEND CHALLENGES ============

    // Create challenge
    app.post('/api/challenge/create', authMiddleware, async (req, res) => {
        const { subject, questionCount = 10 } = req.body;
        const code = generateId().slice(0, 6).toUpperCase();

        const challenge = await dal.challenges.create({
            id: generateId(),
            code,
            creatorId: req.userId,
            opponentId: null,
            subject: subject || 'cardiology',
            questionCount,
            status: 'waiting',
            createdAt: new Date().toISOString()
        });

        res.json({ code, challengeId: challenge.id });
    });

    // Join challenge
    app.post('/api/challenge/join', authMiddleware, async (req, res) => {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Challenge code required' });

        const challenge = await dal.challenges.findByCode(code);
        if (!challenge) return res.status(404).json({ error: 'Challenge not found or already started' });
        if (challenge.creatorId === req.userId) return res.status(400).json({ error: 'Cannot join your own challenge' });

        const activated = await dal.challenges.activate(code, req.userId);

        // Push notify the challenge creator
        const joiner = await dal.users.findById(req.userId);
        const joinerName = joiner?.hunterName || 'A Hunter';
        sendChallengeNotification(dal, activated.creatorId, joinerName, activated.subject).catch(() => { });

        res.json({
            challengeId: activated.id,
            subject: activated.subject,
            questionCount: activated.questionCount,
            status: 'active'
        });
    });
};
