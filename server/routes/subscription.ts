import { Router } from 'express';
import type { Request, Response, NextFunction, Router as RouterType } from 'express';
import { createOrder, verifyPayment, calculateSubscriptionEnd, PLANS, isConfigured as isPaymentConfigured } from '../payment.js';
import logger from '../lib/logger.js';
import type { DAL, User } from '../types.js';

export function createSubscriptionRoutes({ dal, authMiddleware }: {
    dal: DAL;
    authMiddleware: (req: Request, res: Response, next: NextFunction) => void;
}): RouterType {
    const router: RouterType = Router();

    // Get subscription plans
    router.get('/plans', (req: Request, res: Response) => {
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
    router.get('/status', authMiddleware, async (req: Request, res: Response) => {
        try {
            const user: User | null = await dal.users.findById(req.userId);
            if (!user) return res.status(404).json({ error: 'User not found' });

            const isPremium: boolean = !!(user.subscriptionEnd && new Date(user.subscriptionEnd) > new Date());
            res.json({
                isPremium,
                subscriptionEnd: user.subscriptionEnd || null,
                plan: user.subscriptionPlan || null
            });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to get subscription status' });
        }
    });

    // Create payment order
    router.post('/create-order', authMiddleware, async (req: Request, res: Response) => {
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
        } catch (error: any) {
            logger.error('Order creation failed', { error: error.message });
            res.status(500).json({ error: 'Failed to create order' });
        }
    });

    // Verify payment and activate subscription
    router.post('/verify', authMiddleware, async (req: Request, res: Response) => {
        try {
            const { orderId, paymentId, signature, planId } = req.body;
            if (!verifyPayment(orderId, paymentId, signature)) {
                return res.status(400).json({ error: 'Payment verification failed' });
            }

            const subscriptionEnd: string = calculateSubscriptionEnd(planId);
            const user: User | null = await dal.activateSubscription(req.userId, {
                planId, paymentId, orderId,
                amount: PLANS[planId].amount,
                subscriptionEnd
            });

            if (!user) return res.status(404).json({ error: 'User not found' });
            res.json({ success: true, message: 'Subscription activated', subscriptionEnd });
        } catch (error: any) {
            logger.error('Payment verification failed', { error: error.message });
            res.status(500).json({ error: 'Failed to verify payment' });
        }
    });

    return router;
}

// Premium middleware helper
export const createPremiumMiddleware = (dal: DAL) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user: User | null = await dal.users.findById(req.userId);
    if (!user || !user.subscriptionEnd || new Date(user.subscriptionEnd) <= new Date()) {
        res.status(403).json({ error: 'Premium subscription required', upgrade: true });
        return;
    }
    next();
};
