import { describe, it, expect } from 'vitest';
import { verifyPayment, calculateSubscriptionEnd, isConfigured, PLANS } from '../payment.js';

describe('Payment Module', () => {
    describe('PLANS', () => {
        it('has monthly and yearly plans', () => {
            expect(PLANS.monthly).toBeDefined();
            expect(PLANS.yearly).toBeDefined();
        });

        it('monthly plan has correct structure', () => {
            expect(PLANS.monthly.amount).toBeGreaterThan(0);
            expect(PLANS.monthly.currency).toBe('INR');
            expect(PLANS.monthly.duration).toBe(30);
        });

        it('yearly plan costs less per month than monthly', () => {
            const monthlyPerMonth = PLANS.monthly.amount;
            const yearlyPerMonth = PLANS.yearly.amount / 12;
            expect(yearlyPerMonth).toBeLessThan(monthlyPerMonth);
        });
    });

    describe('calculateSubscriptionEnd', () => {
        it('adds 30 days for monthly plan', () => {
            const end = calculateSubscriptionEnd('monthly');
            const endDate = new Date(end);
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() + 30);
            // Allow 1 second tolerance
            expect(Math.abs(endDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
        });

        it('adds 365 days for yearly plan', () => {
            const end = calculateSubscriptionEnd('yearly');
            const endDate = new Date(end);
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() + 365);
            expect(Math.abs(endDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
        });

        it('returns ISO string', () => {
            const end = calculateSubscriptionEnd('monthly');
            expect(end).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });
    });

    describe('isConfigured', () => {
        it('returns false when Razorpay credentials not set', () => {
            // In test environment, Razorpay is not initialized
            expect(isConfigured()).toBe(false);
        });
    });

    describe('verifyPayment', () => {
        it('throws when credentials not configured', () => {
            // Without RAZORPAY_KEY_SECRET env var, should throw
            const originalSecret = process.env.RAZORPAY_KEY_SECRET;
            delete process.env.RAZORPAY_KEY_SECRET;
            expect(() => verifyPayment('order_1', 'pay_1', 'sig_1')).toThrow('credentials not configured');
            if (originalSecret) process.env.RAZORPAY_KEY_SECRET = originalSecret;
        });
    });
});
