// Solo NEET SS - Razorpay Payment Module
import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret'
});

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
        console.error('Razorpay order creation failed:', error);
        throw new Error('Failed to create payment order');
    }
}

// Verify Payment Signature
export function verifyPayment(orderId, paymentId, signature) {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret')
        .update(body)
        .digest('hex');

    return expectedSignature === signature;
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
    try {
        const payment = await razorpay.payments.fetch(paymentId);
        return payment;
    } catch (error) {
        console.error('Failed to fetch payment:', error);
        return null;
    }
}

// Check if Razorpay is configured
export function isConfigured() {
    return process.env.RAZORPAY_KEY_ID &&
        process.env.RAZORPAY_KEY_ID !== 'rzp_test_placeholder' &&
        process.env.RAZORPAY_KEY_SECRET &&
        process.env.RAZORPAY_KEY_SECRET !== 'placeholder_secret';
}

export default {
    createOrder,
    verifyPayment,
    calculateSubscriptionEnd,
    getPaymentDetails,
    isConfigured,
    PLANS
};
