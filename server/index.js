import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { searchAndFetchAbstracts } from './pubmed.js';
import { generateQuestionsFromArticles } from './questionGenerator.js';
import { generateQuestionsFromArticles as generateWithOllama, checkOllamaStatus } from './ollamaClient.js';
import { initBackgroundGenerator } from './backgroundGenerator.js';
import { getDueQuestions, getSRSStats, initSRSRecord, updateSRSRecord } from './srs.js';
import { createOrder, verifyPayment, calculateSubscriptionEnd, PLANS, isConfigured as isPaymentConfigured } from './payment.js';
import { getPersonalAnalytics, getEngagementMetrics } from './analytics.js';
import { registerSocialRoutes } from './social.js';
import { registerNotificationRoutes } from './notifications.js';
import { initFirebaseAdmin, startNotificationScheduler, sendPushToUser } from './pushSender.js';

// LLM Provider configuration (ollama or gemini)
let llmProvider = process.env.LLM_PROVIDER || 'ollama';

// Background generator instance
let backgroundGenerator = null;

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'solo-neet-ss-secret-key-2026';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Google OAuth Config — validated at startup
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || `http://localhost:${PORT}/api/auth/google/callback`;

// Validate OAuth credentials in production
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET)) {
    console.error('CRITICAL: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in production!');
    console.error('Google OAuth will be DISABLED until these environment variables are configured on Render.');
}

// Diagnostic log
console.log(`🔐 Google OAuth: ${GOOGLE_CLIENT_ID ? 'Configured' : 'NOT CONFIGURED (placeholder)'}`);
console.log(`   Callback URL: ${GOOGLE_CALLBACK_URL}`);
console.log(`   Frontend URL: ${FRONTEND_URL}`);

// Initialize JSON database
const defaultData = { users: [], progress: [], leaderboard: [], generatedQuestions: [] };
const adapter = new JSONFile(join(__dirname, 'db.json'));
const db = new Low(adapter, defaultData);

await db.read();
db.data ||= defaultData;
await db.write();

// CORS: allow both localhost and production origins
const allowedOrigins = [FRONTEND_URL];
if (isProduction && FRONTEND_URL !== 'http://localhost:5173') {
    allowedOrigins.push('http://localhost:5173');
} else if (!isProduction) {
    allowedOrigins.push('https://solo-neet-ss.vercel.app');
}

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    credentials: true
}));

app.use(express.json());
app.use(passport.initialize());

// Generate unique ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Get rank from level (SS Edition uses same thresholds)
const getRank = (level) => {
    if (level >= 81) return 'S';
    if (level >= 61) return 'A';
    if (level >= 41) return 'B';
    if (level >= 21) return 'C';
    if (level >= 11) return 'D';
    return 'E';
};

// Helper to create user and initial data
const createUserWithProgress = async (userData) => {
    await db.read();

    const userId = generateId();
    const newUser = {
        id: userId,
        ...userData,
        createdAt: new Date().toISOString()
    };

    db.data.users.push(newUser);

    // Create initial progress with SS-specific subject structure
    db.data.progress.push({
        userId,
        level: 1,
        currentXP: 0,
        totalXP: 0,
        questionsAnswered: 0,
        correctAnswers: 0,
        currentStreak: 0,
        bestStreak: 0,
        dungeonsCleared: 0,
        perfectDungeons: 0,
        achievements: [],
        subjectProgress: {
            cardiology: { answered: 0, correct: 0 },
            neurology: { answered: 0, correct: 0 },
            gastro: { answered: 0, correct: 0 },
            nephrology: { answered: 0, correct: 0 },
            pulmonology: { answered: 0, correct: 0 },
            oncology: { answered: 0, correct: 0 },
            endocrinology: { answered: 0, correct: 0 },
            rheumatology: { answered: 0, correct: 0 },
            hematology: { answered: 0, correct: 0 },
            infectious: { answered: 0, correct: 0 },
            critical: { answered: 0, correct: 0 },
            neonatology: { answered: 0, correct: 0 }
        }
    });

    // Add to leaderboard
    db.data.leaderboard.push({
        userId,
        username: newUser.username,
        hunterName: newUser.hunterName,
        level: 1,
        totalXP: 0,
        rank: 'E'
    });

    await db.write();
    return newUser;
};

// ============ GOOGLE OAUTH SETUP ============

const googleOAuthEnabled = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

if (googleOAuthEnabled) {
    passport.use(new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                await db.read();

                let user = db.data.users.find(u => u.googleId === profile.id);

                if (!user) {
                    const email = profile.emails?.[0]?.value;
                    user = db.data.users.find(u => u.email === email);

                    if (user) {
                        user.googleId = profile.id;
                        user.avatar = profile.photos?.[0]?.value;
                        await db.write();
                    } else {
                        const username = profile.displayName?.replace(/\s+/g, '_').toLowerCase() || `hunter_${generateId().slice(0, 6)}`;
                        user = await createUserWithProgress({
                            username,
                            email,
                            googleId: profile.id,
                            hunterName: profile.displayName || 'Hunter',
                            avatar: profile.photos?.[0]?.value,
                            password: null
                        });
                    }
                }

                done(null, user);
            } catch (err) {
                done(err, null);
            }
        }
    ));
} else {
    console.warn('⚠️  Google OAuth DISABLED — GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set.');
}

// Auth middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// ============ AUTH ROUTES ============

