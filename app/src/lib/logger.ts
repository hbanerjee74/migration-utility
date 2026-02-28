/**
 * Frontend logger.
 *
 * Wraps console.* with a runtime level filter so only messages at or above
 * the active level are emitted. Level is persisted to localStorage under
 * LOG_LEVEL_KEY so the connections-tab UI control survives page reloads.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('workspace: applied');
 *   logger.error('workspace apply failed', err);
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
};

export const LOG_LEVEL_KEY = 'migration-log-level';
const DEFAULT_LEVEL: LogLevel = 'info';

export function getStoredLogLevel(): LogLevel {
  try {
    const stored = localStorage.getItem(LOG_LEVEL_KEY);
    if (stored && stored in LEVEL_RANK) return stored as LogLevel;
  } catch {
    // localStorage unavailable (test environment)
  }
  return DEFAULT_LEVEL;
}

export function storeLogLevel(level: LogLevel): void {
  try {
    localStorage.setItem(LOG_LEVEL_KEY, level);
  } catch {
    // localStorage unavailable
  }
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[getStoredLogLevel()];
}

export const logger = {
  debug: (msg: string, ...args: unknown[]): void => {
    if (shouldLog('debug')) console.debug(`[debug] ${msg}`, ...args);
  },
  info: (msg: string, ...args: unknown[]): void => {
    if (shouldLog('info')) console.info(`[info] ${msg}`, ...args);
  },
  warn: (msg: string, ...args: unknown[]): void => {
    if (shouldLog('warn')) console.warn(`[warn] ${msg}`, ...args);
  },
  error: (msg: string, ...args: unknown[]): void => {
    if (shouldLog('error')) console.error(`[error] ${msg}`, ...args);
  },
};
