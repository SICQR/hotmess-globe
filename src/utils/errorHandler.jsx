/**
 * Centralized Error Handling Utilities
 * 
 * Features:
 * - User-friendly error messages
 * - Error categorization
 * - Retry logic with exponential backoff
 * - Offline queue management
 * - Error analytics
 */

import { trackError } from '@/components/utils/analytics';

// Error categories
export const ErrorCategory = {
  NETWORK: 'network',
  AUTH: 'auth',
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  NOT_FOUND: 'not_found',
  RATE_LIMIT: 'rate_limit',
  SERVER: 'server',
  UNKNOWN: 'unknown',
};

// User-friendly error messages
const ERROR_MESSAGES = {
  [ErrorCategory.NETWORK]: {
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection.',
    recoverable: true,
  },
  [ErrorCategory.AUTH]: {
    title: 'Authentication Required',
    message: 'Please sign in to continue.',
    recoverable: true,
  },
  [ErrorCategory.VALIDATION]: {
    title: 'Invalid Input',
    message: 'Please check your input and try again.',
    recoverable: true,
  },
  [ErrorCategory.PERMISSION]: {
    title: 'Access Denied',
    message: 'You don\'t have permission to perform this action.',
    recoverable: false,
  },
  [ErrorCategory.NOT_FOUND]: {
    title: 'Not Found',
    message: 'The requested resource could not be found.',
    recoverable: false,
  },
  [ErrorCategory.RATE_LIMIT]: {
    title: 'Too Many Requests',
    message: 'Please slow down and try again in a moment.',
    recoverable: true,
  },
  [ErrorCategory.SERVER]: {
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again later.',
    recoverable: true,
  },
  [ErrorCategory.UNKNOWN]: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again.',
    recoverable: true,
  },
};

/**
 * Categorize an error based on its properties
 */
export function categorizeError(error) {
  // Handle fetch/network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return ErrorCategory.NETWORK;
  }
  
  if (!navigator.onLine) {
    return ErrorCategory.NETWORK;
  }
  
  // Handle HTTP status codes
  const status = error.status || error.statusCode;
  
  if (status === 401 || status === 403) {
    return error.message?.includes('permission') 
      ? ErrorCategory.PERMISSION 
      : ErrorCategory.AUTH;
  }
  
  if (status === 404) {
    return ErrorCategory.NOT_FOUND;
  }
  
  if (status === 422 || status === 400) {
    return ErrorCategory.VALIDATION;
  }
  
  if (status === 429) {
    return ErrorCategory.RATE_LIMIT;
  }
  
  if (status >= 500) {
    return ErrorCategory.SERVER;
  }
  
  // Check error message patterns
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return ErrorCategory.NETWORK;
  }
  
  if (message.includes('unauthorized') || message.includes('login') || message.includes('auth')) {
    return ErrorCategory.AUTH;
  }
  
  if (message.includes('rate limit') || message.includes('too many')) {
    return ErrorCategory.RATE_LIMIT;
  }
  
  return ErrorCategory.UNKNOWN;
}

/**
 * Get user-friendly error info
 */
export function getErrorInfo(error) {
  const category = categorizeError(error);
  const info = ERROR_MESSAGES[category];
  
  return {
    category,
    title: info.title,
    message: error.userMessage || info.message,
    recoverable: info.recoverable,
    retryable: [ErrorCategory.NETWORK, ErrorCategory.SERVER, ErrorCategory.RATE_LIMIT].includes(category),
    originalError: error,
  };
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoff(attempt, baseDelay = 1000, maxDelay = 30000) {
  const delay = Math.min(
    baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
    maxDelay
  );
  return Math.round(delay);
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = (error) => {
      const info = getErrorInfo(error);
      return info.retryable;
    },
    onRetry = () => {},
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      const delay = calculateBackoff(attempt, baseDelay, maxDelay);
      onRetry(attempt + 1, delay, error);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Offline queue for storing failed requests
 */
const OFFLINE_QUEUE_KEY = 'hotmess_offline_queue';

export function getOfflineQueue() {
  try {
    const queue = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
}

export function addToOfflineQueue(request) {
  try {
    const queue = getOfflineQueue();
    queue.push({
      ...request,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      queuedAt: new Date().toISOString(),
    });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch {
    return false;
  }
}

export function removeFromOfflineQueue(id) {
  try {
    const queue = getOfflineQueue().filter(r => r.id !== id);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch {
    return false;
  }
}

export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

/**
 * Process offline queue when back online
 */
export async function processOfflineQueue(executor) {
  const queue = getOfflineQueue();
  const results = [];
  
  for (const request of queue) {
    try {
      await executor(request);
      removeFromOfflineQueue(request.id);
      results.push({ id: request.id, success: true });
    } catch (error) {
      results.push({ id: request.id, success: false, error });
    }
  }
  
  return results;
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling(fn, options = {}) {
  const {
    fallbackValue = null,
    onError = () => {},
    track = true,
    rethrow = false,
  } = options;
  
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const info = getErrorInfo(error);
      
      // Track error
      if (track) {
        trackError(error, {
          category: info.category,
          recoverable: info.recoverable,
          function: fn.name,
        });
      }
      
      // Call error handler
      onError(info);
      
      // Rethrow or return fallback
      if (rethrow) {
        throw error;
      }
      
      return fallbackValue;
    }
  };
}

/**
 * Create an error with user-friendly message
 */
export function createUserError(message, category = ErrorCategory.UNKNOWN, originalError = null) {
  const error = new Error(message);
  error.userMessage = message;
  error.category = category;
  error.originalError = originalError;
  return error;
}

/**
 * Error logging with deduplication
 */
const recentErrors = new Map();
const ERROR_DEDUP_WINDOW = 60000; // 1 minute

export function logError(error, context = {}) {
  const errorKey = `${error.message}:${error.stack?.slice(0, 100)}`;
  const now = Date.now();
  
  // Check for duplicate
  const lastSeen = recentErrors.get(errorKey);
  if (lastSeen && now - lastSeen < ERROR_DEDUP_WINDOW) {
    return; // Skip duplicate
  }
  
  recentErrors.set(errorKey, now);
  
  // Clean old entries
  for (const [key, time] of recentErrors) {
    if (now - time > ERROR_DEDUP_WINDOW) {
      recentErrors.delete(key);
    }
  }
  
  // Log using structured logger
  import('@/utils/logger').then(({ default: logger }) => {
    logger.error(error.message, { ...context, stack: error.stack });
  });
  
  // Send to Sentry
  import('@/lib/sentry').then(({ captureError }) => {
    captureError(error, context);
  });
  
  // Track in analytics
  trackError(error, context);
}

/**
 * Global error boundary helper
 */
export function setupGlobalErrorHandlers() {
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason, { type: 'unhandledrejection' });
  });
  
  // Global errors
  window.addEventListener('error', (event) => {
    logError(event.error || new Error(event.message), {
      type: 'error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
  
  // Network status changes
  window.addEventListener('online', () => {
    // Process offline queue when back online
    processOfflineQueue(async (request) => {
      // This would be implemented based on your API client
      import('@/utils/logger').then(({ default: logger }) => {
        logger.info('Processing offline queue request', { request });
      });
    });
  });
}

export default {
  ErrorCategory,
  categorizeError,
  getErrorInfo,
  calculateBackoff,
  withRetry,
  getOfflineQueue,
  addToOfflineQueue,
  removeFromOfflineQueue,
  clearOfflineQueue,
  processOfflineQueue,
  withErrorHandling,
  createUserError,
  logError,
  setupGlobalErrorHandlers,
};
