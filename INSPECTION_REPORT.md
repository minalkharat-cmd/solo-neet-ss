# Solo NEET SS - Deep Inspection Report

**Date:** 2026-02-12
**Branch:** `claude/deep-inspection-BWMPx`
**Scope:** Full codebase security, correctness, and architecture review

---

## Executive Summary

Solo NEET SS is a gamified medical education platform for Indian NEET Super-Specialty exam prep. The codebase implements a full-stack application with React 19 frontend, Express/Node.js backend, Socket.io real-time PvP, Razorpay payments, Firebase push notifications, and AI-powered question generation from PubMed.

The project has **solid feature breadth** but contains **critical security vulnerabilities**, **data integrity bugs**, and **architectural gaps** that must be addressed before production deployment.

**Finding Summary:**
- **CRITICAL:** 6 findings (security vulnerabilities that could lead to data breach, payment fraud, or account compromise)
- **HIGH:** 8 findings (significant bugs or security issues affecting functionality/reliability)
- **MEDIUM:** 9 findings (code quality, correctness, and minor security issues)
- **LOW:** 8 findings (best practice violations and minor bugs)

---

## CRITICAL Findings

### C1. Hardcoded JWT Secret Fallback
**File:** `server/index.js:35`
```js
const JWT_SECRET = process.env.JWT_SECRET || 'solo-neet-ss-secret-key-2026';
```
**Impact:** If `JWT_SECRET` env var is not set (misconfiguration, new deployment, development), anyone who knows this fallback string can forge authentication tokens for any user. The fallback is committed to the public repository.
**Recommendation:** Remove the fallback entirely. Refuse to start the server if `JWT_SECRET` is not set in production.

### C2. Token and User Data Leaked via URL Parameters
**File:** `server/index.js:235-253`
```js
res.redirect(`${FRONTEND_URL}?token=${token}&user=${userParam}`);
```
**Impact:** OAuth callback passes JWT token and full user JSON (including email, userId) as URL query parameters. These end up in:
- Browser history
- Server access logs
- HTTP Referer headers on subsequent navigation
- Any analytics or third-party scripts on the page
**Recommendation:** Use a short-lived authorization code exchanged via POST request, or store the token server-side in an HTTP-only cookie.

### C3. Payment Verification with Placeholder Credentials
**File:** `server/payment.js:8,65`
```js
key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret'
// ...
.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret')
```
**Impact:** If `RAZORPAY_KEY_SECRET` is not set, the HMAC verification uses a known string (`placeholder_secret`). An attacker could craft a valid signature for any payment, activating premium subscriptions for free.
**Recommendation:** Refuse to process payments if credentials are not properly configured. The `isConfigured()` check exists but is not enforced at the verification endpoint.

### C4. No Rate Limiting on Authentication Endpoints
**File:** `server/index.js:263-338`
**Impact:** Login and registration endpoints have no rate limiting. This enables:
- Brute force password attacks on any account
- Credential stuffing attacks
- Registration spam filling the database
**Recommendation:** Add rate limiting (e.g., `express-rate-limit`) with strict limits on auth endpoints (5 attempts/minute per IP).

### C5. No Request Body Size Limit
**File:** `server/index.js:84`
```js
app.use(express.json());
```
**Impact:** No body size limit means an attacker can send multi-GB JSON payloads, causing the server to consume all memory and crash (DoS).
**Recommendation:** Add `app.use(express.json({ limit: '1mb' }));`

### C6. No Password Complexity Requirements
**File:** `server/index.js:267`
```js
if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
}
```
**Impact:** Users can register with single-character passwords. Combined with no rate limiting (C4), this makes accounts trivially brute-forceable.
**Recommendation:** Enforce minimum password length (8+ characters) and basic complexity rules.

---

## HIGH Findings

### H1. Socket.io PvP Has No Authentication
**File:** `server/index.js:1094-1107`
```js
socket.on('register', (userData) => {
    playerSockets[socket.id] = {
        id: socket.id,
        odid: userData.odid,
        username: userData.username,
        // ...
    };
});
```
**Impact:** Socket.io connections require no JWT verification. Anyone can connect and register with any username/identity, impersonate other users in PvP battles, and manipulate matchmaking.
**Recommendation:** Verify JWT token during Socket.io handshake using middleware.

### H2. Any Authenticated User Can Switch Global LLM Provider
**File:** `server/index.js:576-605`
**Impact:** The `POST /api/llm/provider` endpoint has `authMiddleware` but no admin check. Any logged-in user can switch the LLM provider for all users from Gemini to Ollama (or vice versa), potentially breaking question generation globally.
**Recommendation:** Add admin role check for this endpoint.

### H3. Any Authenticated User Can Trigger Background Generation
**File:** `server/index.js:1491-1497`
**Impact:** `POST /api/generator/run` allows any authenticated user to force-run the PubMed generation cycle, consuming Gemini API quota.
**Recommendation:** Restrict to admin users only.

