/**
 * Client-side analytics and monitoring utilities
 */

// Track page views
export function trackPageView(pageName) {
  if (typeof window === 'undefined') return;
  
  // Log locally in dev
  if (import.meta.env.DEV) {
    console.log('[Analytics] Page View:', pageName);
  }
  
  // Add your analytics provider here (GA, Mixpanel, etc.)
  // Example: window.gtag?.('event', 'page_view', { page_name: pageName });
}

// Track user events
export function trackEvent(eventName, properties = {}) {
  if (typeof window === 'undefined') return;
  
  if (import.meta.env.DEV) {
    console.log('[Analytics] Event:', eventName, properties);
  }
  
  // Add your analytics provider here
  // Example: window.gtag?.('event', eventName, properties);
}

// Track errors for monitoring
export function trackError(error, context = {}) {
  if (typeof window === 'undefined') return;
  
  console.error('[Error]', error, context);
  
  // Send to error monitoring service (Sentry, LogRocket, etc.)
  // Example: Sentry.captureException(error, { extra: context });
  
  // Store in localStorage for debugging
  try {
    const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
    errors.push({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
    // Keep only last 50 errors
    localStorage.setItem('app_errors', JSON.stringify(errors.slice(-50)));
  } catch (e) {
    // Ignore localStorage errors
  }
}

// Track performance metrics
export function trackPerformance(metricName, value, unit = 'ms') {
  if (typeof window === 'undefined') return;
  
  if (import.meta.env.DEV) {
    console.log('[Performance]', metricName, `${value}${unit}`);
  }
  
  // Send to analytics
  // Example: window.gtag?.('event', 'timing_complete', {
  //   name: metricName,
  //   value: value,
  //   event_category: 'Performance'
  // });
}

// Track user interactions
export function trackInteraction(element, action) {
  trackEvent('user_interaction', { element, action });
}

// Get performance metrics
export function getPerformanceMetrics() {
  if (typeof window === 'undefined' || !window.performance) return null;
  
  const navigation = performance.getEntriesByType('navigation')[0];
  if (!navigation) return null;
  
  return {
    loadTime: Math.round(navigation.loadEventEnd - navigation.fetchStart),
    domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
    firstPaint: Math.round(performance.getEntriesByName('first-paint')[0]?.startTime || 0),
    firstContentfulPaint: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0),
  };
}

// Session tracking
export function startSession() {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem('session_id', sessionId);
  trackEvent('session_start', { session_id: sessionId });
  return sessionId;
}

export function getSessionId() {
  let sessionId = sessionStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = startSession();
  }
  return sessionId;
}