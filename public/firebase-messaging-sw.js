// Firebase Messaging Service Worker
// This file MUST be at the root of the public directory

importScripts('https://www.gstatic.com/firebasejs/11.5.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.5.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBOWRSfWUg30IyckM4_mLpNvFWNKQtwvYI",
    authDomain: "mcq-challenge-7qfwx.firebaseapp.com",
    projectId: "mcq-challenge-7qfwx",
    storageBucket: "mcq-challenge-7qfwx.firebasestorage.app",
    messagingSenderId: "1048730259088",
    appId: "1:1048730259088:web:06b4e2edd26a6678641215"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('📬 Background message:', payload);

    const { title, body, icon } = payload.notification || {};

    self.registration.showNotification(title || '🏥 Solo NEET SS', {
        body: body || 'Time to study, Hunter!',
        icon: icon || '/vite.svg',
        badge: '/vite.svg',
        tag: 'solo-neet-ss',
        data: payload.data,
        actions: [
            { action: 'open', title: '📖 Open App' },
            { action: 'dismiss', title: '❌ Dismiss' }
        ]
    });
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'open' || !event.action) {
        event.waitUntil(clients.openWindow('/'));
    }
});