### H4. Missing Props Cause Silent Failure - No Logout Button
**File:** `src/App.jsx:792-797`
```jsx
<SettingsPanel
    soundEnabled={soundEnabled}
    onToggleSound={() => setSoundEnabled(!soundEnabled)}
    onClose={() => setShowSettings(false)}
/>
```
**Impact:** `SettingsPanel` expects `user` and `onLogout` props, but they are not passed. The logout button in settings will never render, leaving users unable to log out from the settings panel.
**Fix:** Add `user={user}` and `onLogout={handleLogout}` props.

### H5. Inconsistent localStorage Keys Cause Data Mismatch
**Files:** `src/App.jsx:457` vs `src/services/api.js:11`
- App.jsx stores user under key `'user'`
- api.js stores/reads user under key `'soloNeetSS_user'`

**Impact:** `auth.getUser()` from the API service layer will never see the user stored by App.jsx (and vice versa). Any feature relying on `api.getUser()` will think no user is logged in.
**Fix:** Unify to a single key across the codebase.

### H6. sendBeacon Progress Sync Always Fails
**File:** `src/services/api.js:185-189`
```js
navigator.sendBeacon(
    `${API_BASE}/api/progress`,
    new Blob([payload], { type: 'application/json' })
);
```
**Impact:** `sendBeacon` cannot attach custom headers. Since `POST /api/progress` requires `Authorization: Bearer <token>` via `authMiddleware`, every beacon request will receive 401 and silently fail. Progress is never saved on page exit.
**Recommendation:** Use `keepalive: true` with regular `fetch()` instead, which supports headers.

### H7. Double-Counting Subject Progress
**Files:** `src/hooks/useGameState.js:142-147` and `src/hooks/useGameState.js:174-178`
**Impact:** When a correct answer is given, `addXP()` increments `subjectProgress[subjectId].answered++`, and then `recordAnswer()` also increments `subjectProgress[subjectId].answered++`. Every answered question is counted twice in subject progress. Accuracy calculations will be wrong (appearing ~50% of actual).
**Fix:** Remove the subject progress increment from `addXP()` since `recordAnswer()` is the canonical place for tracking answers.

### H8. XSS Risk via User-Provided Names in PvP/Leaderboard
**Files:** `server/index.js:1098-1106`, leaderboard endpoints, PvP socket events
**Impact:** `hunterName` and `username` from user input are passed directly to other users via Socket.io events and API responses. If rendered as `dangerouslySetInnerHTML` or in contexts where HTML is interpreted, this enables stored XSS. React's JSX escaping mitigates most of this, but any future change to render these as HTML would be exploitable.
**Recommendation:** Sanitize usernames on registration (strip HTML/script tags, enforce character whitelist).

---

## MEDIUM Findings

### M1. PvP Socket URL Mismatch
**File:** `src/components/PvPBattle.jsx:4`
```js
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
```
**Impact:** Fallback port is 3001, but the server runs on port 3002 (`server/index.js:34`). In development without env vars, PvP will fail to connect.
**Fix:** Change default to `http://localhost:3002`.

### M2. Biased Shuffle Algorithm
**File:** `server/index.js:1067`
```js
const shuffled = [...battleQuestions].sort(() => Math.random() - 0.5);
```
**Impact:** `sort(() => Math.random() - 0.5)` produces a biased, non-uniform shuffle. Questions near the beginning of the array are favored. Same pattern in `App.jsx:582`.
**Fix:** Use Fisher-Yates shuffle algorithm.

### M3. CORS Allows localhost in Production
**File:** `server/index.js:64-70`
```js
if (isProduction && FRONTEND_URL !== 'http://localhost:5173') {
    allowedOrigins.push('http://localhost:5173');
}
```
**Impact:** In production, localhost is always added to allowed origins, weakening CORS protection.
**Fix:** Only allow localhost in development mode.

### M4. JSON.parse of URL Params Without Error Handling
**File:** `src/App.jsx:475`
```js
const userData = JSON.parse(userParam);
```
**Impact:** If `userParam` is malformed (e.g., URL-encoding issues, truncation), `JSON.parse` will throw and the entire app will crash on mount.
**Fix:** Wrap in try/catch.

### M5. File-Based Database Not Production-Ready
**File:** `server/index.js:57-58` (Lowdb with `db.json`)
**Impact:**
- No concurrent write safety - simultaneous requests can corrupt data
- No transactions - partial writes on crash lose data
- No backup strategy
- Cannot scale horizontally (multiple server instances would each have their own db.json)
- O(n) lookups on all queries
**Recommendation:** Migrate to PostgreSQL or MongoDB before production.

### M6. Memory Leak - Battle State Accumulation
**File:** `server/index.js:764-767`
**Impact:** `battleRooms`, `playerSockets`, `matchmakingQueue`, `privateRooms` are in-memory objects that grow without bound. While there's cleanup for finished battles (30s delay) and private rooms (5min), `playerSockets` entries persist until server restart if disconnect event doesn't fire.
**Recommendation:** Add periodic cleanup of stale entries.

