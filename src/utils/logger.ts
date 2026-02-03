/**
 * Signal - Logger Utility
 *
 * Centralized logging utility that can be configured for different environments.
 * In production builds, debug logs can be suppressed.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Logger class for structured logging
 */
class Logger {
  private level: LogLevel = 'debug';
  private prefix = '[Signal]';

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  /**
   * Log debug message (development only)
   */
  debug(...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.prefix, ...args);
    }
  }

  /**
   * Log info message
   */
  info(...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.log(this.prefix, ...args);
    }
  }

  /**
   * Log warning message
   */
  warn(...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.prefix, ...args);
    }
  }

  /**
   * Log error message
   */
  error(...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.prefix, ...args);
    }
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();
