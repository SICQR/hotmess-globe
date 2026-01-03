/**
 * Structured Logging Utility
 * 
 * Provides environment-aware logging with different levels.
 * In production, only errors are logged to avoid exposing sensitive information.
 * In development, all levels are available for debugging.
 * 
 * Usage:
 *   import logger from '@/utils/logger';
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('API call failed', { error, endpoint: '/api/users' });
 *   logger.debug('Computed value', { value: someValue });
 */

const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV;
const isTest = import.meta.env.MODE === 'test';

// Log levels: error (0), warn (1), info (2), debug (3)
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// In production, only log errors. In development, log everything.
const currentLogLevel = isDevelopment ? LOG_LEVELS.debug : LOG_LEVELS.error;

/**
 * Format log message with timestamp and context
 */
function formatMessage(level, message, context) {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
}

/**
 * Sanitize context to remove sensitive information
 */
function sanitizeContext(context) {
  if (!context || typeof context !== 'object') {
    return context;
  }

  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  const sanitized = { ...context };

  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
}

// Console method mapping for cleaner code
const consoleMethods = {
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.log,
};

/**
 * Log function
 */
function log(level, message, context = null) {
  if (isTest) {
    // Don't log during tests unless it's an error
    if (level !== 'error') return;
  }

  const levelValue = LOG_LEVELS[level];
  if (levelValue > currentLogLevel) {
    return;
  }

  const sanitizedContext = sanitizeContext(context);
  const formattedMessage = formatMessage(level, message, sanitizedContext);

  // Use appropriate console method
  const consoleMethod = consoleMethods[level] || console.log;
  consoleMethod(formattedMessage);
  
  // In production, you might want to send errors to an error tracking service
  // like Sentry: if (level === 'error') Sentry.captureMessage(formattedMessage, 'error');
}

/**
 * Logger interface
 */
const logger = {
  /**
   * Log error messages (always logged, even in production)
   */
  error: (message, context) => log('error', message, context),

  /**
   * Log warning messages (logged in development)
   */
  warn: (message, context) => log('warn', message, context),

  /**
   * Log info messages (logged in development)
   */
  info: (message, context) => log('info', message, context),

  /**
   * Log debug messages (logged in development)
   */
  debug: (message, context) => log('debug', message, context),

  /**
   * Check if a log level is enabled
   */
  isEnabled: (level) => {
    return LOG_LEVELS[level] <= currentLogLevel;
  },
};

export default logger;