if (googleOAuthEnabled) {
    app.get('/api/auth/google',
        passport.authenticate('google', {
            scope: ['profile', 'email'],
            session: false
        })
    );

    app.get('/api/auth/google/callback',
        passport.authenticate('google', {
            session: false,
            failureRedirect: `${FRONTEND_URL}?auth=failed`
        }),
        (req, res) => {
            const token = jwt.sign({ userId: req.user.id }, JWT_SECRET, { expiresIn: '7d' });
            const userParam = encodeURIComponent(JSON.stringify({
                id: req.user.id,
                username: req.user.username,
                email: req.user.email,
                hunterName: req.user.hunterName,
                avatar: req.user.avatar
            }));

            // Check if request is from mobile app (Android/iOS)
            const userAgent = req.headers['user-agent'] || '';
            const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

            if (isMobile) {
                // Redirect to custom URL scheme for mobile app
                res.redirect(`com.soloneet.ss://oauth?token=${token}&user=${userParam}`);
            } else {
                // Normal web redirect
                res.redirect(`${FRONTEND_URL}?token=${token}&user=${userParam}`);
            }
        }
    );
} else {
    // Return helpful error when Google OAuth is not configured
    app.get('/api/auth/google', (req, res) => {
        res.status(503).json({ error: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' });
    });
}

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, hunterName } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields required' });
        }

        await db.read();

        if (db.data.users.find(u => u.email === email || u.username === username)) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await createUserWithProgress({
            username,
            email,
            password: hashedPassword,
            hunterName: hunterName || 'Hunter'
        });

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: user.id,
                username,
                email,
                hunterName: hunterName || 'Hunter'
            }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        await db.read();
        const user = db.data.users.find(u => u.email === email);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user.password) {
            return res.status(401).json({ error: 'Please use Google Sign-In for this account' });
        }

        if (!(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                hunterName: user.hunterName,
                avatar: user.avatar
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
    await db.read();
    const user = db.data.users.find(u => u.id === req.userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json({
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            hunterName: user.hunterName,
            avatar: user.avatar
        }
    });
});

// ============ GAME PROGRESS ROUTES ============

app.get('/api/progress', authMiddleware, async (req, res) => {
    await db.read();
    const progress = db.data.progress.find(p => p.userId === req.userId);

    if (!progress) {
        return res.status(404).json({ error: 'Progress not found' });
    }

    res.json({
        level: progress.level,
        currentXP: progress.currentXP,
        totalXP: progress.totalXP,
        questionsAnswered: progress.questionsAnswered,
        correctAnswers: progress.correctAnswers,
        currentStreak: progress.currentStreak,
        bestStreak: progress.bestStreak,
        dungeonsCleared: progress.dungeonsCleared,
        perfectDungeons: progress.perfectDungeons,
        unlockedAchievements: progress.achievements || [],
        subjectProgress: progress.subjectProgress || {}
    });
});

app.post('/api/progress', authMiddleware, async (req, res) => {
    const {
        level, currentXP, totalXP, questionsAnswered, correctAnswers,
        currentStreak, bestStreak, dungeonsCleared, perfectDungeons,
        unlockedAchievements, subjectProgress
    } = req.body;

    await db.read();

    const progressIndex = db.data.progress.findIndex(p => p.userId === req.userId);
    if (progressIndex === -1) {
        return res.status(404).json({ error: 'Progress not found' });
    }

    db.data.progress[progressIndex] = {
        ...db.data.progress[progressIndex],
        level,
        currentXP,
        totalXP,
        questionsAnswered,
        correctAnswers,
        currentStreak,
        bestStreak,
        dungeonsCleared,
        perfectDungeons,
        achievements: unlockedAchievements || [],
        subjectProgress: subjectProgress || {}
    };

    // Update leaderboard
    const leaderboardIndex = db.data.leaderboard.findIndex(l => l.userId === req.userId);

    if (leaderboardIndex !== -1) {
        db.data.leaderboard[leaderboardIndex] = {
            ...db.data.leaderboard[leaderboardIndex],
            level,
            totalXP,
            rank: getRank(level)
        };
    }

    await db.write();
    res.json({ success: true });
});

// ============ LEADERBOARD ROUTES ============

app.get('/api/leaderboard', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    await db.read();

    const sorted = [...db.data.leaderboard]
        .sort((a, b) => b.totalXP - a.totalXP || b.level - a.level)
        .slice(0, limit);

    res.json({
        leaderboard: sorted.map((entry, index) => ({
            rank: index + 1,
            username: entry.username,
            hunterName: entry.hunterName,
            level: entry.level,
            totalXP: entry.totalXP,
            hunterRank: entry.rank
        }))
    });
});

app.get('/api/leaderboard/me', authMiddleware, async (req, res) => {
    await db.read();

    const userEntry = db.data.leaderboard.find(l => l.userId === req.userId);

    if (!userEntry) {
        return res.json({ rank: null });
    }

    const sorted = [...db.data.leaderboard].sort((a, b) => b.totalXP - a.totalXP || b.level - a.level);
    const rank = sorted.findIndex(l => l.userId === req.userId) + 1;

    res.json({
        rank,
        level: userEntry.level,
        totalXP: userEntry.totalXP,
        hunterRank: userEntry.rank
    });
});

// ============ PUBMED QUESTION GENERATOR ROUTES ============

// Search PubMed articles
app.post('/api/pubmed/search', async (req, res) => {
    try {
        const { query, limit = 5 } = req.body;

        if (!query || query.length < 3) {
            return res.status(400).json({ error: 'Query must be at least 3 characters' });
        }

        const result = await searchAndFetchAbstracts(query, Math.min(limit, 10));

        res.json({
            success: true,
            query: result.query,
            count: result.count,
            articles: result.articles.map(a => ({
                pmid: a.pmid,
                title: a.title,
                abstract: a.abstract.slice(0, 500) + (a.abstract.length > 500 ? '...' : ''),
                authors: a.authors,
                journal: a.journal,
                year: a.year
            }))
        });
    } catch (error) {
        console.error('PubMed search error:', error);
        res.status(500).json({ error: 'Failed to search PubMed: ' + error.message });
    }
});

// Generate questions from articles (supports both Gemini and Ollama)
app.post('/api/pubmed/generate', authMiddleware, async (req, res) => {
    try {
        const { pmids, specialty = 'general', provider } = req.body;

        if (!pmids || !Array.isArray(pmids) || pmids.length === 0) {
            return res.status(400).json({ error: 'PMIDs array required' });
        }

        // Fetch full abstracts for selected PMIDs
        const { articles } = await searchAndFetchAbstracts(`${pmids.join(' OR ')}[uid]`, pmids.length);

        if (articles.length === 0) {
            return res.status(404).json({ error: 'No articles found for provided PMIDs' });
        }

        // Use specified provider or default
        const useProvider = provider || llmProvider;
        let result;

        if (useProvider === 'ollama') {
            console.log('Using Ollama (Llama 3) for question generation...');
            result = await generateWithOllama(articles, specialty);
        } else {
            console.log('Using Gemini for question generation...');
            result = await generateQuestionsFromArticles(articles, specialty);
        }

        // Store generated questions in database
        await db.read();
        db.data.generatedQuestions = db.data.generatedQuestions || [];

        for (const question of result.questions) {
            question.generatedBy = req.userId;
            question.generatedAt = new Date().toISOString();
            question.llmProvider = useProvider;
            db.data.generatedQuestions.push(question);
        }

        await db.write();

        res.json({
            success: true,
            provider: useProvider,
            model: result.model || (useProvider === 'gemini' ? 'gemini-1.5-flash' : 'llama3:70b'),
            generated: result.totalGenerated,
            errors: result.totalErrors,
            questions: result.questions,
            errorDetails: result.errors
        });
    } catch (error) {
        console.error('Question generation error:', error);
        res.status(500).json({ error: 'Failed to generate questions: ' + error.message });
    }
});

