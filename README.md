# Solo NEET SS

A gamified medical education platform for **NEET Super-Specialty (SS)** exam preparation. Built as a full-stack web + mobile app with real-time PvP battles, spaced repetition, AI-powered question generation, and a Solo Leveling-inspired progression system.

## Architecture

```
solo-neet-ss/
├── src/                    # React 19 frontend (Vite 7)
│   ├── components/         # 17 React components
│   ├── hooks/              # Game state management
│   ├── services/           # API & notification clients
│   ├── contexts/           # Theme context
│   ├── data/               # Static question banks
│   └── utils/              # Sound utilities
├── server/                 # Express.js backend (TypeScript)
│   ├── routes/             # 6 route modules (auth, progress, leaderboard, questions, srs, subscription)
│   ├── middleware/          # Auth, validation, error handling, request ID
│   ├── lib/                # Logger, env validation, graceful shutdown
│   ├── pvp/                # Socket.io real-time PvP battle system
│   ├── __tests__/          # 107 Vitest tests
│   ├── dal.ts              # Data Access Layer (repository pattern)
│   ├── types.ts            # 30+ TypeScript interfaces
│   ├── srs.ts              # SM-2 spaced repetition algorithm
│   ├── questionGenerator.ts # Gemini AI question generation
│   ├── ollamaClient.ts     # Ollama/Llama local LLM client
│   ├── pubmed.ts           # PubMed NCBI article search
│   ├── payment.ts          # Razorpay payment integration
│   ├── social.ts           # Study groups & challenges
│   └── notifications.ts    # Firebase push notifications
├── android/                # Capacitor Android app
├── public/                 # Static assets & PWA manifest
└── .github/workflows/      # CI/CD pipeline
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, CSS |
| Backend | Express.js, TypeScript (strict mode), Node.js 20 |
| Real-time | Socket.io (PvP battles, live updates) |
| Database | Lowdb (JSON file, repository pattern via DAL) |
| Auth | JWT (HTTP-only cookies), Google OAuth 2.0 (Passport.js) |
| AI/LLM | Google Gemini 1.5 Flash, Ollama/Llama 3 (switchable) |
| Medical Data | PubMed NCBI E-utilities API |
| Payments | Razorpay (INR) |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Mobile | Capacitor 8 (Android), PWA |
| Testing | Vitest, supertest, v8 coverage |
| CI/CD | GitHub Actions (4 parallel jobs) |
| Security | Helmet, rate limiting, bcrypt (cost 12), input sanitization |
| Observability | Structured JSON logging, request ID tracing, health checks |

## Prerequisites

- **Node.js** >= 20
- **npm** >= 9

Optional (for specific features):
- **Ollama** — for local LLM question generation
- **Android Studio** — for Capacitor Android builds
- **Razorpay account** — for payment processing
- **Google Cloud Console** — for OAuth credentials
- **Firebase project** — for push notifications

## Quick Start

### 1. Clone & install

```bash
git clone <repository-url>
cd solo-neet-ss

# Frontend dependencies
npm install

# Backend dependencies
cd server && npm install
```

### 2. Configure environment

```bash
# Create server env file
cp server/.env.example server/.env
# Edit server/.env with your values
```

### 3. Run development servers

```bash
# Terminal 1 — Backend (port 3002)
cd server && npm run dev

# Terminal 2 — Frontend (port 5173)
npm run dev
```

The frontend dev server proxies API requests to the backend automatically.

## Environment Variables

### Server (Required in Production)

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret key for JWT token signing (use a strong random string) |
| `FRONTEND_URL` | Frontend origin for CORS (e.g., `https://your-domain.com`) |

### Server (Optional — Features Auto-Detect)

| Variable | Description | Feature |
|----------|-------------|---------|
| `PORT` | Server port (default: `3002`) | — |
| `NODE_ENV` | `production` or `development` | — |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Google login |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Google login |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL | Google login |
| `RAZORPAY_KEY_ID` | Razorpay key ID | Payments |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret | Payments |
| `GEMINI_API_KEY` | Google Gemini API key | AI question generation |
| `OLLAMA_MODEL` | Ollama model name (default: `llama3:70b`) | Local LLM |
| `LLM_PROVIDER` | `gemini` or `ollama` (default: `gemini`) | LLM selection |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Admin SDK credentials (JSON string) | Push notifications |
| `NCBI_API_KEY` | NCBI API key for PubMed | Higher rate limits |
| `LOG_LEVEL` | `error`, `warn`, `info`, or `debug` (default: `info`) | Logging |

### Frontend

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (leave empty for unified deployment — uses same-origin) |

Features gracefully degrade when optional variables are missing. The server logs which features are enabled at startup.

## Scripts

### Server (`server/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot-reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run production build |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Run all 107 tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with v8 coverage report |

### Frontend (root)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | ESLint check |
| `npm run preview` | Preview production build |

## Testing

The server has **107 tests** across 7 test suites:

