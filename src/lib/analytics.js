/**
 * Analytics Event Tracking Library
 * 
 * Centralized event tracking for CTAs, conversions, and user behavior.
 * Supports multiple analytics providers with a unified API.
 */

// ============================================================================
// Configuration
// ============================================================================

const DEBUG_MODE = import.meta.env.DEV;
const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5 seconds

// Event queue for batching
let eventQueue = [];
let flushTimeout = null;

// ============================================================================
// Event Definitions
// ============================================================================

/**
 * Predefined events with their required/optional properties
 */
export const EVENTS = {
  // CTA Events
  cta_click: ['cta_id', 'cta_location', 'cta_text'],
  cta_view: ['cta_id', 'cta_location'],
  
  // Match Events
  match_view: ['target_user_id', 'match_score', 'source'],
  match_message: ['target_user_id', 'match_score'],
  match_like: ['target_user_id', 'match_score'],
  
  // Live Status Events
  go_live_start: ['duration', 'hosting', 'location_enabled'],
  go_live_end: ['duration', 'messages_received', 'connections_made'],
  go_live_view: ['target_user_id'],
  
  // Profile Events
  profile_view: ['target_user_id', 'source'],
  profile_edit: ['fields_updated'],
  profile_photo_add: ['photo_count'],
  profile_completion_change: ['old_percentage', 'new_percentage'],
  
  // Onboarding Events
  onboarding_started: [],
  onboarding_step_completed: ['step', 'stepIndex'],
  onboarding_completed: [],
  onboarding_skipped: ['fromStep'],
  
  // A/B Testing Events
  ab_exposure: ['experiment_id', 'variant_id'],
  ab_conversion: ['experiment_id', 'variant_id', 'conversion_type'],
  
  // Membership Events
  membership_view: ['current_tier'],
  membership_upgrade_start: ['from_tier', 'to_tier'],
  membership_upgrade_complete: ['from_tier', 'to_tier', 'price'],
  membership_cancel: ['tier', 'reason'],
  
  // Discovery Events
  discovery_filter_change: ['filter_type', 'filter_value'],
  discovery_sort_change: ['sort_by'],
  discovery_lane_change: ['lane'],
  discovery_scroll: ['depth', 'profiles_viewed'],
  
  // Messaging Events
  message_sent: ['thread_id', 'is_first_message'],
  message_read: ['thread_id'],
  
  // Session Events
  session_start: ['referrer', 'utm_source', 'utm_campaign'],
  session_end: ['duration', 'pages_viewed'],
  
  // Error Events
  error: ['error_type', 'error_message', 'component'],
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Track an analytics event
 * 
 * @param {string} eventName - Name of the event (from EVENTS or custom)
 * @param {object} properties - Event properties
 * @param {object} options - Additional options (immediate: boolean)
 */
export function trackEvent(eventName, properties = {}, options = {}) {
  const event = {
    event: eventName,
    properties: {
      ...properties,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    },
    timestamp: Date.now(),
  };

  // Add user context if available
  const userId = getUserId();
  if (userId) {
    event.userId = userId;
  }

  // Add session context
  const sessionId = getSessionId();
  if (sessionId) {
    event.sessionId = sessionId;
  }

  // Debug logging
  if (DEBUG_MODE) {
    console.log('📊 Track:', eventName, properties);
  }

  // Send immediately or queue
  if (options.immediate) {
    sendEvents([event]);
  } else {
    queueEvent(event);
  }

  return event;
}

/**
 * Track a page view
 */
export function trackPageView(pageName, properties = {}) {
  return trackEvent('page_view', {
    page_name: pageName,
    ...properties,
  });
}

/**
 * Track a CTA click with standard properties
 */
export function trackCTAClick(ctaId, ctaLocation, ctaText, additionalProps = {}) {
  return trackEvent('cta_click', {
    cta_id: ctaId,
    cta_location: ctaLocation,
    cta_text: ctaText,
    ...additionalProps,
  });
}

/**
 * Track a match-related action
 */
export function trackMatchAction(action, targetUserId, matchScore, additionalProps = {}) {
  return trackEvent(`match_${action}`, {
    target_user_id: targetUserId,
    match_score: matchScore,
    ...additionalProps,
  });
}

/**
 * Identify a user
 */
export function identifyUser(userId, traits = {}) {
  setUserId(userId);
  
  if (DEBUG_MODE) {
    console.log('📊 Identify:', userId, traits);
  }

  // Send to analytics providers
  sendIdentify(userId, traits);
}

// ============================================================================
// Event Queue & Batching
// ============================================================================

function queueEvent(event) {
  eventQueue.push(event);

  // Flush if queue is full
  if (eventQueue.length >= BATCH_SIZE) {
    flushEvents();
  } else if (!flushTimeout) {
    // Schedule flush
    flushTimeout = setTimeout(flushEvents, FLUSH_INTERVAL);
  }
}

function flushEvents() {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  if (eventQueue.length === 0) return;

  const events = [...eventQueue];
  eventQueue = [];

  sendEvents(events);
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushEvents();
  });

  // Also flush on visibility change (tab switch on mobile)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushEvents();
    }
  });
}

