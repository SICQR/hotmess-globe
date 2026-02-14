/**
 * Globe Activity Broadcaster
 * 
 * Central system for broadcasting activities to the globe visualization.
 * Use this throughout the app to trigger animated beacons on the globe.
 */

import { supabase } from '@/components/utils/supabaseClient';
import logger from '@/utils/logger';

// Event emitter for local activity broadcasts
const listeners = new Set();

export const globeActivity = {
  /**
   * Broadcast an activity to the globe
   * @param {Object} activity - Activity data
   * @param {string} activity.type - Activity type (see ACTIVITY_TYPES)
   * @param {number} [activity.lat] - Latitude (optional, will use random if not provided)
   * @param {number} [activity.lng] - Longitude (optional, will use random if not provided)
   * @param {Object} [activity.metadata] - Additional metadata
   * @param {string} [activity.fromLat] - For arc activities, starting latitude
   * @param {string} [activity.fromLng] - For arc activities, starting longitude
   */
  broadcast: (activity) => {
    const event = {
      ...activity,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    // Notify local listeners
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        logger.error('[GlobeActivity] Listener error:', e);
      }
    });
    
    // Optionally persist to database for cross-device sync
    if (activity.persist !== false) {
      persistActivity(event).catch(() => {
        // Non-critical, fail silently
      });
    }
    
    return event.id;
  },
  
  /**
   * Subscribe to activity broadcasts
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  
  /**
   * Get the current number of listeners
   */
  getListenerCount: () => listeners.size,
};

// Persist activity to database
async function persistActivity(activity) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) return;
    
    await supabase.from('user_interactions').insert({
      user_email: session.user.email,
      interaction_type: activity.type,
      lat: activity.lat || null,
      lng: activity.lng || null,
      metadata: {
        ...activity.metadata,
        fromLat: activity.fromLat,
        fromLng: activity.fromLng,
      },
      created_by: session.user.email,
    });
  } catch {
    // Non-critical
  }
}

// Convenience methods for common activity types
export const broadcast = {
  /** Message sent between users */
  message: (metadata = {}) => globeActivity.broadcast({
    type: 'message_sent',
    ...metadata,
  }),
  
  /** Profile viewed */
  profileView: (lat, lng, metadata = {}) => globeActivity.broadcast({
    type: 'profile_view',
    lat,
    lng,
    ...metadata,
  }),
  
  /** New follow */
  follow: (fromLat, fromLng, toLat, toLng, metadata = {}) => globeActivity.broadcast({
    type: 'follow',
    lat: toLat,
    lng: toLng,
    fromLat,
    fromLng,
    ...metadata,
  }),
  
  /** Match made */
  match: (lat, lng, metadata = {}) => globeActivity.broadcast({
    type: 'match',
    lat,
    lng,
    ...metadata,
  }),
  
  /** Beacon scanned */
  beaconScan: (lat, lng, metadata = {}) => globeActivity.broadcast({
    type: 'beacon_scan',
    lat,
    lng,
    ...metadata,
  }),
  
  /** New beacon created */
  beaconCreated: (lat, lng, metadata = {}) => globeActivity.broadcast({
    type: 'beacon_created',
    lat,
    lng,
    ...metadata,
  }),
  
  /** Event RSVP */
  eventRsvp: (lat, lng, metadata = {}) => globeActivity.broadcast({
    type: 'event_rsvp',
    lat,
    lng,
    ...metadata,
  }),
  
  /** Event check-in */
  eventCheckin: (lat, lng, metadata = {}) => globeActivity.broadcast({
    type: 'event_checkin',
    lat,
    lng,
    ...metadata,
  }),
  
  /** Purchase made */
  purchase: (lat, lng, metadata = {}) => globeActivity.broadcast({
    type: 'purchase',
    lat,
    lng,
    ...metadata,
  }),
  
  /** Product listed */
  productListed: (lat, lng, metadata = {}) => globeActivity.broadcast({
    type: 'product_listed',
    lat,
    lng,
    ...metadata,
  }),
  
  /** XP earned */
  xpEarned: (lat, lng, amount, metadata = {}) => globeActivity.broadcast({
    type: 'xp_earned',
    lat,
    lng,
    metadata: { ...metadata, amount },
  }),
  
  /** User went live (Right Now) */
  rightNow: (lat, lng, metadata = {}) => globeActivity.broadcast({
    type: 'right_now',
    lat,
    lng,
    ...metadata,
  }),
  
  /** User came online */
  online: (lat, lng, metadata = {}) => globeActivity.broadcast({
    type: 'online',
    lat,
    lng,
    persist: false, // Don't persist presence pings
    ...metadata,
  }),
  
  /** Track played */
  trackPlay: (metadata = {}) => globeActivity.broadcast({
    type: 'track_play',
    persist: false,
    ...metadata,
  }),
  
  /** Radio tune-in */
  radioTuneIn: (lat, lng, metadata = {}) => globeActivity.broadcast({
    type: 'radio_tune_in',
    lat,
    lng,
    ...metadata,
  }),
  
  /** Safety check-in */
  safetyCheckin: (lat, lng, metadata = {}) => globeActivity.broadcast({
    type: 'safety_checkin',
    lat,
    lng,
    persist: false, // Privacy
    ...metadata,
  }),
};

export default globeActivity;
