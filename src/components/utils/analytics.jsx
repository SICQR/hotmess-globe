/**
 * Client-side analytics and error tracking utilities
 * 
 * Supports:
 * - Google Analytics 4 (GA4)
 * - Mixpanel (optional)
 * - Sentry for error tracking
 * 
 * Configure via environment variables:
 * - VITE_GA_MEASUREMENT_ID: Google Analytics 4 measurement ID
 * - VITE_MIXPANEL_TOKEN: Mixpanel project token (optional)
 * - VITE_SENTRY_DSN: Sentry DSN for error tracking
 */

// Analytics configuration
const config = {
  gaId: import.meta.env.VITE_GA_MEASUREMENT_ID,
  mixpanelToken: import.meta.env.VITE_MIXPANEL_TOKEN,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  debug: import.meta.env.DEV,
};

let initialized = false;
let userId = null;

/**
 * Initialize analytics providers
 * Call this once in your app's entry point
 */
export function initAnalytics() {
  if (initialized || typeof window === 'undefined') return;
  
  // Initialize Google Analytics 4
  if (config.gaId) {
    initGA4();
  }
  
  // Initialize Mixpanel (if configured)
  if (config.mixpanelToken) {
    initMixpanel();
  }
  
  // Initialize Sentry (if configured)
  if (config.sentryDsn) {
    initSentry();
  }
  
  // Track web vitals
  trackWebVitals();
  
  initialized = true;
  
  if (config.debug) {
    console.log('[Analytics] Initialized with:', {
      ga: !!config.gaId,
      mixpanel: !!config.mixpanelToken,
      sentry: !!config.sentryDsn,
    });
  }
}

/**
 * Initialize Google Analytics 4
 */
function initGA4() {
  // Load gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${config.gaId}`;
  document.head.appendChild(script);
  
  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', config.gaId, {
    send_page_view: false, // We'll track manually
    cookie_flags: 'SameSite=None;Secure',
  });
}

/**
 * Initialize Mixpanel
 */
function initMixpanel() {
  // Mixpanel snippet - loads from CDN
  (function(f,b){if(!b.__SV){var e,g,i,h;window.mixpanel=b;b._i=[];b.init=function(e,f,c){function g(a,d){var b=d.split(".");2==b.length&&(a=a[b[0]],d=b[1]);a[d]=function(){a.push([d].concat(Array.prototype.slice.call(arguments,0)))}}var a=b;"undefined"!==typeof c?a=b[c]=[]:c="mixpanel";a.people=a.people||[];a.toString=function(a){var d="mixpanel";"mixpanel"!==c&&(d+="."+c);a||(d+=" (stub)");return d};a.people.toString=function(){return a.toString(1)+".people (stub)"};i="disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove".split(" ");for(h=0;h<i.length;h++)g(a,i[h]);var j="set set_once union unset remove delete".split(" ");a.get_group=function(){function b(c){d[c]=function(){call2_args=arguments;call2=[c].concat(Array.prototype.slice.call(call2_args,0));a.push([e,call2])}}for(var d={},e=["get_group"].concat(Array.prototype.slice.call(arguments,0)),c=0;c<j.length;c++)b(j[c]);return d};b._i.push([e,f,c])};b.__SV=1.2;e=f.createElement("script");e.type="text/javascript";e.async=!0;e.src="https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";g=f.getElementsByTagName("script")[0];g.parentNode.insertBefore(e,g)}})(document,window.mixpanel||[]);
  
  window.mixpanel.init(config.mixpanelToken, {
    debug: config.debug,
    track_pageview: false,
    persistence: 'localStorage',
  });
}

/**
 * Initialize Sentry
 */
function initSentry() {
  // Load Sentry SDK dynamically
  import('@sentry/browser').then((Sentry) => {
    Sentry.init({
      dsn: config.sentryDsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION || '1.0.0',
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
    });
    
    window.__SENTRY__ = Sentry;
  }).catch((err) => {
    console.warn('[Analytics] Failed to load Sentry:', err);
  });
}

/**
 * Track Web Vitals for performance monitoring
 */
function trackWebVitals() {
  if (typeof window === 'undefined') return;
  
  // Use web-vitals library if available, otherwise use Performance API
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        trackPerformance(entry.name, Math.round(entry.startTime));
      }
    });
    
    observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
  } catch (e) {
    // PerformanceObserver not supported
  }
}