// ============ LLM PROVIDER MANAGEMENT ============

// Get current LLM provider status
app.get('/api/llm/status', async (req, res) => {
    const ollamaStatus = await checkOllamaStatus();
    const geminiConfigured = !!process.env.GEMINI_API_KEY;

    res.json({
        currentProvider: llmProvider,
        ollama: ollamaStatus,
        gemini: {
            configured: geminiConfigured,
            model: 'gemini-1.5-flash'
        }
    });
});

// Switch LLM provider
app.post('/api/llm/provider', authMiddleware, async (req, res) => {
    const { provider } = req.body;

    if (!['ollama', 'gemini'].includes(provider)) {
        return res.status(400).json({ error: 'Provider must be "ollama" or "gemini"' });
    }

    if (provider === 'ollama') {
        const status = await checkOllamaStatus();
        if (!status.available) {
            return res.status(503).json({
                error: 'Ollama server not available',
                details: status.error
            });
        }
    }

    if (provider === 'gemini' && !process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'Gemini API key not configured' });
    }

    llmProvider = provider;
    console.log(`LLM provider switched to: ${provider}`);

    res.json({
        success: true,
        provider: llmProvider,
        model: provider === 'ollama' ? (process.env.OLLAMA_MODEL || 'llama3:70b') : 'gemini-1.5-flash'
    });
});

// Get all generated questions
app.get('/api/questions/generated', authMiddleware, async (req, res) => {
    await db.read();

    const questions = db.data.generatedQuestions || [];
    const reviewed = req.query.reviewed === 'true' ? true : req.query.reviewed === 'false' ? false : undefined;

    let filtered = questions;
    if (reviewed !== undefined) {
        filtered = questions.filter(q => q.reviewed === reviewed);
    }

    res.json({
        total: filtered.length,
        questions: filtered.slice(-50) // Last 50
    });
});

// Approve/reject a generated question
app.patch('/api/questions/generated/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { approved, specialty } = req.body;

    await db.read();

    const questionIndex = db.data.generatedQuestions.findIndex(q => q.id === id);

    if (questionIndex === -1) {
        return res.status(404).json({ error: 'Question not found' });
    }

    db.data.generatedQuestions[questionIndex].reviewed = true;
    db.data.generatedQuestions[questionIndex].approved = approved;
    db.data.generatedQuestions[questionIndex].reviewedAt = new Date().toISOString();
    db.data.generatedQuestions[questionIndex].reviewedBy = req.userId;

    if (specialty) {
        db.data.generatedQuestions[questionIndex].specialty = specialty;
    }

    await db.write();

    res.json({ success: true });
});

// ============ SPACED REPETITION (SRS) ROUTES ============

// Get due questions for today
app.get('/api/srs/due', authMiddleware, async (req, res) => {
    await db.read();

    db.data.srsRecords = db.data.srsRecords || [];
    const dueQuestions = getDueQuestions(db.data.srsRecords, req.userId);

    res.json({
        count: dueQuestions.length,
        questions: dueQuestions.slice(0, 20) // Limit to 20 per session
    });
});

// Get SRS statistics
app.get('/api/srs/stats', authMiddleware, async (req, res) => {
    await db.read();

    db.data.srsRecords = db.data.srsRecords || [];
    const stats = getSRSStats(db.data.srsRecords, req.userId);

    res.json(stats);
});

// Record an answer and update SRS
app.post('/api/srs/answer', authMiddleware, async (req, res) => {
    const { questionId, correct, timeMs } = req.body;

    if (!questionId) {
        return res.status(400).json({ error: 'questionId required' });
    }

    await db.read();
    db.data.srsRecords = db.data.srsRecords || [];

    // Find or create SRS record
    let recordIndex = db.data.srsRecords.findIndex(
        r => r.questionId === questionId && r.userId === req.userId
    );

    let record;
    if (recordIndex === -1) {
        record = initSRSRecord(questionId, req.userId);
        db.data.srsRecords.push(record);
        recordIndex = db.data.srsRecords.length - 1;
    } else {
        record = db.data.srsRecords[recordIndex];
    }

    // Update the record
    const updatedRecord = updateSRSRecord(record, correct, timeMs || 15000);
    db.data.srsRecords[recordIndex] = updatedRecord;

    await db.write();

    res.json({
        success: true,
        nextReview: updatedRecord.nextReview,
        interval: updatedRecord.interval,
        easeFactor: updatedRecord.easeFactor
    });
});

// Initialize SRS for multiple questions (batch)
app.post('/api/srs/init-batch', authMiddleware, async (req, res) => {
    const { questionIds } = req.body;

    if (!questionIds || !Array.isArray(questionIds)) {
        return res.status(400).json({ error: 'questionIds array required' });
    }

    await db.read();
    db.data.srsRecords = db.data.srsRecords || [];

    let added = 0;
    for (const questionId of questionIds) {
        const exists = db.data.srsRecords.some(
            r => r.questionId === questionId && r.userId === req.userId
        );
        if (!exists) {
            db.data.srsRecords.push(initSRSRecord(questionId, req.userId));
            added++;
        }
    }

    await db.write();

    res.json({ success: true, added });
});

// ============ PVP BATTLE ROUTES ============

app.get('/api/pvp/status', async (req, res) => {
    res.json({
        playersInQueue: matchmakingQueue.length,
        activeBattles: Object.keys(battleRooms).length
    });
});

