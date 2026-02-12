import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import passport from 'passport';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';

// Internal modules
import { createAuthMiddleware, createAdminMiddleware } from './middleware/auth.js';
import { createAuthRoutes } from './routes/auth.js';
import { createProgressRoutes } from './routes/progress.js';
import { createLeaderboardRoutes } from './routes/leaderboard.js';
import { createQuestionRoutes } from './routes/questions.js';
import { createSRSRoutes } from './routes/srsRoutes.js';
import { createSubscriptionRoutes } from './routes/subscription.js';
import { initPvPSocket } from './pvp/socketHandler.js';
import { getPersonalAnalytics, getEngagementMetrics } from './analytics.js';
import { registerSocialRoutes } from './social.js';
import { registerNotificationRoutes } from './notifications.js';
import { initFirebaseAdmin, startNotificationScheduler, sendPushToUser } from './pushSender.js';
import { initBackgroundGenerator } from './backgroundGenerator.js';

// ============ CONFIG ============

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3002;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';

// JWT Secret — MUST be set via environment variable in production
if (!process.env.JWT_SECRET) {
    if (isProduction) {
        console.error('FATAL: JWT_SECRET environment variable is required in production.');
        process.exit(1);
    }
    console.warn('WARNING: JWT_SECRET not set. Using random secret — sessions will not survive restarts.');
}
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

// ============ DATABASE ============

const defaultData = { users: [], progress: [], leaderboard: [], generatedQuestions: [] };
const adapter = new JSONFile(join(__dirname, 'db.json'));
const db = new Low(adapter, defaultData);

await db.read();
db.data ||= defaultData;
await db.write();

// ============ MIDDLEWARE ============

// CORS: strict origin allowlist
const allowedOrigins = [FRONTEND_URL];
if (!isProduction) {
    allowedOrigins.push('https://solo-neet-ss.vercel.app');
    allowedOrigins.push('http://localhost:5173');
}

app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
}));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(passport.initialize());

// Rate limiters
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: { error: 'Rate limit exceeded. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// Create auth middleware instances
const authMiddleware = createAuthMiddleware(JWT_SECRET);
const adminMiddleware = createAdminMiddleware(db);

// ============ LLM PROVIDER STATE ============

let llmProvider = process.env.LLM_PROVIDER || 'ollama';
const getLlmProvider = () => llmProvider;
const setLlmProvider = (p) => { llmProvider = p; console.log(`LLM provider switched to: ${p}`); };

// ============ MOUNT ROUTES ============

const deps = { db, JWT_SECRET, authMiddleware, adminMiddleware, authLimiter, isProduction, FRONTEND_URL };

app.use('/api/auth', createAuthRoutes(deps));
app.use('/api/progress', createProgressRoutes(deps));
app.use('/api/leaderboard', createLeaderboardRoutes(deps));
app.use('/api', createQuestionRoutes({ ...deps, getLlmProvider, setLlmProvider }));
app.use('/api/srs', createSRSRoutes(deps));
app.use('/api/payment', createSubscriptionRoutes(deps));

// ============ ANALYTICS ROUTES ============

app.get('/api/analytics/personal', authMiddleware, async (req, res) => {
    try {
        await db.read();
        const analytics = getPersonalAnalytics(db, req.userId);
        if (!analytics) return res.status(404).json({ error: 'No analytics data found' });
        res.json(analytics);
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

app.get('/api/analytics/engagement', authMiddleware, async (req, res) => {
    try {
        await db.read();
        const metrics = getEngagementMetrics(db);
        res.json(metrics);
    } catch (error) {
        console.error('Engagement metrics error:', error);
        res.status(500).json({ error: 'Failed to fetch engagement metrics' });
    }
});

// ============ SOCIAL & NOTIFICATIONS ============

registerSocialRoutes(app, db, authMiddleware);
registerNotificationRoutes(app, db, authMiddleware);

app.post('/api/notifications/test-push', authMiddleware, adminMiddleware, async (req, res) => {
    const { title, body } = req.body;
    const result = await sendPushToUser(db, req.userId, {
        title: title || 'Test Notification',
        body: body || 'If you see this, push notifications are working!',
        tag: 'test'
    });
    res.json(result);
});

// ============ PVP (Socket.io) ============

const httpServer = createServer(app);
const { matchmakingQueue, battleRooms } = initPvPSocket(httpServer, { db, JWT_SECRET, allowedOrigins });

app.get('/api/pvp/status', async (req, res) => {
    res.json({
        playersInQueue: matchmakingQueue.length,
        activeBattles: Object.keys(battleRooms).length
    });
});

// ============ BACKGROUND GENERATOR ============

let backgroundGenerator = null;

app.get('/api/generator/status', (req, res) => {
    if (backgroundGenerator) {
        res.json({ enabled: true, ...backgroundGenerator.getStats() });
    } else {
        res.json({ enabled: false, message: 'Set GEMINI_API_KEY in .env to enable' });
    }
});

app.post('/api/generator/run', authMiddleware, adminMiddleware, (req, res) => {
    if (!backgroundGenerator) {
        return res.status(503).json({ error: 'Generator not enabled' });
    }
    backgroundGenerator.forceRun();
    res.json({ message: 'Generation cycle started' });
});

// ============ START SERVER ============

initFirebaseAdmin();
startNotificationScheduler(db);

httpServer.listen(PORT, () => {
    console.log(`Solo NEET SS Server running on http://localhost:${PORT}`);
    console.log(`Database: db.json`);
    console.log(`PvP Battles: Enabled`);

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY') {
        backgroundGenerator = initBackgroundGenerator(db, 30);
        console.log('Background Question Generator: ACTIVE');
    } else {
        console.log('Background Question Generator: DISABLED (set GEMINI_API_KEY)');
    }
});
