// Solo NEET SS - Razorpay Payment Module
import Razorpay from 'razorpay';
import crypto from 'crypto';
import logger from './lib/logger.js';

// Initialize Razorpay instance only if credentials are configured
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    logger.info('Payment gateway initialized', { provider: 'Razorpay' });
} else {
    logger.warn('Payment gateway not configured', { hint: 'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET' });
}

// Subscription Plans
export const PLANS = {
    monthly: {
        id: 'premium_monthly',
        name: 'Premium Monthly',
        amount: 29900, // in paise (₹299)
        currency: 'INR',
        duration: 30 // days
    },
    yearly: {
        id: 'premium_yearly',
        name: 'Premium Yearly',
        amount: 249900, // in paise (₹2499)
        currency: 'INR',
        duration: 365 // days
    }
};

// Create Razorpay Order
export async function createOrder(planId, userId) {
    if (!razorpay) {
        throw new Error('Payment gateway not configured');
    }

    const plan = PLANS[planId];
    if (!plan) {
        throw new Error('Invalid plan');
    }

    const options = {
        amount: plan.amount,
        currency: plan.currency,
        receipt: `order_${userId}_${Date.now()}`,
        notes: {
            userId,
            planId
        }
    };

    try {
        const order = await razorpay.orders.create(options);
        return {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            planName: plan.name,
            keyId: process.env.RAZORPAY_KEY_ID
        };
    } catch (error) {
        logger.error('Razorpay order creation failed', { error: error.message });
        throw new Error('Failed to create payment order');
    }
}

// Verify Payment Signature
export function verifyPayment(orderId, paymentId, signature) {
    if (!process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('Payment verification unavailable: credentials not configured');
    }

    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(signature, 'hex')
        );
    } catch {
        return false;
    }
}

// Calculate subscription end date
export function calculateSubscriptionEnd(planId) {
    const plan = PLANS[planId];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);
    return endDate.toISOString();
}

// Get payment details
export async function getPaymentDetails(paymentId) {
    if (!razorpay) return null;
    try {
        const payment = await razorpay.payments.fetch(paymentId);
        return payment;
    } catch (error) {
        logger.error('Failed to fetch payment details', { error: error.message });
        return null;
    }
}

// Check if Razorpay is configured
export function isConfigured() {
    return razorpay !== null;
}

export default {
    createOrder,
    verifyPayment,
    calculateSubscriptionEnd,
    getPaymentDetails,
    isConfigured,
    PLANS
};