/**
 * Identify user for tracking
 */
export function identifyUser(user) {
  if (!user) return;
  
  userId = user.id || user.email;
  
  // GA4 user identification
  if (window.gtag && config.gaId) {
    window.gtag('config', config.gaId, {
      user_id: userId,
    });
    window.gtag('set', 'user_properties', {
      membership_tier: user.membership_tier || 'basic',
      user_city: user.city,
    });
  }
  
  // Mixpanel user identification
  if (window.mixpanel) {
    window.mixpanel.identify(userId);
    window.mixpanel.people.set({
      $email: user.email,
      $name: user.full_name || user.display_name,
      membership_tier: user.membership_tier,
      city: user.city,
    });
  }
  
  // Sentry user context
  if (window.__SENTRY__) {
    window.__SENTRY__.setUser({
      id: userId,
      email: user.email,
    });
  }
  
  if (config.debug) {
    console.log('[Analytics] Identified user:', userId);
  }
}

/**
 * Track page views
 */
export function trackPageView(pageName, properties = {}) {
  if (typeof window === 'undefined') return;
  
  const pageData = {
    page_title: pageName,
    page_location: window.location.href,
    page_path: window.location.pathname,
    ...properties,
  };
  
  // GA4 page view
  if (window.gtag && config.gaId) {
    window.gtag('event', 'page_view', pageData);
  }
  
  // Mixpanel page view
  if (window.mixpanel) {
    window.mixpanel.track('Page View', pageData);
  }
  
  if (config.debug) {
    console.log('[Analytics] Page View:', pageName, pageData);
  }
}

/**
 * Track custom events
 */
export function trackEvent(eventName, properties = {}) {
  if (typeof window === 'undefined') return;
  
  const eventData = {
    ...properties,
    timestamp: new Date().toISOString(),
  };
  
  // GA4 event
  if (window.gtag) {
    window.gtag('event', eventName, eventData);
  }
  
  // Mixpanel event
  if (window.mixpanel) {
    window.mixpanel.track(eventName, eventData);
  }
  
  if (config.debug) {
    console.log('[Analytics] Event:', eventName, eventData);
  }
}

/**
 * Track errors for monitoring
 */
export function trackError(error, context = {}) {
  if (typeof window === 'undefined') return;
  
  const errorData = {
    message: error.message || String(error),
    stack: error.stack,
    context,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  };
  
  // Sentry error capture
  if (window.__SENTRY__) {
    window.__SENTRY__.captureException(error, {
      extra: context,
    });
  }
  
  // GA4 error event
  if (window.gtag) {
    window.gtag('event', 'exception', {
      description: error.message,
      fatal: context.fatal || false,
    });
  }
  
  // Store locally for debugging
  try {
    const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
    errors.push(errorData);
    localStorage.setItem('app_errors', JSON.stringify(errors.slice(-50)));
  } catch (e) {
    // Ignore localStorage errors
  }
  
  console.error('[Error]', error, context);
}

/**
 * Track performance metrics
 */
export function trackPerformance(metricName, value, unit = 'ms') {
  if (typeof window === 'undefined') return;
  
  // GA4 timing event
  if (window.gtag) {
    window.gtag('event', 'timing_complete', {
      name: metricName,
      value: Math.round(value),
      event_category: 'Performance',
    });
  }
  
  if (config.debug) {
    console.log('[Performance]', metricName, `${value}${unit}`);
  }
}

/**
 * Track user interactions
 */
export function trackInteraction(element, action, label) {
  trackEvent('user_interaction', {
    element,
    action,
    label,
  });
}

/**
 * Track commerce events
 */
export function trackPurchase(orderId, total, currency = 'GBP', items = []) {
  if (window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: orderId,
      value: total,
      currency,
      items: items.map((item) => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    });
  }
  
  if (window.mixpanel) {
    window.mixpanel.track('Purchase', {
      order_id: orderId,
      total,
      currency,
      items,
    });
    window.mixpanel.people.track_charge(total);
  }
}

/**
 * Get performance metrics
 */
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

/**
 * Session tracking
 */
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

/**
 * Reset analytics (for logout)
 */
export function resetAnalytics() {
  userId = null;
  
  if (window.mixpanel) {
    window.mixpanel.reset();
  }
  
  if (window.__SENTRY__) {
    window.__SENTRY__.setUser(null);
  }
  
  sessionStorage.removeItem('session_id');
}