// ============ SOCKET.IO SETUP FOR 1v1 BATTLES ============

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Battle state management
const matchmakingQueue = [];
const battleRooms = {};
const playerSockets = {};
const privateRooms = {};

// SS PvP Questions - Super Specialty focused
const battleQuestions = [
    // CARDIOLOGY
    {
        id: 'ss_pvp_001',
        question: 'Drug of choice for rate control in atrial fibrillation with HFrEF?',
        options: ['Diltiazem', 'Verapamil', 'Bisoprolol', 'Digoxin'],
        correct: 2,
        subject: 'Cardiology',
        explanation: 'Beta-blockers (bisoprolol, metoprolol, carvedilol) are preferred for rate control in AF with HFrEF. CCBs are contraindicated in reduced EF. Digoxin is second-line.',
        reference: "ESC Guidelines 2024, AF Management"
    },
    {
        id: 'ss_pvp_002',
        question: 'TIMI risk score is used for:',
        options: ['STEMI only', 'UA/NSTEMI', 'Heart failure', 'Pulmonary embolism'],
        correct: 1,
        subject: 'Cardiology',
        explanation: 'TIMI risk score stratifies patients with UA/NSTEMI. GRACE score is also used for ACS. For PE, Wells and Geneva scores are used.',
        reference: "Braunwald's Heart Disease, 12th Ed."
    },
    {
        id: 'ss_pvp_003',
        question: 'Target LDL in very high CV risk patient is:',
        options: ['<100 mg/dL', '<70 mg/dL', '<55 mg/dL', '<40 mg/dL'],
        correct: 2,
        subject: 'Cardiology',
        explanation: 'ESC 2021 guidelines recommend LDL <55 mg/dL for very high-risk patients (prior CVD, DM with TOD). For extreme risk, <40 mg/dL may be considered.',
        reference: "ESC Dyslipidemia Guidelines 2021"
    },
    // NEUROLOGY
    {
        id: 'ss_pvp_004',
        question: 'Window period for IV thrombolysis in acute ischemic stroke:',
        options: ['3 hours', '4.5 hours', '6 hours', '24 hours'],
        correct: 1,
        subject: 'Neurology',
        explanation: 'IV alteplase can be given within 4.5 hours of symptom onset. Mechanical thrombectomy extends to 24h in selected patients with salvageable tissue.',
        reference: "AHA/ASA Stroke Guidelines 2023"
    },
    {
        id: 'ss_pvp_005',
        question: 'Most common cause of SAH is:',
        options: ['AVM rupture', 'Trauma', 'Berry aneurysm rupture', 'Hypertensive bleed'],
        correct: 2,
        subject: 'Neurology',
        explanation: 'Ruptured saccular (berry) aneurysms cause ~85% of spontaneous SAH. Most occur at circle of Willis bifurcations, especially AComm.',
        reference: "Adams & Victor's Neurology, 11th Ed."
    },
    {
        id: 'ss_pvp_006',
        question: 'CSF finding in bacterial meningitis:',
        options: ['Low protein, high glucose', 'High protein, low glucose', 'Normal protein and glucose', 'High protein, high glucose'],
        correct: 1,
        subject: 'Neurology',
        explanation: 'Bacterial meningitis shows PMN pleocytosis, elevated protein (>100 mg/dL), and low glucose (<40 mg/dL or CSF:serum <0.4). Opens under high pressure.',
        reference: "Harrison's Neurology, 4th Ed."
    },
    // GASTROENTEROLOGY
    {
        id: 'ss_pvp_007',
        question: 'Barcelona staging is used for:',
        options: ['Colorectal cancer', 'Hepatocellular carcinoma', 'Pancreatic cancer', 'Gastric cancer'],
        correct: 1,
        subject: 'Gastroenterology',
        explanation: 'BCLC (Barcelona Clinic Liver Cancer) staging incorporates tumor burden, liver function (Child-Pugh), and performance status to guide HCC treatment.',
        reference: "EASL-EORTC HCC Guidelines"
    },
    {
        id: 'ss_pvp_008',
        question: 'Capsule endoscopy is contraindicated in:',
        options: ['Crohn\'s disease', 'GI bleeding', 'Suspected stricture', 'Celiac disease'],
        correct: 2,
        subject: 'Gastroenterology',
        explanation: 'Capsule endoscopy is contraindicated in known/suspected strictures due to risk of retention. Patency capsule can be used to assess beforehand.',
        reference: "ASGE Guidelines 2023"
    },
    {
        id: 'ss_pvp_009',
        question: 'First-line treatment for Helicobacter pylori:',
        options: ['PPI + Amoxicillin + Metronidazole', 'Bismuth quadruple therapy', 'PPI + Amoxicillin + Clarithromycin', 'PPI + Levofloxacin + Amoxicillin'],
        correct: 2,
        subject: 'Gastroenterology',
        explanation: 'PPI-based triple therapy (PPI + Amox + Clarithro) for 14 days is standard first-line where clarithromycin resistance is <15%.',
        reference: "ACG Clinical Guidelines 2023"
    },
    // NEPHROLOGY
    {
        id: 'ss_pvp_010',
        question: 'Target BP in diabetic nephropathy:',
        options: ['<140/90 mmHg', '<130/80 mmHg', '<120/80 mmHg', '<110/70 mmHg'],
        correct: 1,
        subject: 'Nephrology',
        explanation: 'KDIGO 2021 recommends BP <130/80 in adults with diabetes and CKD. ACEi/ARBs are first-line for their renoprotective effects.',
        reference: "KDIGO CKD Guidelines 2021"
    },
    {
        id: 'ss_pvp_011',
        question: 'Calcineurin inhibitor nephrotoxicity causes:',
        options: ['Membranous nephropathy', 'Thrombotic microangiopathy', 'IgA nephropathy', 'Minimal change disease'],
        correct: 1,
        subject: 'Nephrology',
        explanation: 'CNIs (tacrolimus, cyclosporine) can cause TMA with arteriolar hyalinosis and thrombosis. Also cause chronic tubulointerstitial fibrosis.',
        reference: "Brenner & Rector's The Kidney, 11th Ed."
    },
    {
        id: 'ss_pvp_012',
        question: 'Indication for urgent dialysis:',
        options: ['GFR 10 mL/min asymptomatic', 'Refractory hyperkalemia', 'Serum creatinine 8 mg/dL', 'Mild metabolic acidosis'],
        correct: 1,
        subject: 'Nephrology',
        explanation: 'Urgent dialysis indications: refractory hyperkalemia, severe metabolic acidosis, uremic encephalopathy/pericarditis, volume overload, toxins (AEIOU).',
        reference: "KDIGO AKI Guidelines"
    },
    // PULMONOLOGY
    {
        id: 'ss_pvp_013',
        question: 'GOLD criteria for COPD diagnosis requires:',
        options: ['FEV1/FVC <70% pre-bronchodilator', 'FEV1/FVC <70% post-bronchodilator', 'FEV1 <80% predicted', 'Peak flow <70% predicted'],
        correct: 1,
        subject: 'Pulmonology',
        explanation: 'COPD is defined by persistent airflow limitation with FEV1/FVC <0.70 after bronchodilator. Severity is graded by FEV1 % predicted.',
        reference: "GOLD Report 2024"
    },
    {
        id: 'ss_pvp_014',
        question: 'First-line treatment for idiopathic pulmonary fibrosis:',
        options: ['Prednisone', 'Azathioprine', 'Pirfenidone', 'Cyclophosphamide'],
        correct: 2,
        subject: 'Pulmonology',
        explanation: 'Antifibrotics (pirfenidone and nintedanib) slow FVC decline in IPF. Immunosuppressants are harmful in IPF, unlike other ILDs.',
        reference: "ATS/ERS IPF Guidelines 2022"
    },
    // ONCOLOGY
    {
        id: 'ss_pvp_015',
        question: 'Tumor marker for monitoring colon cancer:',
        options: ['CA 19-9', 'CEA', 'AFP', 'CA 125'],
        correct: 1,
        subject: 'Medical Oncology',
        explanation: 'CEA is used for post-treatment surveillance in colorectal cancer. Rising CEA may indicate recurrence. CA 19-9 is for pancreatic cancer.',
        reference: "NCCN Guidelines 2024"
    },
    {
        id: 'ss_pvp_016',
        question: 'BRCA mutation is associated with increased risk of:',
        options: ['Lung cancer', 'Ovarian and breast cancer', 'Gastric cancer', 'Thyroid cancer'],
        correct: 1,
        subject: 'Medical Oncology',
        explanation: 'BRCA1/2 mutations increase lifetime risk of breast (45-65%) and ovarian (10-40%) cancers. Also associated with prostate and pancreatic cancer.',
        reference: "NCCN Genetic/Familial High-Risk Assessment"
    },
    // ENDOCRINOLOGY
    {
        id: 'ss_pvp_017',
        question: 'First-line drug for type 2 diabetes with HbA1c 8%:',
        options: ['Glimepiride', 'Metformin', 'Insulin', 'Sitagliptin'],
        correct: 1,
        subject: 'Endocrinology',
        explanation: 'Metformin is first-line for T2DM regardless of HbA1c. SGLT2i or GLP-1RA added if ASCVD, HF, or CKD present.',
        reference: "ADA Standards of Care 2024"
    },
    {
        id: 'ss_pvp_018',
        question: 'Target TSH in differentiated thyroid cancer post-thyroidectomy:',
        options: ['0.5-2 mIU/L', '<0.1 mIU/L', '2-4 mIU/L', '0.5-1 mIU/L'],
        correct: 1,
        subject: 'Endocrinology',
        explanation: 'Initial TSH suppression to <0.1 mIU/L in high-risk DTC. After remission, target is relaxed based on risk stratification.',
        reference: "ATA Thyroid Cancer Guidelines 2015"
    },
    // RHEUMATOLOGY
    {
        id: 'ss_pvp_019',
        question: 'Anti-CCP antibody is specific for:',
        options: ['SLE', 'Rheumatoid arthritis', 'Psoriatic arthritis', 'Ankylosing spondylitis'],
        correct: 1,
        subject: 'Rheumatology',
        explanation: 'Anti-CCP has >95% specificity for RA and predicts erosive disease. Unlike RF, it rarely occurs in non-RA conditions.',
        reference: "Kelley & Firestein's Rheumatology, 11th Ed."
    },
    {
        id: 'ss_pvp_020',
        question: 'First-line DMARD for rheumatoid arthritis:',
        options: ['Hydroxychloroquine', 'Sulfasalazine', 'Methotrexate', 'Leflunomide'],
        correct: 2,
        subject: 'Rheumatology',
        explanation: 'Methotrexate is anchor DMARD for RA. Start 15-25 mg/week with folic acid. Add biologics (TNFi, IL-6i) if inadequate response.',
        reference: "ACR RA Guidelines 2021"
    },
    // HEMATOLOGY
    {
        id: 'ss_pvp_021',
        question: 'Philadelphia chromosome is seen in:',
        options: ['AML', 'ALL', 'CML', 'CLL'],
        correct: 2,
        subject: 'Hematology',
        explanation: 'Ph chromosome t(9;22) creating BCR-ABL1 is pathognomonic of CML. Also seen in 25% of adult ALL (poor prognosis).',
        reference: "Williams Hematology, 10th Ed."
    },
    {
        id: 'ss_pvp_022',
        question: 'Direct Coombs test detects:',
        options: ['Free antibodies in serum', 'Antibodies on RBC surface', 'Complement activation', 'Platelet antibodies'],
        correct: 1,
        subject: 'Hematology',
        explanation: 'DAT (direct Coombs) detects IgG/complement bound to RBCs. Positive in AIHA, HDN, and transfusion reactions. IAT detects serum antibodies.',
        reference: "AABB Technical Manual, 20th Ed."
    },
    // INFECTIOUS DISEASES
    {
        id: 'ss_pvp_023',
        question: 'ART should be initiated in HIV at what CD4 count?',
        options: ['<500 cells/µL', '<350 cells/µL', '<200 cells/µL', 'Any CD4 count'],
        correct: 3,
        subject: 'Infectious Diseases',
        explanation: 'WHO/DHHS recommend ART for all HIV+ individuals regardless of CD4 count (Treat All). Early ART improves outcomes and reduces transmission.',
        reference: "WHO HIV Guidelines 2021"
    },
    {
        id: 'ss_pvp_024',
        question: 'Drug of choice for MRSA skin infection:',
        options: ['Vancomycin IV', 'TMP-SMX oral', 'Ceftriaxone', 'Amoxicillin-clavulanate'],
        correct: 1,
        subject: 'Infectious Diseases',
        explanation: 'For uncomplicated CA-MRSA SSTIs, oral TMP-SMX or doxycycline is effective. Vancomycin IV is reserved for severe/invasive infections.',
        reference: "IDSA SSTI Guidelines 2014"
    },
    // CRITICAL CARE
    {
        id: 'ss_pvp_025',
        question: 'Target SpO2 in ARDS patients:',
        options: ['98-100%', '94-98%', '88-95%', '80-85%'],
        correct: 2,
        subject: 'Critical Care',
        explanation: 'Conservative oxygen targets (SpO2 88-95%, PaO2 55-80 mmHg) in ARDS. Hyperoxia may cause harm. ARDSNet protocol recommends low tidal volume.',
        reference: "ARDSNet Protocol"
    },
    {
        id: 'ss_pvp_026',
        question: 'Septic shock requires all EXCEPT:',
        options: ['Infection source', 'Vasopressor need despite fluid resuscitation', 'Lactate >2 mmol/L', 'Temperature >38.5°C'],
        correct: 3,
        subject: 'Critical Care',
        explanation: 'Septic shock = sepsis + vasopressor requirement + lactate >2 mmol/L despite adequate fluid resuscitation. Fever is common but not required.',
        reference: "Sepsis-3 Definitions (JAMA 2016)"
    },
    // NEONATOLOGY
    {
        id: 'ss_pvp_027',
        question: 'First-line surfactant administration route:',
        options: ['Aerosolized', 'Intratracheal via ETT', 'Nebulized', 'Intravenous'],
        correct: 1,
        subject: 'Neonatology',
        explanation: 'Surfactant is given intratracheally via ETT. INSURE (INtubate-SURfactant-Extubate) or LISA (Less Invasive Surfactant Administration) techniques preferred.',
        reference: "AAP Surfactant Guidelines"
    },
    {
        id: 'ss_pvp_028',
        question: 'Target SpO2 in preterm neonates:',
        options: ['98-100%', '95-99%', '91-95%', '85-90%'],
        correct: 2,
        subject: 'Neonatology',
        explanation: 'Target SpO2 91-95% in preterm infants to balance ROP risk (high O2) and mortality (low O2). Avoid hyperoxia and hypoxia.',
        reference: "SUPPORT Trial, AAP Guidelines"
    },
    {
        id: 'ss_pvp_029',
        question: 'Therapeutic hypothermia in HIE is started within:',
        options: ['1 hour', '6 hours', '12 hours', '24 hours'],
        correct: 1,
        subject: 'Neonatology',
        explanation: 'Therapeutic hypothermia (33.5°C for 72h) must be initiated within 6 hours of birth for moderate-severe HIE. Improves neurological outcomes.',
        reference: "AAP HIE Guidelines"
    },
    {
        id: 'ss_pvp_030',
        question: 'Exchange transfusion in neonatal hyperbilirubinemia is done at:',
        options: ['Bilirubin 10 mg/dL', 'Bilirubin 15 mg/dL', 'Near phototherapy threshold', 'Near exchange threshold on Bhutani nomogram'],
        correct: 3,
        subject: 'Neonatology',
        explanation: 'Exchange transfusion thresholds are plotted on AAP nomogram based on gestational age and risk factors. Immediate exchange if acute bilirubin encephalopathy.',
        reference: "AAP Hyperbilirubinemia Guidelines 2022"
    }
];

