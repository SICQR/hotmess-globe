/**
 * HOTMESS Glass Feed Ruleset
 * 
 * What can appear:
 * - City heat changes (thresholded)
 * - Show start / spike (radio)
 * - Event going live (verified)
 * - "Now" signals (contextual, delayed)
 * - Care availability (quiet, opt-in)
 * 
 * What cannot:
 * - Exact locations
 * - Sexual intent
 * - Live movement
 * - Personal identifiers
 */

import { TIME_JITTER, meetsKAnonymity } from './visualLanguage';

// Minimum k-anonymity for feed items
const FEED_K_THRESHOLD = 20;

// Minimum delay before showing (seconds)
const FEED_DELAY_SECONDS = 300;

// Feed item types with rules
export const FEED_ITEM_TYPES = {
  CITY_HEAT: {
    id: 'city_heat',
    clickTarget: null, // Not clickable
    delay: 600,
    kThreshold: 50,
    template: (data) => `${data.city} is heating up`,
  },
  RADIO_START: {
    id: 'radio_start',
    clickTarget: 'radio',
    delay: 60, // Shows faster - time-bound
    kThreshold: 10,
    template: (data) => `${data.showName} just went live`,
  },
  RADIO_SPIKE: {
    id: 'radio_spike',
    clickTarget: 'radio',
    delay: 300,
    kThreshold: 30,
    template: (data) => `Listeners surging on ${data.showName}`,
  },
  EVENT_LIVE: {
    id: 'event_live',
    clickTarget: 'events',
    delay: 120,
    kThreshold: 20,
    template: (data) => `${data.eventName} is happening now`,
  },
  TICKET_VELOCITY: {
    id: 'ticket_velocity',
    clickTarget: 'events',
    delay: 600,
    kThreshold: 30,
    template: (data) => `Tickets moving fast for ${data.eventName}`,
  },
  NOW_SIGNAL: {
    id: 'now_signal',
    clickTarget: 'ghosted',
    delay: 300,
    kThreshold: 20,
    template: (data) => `${data.city} nightlife accelerating`,
  },
  CARE_AVAILABLE: {
    id: 'care_available',
    clickTarget: 'care',
    delay: 0, // Immediate for safety
    kThreshold: 0, // No threshold for safety
    quiet: true,
    template: () => 'Support available',
  },
  WORLD_PULSE: {
    id: 'world_pulse',
    clickTarget: null,
    delay: 900,
    kThreshold: 100,
    template: (data) => `${data.city1} just overtook ${data.city2}`,
  },
};

// Blocked content types - NEVER show
const BLOCKED_FEED_CONTENT = new Set([
  'exact_location',
  'user_position',
  'movement_path',
  'sexual_intent',
  'hookup_request',
  'personal_name',
  'profile_view',
  'dm_notification',
  'sos_signal', // SOS is sealed, not public
]);

/**
 * Check if a feed item is eligible to display
 */
export function isEligible(item, viewerContext = {}) {
  // 1. Block forbidden content types
  if (BLOCKED_FEED_CONTENT.has(item.contentType)) {
    return { eligible: false, reason: 'blocked_content' };
  }

  // 2. Get item type rules
  const rules = FEED_ITEM_TYPES[item.type];
  if (!rules) {
    return { eligible: false, reason: 'unknown_type' };
  }

  // 3. Check k-anonymity threshold
  if (item.k_count !== undefined && item.k_count < rules.kThreshold) {
    return { eligible: false, reason: 'k_below_threshold' };
  }

  // 4. Check delay requirement
  if (item.timestamp) {
    const ageSeconds = (Date.now() - new Date(item.timestamp).getTime()) / 1000;
    if (ageSeconds < rules.delay) {
      return { eligible: false, reason: 'too_recent' };
    }
  }

  // 5. Check viewer context allows this type
  if (viewerContext.blockedTypes?.includes(item.type)) {
    return { eligible: false, reason: 'viewer_blocked' };
  }

  // 6. Care items require opt-in
  if (rules.id === 'care_available' && !viewerContext.careOptIn) {
    return { eligible: false, reason: 'care_not_opted_in' };
  }

  return { eligible: true };
}

/**
 * Filter and prepare feed items for display
 */
export function prepareFeedItems(items, viewerContext = {}) {
  return items
    .map(item => {
      const eligibility = isEligible(item, viewerContext);
      if (!eligibility.eligible) {
        return null;
      }

      const rules = FEED_ITEM_TYPES[item.type];
      
      return {
        ...item,
        displayText: rules.template(item.data || {}),
        clickTarget: rules.clickTarget,
        isQuiet: rules.quiet || false,
        displayTimestamp: TIME_JITTER.apply(item.timestamp),
      };
    })
    .filter(Boolean)
    .slice(0, 10); // Max 10 items in feed
}

/**
 * Route click to correct destination
 */
export function getClickRoute(feedItem) {
  if (!feedItem.clickTarget) return null;

  const routes = {
    radio: '/radio',
    events: '/events',
    ghosted: '/ghosted',
    care: '/care',
    market: '/market',
  };

  const base = routes[feedItem.clickTarget];
  if (!base) return null;

  // Add context params
  if (feedItem.data?.id) {
    return `${base}?item=${feedItem.data.id}`;
  }
  if (feedItem.data?.city) {
    return `${base}?city=${feedItem.data.city}`;
  }

  return base;
}

/**
 * Create feed item from raw signal
 */
export function createFeedItem(signal) {
  // Map signal source to feed type
  const typeMap = {
    'radio_session_start': 'RADIO_START',
    'radio_listener_spike': 'RADIO_SPIKE',
    'event_start': 'EVENT_LIVE',
    'ticket_surge': 'TICKET_VELOCITY',
    'city_heat_change': 'CITY_HEAT',
    'zone_activity': 'NOW_SIGNAL',
    'care_status': 'CARE_AVAILABLE',
    'city_comparison': 'WORLD_PULSE',
  };

  const type = typeMap[signal.source];
  if (!type) return null;

  return {
    id: signal.id || crypto.randomUUID(),
    type,
    timestamp: signal.timestamp || new Date().toISOString(),
    k_count: signal.k_count || signal.aggregate_count,
    contentType: signal.content_type,
    data: {
      city: signal.city,
      showName: signal.show_name,
      eventName: signal.event_name,
      id: signal.reference_id,
      city1: signal.city_a,
      city2: signal.city_b,
    },
  };
}

/**
 * Merge and dedupe feed items
 */
export function mergeFeedItems(existing, incoming) {
  const seen = new Set(existing.map(i => i.id));
  const merged = [...existing];

  for (const item of incoming) {
    if (!seen.has(item.id)) {
      merged.push(item);
      seen.add(item.id);
    }
  }

  // Sort by timestamp (newest first) and limit
  return merged
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 20);
}
