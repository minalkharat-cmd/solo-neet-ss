import { Router } from 'express';
import type { Request, Response, NextFunction, Router as RouterType } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import crypto from 'crypto';
import { sanitizeInput, validatePassword, validateEmail } from '../middleware/validation.js';
import logger from '../lib/logger.js';
import type { DAL, User, Progress, LeaderboardEntry } from '../types.js';

export function createAuthRoutes({ dal, JWT_SECRET, authMiddleware, authLimiter, isProduction, FRONTEND_URL }: {
    dal: DAL;
    JWT_SECRET: string;
    authMiddleware: (req: Request, res: Response, next: NextFunction) => void;
    authLimiter: (req: Request, res: Response, next: NextFunction) => void;
    isProduction: boolean;
    FRONTEND_URL: string;
}): RouterType {
    const router: RouterType = Router();

    const GOOGLE_CLIENT_ID: string | undefined = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET: string | undefined = process.env.GOOGLE_CLIENT_SECRET;
    const GOOGLE_CALLBACK_URL: string = process.env.GOOGLE_CALLBACK_URL || `http://localhost:${process.env.PORT || 3002}/api/auth/google/callback`;
    const googleOAuthEnabled: boolean = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

    const generateId = (): string => crypto.randomUUID();

    const getRank = (level: number): string => {
        if (level >= 81) return 'S';
        if (level >= 61) return 'A';
        if (level >= 41) return 'B';
        if (level >= 21) return 'C';
        if (level >= 11) return 'D';
        return 'E';
    };

    const createUserWithProgress = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
        const userId = generateId();
        const newUser: User = { id: userId, ...userData, createdAt: new Date().toISOString() };

        const progressData: Progress = {
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

        const leaderboardData: LeaderboardEntry = {
            userId, username: newUser.username, hunterName: newUser.hunterName,
            level: 1, totalXP: 0, rank: 'E'
        };

        await dal.createUserWithProgress(newUser, progressData, leaderboardData);
        return newUser;
    };

    // Google OAuth setup
    if (googleOAuthEnabled) {
        passport.use(new GoogleStrategy({
            clientID: GOOGLE_CLIENT_ID!,
            clientSecret: GOOGLE_CLIENT_SECRET!,
            callbackURL: GOOGLE_CALLBACK_URL
        },
            async (accessToken: string, refreshToken: string, profile: passport.Profile, done: (error: any, user?: any) => void) => {
                try {
                    let user = await dal.users.findByGoogleId(profile.id);

                    if (!user) {
                        const email: string | undefined = profile.emails?.[0]?.value;
                        user = await dal.users.findByEmail(email as string);

                        if (user) {
                            await dal.users.update(user.id, {
                                googleId: profile.id,
                                avatar: profile.photos?.[0]?.value
                            });
                        } else {
                            const username = profile.displayName?.replace(/\s+/g, '_').toLowerCase() || `hunter_${generateId().slice(0, 6)}`;
                            user = await createUserWithProgress({
                                username, email: email as string,
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
            (req: Request, res: Response) => {
                const user = req.user as User;
                const token: string = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
                const userAgent: string = req.headers['user-agent'] || '';
                const isMobile: boolean = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

                const userParam: string = encodeURIComponent(JSON.stringify({
                    id: user.id, username: user.username,
                    hunterName: user.hunterName, avatar: user.avatar
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
        logger.warn('Google OAuth disabled', { reason: 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set' });
        router.get('/google', (req: Request, res: Response) => {
            res.status(503).json({ error: 'Google OAuth is not configured.' });
        });
    }

    // Register
    router.post('/register', authLimiter, async (req: Request, res: Response) => {
        try {
            const username: string = sanitizeInput(req.body.username, 30);
            const email: string = sanitizeInput(req.body.email, 100);
            const password: string = req.body.password;
            const hunterName: string = sanitizeInput(req.body.hunterName, 50) || 'Hunter';

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

            const existing: User | null = await dal.users.findByEmailOrUsername(email, username);
            if (existing) {
                return res.status(400).json({ error: 'Username or email already exists' });
            }

            const hashedPassword: string = await bcrypt.hash(password, 12);
            const user: User = await createUserWithProgress({
                username, email, password: hashedPassword, hunterName
            });

            const token: string = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ token, user: { id: user.id, username, email, hunterName } });
        } catch (err: any) {
            logger.error('Registration failed', { error: err.message });
            res.status(500).json({ error: 'Registration failed' });
        }
    });

    // Login
    router.post('/login', authLimiter, async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;
            const user: User | null = await dal.users.findByEmail(email);

            if (!user || !user.password) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            const validPassword: boolean = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            const token: string = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
            res.json({
                token,
                user: {
                    id: user.id, username: user.username, email: user.email,
                    hunterName: user.hunterName, avatar: user.avatar
                }
            });
        } catch (err: any) {
            logger.error('Login failed', { error: err.message });
            res.status(500).json({ error: 'Login failed' });
        }
    });

    // Get current user
    router.get('/me', authMiddleware, async (req: Request, res: Response) => {
        try {
            const user: User | null = await dal.users.findById(req.userId);
            if (!user) return res.status(404).json({ error: 'User not found' });

            res.json({
                user: {
                    id: user.id, username: user.username, email: user.email,
                    hunterName: user.hunterName, avatar: user.avatar
                }
            });
        } catch (err: any) {
            logger.error('Failed to fetch current user', { error: err.message });
            res.status(500).json({ error: 'Failed to fetch user' });
        }
    });

    (router as any)._helpers = { createUserWithProgress, getRank, generateId };

    return router;
}
