import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from '../lib/logger.js';

describe('Logger', () => {
    let stdoutSpy: ReturnType<typeof vi.spyOn>;
    let stderrSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
        stdoutSpy.mockRestore();
        stderrSpy.mockRestore();
    });

    it('creates a logger with all log methods', () => {
        const logger = createLogger();
        expect(typeof logger.error).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.debug).toBe('function');
        expect(typeof logger.child).toBe('function');
    });

    it('writes error to stderr', () => {
        const logger = createLogger();
        logger.error('test error', { code: 500 });
        expect(stderrSpy).toHaveBeenCalled();
        const output = stderrSpy.mock.calls[0][0] as string;
        expect(output).toContain('ERROR');
        expect(output).toContain('test error');
    });

    it('writes info to stdout', () => {
        const logger = createLogger();
        logger.info('test info');
        expect(stdoutSpy).toHaveBeenCalled();
        const output = stdoutSpy.mock.calls[0][0] as string;
        expect(output).toContain('INFO');
        expect(output).toContain('test info');
    });

    it('child logger inherits context', () => {
        const parent = createLogger({ service: 'api' });
        const child = parent.child({ module: 'auth' });
        child.info('child message');
        expect(stdoutSpy).toHaveBeenCalled();
        const output = stdoutSpy.mock.calls[0][0] as string;
        expect(output).toContain('child message');
    });
});
