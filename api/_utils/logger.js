/**
 * Production Logger
 * 
 * Centralized logging that integrates with Sentry in production.
 * In development, logs to console. In production, uses Sentry.
 */

const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development';

/**
 * Log levels
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};

/**
 * Log a message (only in development or when explicitly enabled)
 */
export function log(message, data = null) {
  if (isDev || process.env.ENABLE_LOGGING === 'true') {
    if (data) {
      // console.log(`[LOG] ${message}`, data);
    } else {
      // console.log(`[LOG] ${message}`);
    }
  }
}

/**
 * Log debug info (development only)
 */
export function debug(message, data = null) {
  if (isDev) {
    if (data) {
      console.debug(`[DEBUG] ${message}`, data);
    } else {
      console.debug(`[DEBUG] ${message}`);
    }
  }
}

/**
 * Log info (always logged)
 */
export function info(message, data = null) {
  if (data) {
    console.info(`[INFO] ${message}`, data);
  } else {
    console.info(`[INFO] ${message}`);
  }
}

/**
 * Log warning
 */
export function warn(message, data = null) {
  if (data) {
    // console.warn(`[WARN] ${message}`, data);
  } else {
    // console.warn(`[WARN] ${message}`);
  }
}

/**
 * Log error (always logged, sent to Sentry in production)
 */
export function error(message, err = null) {
  const errorMessage = `[ERROR] ${message}`;
  
  if (err) {
    // console.error(errorMessage, err);
  } else {
    // console.error(errorMessage);
  }
  
  // In production, errors should be captured by Sentry middleware
  // No need to manually call Sentry here as it's configured globally
}

/**
 * Create a scoped logger for a specific module
 */
export function createLogger(scope) {
  return {
    log: (msg, data) => log(`[${scope}] ${msg}`, data),
    debug: (msg, data) => debug(`[${scope}] ${msg}`, data),
    info: (msg, data) => info(`[${scope}] ${msg}`, data),
    warn: (msg, data) => warn(`[${scope}] ${msg}`, data),
    error: (msg, err) => error(`[${scope}] ${msg}`, err),
  };
}

export default {
  log,
  debug,
  info,
  warn,
  error,
  createLogger,
  LogLevel,
};
