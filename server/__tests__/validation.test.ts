import { describe, it, expect } from 'vitest';
import { sanitizeInput, validatePassword, validateEmail } from '../middleware/validation.js';

describe('Input Validation', () => {
    describe('sanitizeInput', () => {
        it('strips HTML tags', () => {
            expect(sanitizeInput('<script>alert("xss")</script>Hello')).toBe('alert("xss")Hello');
        });

        it('trims whitespace', () => {
            expect(sanitizeInput('  hello  ')).toBe('hello');
        });

        it('truncates to maxLength', () => {
            expect(sanitizeInput('abcdefghij', 5)).toBe('abcde');
        });

        it('returns empty string for non-string input', () => {
            expect(sanitizeInput(null as unknown as string)).toBe('');
            expect(sanitizeInput(undefined as unknown as string)).toBe('');
            expect(sanitizeInput(123 as unknown as string)).toBe('');
        });

        it('uses default maxLength of 100', () => {
            const longStr = 'a'.repeat(150);
            expect(sanitizeInput(longStr)).toHaveLength(100);
        });

        it('handles nested HTML tags', () => {
            expect(sanitizeInput('<div><p>hello</p></div>')).toBe('hello');
        });
    });

    describe('validatePassword', () => {
        it('rejects passwords shorter than 8 characters', () => {
            expect(validatePassword('Ab1')).toContain('at least 8');
        });

        it('rejects passwords longer than 128 characters', () => {
            const long = 'Aa1' + 'x'.repeat(130);
            expect(validatePassword(long)).toContain('less than 128');
        });

        it('rejects passwords without letters', () => {
            expect(validatePassword('12345678')).toContain('at least one letter');
        });

        it('rejects passwords without numbers', () => {
            expect(validatePassword('abcdefgh')).toContain('at least one number');
        });

        it('accepts valid passwords', () => {
            expect(validatePassword('SecurePass1')).toBeNull();
        });

        it('rejects empty password', () => {
            expect(validatePassword('')).toBeTruthy();
        });
    });

    describe('validateEmail', () => {
        it('accepts valid emails', () => {
            expect(validateEmail('user@example.com')).toBe(true);
            expect(validateEmail('test.name@domain.co.in')).toBe(true);
        });

        it('rejects invalid emails', () => {
            expect(validateEmail('not-an-email')).toBe(false);
            expect(validateEmail('@domain.com')).toBe(false);
            expect(validateEmail('user@')).toBe(false);
            expect(validateEmail('')).toBe(false);
        });
    });
});
