// Solo NEET SS - API Service Layer
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

// Token management
const getToken = () => localStorage.getItem('soloNeetSS_token');
const setToken = (token) => localStorage.setItem('soloNeetSS_token', token);
const removeToken = () => localStorage.removeItem('soloNeetSS_token');

// User management  
const getUser = () => {
    const user = localStorage.getItem('soloNeetSS_user');
    return user ? JSON.parse(user) : null;
};
const setUser = (user) => localStorage.setItem('soloNeetSS_user', JSON.stringify(user));
const removeUser = () => localStorage.removeItem('soloNeetSS_user');

// Fetch wrapper with auth
const fetchWithAuth = async (endpoint, options = {}) => {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include'
    });

    if (response.status === 401) {
        removeToken();
        removeUser();
        throw new Error('Session expired. Please login again.');
    }

    return response;
};

// ============ AUTH API ============

export const auth = {
    // Register new user
    async register(username, email, password, hunterName) {
        const res = await fetchWithAuth('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password, hunterName })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Registration failed');
        }

        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        return data;
    },

    // Login
    async login(email, password) {
        const res = await fetchWithAuth('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Login failed');
        }

        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        return data;
    },

    // Get current user
    async me() {
        const res = await fetchWithAuth('/api/auth/me');
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
    },

    // Get Google OAuth URL
    getGoogleUrl() {
        return `${API_BASE}/api/auth/google`;
    },

    // Handle OAuth callback (call on page load with URL params)
    handleOAuthCallback() {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const userStr = params.get('user');

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                setToken(token);
                setUser(user);
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
                return { token, user };
            } catch (e) {
                console.error('OAuth callback parse error:', e);
            }
        }
        return null;
    },

    // Logout
    logout() {
        removeToken();
        removeUser();
    },

    // Check if authenticated
    isAuthenticated() {
        return !!getToken();
    },

    // Get current user from localStorage
    getUser,
    getToken
};

// ============ PROGRESS API ============

export const progress = {
    // Get progress from server
    async get() {
        const res = await fetchWithAuth('/api/progress');
        if (!res.ok) throw new Error('Failed to fetch progress');
        return res.json();
    },

    // Save progress to server (debounced usage recommended)
    async save(gameState) {
        const res = await fetchWithAuth('/api/progress', {
            method: 'POST',
            body: JSON.stringify({
                level: gameState.level,
                currentXP: gameState.currentXP,
                totalXP: gameState.totalXP,
                questionsAnswered: gameState.questionsAnswered,
                correctAnswers: gameState.correctAnswers,
                currentStreak: gameState.currentStreak,
                bestStreak: gameState.bestStreak,
                dungeonsCleared: gameState.dungeonsCleared,
                perfectDungeons: gameState.perfectDungeons,
                unlockedAchievements: gameState.unlockedAchievements || [],
                subjectProgress: gameState.subjectProgress || {}
            })
        });

        if (!res.ok) {
            console.error('Failed to save progress');
            return false;
        }
        return true;
    },

    // Beacon sync for exit (non-blocking)
    saveBeacon(gameState) {
        const token = getToken();
        if (!token) return;

        const payload = JSON.stringify({
            level: gameState.level,
            currentXP: gameState.currentXP,
            totalXP: gameState.totalXP,
            questionsAnswered: gameState.questionsAnswered,
            correctAnswers: gameState.correctAnswers,
            currentStreak: gameState.currentStreak,
            bestStreak: gameState.bestStreak,
            dungeonsCleared: gameState.dungeonsCleared,
            perfectDungeons: gameState.perfectDungeons,
            unlockedAchievements: gameState.unlockedAchievements || [],
            subjectProgress: gameState.subjectProgress || {}
        });

        // Use sendBeacon for reliable exit sync
        navigator.sendBeacon(
            `${API_BASE}/api/progress`,
            new Blob([payload], { type: 'application/json' })
        );
    }
};

// ============ LEADERBOARD API ============

export const leaderboard = {
    // Get top players
    async getTop(limit = 50) {
        const res = await fetch(`${API_BASE}/api/leaderboard?limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch leaderboard');
        return res.json();
    },

    // Get current user's rank
    async getMyRank() {
        const res = await fetchWithAuth('/api/leaderboard/me');
        if (!res.ok) throw new Error('Failed to fetch rank');
        return res.json();
    }
};

// ============ PVP API ============

export const pvp = {
    // Get queue status
    async getStatus() {
        const res = await fetch(`${API_BASE}/api/pvp/status`);
        if (!res.ok) throw new Error('Failed to fetch PvP status');
        return res.json();
    }
};

// Debounce utility for progress saves
let saveTimeout = null;
export const debouncedSave = (gameState, delay = 5000) => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        if (auth.isAuthenticated()) {
            progress.save(gameState);
        }
    }, delay);
};

// Combined API export
export const api = {
    auth,
    progress,
    leaderboard,
    pvp,
    debouncedSave
};

// ============ LEGACY NAMED EXPORTS (for component compatibility) ============
// These are used by LoginGate.jsx and App.jsx

export { getToken, setToken };
export const getGoogleAuthUrl = () => auth.getGoogleUrl();
export const register = (username, email, password, hunterName) => auth.register(username, email, password, hunterName);
export const login = (email, password) => auth.login(email, password);
export const logout = () => auth.logout();
export const getMe = () => auth.me();
export const saveProgress = (gameState) => progress.save(gameState);

export default api;
