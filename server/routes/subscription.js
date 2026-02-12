import { Router } from 'express';
import crypto from 'crypto';
import { createOrder, verifyPayment, calculateSubscriptionEnd, PLANS, isConfigured as isPaymentConfigured } from '../payment.js';

export function createSubscriptionRoutes({ db, authMiddleware }) {
    const router = Router();
    const generateId = () => crypto.randomUUID();

    // Get subscription plans
    router.get('/plans', (req, res) => {
        res.json({
            configured: isPaymentConfigured(),
            plans: Object.entries(PLANS).map(([id, plan]) => ({
                id,
                name: plan.name,
                amount: plan.amount / 100,
                currency: plan.currency,
                duration: plan.duration
            }))
        });
    });

    // Get user subscription status
    router.get('/status', authMiddleware, async (req, res) => {
        try {
            await db.read();
            const user = db.data.users.find(u => u.id === req.userId);
            if (!user) return res.status(404).json({ error: 'User not found' });

            const isPremium = user.subscriptionEnd && new Date(user.subscriptionEnd) > new Date();
            res.json({
                isPremium,
                subscriptionEnd: user.subscriptionEnd || null,
                plan: user.subscriptionPlan || null
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to get subscription status' });
        }
    });

    // Create payment order
    router.post('/create-order', authMiddleware, async (req, res) => {
        try {
            const { planId } = req.body;
            if (!isPaymentConfigured()) {
                return res.status(503).json({ error: 'Payment gateway not configured' });
            }
            if (!planId || !PLANS[planId]) {
                return res.status(400).json({ error: 'Invalid plan' });
            }
            const order = await createOrder(planId, req.userId);
            res.json({ success: true, order });
        } catch (error) {
            console.error('Order creation failed:', error);
            res.status(500).json({ error: 'Failed to create order' });
        }
    });

    // Verify payment and activate subscription
    router.post('/verify', authMiddleware, async (req, res) => {
        try {
            const { orderId, paymentId, signature, planId } = req.body;
            if (!verifyPayment(orderId, paymentId, signature)) {
                return res.status(400).json({ error: 'Payment verification failed' });
            }

            await db.read();
            const userIndex = db.data.users.findIndex(u => u.id === req.userId);
            if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

            const subscriptionEnd = calculateSubscriptionEnd(planId);
            db.data.users[userIndex].isPremium = true;
            db.data.users[userIndex].subscriptionPlan = planId;
            db.data.users[userIndex].subscriptionEnd = subscriptionEnd;
            db.data.users[userIndex].subscriptionId = paymentId;

            if (!db.data.payments) db.data.payments = [];
            db.data.payments.push({
                id: generateId(),
                userId: req.userId,
                orderId, paymentId, planId,
                amount: PLANS[planId].amount,
                status: 'completed',
                createdAt: new Date().toISOString()
            });

            await db.write();
            res.json({ success: true, message: 'Subscription activated', subscriptionEnd });
        } catch (error) {
            console.error('Payment verification failed:', error);
            res.status(500).json({ error: 'Failed to verify payment' });
        }
    });

    return router;
}

// Premium middleware helper
export const createPremiumMiddleware = (db) => async (req, res, next) => {
    await db.read();
    const user = db.data.users.find(u => u.id === req.userId);
    if (!user || !user.subscriptionEnd || new Date(user.subscriptionEnd) <= new Date()) {
        return res.status(403).json({ error: 'Premium subscription required', upgrade: true });
    }
    next();
};