// Generate random room code
const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
};

// Get random questions for battle
const getBattleQuestions = (count = 10) => {
    const shuffled = [...battleQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
};

// Create a new battle room
const createBattleRoom = (player1, player2, isRanked = true) => {
    const roomId = generateId();
    const questions = getBattleQuestions(10);

    battleRooms[roomId] = {
        id: roomId,
        players: [
            { ...player1, score: 0, answered: 0, ready: false },
            { ...player2, score: 0, answered: 0, ready: false }
        ],
        questions,
        currentQuestion: 0,
        status: 'waiting',
        isRanked,
        startTime: null,
        answers: {}
    };

    return battleRooms[roomId];
};

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`🎮 SS Hunter connected: ${socket.id}`);

    socket.on('register', (userData) => {
        playerSockets[socket.id] = {
            id: socket.id,
            odid: userData.odid,
            username: userData.username,
            hunterName: userData.hunterName || userData.username,
            level: userData.level || 1,
            avatar: userData.avatar
        };
        console.log(`✅ SS Registered: ${userData.username}`);
    });

    socket.on('joinQueue', () => {
        const player = playerSockets[socket.id];
        if (!player) {
            socket.emit('error', { message: 'Please register first' });
            return;
        }

        const existingIndex = matchmakingQueue.findIndex(p => p.id === socket.id);
        if (existingIndex !== -1) {
            matchmakingQueue.splice(existingIndex, 1);
        }

        matchmakingQueue.push(player);
        socket.emit('queueJoined', { position: matchmakingQueue.length });
        console.log(`🔍 ${player.username} joined SS queue. Size: ${matchmakingQueue.length}`);

        if (matchmakingQueue.length >= 2) {
            const player1 = matchmakingQueue.shift();
            const player2 = matchmakingQueue.shift();

            const room = createBattleRoom(player1, player2);

            const socket1 = io.sockets.sockets.get(player1.id);
            const socket2 = io.sockets.sockets.get(player2.id);

            if (socket1 && socket2) {
                socket1.join(room.id);
                socket2.join(room.id);

                socket1.emit('matchFound', {
                    roomId: room.id,
                    playerIndex: 0,
                    questions: room.questions.map(q => ({ ...q, correct: undefined }))
                });
                socket2.emit('matchFound', {
                    roomId: room.id,
                    playerIndex: 1,
                    questions: room.questions.map(q => ({ ...q, correct: undefined }))
                });

                socket1.emit('opponentInfo', {
                    username: player2.username,
                    hunterName: player2.hunterName,
                    level: player2.level,
                    avatar: player2.avatar
                });
                socket2.emit('opponentInfo', {
                    username: player1.username,
                    hunterName: player1.hunterName,
                    level: player1.level,
                    avatar: player1.avatar
                });

                console.log(`⚔️ SS Match: ${player1.username} vs ${player2.username}`);
            }
        }
    });

    socket.on('leaveQueue', () => {
        const index = matchmakingQueue.findIndex(p => p.id === socket.id);
        if (index !== -1) {
            matchmakingQueue.splice(index, 1);
            socket.emit('queueLeft');
            console.log(`🚪 Left SS queue. Size: ${matchmakingQueue.length}`);
        }
    });

    socket.on('createPrivateRoom', () => {
        const player = playerSockets[socket.id];
        if (!player) {
            socket.emit('error', { message: 'Please register first' });
            return;
        }

        const roomCode = generateRoomCode();
        privateRooms[roomCode] = {
            code: roomCode,
            host: player,
            hostSocket: socket.id,
            createdAt: Date.now()
        };

        socket.emit('privateRoomCreated', { roomCode });
        console.log(`🏠 SS Private room: ${roomCode} by ${player.username}`);
    });

    socket.on('joinPrivateRoom', ({ roomCode }) => {
        const player = playerSockets[socket.id];
        if (!player) {
            socket.emit('error', { message: 'Please register first' });
            return;
        }

        const privateRoom = privateRooms[roomCode.toUpperCase()];
        if (!privateRoom) {
            socket.emit('error', { message: 'Room not found or expired' });
            return;
        }

        const room = createBattleRoom(privateRoom.host, player, false);
        const hostSocket = io.sockets.sockets.get(privateRoom.hostSocket);

        if (hostSocket) {
            hostSocket.join(room.id);
            socket.join(room.id);

            hostSocket.emit('matchFound', {
                roomId: room.id,
                playerIndex: 0,
                isPrivate: true,
                questions: room.questions.map(q => ({ ...q, correct: undefined }))
            });
            socket.emit('matchFound', {
                roomId: room.id,
                playerIndex: 1,
                isPrivate: true,
                questions: room.questions.map(q => ({ ...q, correct: undefined }))
            });

            hostSocket.emit('opponentInfo', {
                username: player.username,
                hunterName: player.hunterName,
                level: player.level,
                avatar: player.avatar
            });
            socket.emit('opponentInfo', {
                username: privateRoom.host.username,
                hunterName: privateRoom.host.hunterName,
                level: privateRoom.host.level,
                avatar: privateRoom.host.avatar
            });

            console.log(`🤝 SS Private: ${privateRoom.host.username} vs ${player.username}`);
        }

        delete privateRooms[roomCode];
    });

    socket.on('playerReady', ({ roomId }) => {
        const room = battleRooms[roomId];
        if (!room) return;

        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
            room.players[playerIndex].ready = true;

            io.to(roomId).emit('playerReadyUpdate', {
                player1Ready: room.players[0].ready,
                player2Ready: room.players[1].ready
            });

            if (room.players.every(p => p.ready)) {
                room.status = 'countdown';

                let countdown = 3;
                const countdownInterval = setInterval(() => {
                    io.to(roomId).emit('countdown', { count: countdown });
                    countdown--;

                    if (countdown < 0) {
                        clearInterval(countdownInterval);
                        room.status = 'active';
                        room.startTime = Date.now();
                        io.to(roomId).emit('battleStart', {
                            questionIndex: 0,
                            timePerQuestion: 15
                        });
                    }
                }, 1000);
            }
        }
    });

    socket.on('submitAnswer', ({ roomId, questionIndex, answer, timeLeft }) => {
        const room = battleRooms[roomId];
        if (!room || room.status !== 'active') return;

        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex === -1) return;

        const question = room.questions[questionIndex];
        if (!question) return;

        const answerKey = `${socket.id}_${questionIndex}`;
        if (room.answers[answerKey]) return;

        const isCorrect = answer === question.correct;
        const points = isCorrect ? (10 + Math.floor(timeLeft / 2)) : 0;

        room.answers[answerKey] = { answer, isCorrect, points };
        room.players[playerIndex].answered++;

        if (isCorrect) {
            room.players[playerIndex].score += points;
        }

        io.to(roomId).emit('answerSubmitted', {
            playerIndex,
            questionIndex,
            isCorrect,
            correctAnswer: question.correct,
            scores: room.players.map(p => ({ score: p.score, answered: p.answered }))
        });

        const bothAnswered = room.players.every(p =>
            room.answers[`${p.id}_${questionIndex}`]
        );

        if (bothAnswered) {
            setTimeout(() => {
                if (questionIndex < room.questions.length - 1) {
                    io.to(roomId).emit('nextQuestion', {
                        questionIndex: questionIndex + 1,
                        timePerQuestion: 15
                    });
                } else {
                    endBattle(roomId);
                }
            }, 2000);
        }
    });

    socket.on('disconnect', () => {
        console.log(`👋 SS Hunter disconnected: ${socket.id}`);

        const queueIndex = matchmakingQueue.findIndex(p => p.id === socket.id);
        if (queueIndex !== -1) {
            matchmakingQueue.splice(queueIndex, 1);
        }

        Object.keys(privateRooms).forEach(code => {
            if (privateRooms[code].hostSocket === socket.id) {
                delete privateRooms[code];
            }
        });

        Object.keys(battleRooms).forEach(roomId => {
            const room = battleRooms[roomId];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);

            if (playerIndex !== -1 && room.status !== 'finished') {
                room.status = 'finished';
                io.to(roomId).emit('opponentDisconnected', {
                    winner: room.players[1 - playerIndex].username
                });
            }
        });

        delete playerSockets[socket.id];
    });
});

