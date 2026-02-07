import { useState, useEffect, useCallback } from 'react';
import { requestNotificationPermission, onForegroundMessage, registerTokenWithServer, isNotificationsSupported } from '../services/notifications';

export const NotificationBell = () => {
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const checkStatus = useCallback(() => {
        if (!isNotificationsSupported()) return;
        setEnabled(Notification.permission === 'granted' && !!localStorage.getItem('soloNeetSS_fcmToken'));
    }, []);

    useEffect(() => { checkStatus(); }, [checkStatus]);

    // Listen for foreground messages
    useEffect(() => {
        if (!enabled || !isNotificationsSupported()) return;
        const unsub = onForegroundMessage(({ title, body }) => {
            setToast({ title, body });
            setTimeout(() => setToast(null), 5000);
        });
        return unsub;
    }, [enabled]);

    const enableNotifications = async () => {
        setLoading(true);
        const token = await requestNotificationPermission();
        if (token) {
            localStorage.setItem('soloNeetSS_fcmToken', token);
            await registerTokenWithServer(token);
            setEnabled(true);
        }
        setLoading(false);
    };

    if (!isNotificationsSupported()) return null;

    return (
        <>
            <button
                onClick={enabled ? undefined : enableNotifications}
                disabled={loading}
                title={enabled ? 'Notifications enabled' : 'Enable study reminders'}
                style={{
                    background: enabled ? '#10b98122' : '#7c3aed22',
                    border: `1px solid ${enabled ? '#10b981' : '#7c3aed'}`,
                    color: enabled ? '#10b981' : '#a855f7',
                    borderRadius: '10px', padding: '6px 12px',
                    cursor: enabled ? 'default' : 'pointer',
                    fontSize: '0.8rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '6px',
                    opacity: loading ? 0.6 : 1
                }}
            >
                {loading ? '⏳' : enabled ? '🔔' : '🔕'}
                {loading ? 'Enabling...' : enabled ? 'Reminders On' : 'Enable Reminders'}
            </button>

            {/* Foreground toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 99999,
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                    border: '1px solid #7c3aed', borderRadius: '14px',
                    padding: '16px 20px', maxWidth: '320px',
                    boxShadow: '0 8px 32px rgba(124, 58, 237, 0.3)',
                    animation: 'slideInRight 0.3s ease'
                }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>
                        {toast.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{toast.body}</div>
                    <button onClick={() => setToast(null)} style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'none', border: 'none', color: '#64748b',
                        cursor: 'pointer', fontSize: '0.9rem'
                    }}>✕</button>
                </div>
            )}
        </>
    );
};