// ============================================================================
// Send to Providers
// ============================================================================

async function sendEvents(events) {
  // Store locally for debugging
  storeEventsLocally(events);

  // Send to backend API
  try {
    const response = await fetch('/api/analytics/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
      keepalive: true, // Important for beforeunload
    });

    if (!response.ok && DEBUG_MODE) {
      console.warn('Analytics send failed:', response.status);
    }
  } catch (error) {
    if (DEBUG_MODE) {
      console.warn('Analytics send error:', error);
    }
    // Re-queue events on failure
    eventQueue.push(...events);
  }

  // Send to third-party providers
  sendToProviders(events);
}

function sendToProviders(events) {
  // Google Analytics 4
  if (typeof window !== 'undefined' && window.gtag) {
    events.forEach(event => {
      window.gtag('event', event.event, event.properties);
    });
  }

  // Mixpanel
  if (typeof window !== 'undefined' && window.mixpanel) {
    events.forEach(event => {
      window.mixpanel.track(event.event, event.properties);
    });
  }

  // PostHog
  if (typeof window !== 'undefined' && window.posthog) {
    events.forEach(event => {
      window.posthog.capture(event.event, event.properties);
    });
  }
}

function sendIdentify(userId, traits) {
  // Google Analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('set', 'user_id', userId);
    window.gtag('set', 'user_properties', traits);
  }

  // Mixpanel
  if (typeof window !== 'undefined' && window.mixpanel) {
    window.mixpanel.identify(userId);
    window.mixpanel.people.set(traits);
  }

  // PostHog
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.identify(userId, traits);
  }
}

// ============================================================================
// Local Storage (for debugging/replay)
// ============================================================================

const LOCAL_EVENTS_KEY = 'hotmess_analytics_events';
const MAX_LOCAL_EVENTS = 100;

function storeEventsLocally(events) {
  if (!DEBUG_MODE) return;

  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY) || '[]');
    const updated = [...events, ...stored].slice(0, MAX_LOCAL_EVENTS);
    localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(updated));
  } catch (e) {
    // Ignore storage errors
  }
}

export function getLocalEvents() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearLocalEvents() {
  localStorage.removeItem(LOCAL_EVENTS_KEY);
}

// ============================================================================
// Session & User Management
// ============================================================================

const SESSION_KEY = 'hotmess_session_id';
const USER_KEY = 'hotmess_user_id';

function getSessionId() {
  if (typeof window === 'undefined') return null;
  
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
    
    // Track session start
    trackEvent('session_start', {
      referrer: document.referrer,
      utm_source: new URLSearchParams(window.location.search).get('utm_source'),
      utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
    }, { immediate: true });
  }
  
  return sessionId;
}

function getUserId() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_KEY);
}

function setUserId(userId) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, userId);
}

// ============================================================================
// React Hooks
// ============================================================================

import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook for tracking page views
 */
export function usePageView(pageName, properties = {}) {
  useEffect(() => {
    trackPageView(pageName, properties);
  }, [pageName]);
}

/**
 * Hook for tracking CTA interactions
 */
export function useCTATracking(ctaId, ctaLocation) {
  const handleClick = useCallback((ctaText) => {
    trackCTAClick(ctaId, ctaLocation, ctaText);
  }, [ctaId, ctaLocation]);

  const handleView = useCallback(() => {
    trackEvent('cta_view', { cta_id: ctaId, cta_location: ctaLocation });
  }, [ctaId, ctaLocation]);

  return { trackClick: handleClick, trackView: handleView };
}

/**
 * Hook for tracking element visibility (for CTA view tracking)
 */
export function useVisibilityTracking(onVisible) {
  const ref = useRef(null);
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!ref.current || hasTracked.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTracked.current) {
          hasTracked.current = true;
          onVisible();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [onVisible]);

  return ref;
}

// ============================================================================
// Export convenience functions
// ============================================================================

export default {
  track: trackEvent,
  page: trackPageView,
  cta: trackCTAClick,
  match: trackMatchAction,
  identify: identifyUser,
  flush: flushEvents,
  getEvents: getLocalEvents,
  clearEvents: clearLocalEvents,
};