// End battle and determine winner
const endBattle = (roomId) => {
    const room = battleRooms[roomId];
    if (!room) return;

    room.status = 'finished';

    const [player1, player2] = room.players;
    let winner = null;
    let isDraw = false;

    if (player1.score > player2.score) {
        winner = player1;
    } else if (player2.score > player1.score) {
        winner = player2;
    } else {
        isDraw = true;
    }

    io.to(roomId).emit('battleEnd', {
        winner: winner ? {
            username: winner.username,
            hunterName: winner.hunterName,
            score: winner.score
        } : null,
        isDraw,
        finalScores: {
            player1: { username: player1.username, score: player1.score },
            player2: { username: player2.username, score: player2.score }
        },
        xpReward: winner ? 100 : 50
    });

    console.log(`🏆 SS Battle: ${player1.username}(${player1.score}) vs ${player2.username}(${player2.score})`);

    setTimeout(() => {
        delete battleRooms[roomId];
    }, 30000);
};

// Clean up old private rooms periodically
setInterval(() => {
    const now = Date.now();
    Object.keys(privateRooms).forEach(code => {
        if (now - privateRooms[code].createdAt > 5 * 60 * 1000) {
            delete privateRooms[code];
        }
    });
}, 60000);

// Start server
// ============ ANALYTICS ROUTES ============

