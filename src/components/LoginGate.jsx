import { useState } from 'react';
import { getGoogleAuthUrl, register, login } from '../services/api';

// Login Gate Component - Shown before accessing the app
export function LoginGate({ onLoginSuccess }) {
    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [hunterName, setHunterName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = () => {
        window.location.href = getGoogleAuthUrl();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let result;
            if (mode === 'register') {
                result = await register(username, email, password, hunterName || 'Hunter');
            } else {
                result = await login(email, password);
            }
            localStorage.setItem('user', JSON.stringify(result.user));
            onLoginSuccess(result.user);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-gate">
            <div className="login-container system-window">
                <div className="login-header">
                    <h1 className="login-title">SOLO NEET <span className="text-accent">SS</span></h1>
                    <p className="login-subtitle">"Arise, Hunter. Your journey begins."</p>
                </div>

                {/* Google OAuth Button */}
                <button
                    className="btn btn-google"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                <div className="login-divider">
                    <span>or</span>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleSubmit} className="login-form">
                    {mode === 'register' && (
                        <>
                            <input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="login-input"
                            />
                            <input
                                type="text"
                                placeholder="Hunter Name (optional)"
                                value={hunterName}
                                onChange={(e) => setHunterName(e.target.value)}
                                className="login-input"
                            />
                        </>
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="login-input"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="login-input"
                    />

                    {error && <div className="login-error">{error}</div>}

                    <button
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={loading}
                    >
                        {loading ? '...' : (mode === 'register' ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                <div className="login-switch">
                    {mode === 'login' ? (
                        <p>New hunter? <button onClick={() => setMode('register')}>Register here</button></p>
                    ) : (
                        <p>Already a hunter? <button onClick={() => setMode('login')}>Sign in</button></p>
                    )}
                </div>

                {/* Skip login for offline mode */}
                <button
                    className="btn-link login-skip"
                    onClick={() => onLoginSuccess(null)}
                >
                    Continue offline (progress won't sync)
                </button>
            </div>

            <style>{`
        .login-gate {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          padding: 20px;
        }
        .login-container {
          max-width: 400px;
          width: 100%;
          padding: 40px 30px;
          text-align: center;
        }
        .login-header {
          margin-bottom: 30px;
        }
        .login-title {
          font-size: 2.5rem;
          margin-bottom: 8px;
        }
        .login-subtitle {
          color: var(--text-secondary);
          font-style: italic;
        }
        .btn-google {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px 20px;
          background: #fff;
          color: #333;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-google:hover {
          background: #f1f1f1;
        }
        .login-divider {
          display: flex;
          align-items: center;
          margin: 20px 0;
          color: var(--text-secondary);
        }
        .login-divider::before,
        .login-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .login-divider span {
          padding: 0 15px;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .login-input {
          padding: 12px 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 1rem;
        }
        .login-input:focus {
          outline: none;
          border-color: var(--accent);
        }
        .login-error {
          color: #ff4757;
          font-size: 0.9rem;
        }
        .btn-full {
          width: 100%;
          padding: 12px;
        }
        .login-switch {
          margin-top: 20px;
          color: var(--text-secondary);
        }
        .login-switch button {
          background: none;
          border: none;
          color: var(--accent);
          cursor: pointer;
          text-decoration: underline;
        }
        .login-skip {
          margin-top: 15px;
          color: var(--text-secondary);
          font-size: 0.85rem;
        }
        .btn-link {
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: underline;
        }
        .btn-link:hover {
          color: var(--text-primary);
        }
      `}</style>
        </div>
    );
}
