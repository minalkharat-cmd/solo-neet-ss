// Solo NEET SS - Firebase Push Notification Service
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: "AIzaSyBOWRSfWUg30IyckM4_mLpNvFWNKQtwvYI",
    authDomain: "mcq-challenge-7qfwx.firebaseapp.com",
    projectId: "mcq-challenge-7qfwx",
    storageBucket: "mcq-challenge-7qfwx.firebasestorage.app",
    messagingSenderId: "1048730259088",
    appId: "1:1048730259088:web:06b4e2edd26a6678641215"
};

const VAPID_KEY = 'BNUaO6j4a9uv1znFfjUKgJ5JeD4KjGrNMs1Kfs103nIck5H76jTsgqBX2pbWRgxe3qv-0iJ8ZIJGQZjzhS7EeQY';

let app = null;
let messaging = null;

const getFirebaseMessaging = () => {
    if (!messaging) {
        app = initializeApp(firebaseConfig);
        messaging = getMessaging(app);
    }
    return messaging;
};

/**
 * Request notification permission and get FCM token
 * @returns {Promise<string|null>} FCM token or null if denied
 */
export const requestNotificationPermission = async () => {
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('🔕 Notification permission denied');
            return null;
        }

        const msg = getFirebaseMessaging();
        const token = await getToken(msg, { vapidKey: VAPID_KEY });
        console.log('🔔 FCM Token:', token);
        return token;
    } catch (err) {
        console.error('❌ FCM token error:', err);
        return null;
    }
};

/**
 * Register a foreground message handler
 * @param {Function} callback - Called with { title, body, data }
 * @returns {Function} Unsubscribe function
 */
export const onForegroundMessage = (callback) => {
    const msg = getFirebaseMessaging();
    return onMessage(msg, (payload) => {
        console.log('📬 Foreground message:', payload);
        callback({
            title: payload.notification?.title || '🏥 Solo NEET SS',
            body: payload.notification?.body || 'New notification',
            data: payload.data
        });
    });
};

/**
 * Register FCM token with the server
 */
export const registerTokenWithServer = async (fcmToken) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';
    const authToken = localStorage.getItem('soloNeetSS_token');
    if (!authToken) return;

    try {
        await fetch(`${API_BASE}/api/notifications/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
            body: JSON.stringify({ fcmToken })
        });
    } catch (err) {
        console.error('Failed to register FCM token:', err);
    }
};

/**
 * Check if notifications are supported
 */
export const isNotificationsSupported = () => {
    return 'Notification' in window && 'serviceWorker' in navigator;
};
