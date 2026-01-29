import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry error monitoring
 * Set VITE_SENTRY_DSN in your environment to enable
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    if (import.meta.env.DEV) {
      console.log('[Sentry] No DSN configured - error monitoring disabled');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    
    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in prod, 100% in dev
    
    // Session Replay for debugging user issues
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    
    // Filter out noisy errors
    ignoreErrors: [
      // Network errors
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      // User-caused errors
      'ResizeObserver loop',
      'Non-Error promise rejection',
      // Third-party errors
      /^Script error\.?$/,
    ],
    
    // Don't send errors in development unless DSN is explicitly set
    enabled: Boolean(dsn),
    
    // Add release version if available
    release: import.meta.env.VITE_APP_VERSION || 'development',
    
    beforeSend(event, hint) {
      // Don't send errors from localhost unless explicitly testing
      if (window.location.hostname === 'localhost' && !import.meta.env.VITE_SENTRY_DEBUG) {
        return null;
      }
      
      // Sanitize sensitive data
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }
      
      return event;
    },
  });

  console.log('[Sentry] Error monitoring initialized');
}

/**
 * Capture an error manually
 */
export function captureError(error, context = {}) {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}

/**
 * Capture a message/breadcrumb
 */
export function captureMessage(message, level = 'info', context = {}) {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  }
}

/**
 * Set user context for better error tracking
 */
export function setUser(user) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.user_metadata?.display_name,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message, category = 'action', data = {}) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

// Export Sentry for direct access if needed
export { Sentry };
