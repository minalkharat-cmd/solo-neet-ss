// Environment Configuration Validator
// Validates required env vars at startup — fail fast, not at runtime.

import logger from './logger.js';

interface EnvVar {
    key: string;
    description: string;
}

export interface Features {
    googleOAuth: boolean;
    razorpay: boolean;
    geminiAI: boolean;
    firebase: boolean;
    ollama: boolean;
}

const REQUIRED_PRODUCTION: EnvVar[] = [
    { key: 'JWT_SECRET', description: 'JWT signing secret' },
    { key: 'FRONTEND_URL', description: 'Frontend origin for CORS' },
];

const OPTIONAL: EnvVar[] = [
    { key: 'GOOGLE_CLIENT_ID', description: 'Google OAuth client ID' },
    { key: 'GOOGLE_CLIENT_SECRET', description: 'Google OAuth client secret' },
    { key: 'GOOGLE_CALLBACK_URL', description: 'Google OAuth callback URL' },
    { key: 'RAZORPAY_KEY_ID', description: 'Razorpay payment key' },
    { key: 'RAZORPAY_KEY_SECRET', description: 'Razorpay payment secret' },
    { key: 'GEMINI_API_KEY', description: 'Google Gemini AI API key' },
    { key: 'FIREBASE_SERVICE_ACCOUNT_JSON', description: 'Firebase Admin SDK credentials' },
    { key: 'OLLAMA_MODEL', description: 'Ollama LLM model name' },
    { key: 'LLM_PROVIDER', description: 'Active LLM provider (ollama|gemini)' },
    { key: 'LOG_LEVEL', description: 'Logging level (error|warn|info|debug)' },
];

/**
 * Validate environment and log configuration summary.
 * Exits process in production if required vars are missing.
 */
export function validateEnvironment(): Features {
    const isProduction: boolean = process.env.NODE_ENV === 'production';
    const errors: string[] = [];

    // Check required (production-only)
    if (isProduction) {
        for (const { key, description } of REQUIRED_PRODUCTION) {
            if (!process.env[key]) {
                errors.push(`  MISSING: ${key} — ${description}`);
            }
        }
    }

    if (errors.length > 0) {
        logger.error('Environment validation failed — missing required variables:');
        for (const err of errors) {
            logger.error(err);
        }
        process.exit(1);
    }

    // Log configuration summary
    const features: Features = {
        googleOAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        razorpay: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
        geminiAI: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY'),
        firebase: !!(process.env.FIREBASE_SERVICE_ACCOUNT_JSON),
        ollama: process.env.LLM_PROVIDER === 'ollama',
    };

    logger.info('Environment validated', {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3002,
        features,
    });

    return features;
}
