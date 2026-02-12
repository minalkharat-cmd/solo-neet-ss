import { Router } from 'express';
import { createOrder, verifyPayment, calculateSubscriptionEnd, PLANS, isConfigured as isPaymentConfigured } from '../payment.js';
import logger from '../lib/logger.js';

export function createSubscriptionRoutes({ dal, authMiddleware }) {
    const router = Router();

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
            const user = await dal.users.findById(req.userId);
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
            logger.error('Order creation failed', { error: error.message });
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

            const subscriptionEnd = calculateSubscriptionEnd(planId);
            const user = await dal.activateSubscription(req.userId, {
                planId, paymentId, orderId,
                amount: PLANS[planId].amount,
                subscriptionEnd
            });

            if (!user) return res.status(404).json({ error: 'User not found' });
            res.json({ success: true, message: 'Subscription activated', subscriptionEnd });
        } catch (error) {
            logger.error('Payment verification failed', { error: error.message });
            res.status(500).json({ error: 'Failed to verify payment' });
        }
    });

    return router;
}

// Premium middleware helper
export const createPremiumMiddleware = (dal) => async (req, res, next) => {
    const user = await dal.users.findById(req.userId);
    if (!user || !user.subscriptionEnd || new Date(user.subscriptionEnd) <= new Date()) {
        return res.status(403).json({ error: 'Premium subscription required', upgrade: true });
    }
    next();
};
