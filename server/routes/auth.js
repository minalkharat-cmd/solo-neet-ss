import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import crypto from 'crypto';
import { sanitizeInput, validatePassword, validateEmail } from '../middleware/validation.js';

export function createAuthRoutes({ dal, JWT_SECRET, authMiddleware, authLimiter, isProduction, FRONTEND_URL }) {
    const router = Router();

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || `http://localhost:${process.env.PORT || 3002}/api/auth/google/callback`;
    const googleOAuthEnabled = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

    const generateId = () => crypto.randomUUID();

    const getRank = (level) => {
        if (level >= 81) return 'S';
        if (level >= 61) return 'A';
        if (level >= 41) return 'B';
        if (level >= 21) return 'C';
        if (level >= 11) return 'D';
        return 'E';
    };

    const createUserWithProgress = async (userData) => {
        const userId = generateId();
        const newUser = { id: userId, ...userData, createdAt: new Date().toISOString() };

        const progressData = {
            userId, level: 1, currentXP: 0, totalXP: 0,
            questionsAnswered: 0, correctAnswers: 0,
            currentStreak: 0, bestStreak: 0,
            dungeonsCleared: 0, perfectDungeons: 0,
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
        };

        const leaderboardData = {
            userId, username: newUser.username, hunterName: newUser.hunterName,
            level: 1, totalXP: 0, rank: 'E'
        };

        await dal.createUserWithProgress(newUser, progressData, leaderboardData);
        return newUser;
    };

    // Google OAuth setup
    if (googleOAuthEnabled) {
        passport.use(new GoogleStrategy({
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL: GOOGLE_CALLBACK_URL
        },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    let user = await dal.users.findByGoogleId(profile.id);

                    if (!user) {
                        const email = profile.emails?.[0]?.value;
                        user = await dal.users.findByEmail(email);

                        if (user) {
                            await dal.users.update(user.id, {
                                googleId: profile.id,
                                avatar: profile.photos?.[0]?.value
                            });
                        } else {
                            const username = profile.displayName?.replace(/\s+/g, '_').toLowerCase() || `hunter_${generateId().slice(0, 6)}`;
                            user = await createUserWithProgress({
                                username, email,
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

        router.get('/google',
            passport.authenticate('google', { scope: ['profile', 'email'], session: false })
        );

        router.get('/google/callback',
            passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}?auth=failed` }),
            (req, res) => {
                const token = jwt.sign({ userId: req.user.id }, JWT_SECRET, { expiresIn: '7d' });
                const userAgent = req.headers['user-agent'] || '';
                const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

                const userParam = encodeURIComponent(JSON.stringify({
                    id: req.user.id, username: req.user.username,
                    hunterName: req.user.hunterName, avatar: req.user.avatar
                }));

                if (isMobile) {
                    res.redirect(`com.soloneet.ss://oauth?token=${token}&user=${userParam}`);
                } else {
                    res.cookie('auth_token', token, {
                        httpOnly: true, secure: isProduction, sameSite: 'lax',
                        maxAge: 7 * 24 * 60 * 60 * 1000, path: '/',
                    });
                    res.redirect(`${FRONTEND_URL}?auth=success&user=${userParam}`);
                }
            }
        );
    } else {
        console.warn('Google OAuth DISABLED — GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set.');
        router.get('/google', (req, res) => {
            res.status(503).json({ error: 'Google OAuth is not configured.' });
        });
    }

    // Register
    router.post('/register', authLimiter, async (req, res) => {
        try {
            const username = sanitizeInput(req.body.username, 30);
            const email = sanitizeInput(req.body.email, 100);
            const password = req.body.password;
            const hunterName = sanitizeInput(req.body.hunterName, 50) || 'Hunter';

            if (!username || !email || !password) {
                return res.status(400).json({ error: 'All fields required' });
            }
            if (username.length < 3) {
                return res.status(400).json({ error: 'Username must be at least 3 characters' });
            }
            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                return res.status(400).json({ error: 'Username may only contain letters, numbers, and underscores' });
            }
            if (!validateEmail(email)) {
                return res.status(400).json({ error: 'Invalid email address' });
            }
            const passwordError = validatePassword(password);
            if (passwordError) {
                return res.status(400).json({ error: passwordError });
            }

            const existing = await dal.users.findByEmailOrUsername(email, username);
            if (existing) {
                return res.status(400).json({ error: 'Username or email already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 12);
            const user = await createUserWithProgress({
                username, email, password: hashedPassword, hunterName
            });

            const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ token, user: { id: user.id, username, email, hunterName } });
        } catch (err) {
            console.error('Register error:', err);
            res.status(500).json({ error: 'Registration failed' });
        }
    });

    // Login
    router.post('/login', authLimiter, async (req, res) => {
        try {
            const { email, password } = req.body;
            const user = await dal.users.findByEmail(email);

            if (!user || !user.password) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
            res.json({
                token,
                user: {
                    id: user.id, username: user.username, email: user.email,
                    hunterName: user.hunterName, avatar: user.avatar
                }
            });
        } catch (err) {
            console.error('Login error:', err);
            res.status(500).json({ error: 'Login failed' });
        }
    });

    // Get current user
    router.get('/me', authMiddleware, async (req, res) => {
        try {
            const user = await dal.users.findById(req.userId);
            if (!user) return res.status(404).json({ error: 'User not found' });

            res.json({
                user: {
                    id: user.id, username: user.username, email: user.email,
                    hunterName: user.hunterName, avatar: user.avatar
                }
            });
        } catch (err) {
            console.error('Auth me error:', err);
            res.status(500).json({ error: 'Failed to fetch user' });
        }
    });

    router._helpers = { createUserWithProgress, getRank, generateId };

    return router;
}