app.get('/api/analytics/personal', authMiddleware, async (req, res) => {
    try {
        await db.read();
        const analytics = getPersonalAnalytics(db, req.userId);
        if (!analytics) {
            return res.status(404).json({ error: 'No analytics data found' });
        }
        res.json(analytics);
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

app.get('/api/analytics/engagement', async (req, res) => {
    try {
        await db.read();
        const metrics = getEngagementMetrics(db);
        res.json(metrics);
    } catch (error) {
        console.error('Engagement metrics error:', error);
        res.status(500).json({ error: 'Failed to fetch engagement metrics' });
    }
});

// ============ SOCIAL FEATURES ============
registerSocialRoutes(app, db, authMiddleware);

// ============ PUSH NOTIFICATIONS ============
registerNotificationRoutes(app, db, authMiddleware);

// Admin test push endpoint
app.post('/api/notifications/test-push', authMiddleware, async (req, res) => {
    const { title, body } = req.body;
    const result = await sendPushToUser(db, req.userId, {
        title: title || '🧪 Test Notification',
        body: body || 'If you see this, push notifications are working!',
        tag: 'test'
    });
    res.json(result);
});

// ============ INIT FIREBASE & START SCHEDULER ============
initFirebaseAdmin();
startNotificationScheduler(db);

httpServer.listen(PORT, () => {
    console.log(`🏥 Solo NEET SS Server running on http://localhost:${PORT}`);
    console.log('📊 Database: db.json');
    console.log('⚔️ PvP Battles: Enabled (30 SS Questions)');
    console.log('🔐 Google OAuth:', GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID' ? 'Configured' : 'Not configured');

    // Initialize background PubMed generator
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY') {
        backgroundGenerator = initBackgroundGenerator(db, 30); // Run every 30 minutes
        console.log('🧬 Background Question Generator: ACTIVE');
    } else {
        console.log('🧬 Background Question Generator: DISABLED (set GEMINI_API_KEY in .env)');
    }
});

// API endpoint to check background generator status
app.get('/api/generator/status', (req, res) => {
    if (backgroundGenerator) {
        res.json({
            enabled: true,
            ...backgroundGenerator.getStats()
        });
    } else {
        res.json({
            enabled: false,
            message: 'Set GEMINI_API_KEY in .env to enable'
        });
    }
});

// Force run generation (admin only)
app.post('/api/generator/run', authMiddleware, (req, res) => {
    if (!backgroundGenerator) {
        return res.status(503).json({ error: 'Generator not enabled' });
    }
    backgroundGenerator.forceRun();
    res.json({ message: 'Generation cycle started' });
});

// ============ PAYMENT ROUTES ============

// Get subscription plans and status
app.get('/api/payment/plans', (req, res) => {
    res.json({
        configured: isPaymentConfigured(),
        plans: Object.entries(PLANS).map(([id, plan]) => ({
            id,
            name: plan.name,
            amount: plan.amount / 100, // Convert paise to rupees
            currency: plan.currency,
            duration: plan.duration
        }))
    });
});

// Get user subscription status
app.get('/api/payment/status', authMiddleware, async (req, res) => {
    try {
        await db.read();
        const user = db.data.users.find(u => u.id === req.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isPremium = user.subscriptionEnd && new Date(user.subscriptionEnd) > new Date();

        res.json({
            isPremium,
            subscriptionEnd: user.subscriptionEnd || null,
            plan: user.subscriptionPlan || null
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get subscription status' });
    }
});

// Create payment order
app.post('/api/payment/create-order', authMiddleware, async (req, res) => {
    try {
        const { planId } = req.body;

        if (!isPaymentConfigured()) {
            return res.status(503).json({ error: 'Payment gateway not configured' });
        }

        if (!planId || !PLANS[planId]) {
            return res.status(400).json({ error: 'Invalid plan' });
        }

        const order = await createOrder(planId, req.userId);

        res.json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Order creation failed:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Verify payment and activate subscription
app.post('/api/payment/verify', authMiddleware, async (req, res) => {
    try {
        const { orderId, paymentId, signature, planId } = req.body;

        if (!verifyPayment(orderId, paymentId, signature)) {
            return res.status(400).json({ error: 'Payment verification failed' });
        }

        await db.read();
        const userIndex = db.data.users.findIndex(u => u.id === req.userId);

        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Activate subscription
        const subscriptionEnd = calculateSubscriptionEnd(planId);
        db.data.users[userIndex].isPremium = true;
        db.data.users[userIndex].subscriptionPlan = planId;
        db.data.users[userIndex].subscriptionEnd = subscriptionEnd;
        db.data.users[userIndex].subscriptionId = paymentId;

        // Store payment record
        if (!db.data.payments) db.data.payments = [];
        db.data.payments.push({
            id: generateId(),
            userId: req.userId,
            orderId,
            paymentId,
            planId,
            amount: PLANS[planId].amount,
            status: 'completed',
            createdAt: new Date().toISOString()
        });

        await db.write();

        res.json({
            success: true,
            message: 'Subscription activated',
            subscriptionEnd
        });
    } catch (error) {
        console.error('Payment verification failed:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

// Premium middleware helper
export const requirePremium = async (req, res, next) => {
    await db.read();
    const user = db.data.users.find(u => u.id === req.userId);

    if (!user || !user.subscriptionEnd || new Date(user.subscriptionEnd) <= new Date()) {
        return res.status(403).json({
            error: 'Premium subscription required',
            upgrade: true
        });
    }
    next();
};