### M7. useEffect Dependency Could Cause Socket Reconnection Loop
**File:** `src/components/PvPBattle.jsx:162`
```js
}, [user, gameState.level]);
```
**Impact:** If `user` object reference changes on re-render (which it will since it's from `useState` with `JSON.parse`), the socket will disconnect and reconnect, losing any in-progress battle state.
**Fix:** Use stable values like `user?.id` instead of the full object.

### M8. PubMed Search Endpoint Has No Authentication
**File:** `server/index.js:473`
```js
app.post('/api/pubmed/search', async (req, res) => {
```
**Impact:** Anyone (unauthenticated) can call this endpoint to proxy PubMed searches through the server, potentially consuming NCBI API quota.
**Recommendation:** Add `authMiddleware`.

### M9. Error Messages Leak Internal Details
**Files:** `server/index.js:498,554`
```js
res.status(500).json({ error: 'Failed to search PubMed: ' + error.message });
```
**Impact:** Internal error messages (stack traces, file paths, API error details) are sent to the client, aiding attackers in reconnaissance.
**Fix:** Log full error server-side, return generic message to client.

---

## LOW Findings

### L1. Non-Cryptographic Random for IDs
**File:** `server/index.js:88`
```js
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
```
**Impact:** `Math.random()` is not cryptographically secure. IDs are predictable. While not directly exploitable for authentication (JWT is used), predictable IDs could enable IDOR attacks on future endpoints.
**Fix:** Use `crypto.randomUUID()` or `crypto.randomBytes()`.

### L2. XP Multiplier Timer Doesn't Persist Across Reloads
**File:** `src/hooks/useGameState.js:246-252`
**Impact:** The `setTimeout` for XP multiplier expiry runs in JS memory. If the user refreshes the page, the multiplier value persists (it's in localStorage) but the timer that resets it is lost. The multiplier remains active indefinitely until the next page session creates a new timer.
**Fix:** Store the expiry timestamp and check it on load.

### L3. Daily Stats Reset May Miss the Window
**File:** `server/backgroundGenerator.js:316-322`
```js
if (now.getHours() === 0 && now.getMinutes() === 0) {
```
**Impact:** Checks every 60 seconds for exactly minute 0 of hour 0. Due to timing drift, the check could miss this exact minute. If the interval callback fires at 00:00:59, the next check at 00:01:59 misses the window.
**Fix:** Track the last reset date and compare against current date.

### L4. Static PvP Question Pool
**File:** `server/index.js:770-1053`
**Impact:** Only 30 hardcoded PvP questions. Players will quickly memorize answers, reducing the educational and competitive value.
**Recommendation:** Integrate AI-generated questions into the PvP pool after review approval.

### L5. No React Error Boundaries
**Impact:** Any unhandled error in a component will crash the entire app with a white screen. No recovery or fallback UI.
**Recommendation:** Add error boundaries around major sections (quiz, PvP, settings).

### L6. No Test Coverage
**Impact:** Zero unit, integration, or E2E tests found. Any change risks introducing regressions with no safety net.
**Recommendation:** Add tests for critical paths: auth, payment verification, SRS calculations, XP/leveling.

### L7. README Is Default Vite Template
**File:** `README.md`
**Impact:** No project-specific documentation for setup, development, deployment, or API endpoints.
**Recommendation:** Replace with project-specific documentation.

### L8. Engagement Metrics Endpoint Has No Authentication
**File:** `server/index.js:1428`
```js
app.get('/api/analytics/engagement', async (req, res) => {
```
**Impact:** Anyone can view aggregate engagement metrics without logging in. Depending on what data is included, this could leak user counts and usage patterns.

---

## Architecture Observations

### Strengths
1. **Modular backend** - separate files for payment, SRS, push, analytics, social
2. **SM-2 algorithm** correctly implements standard spaced repetition
3. **Dual LLM support** with graceful fallback between Gemini and Ollama
4. **PWA support** with service worker caching strategy
5. **Multi-platform** via Capacitor for Android
6. **Gamification mechanics** are well-designed and engaging

### Weaknesses
1. **No admin role system** - user vs admin distinction doesn't exist
2. **No API versioning** - all routes under `/api/` with no version prefix
3. **Monolithic server file** - `server/index.js` at 1624 lines mixing routes, Socket.io, and config
4. **Client-side state is source of truth** - localStorage drives game state, server sync is "best effort"
5. **No TypeScript** - large codebase with no type safety
6. **No structured logging** - only console.log with emoji prefixes

---

## Priority Remediation Order

1. **Immediate (before any production traffic):**
   - C1: Remove JWT secret fallback
   - C3: Enforce payment credential validation
   - C4: Add rate limiting
   - C5: Add body size limits
   - H1: Authenticate Socket.io connections

2. **Before public launch:**
   - C2: Fix token-in-URL OAuth flow
   - C6: Add password validation
   - H2/H3: Add admin role for privileged endpoints
   - H4: Fix missing SettingsPanel props
   - H5: Fix localStorage key mismatch
   - H7: Fix double-counting bug
   - M5: Evaluate database migration

3. **Near-term improvements:**
   - H6: Fix sendBeacon progress sync
   - M1-M9: Address all medium findings
   - L6: Add test coverage for critical paths
   - L5: Add React error boundaries
