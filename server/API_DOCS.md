# Solo NEET SS — API Documentation

Base URL: `/api`

All authenticated endpoints require either:
- `Authorization: Bearer <token>` header, or
- `auth_token` HTTP-only cookie

---

## Health

### `GET /api/health`

Returns server health status.

**Auth**: None

**Response** `200`:
```json
{ "status": "ok" }
```

---

## Authentication

### `POST /api/auth/register`

Create a new account.

**Auth**: None (rate-limited)

**Body**:
```json
{
  "username": "hunter_01",
  "email": "user@example.com",
  "password": "SecureP@ss1",
  "hunterName": "Shadow Monarch"
}
```

**Validation**:
- `username`: 3+ chars, alphanumeric + underscores only
- `email`: Valid email format
- `password`: 8+ chars, 1 uppercase, 1 lowercase, 1 number

**Response** `200`:
```json
{
  "token": "eyJhbG...",
  "user": { "id": "uuid", "username": "hunter_01", "email": "user@example.com", "hunterName": "Shadow Monarch" }
}
```

**Errors**: `400` (validation), `400` (duplicate username/email)

---

### `POST /api/auth/login`

Authenticate with email and password.

**Auth**: None (rate-limited)

**Body**:
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss1"
}
```

**Response** `200`:
```json
{
  "token": "eyJhbG...",
  "user": { "id": "uuid", "username": "hunter_01", "email": "user@example.com", "hunterName": "Shadow Monarch", "avatar": null }
}
```

**Errors**: `401` (invalid credentials)

---

### `GET /api/auth/me`

Get current authenticated user profile.

**Auth**: Required

**Response** `200`:
```json
{
  "user": { "id": "uuid", "username": "hunter_01", "email": "user@example.com", "hunterName": "Shadow Monarch", "avatar": null }
}
```

**Errors**: `401` (no token), `404` (user not found)

---

### `GET /api/auth/google`

Initiate Google OAuth 2.0 login flow. Redirects to Google consent screen.

**Auth**: None

**Response**: `302` redirect to Google

**Note**: Returns `503` if Google OAuth is not configured.

---

### `GET /api/auth/google/callback`

Google OAuth callback. Sets HTTP-only cookie (web) or redirects with deep link (mobile).

**Auth**: None (handled by Passport.js)

---

## Progress

### `GET /api/progress`

Get the authenticated user's progress.

**Auth**: Required

**Response** `200`:
```json
{
  "userId": "uuid",
  "level": 5,
  "currentXP": 200,
  "totalXP": 1200,
  "questionsAnswered": 50,
  "correctAnswers": 35,
  "currentStreak": 3,
  "bestStreak": 10,
  "dungeonsCleared": 2,
  "perfectDungeons": 1,
  "achievements": ["first_blood"],
  "subjectProgress": {
    "cardiology": { "answered": 20, "correct": 15 },
    "neurology": { "answered": 10, "correct": 7 }
  }
}
```

**Errors**: `404` (no progress record)

---

### `POST /api/progress`

Save/update the authenticated user's progress. Also syncs the leaderboard entry.

**Auth**: Required

**Body** (all fields optional):
```json
{
  "level": 6,
  "currentXP": 100,
  "totalXP": 1500,
  "questionsAnswered": 55,
  "correctAnswers": 40,
  "currentStreak": 5,
  "bestStreak": 10,
  "dungeonsCleared": 3,
  "perfectDungeons": 1,
  "subjectProgress": { "cardiology": { "answered": 25, "correct": 20 } }
}
```

**Response** `200`:
```json
{ "success": true }
```

**Errors**: `404` (user progress not found)

---

## Leaderboard

### `GET /api/leaderboard`

Get the top players sorted by XP.

**Auth**: None

**Query params**:
| Param | Type | Default | Max |
|-------|------|---------|-----|
| `limit` | number | 50 | 100 |

**Response** `200`:
```json
[
  { "userId": "uuid", "username": "rival", "hunterName": "Rival", "level": 10, "totalXP": 5000, "rank": "B" },
  { "userId": "uuid", "username": "hunter_01", "hunterName": "Shadow Monarch", "level": 5, "totalXP": 1200, "rank": "D" }
]
```

---

### `GET /api/leaderboard/me`

Get the authenticated user's rank position.

**Auth**: Required

**Response** `200`:
```json
{
  "rank": 2,
  "entry": { "userId": "uuid", "username": "hunter_01", "hunterName": "Shadow Monarch", "level": 5, "totalXP": 1200, "rank": "D" },
  "totalPlayers": 150
}
```

---

## Spaced Repetition (SRS)

### `GET /api/srs/due`

Get questions due for review today (SM-2 algorithm).

**Auth**: Required

**Response** `200`:
```json
{
  "count": 5,
  "questions": [
    {
      "questionId": "q-123",
      "userId": "uuid",
      "repetition": 3,
      "easeFactor": 2.6,
      "interval": 6,
      "nextReview": "2025-06-15",
      "lastAttempt": "2025-06-09T10:30:00Z",
      "attempts": [],
      "createdAt": "2025-06-01T00:00:00Z"
    }
  ]
}
```

Returns max 20 questions per request.

---

### `GET /api/srs/stats`

Get SRS statistics for the authenticated user.

**Auth**: Required

**Response** `200`:
```json
{
  "total": 50,
  "dueToday": 5,
  "mastered": 20,
  "learning": 25,
  "new": 5,
  "averageEase": 2.5,
  "totalReviews": 150
}
```

---

### `POST /api/srs/answer`

Record an answer and update the SRS schedule.

**Auth**: Required

**Body**:
```json
{
  "questionId": "q-123",
  "correct": true,
  "timeMs": 5000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `questionId` | string | Yes | Question identifier |
| `correct` | boolean | Yes | Whether the answer was correct |
| `timeMs` | number | No | Response time in milliseconds (default: 15000) |

**Response** `200`:
```json
{
  "success": true,
  "nextReview": "2025-06-16",
  "interval": 1,
  "easeFactor": 2.5
}
```

**Errors**: `400` (missing questionId)

---

### `POST /api/srs/init-batch`

Initialize SRS records for multiple questions. Skips questions that already have records.

**Auth**: Required

**Body**:
```json
{
  "questionIds": ["q-1", "q-2", "q-3"]
}
```

**Response** `200`:
```json
{ "success": true, "added": 3 }
```

**Errors**: `400` (missing/invalid questionIds)

---

## Questions (AI Generation)

### `POST /api/questions/pubmed/search`

Search PubMed for medical articles.

**Auth**: Required

**Body**:
```json
{
  "query": "cardiology atrial fibrillation",
  "limit": 5
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | Yes | Search query (min 3 chars) |
| `limit` | number | No | Max results (default: 5, max: 10) |

**Response** `200`:
```json
{
  "success": true,
  "query": "cardiology atrial fibrillation",
  "count": 5,
  "articles": [
    {
      "pmid": "12345678",
      "title": "Article Title",
      "abstract": "Truncated abstract...",
      "authors": ["Author A", "Author B"],
      "journal": "Journal Name",
      "year": "2024"
    }
  ]
}
```

---

### `POST /api/questions/pubmed/generate`

Generate MCQ questions from PubMed articles using AI.

**Auth**: Required

**Body**:
```json
{
  "pmids": ["12345678", "87654321"],
  "specialty": "cardiology",
  "provider": "gemini"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pmids` | string[] | Yes | PubMed article IDs |
| `specialty` | string | No | Medical specialty (default: "general") |
| `provider` | string | No | `gemini` or `ollama` (uses server default) |

**Response** `200`:
```json
{
  "success": true,
  "provider": "gemini",
  "model": "gemini-1.5-flash",
  "generated": 4,
  "errors": 0,
  "questions": [
    {
      "id": "gen-uuid",
      "question": "What is the most common cause of...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "difficulty": "medium",
      "xp": 25,
      "explanation": "The correct answer is A because..."
    }
  ]
}
```

---

### `GET /api/questions/llm/status`

Get LLM provider status and availability.

**Auth**: None

**Response** `200`:
```json
{
  "currentProvider": "gemini",
  "ollama": { "available": false, "error": "Connection refused" },
  "gemini": { "configured": true, "model": "gemini-1.5-flash" }
}
```

---

### `POST /api/questions/llm/provider`

Switch the active LLM provider.

**Auth**: Required (Admin only)

**Body**:
```json
{ "provider": "ollama" }
```

**Response** `200`:
```json
{ "success": true, "provider": "ollama", "model": "llama3:70b" }
```

**Errors**: `400` (invalid provider), `403` (not admin), `503` (provider unavailable)

---

### `GET /api/questions/questions/generated`

List generated questions.

**Auth**: Required

**Query params**:
| Param | Type | Description |
|-------|------|-------------|
| `reviewed` | `true`/`false` | Filter by review status |

**Response** `200`:
```json
{
  "total": 12,
  "questions": [...]
}
```

Returns max 50 most recent questions.

---

### `PATCH /api/questions/questions/generated/:id`

Approve or reject a generated question.

**Auth**: Required

**Body**:
```json
{
  "approved": true,
  "specialty": "cardiology"
}
```

**Response** `200`:
```json
{ "success": true }
```

**Errors**: `404` (question not found)

---

## Subscriptions

### `GET /api/subscription/plans`

Get available subscription plans.

**Auth**: None

**Response** `200`:
```json
{
  "configured": true,
  "plans": [
    { "id": "monthly", "name": "Monthly Hunter Pass", "amount": 299, "currency": "INR", "duration": 30 },
    { "id": "yearly", "name": "Yearly Hunter Pass", "amount": 2399, "currency": "INR", "duration": 365 }
  ]
}
```

---

### `GET /api/subscription/status`

Get the authenticated user's subscription status.

**Auth**: Required

**Response** `200`:
```json
{
  "isPremium": true,
  "subscriptionEnd": "2025-07-15T00:00:00Z",
  "plan": "monthly"
}
```

---

### `POST /api/subscription/create-order`

Create a Razorpay payment order.

**Auth**: Required

**Body**:
```json
{ "planId": "monthly" }
```

**Response** `200`:
```json
{
  "success": true,
  "order": { "id": "order_...", "amount": 29900, "currency": "INR" }
}
```

**Errors**: `400` (invalid plan), `503` (payment gateway not configured)

---

### `POST /api/subscription/verify`

Verify Razorpay payment and activate subscription.

**Auth**: Required

**Body**:
```json
{
  "orderId": "order_...",
  "paymentId": "pay_...",
  "signature": "hmac_signature",
  "planId": "monthly"
}
```

**Response** `200`:
```json
{
  "success": true,
  "message": "Subscription activated",
  "subscriptionEnd": "2025-07-15T00:00:00Z"
}
```

**Errors**: `400` (verification failed), `404` (user not found)

---

## Socket.io — PvP Battles

**Namespace**: Default (`/`)

**Auth**: JWT token required in `auth.token` handshake parameter.

### Events (Client → Server)

| Event | Payload | Description |
|-------|---------|-------------|
| `pvp:join-queue` | `{ subject?: string }` | Join matchmaking queue |
| `pvp:leave-queue` | — | Leave matchmaking queue |
| `pvp:answer` | `{ roomId, questionIndex, answer, timeMs }` | Submit an answer |
| `pvp:create-private` | `{ subject?: string }` | Create a private room |
| `pvp:join-private` | `{ roomCode }` | Join a private room by code |

### Events (Server → Client)

| Event | Payload | Description |
|-------|---------|-------------|
| `pvp:matched` | `{ roomId, opponent, questions }` | Match found, battle starting |
| `pvp:opponent-answered` | `{ questionIndex, correct, score }` | Opponent submitted an answer |
| `pvp:answer-result` | `{ correct, correctAnswer, score }` | Your answer result |
| `pvp:battle-end` | `{ winner, scores, stats }` | Battle finished |
| `pvp:private-created` | `{ roomCode }` | Private room code |
| `pvp:error` | `{ message }` | Error message |

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Human-readable error message",
  "requestId": "uuid"
}
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request / validation error |
| `401` | Authentication required or token invalid |
| `403` | Forbidden (not admin / not premium) |
| `404` | Resource not found |
| `429` | Rate limit exceeded |
| `500` | Internal server error |
| `503` | Service unavailable (feature not configured) |

---

## Response Headers

| Header | Description |
|--------|-------------|
| `X-Request-Id` | Unique request identifier for tracing |
| Various Helmet headers | Security headers (CSP, HSTS, X-Frame-Options, etc.) |