| Suite | Tests | Covers |
|-------|-------|--------|
| `srs.test.ts` | 24 | SM-2 algorithm, quality calculation, due questions, stats |
| `dal.test.ts` | 30 | All 8 DAL repositories + composite operations |
| `api.test.ts` | 16 | Full Express integration (health, auth, progress, leaderboard, SRS) |
| `validation.test.ts` | 14 | XSS sanitization, password rules, email validation |
| `middleware.test.ts` | 11 | JWT auth, admin RBAC, request ID, error handler |
| `payment.test.ts` | 8 | Plans, subscription calculation, Razorpay config |
| `logger.test.ts` | 4 | Structured logging, child loggers |

All tests use in-memory databases (Lowdb `Memory` adapter) for complete isolation.

```bash
cd server
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

## CI/CD

GitHub Actions runs **4 parallel jobs** on push/PR to `main` or `develop`:

1. **Server — Type Check** (`tsc --noEmit`)
2. **Server — Tests** (vitest + coverage upload)
3. **Server — Build** (`tsc` compilation)
4. **Frontend — Lint & Build** (eslint + vite build)

## Deployment

### One-Click Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/minalkharat-cmd/solo-neet-ss)

Click the button above. Render will:
1. Create a free web service
2. Build frontend + backend automatically
3. Generate a JWT secret
4. Give you a live URL like `https://solo-neet-ss.onrender.com`

After deploy, optionally add these env vars in the Render dashboard:

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | AI question generation (Google Gemini) |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Google OAuth login |
| `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` | Premium payments (INR) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Push notifications |
| `NCBI_API_KEY` | PubMed higher rate limits |

### Manual Deploy (Render)

Configured via `render.yaml` — single unified service (frontend + backend):
- **Build**: `npm install && npm run build && cd server && npm install && npm run build`
- **Start**: `cd server && npm start`
- Express serves the built frontend in production mode
- Set `FRONTEND_URL` to your Render service URL

### Android (Capacitor)

```bash
npm run build                  # Build frontend
npx cap sync android           # Sync to Android project
npx cap open android           # Open in Android Studio
```

App ID: `com.soloneet.ss`

## Key Features

### Gamification System
- **Hunter Rank progression**: E → D → C → B → A → S (based on level)
- **XP & leveling** with subject-specific progress tracking
- **Achievements** and streak tracking
- **Dungeon breaks** (timed challenge sessions)
- **Daily rewards**, mystery boxes, spin wheel
- **Global leaderboard** with rank positions

### Spaced Repetition (SM-2)
- Full SM-2 algorithm implementation with quality scoring
- Due question scheduling with ease factor adjustment
- Batch initialization for new question sets
- Per-user SRS statistics

### AI Question Generation
- **PubMed integration**: Search NCBI for medical literature
- **Dual LLM support**: Google Gemini (cloud) or Ollama (local)
- **Admin review pipeline**: Generated → Reviewed → Approved/Rejected
- **Background generation** from research articles

### Real-time PvP Battles
- Socket.io matchmaking queue
- Timed question battles with live score updates
- Private rooms with invite codes
- Rating/ELO-style ranking

### Social Features
- Study groups with member management
- Daily challenges with leaderboards
- Push notification campaigns (Firebase FCM)

### Premium Subscriptions
- Razorpay payment integration (INR)
- Monthly (30-day) and yearly (365-day) plans
- Server-side signature verification
- Premium-gated content middleware

## Security

- **Authentication**: JWT with HTTP-only secure cookies + Bearer tokens
- **Password hashing**: bcrypt with cost factor 12
- **Input validation**: HTML/XSS sanitization, email/password rules
- **Rate limiting**: Auth endpoints rate-limited
- **HTTP headers**: Helmet security headers (CSP, HSTS, etc.)
- **Payment verification**: Timing-safe HMAC signature comparison
- **CORS**: Strict origin allowlist
- **Request tracing**: UUID request IDs for audit trails

## Project Structure — Server Modules

| Module | Responsibility |
|--------|---------------|
| `dal.ts` | Data Access Layer — 8 repositories, 3 composite operations |
| `types.ts` | 30+ TypeScript interfaces for all domain models |
| `srs.ts` | SM-2 spaced repetition algorithm |
| `payment.ts` | Razorpay order creation & signature verification |
| `questionGenerator.ts` | Gemini AI question generation from articles |
| `ollamaClient.ts` | Ollama/Llama local LLM integration |
| `pubmed.ts` | PubMed NCBI E-utilities API client |
| `social.ts` | Study groups & challenge routes |
| `notifications.ts` | Firebase Admin SDK push notifications |
| `analytics.ts` | Platform analytics & usage stats |
| `backgroundGenerator.ts` | Automated question generation pipeline |
| `pushSender.ts` | FCM message delivery |

## API Reference

See [server/API_DOCS.md](server/API_DOCS.md) for the complete API documentation.

## License

Private — All rights reserved.
