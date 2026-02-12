/**
 * Input sanitization — strip HTML tags and trim
 */
export const sanitizeInput = (str: unknown, maxLength: number = 100): string => {
    if (typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '').trim().slice(0, maxLength);
};

/**
 * Password validation
 */
export const validatePassword = (password: string): string | null => {
    if (!password || password.length < 8) return 'Password must be at least 8 characters';
    if (password.length > 128) return 'Password must be less than 128 characters';
    if (!/[A-Za-z]/.test(password)) return 'Password must contain at least one letter';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
    return null;
};

/**
 * Email validation
 */
export const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};
