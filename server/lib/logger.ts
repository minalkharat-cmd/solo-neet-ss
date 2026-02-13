// Structured JSON Logger
// Enterprise-grade logging with levels, timestamps, and context.
// Outputs JSON in production for log aggregators (Datadog, ELK, CloudWatch).
// Outputs human-readable colored text in development.

import type { Logger } from '../types.js';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };

const isProduction: boolean = process.env.NODE_ENV === 'production';
const configuredLevel: string = (process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug')).toLowerCase();
const currentLevel: number = LOG_LEVELS[configuredLevel as LogLevel] ?? LOG_LEVELS.info;

// ANSI colors for dev output
const COLORS: Record<string, string> = {
    error: '\x1b[31m',   // red
    warn: '\x1b[33m',    // yellow
    info: '\x1b[36m',    // cyan
    debug: '\x1b[90m',   // gray
    reset: '\x1b[0m',
};

function formatDev(level: LogLevel, message: string, meta: Record<string, unknown>): string {
    const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
    const color = COLORS[level] || COLORS.reset;
    const prefix = `${COLORS.debug}${ts}${COLORS.reset} ${color}${level.toUpperCase().padEnd(5)}${COLORS.reset}`;
    const metaStr = meta && Object.keys(meta).length > 0
        ? ` ${COLORS.debug}${JSON.stringify(meta)}${COLORS.reset}`
        : '';
    return `${prefix} ${message}${metaStr}`;
}

function formatJSON(level: LogLevel, message: string, meta: Record<string, unknown>): string {
    return JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...meta
    });
}

function log(level: LogLevel, message: string, meta: Record<string, unknown> = {}): void {
    if (LOG_LEVELS[level] > currentLevel) return;

    const output = isProduction
        ? formatJSON(level, message, meta)
        : formatDev(level, message, meta);

    if (level === 'error') {
        process.stderr.write(output + '\n');
    } else {
        process.stdout.write(output + '\n');
    }
}

/**
 * Create a child logger with persistent context fields.
 * @param {object} context — fields added to every log entry
 */
function createLogger(context: Record<string, unknown> = {}): Logger {
    return {
        error: (msg: string, meta: Record<string, unknown> = {}): void => log('error', msg, { ...context, ...meta }),
        warn: (msg: string, meta: Record<string, unknown> = {}): void => log('warn', msg, { ...context, ...meta }),
        info: (msg: string, meta: Record<string, unknown> = {}): void => log('info', msg, { ...context, ...meta }),
        debug: (msg: string, meta: Record<string, unknown> = {}): void => log('debug', msg, { ...context, ...meta }),
        child: (childCtx: Record<string, unknown>): Logger => createLogger({ ...context, ...childCtx }),
    };
}

// Root logger
const logger: Logger = createLogger();

export default logger;
export { createLogger };
