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

// Lib
import logger from './lib/logger.js';
import { validateEnvironment } from './lib/env.js';
import { installShutdownHandlers, onShutdown } from './lib/shutdown.js';

// Middleware
import { createDAL } from './dal.js';
import { createAuthMiddleware, createAdminMiddleware } from './middleware/auth.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Routes
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

// ============ BOOTSTRAP ============

installShutdownHandlers();
const features = validateEnvironment();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3002;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';

// JWT Secret
if (!process.env.JWT_SECRET) {
    if (isProduction) {
        logger.error('FATAL: JWT_SECRET environment variable is required in production.');
        process.exit(1);
    }
    logger.warn('JWT_SECRET not set — using random secret. Sessions will not survive restarts.');
}
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

// ============ DATABASE ============

const defaultData = { users: [], progress: [], leaderboard: [], generatedQuestions: [] };
const adapter = new JSONFile(join(__dirname, 'db.json'));
const db = new Low(adapter, defaultData);

await db.read();
db.data ||= defaultData;
await db.write();

const dal = createDAL(db);
logger.info('Database initialized', { path: 'db.json' });

// ============ MIDDLEWARE ============

const allowedOrigins = [FRONTEND_URL];
if (!isProduction) {
    allowedOrigins.push('https://solo-neet-ss.vercel.app');
    allowedOrigins.push('http://localhost:5173');
}

// Request ID — first middleware, before anything else
app.use(requestIdMiddleware);

app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
}));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn('CORS blocked origin', { origin });
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

const authMiddleware = createAuthMiddleware(JWT_SECRET);
const adminMiddleware = createAdminMiddleware(dal);

// ============ LLM PROVIDER STATE ============

let llmProvider = process.env.LLM_PROVIDER || 'ollama';
const getLlmProvider = () => llmProvider;
const setLlmProvider = (p) => { llmProvider = p; logger.info('LLM provider switched', { provider: p }); };

// ============ HEALTH CHECK ============

const startTime = Date.now();

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        timestamp: new Date().toISOString(),
    });
});

app.get('/api/health/ready', async (req, res) => {
    try {
        // Verify DB is readable
        await db.read();
        res.json({
            status: 'ready',
            database: 'ok',
            uptime: Math.floor((Date.now() - startTime) / 1000),
        });
    } catch (err) {
        res.status(503).json({ status: 'not ready', database: 'error', error: err.message });
    }
});

// ============ MOUNT ROUTES ============

const deps = { dal, JWT_SECRET, authMiddleware, adminMiddleware, authLimiter, isProduction, FRONTEND_URL };

app.use('/api/auth', createAuthRoutes(deps));
app.use('/api/progress', createProgressRoutes(deps));
app.use('/api/leaderboard', createLeaderboardRoutes(deps));
app.use('/api', createQuestionRoutes({ ...deps, getLlmProvider, setLlmProvider }));
app.use('/api/srs', createSRSRoutes(deps));
app.use('/api/payment', createSubscriptionRoutes(deps));

// ============ ANALYTICS ROUTES ============

app.get('/api/analytics/personal', authMiddleware, async (req, res, next) => {
    try {
        const analytics = await getPersonalAnalytics(dal, req.userId);
        if (!analytics) return res.status(404).json({ error: 'No analytics data found' });
        res.json(analytics);
    } catch (error) {
        next(error);
    }
});

app.get('/api/analytics/engagement', authMiddleware, async (req, res, next) => {
    try {
        const metrics = await getEngagementMetrics(dal);
        res.json(metrics);
    } catch (error) {
        next(error);
    }
});

// ============ SOCIAL & NOTIFICATIONS ============

registerSocialRoutes(app, dal, authMiddleware);
registerNotificationRoutes(app, dal, authMiddleware);

app.post('/api/notifications/test-push', authMiddleware, adminMiddleware, async (req, res) => {
    const { title, body } = req.body;
    const result = await sendPushToUser(dal, req.userId, {
        title: title || 'Test Notification',
        body: body || 'If you see this, push notifications are working!',
        tag: 'test'
    });
    res.json(result);
});

// ============ PVP (Socket.io) ============

const httpServer = createServer(app);
const { matchmakingQueue, battleRooms } = initPvPSocket(httpServer, { dal, JWT_SECRET, allowedOrigins });

app.get('/api/pvp/status', (req, res) => {
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

// ============ ERROR HANDLING (must be last) ============

app.use(notFoundHandler);
app.use(errorHandler);

// ============ START SERVER ============

initFirebaseAdmin();
startNotificationScheduler(dal);

// Register graceful shutdown callbacks
onShutdown('HTTP server', () => new Promise((resolve) => httpServer.close(resolve)));
onShutdown('Database flush', () => db.write());

httpServer.listen(PORT, () => {
    logger.info('Server started', {
        port: PORT,
        database: 'db.json',
        pvp: true,
        features,
    });

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY') {
        backgroundGenerator = initBackgroundGenerator(dal, 30);
        logger.info('Background Question Generator: ACTIVE');
    } else {
        logger.info('Background Question Generator: DISABLED (set GEMINI_API_KEY)');
    }
});
