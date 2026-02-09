import { supabase, base44 } from '@/components/utils/supabaseClient';
import logger from '@/utils/logger';

export async function updatePresence({ lat, lng, accuracy, heading, speed }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const res = await fetch('/api/presence/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ lat, lng, accuracy, heading, speed }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Presence update failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Presence API - TTL-based visibility system
 * 
 * LAW 2: "Right Now" is presence rows with TTL, not UI toggles.
 * - If row exists with expires_at > now → user is visible
 * - If expires → user disappears automatically
 * - No manual "turn off" required (but supported)
 */
export const presenceAPI = {
  /**
   * Go Right Now - Create/update presence with TTL
   * Automatically deactivates any existing presence for the user
   * Also creates a social beacon for Globe rendering
   */
  goRightNow: async ({ intent, timeframe, location, preferences, ttlMinutes = 60 }) => {
    try {
      // Step 1: Create Right Now status (presence row)
      const { data, error } = await supabase.rpc('upsert_right_now_presence', {
        p_intent: intent || 'explore',
        p_timeframe: timeframe || 'now',
        p_location: location || null,
        p_preferences: preferences || null,
        p_ttl_minutes: ttlMinutes
      });

      if (error) throw error;

      logger.info('Presence: User went Right Now', { 
        statusId: data, 
        intent, 
        ttlMinutes 
      });

      // Step 2: Create social beacon for Globe (best-effort)
      try {
        const currentUser = await base44.auth.me();
        if (currentUser?.email) {
          // Import beaconAPI to avoid circular dependency
          const { beaconAPI } = await import('./beacons.js');
          await beaconAPI.createPresenceBeacon({
            userId: currentUser.auth_user_id,
            email: currentUser.email,
            intent: intent || 'explore',
            location,
            ttlMinutes
          });
        }
      } catch (beaconError) {
        // Don't fail the whole operation if beacon creation fails
        logger.warn('Presence: Failed to create beacon (non-fatal)', { 
          error: beaconError.message 
        });
      }

      return { id: data, expiresIn: ttlMinutes * 60 };
    } catch (error) {
      logger.error('Presence: Failed to go Right Now', { error: error.message });
      throw error;
    }
  },

  /**
   * Stop Right Now - Deactivate presence immediately
   * Also deactivates social beacons
   */
  stopRightNow: async () => {
    try {
      // Step 1: Deactivate Right Now status
      const { data, error } = await supabase.rpc('stop_right_now_presence');

      if (error) throw error;

      logger.info('Presence: User stopped Right Now', { deactivated: data });

      // Step 2: Deactivate social beacons (best-effort)
      try {
        const currentUser = await base44.auth.me();
        if (currentUser?.email) {
          const { beaconAPI } = await import('./beacons.js');
          await beaconAPI.deactivatePresenceBeacons(currentUser.email);
        }
      } catch (beaconError) {
        logger.warn('Presence: Failed to deactivate beacons (non-fatal)', { 
          error: beaconError.message 
        });
      }

      return { deactivated: data };
    } catch (error) {
      logger.error('Presence: Failed to stop Right Now', { error: error.message });
      throw error;
    }
  },

  /**
   * Get active Right Now users
   * Only returns users with active=true and expires_at > now
   */
  getActivePresence: async () => {
    try {
      const { data, error } = await base44.entities.RightNowStatus.filter({
        active: true
      });

      if (error) throw error;

      // Filter out expired rows on client side as extra safety
      const now = new Date();
      const activeUsers = (data || []).filter(status => {
        if (!status.expires_at) return false;
        const expiresAt = new Date(status.expires_at);
        return expiresAt > now;
      });

      logger.debug('Presence: Fetched active users', { 
        total: activeUsers.length 
      });

      return activeUsers;
    } catch (error) {
      logger.error('Presence: Failed to get active presence', { error: error.message });
      throw error;
    }
  },

  /**
   * Get current user's presence status
   */
  getMyPresence: async () => {
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser?.email) return null;

      const { data, error } = await base44.entities.RightNowStatus.filter({
        user_email: currentUser.email,
        active: true
      });

      if (error) throw error;

      // Return most recent active status
      const statuses = data || [];
      if (statuses.length === 0) return null;

      const now = new Date();
      const activeStatus = statuses
        .filter(s => {
          const expiresAt = new Date(s.expires_at);
          return expiresAt > now;
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

      return activeStatus || null;
    } catch (error) {
      logger.error('Presence: Failed to get my presence', { error: error.message });
      return null;
    }
  },

  /**
   * Subscribe to presence changes (realtime)
   * Returns unsubscribe function
   */
  subscribeToPresence: (callback) => {
    try {
      const channel = supabase
        .channel('right_now_presence')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'right_now_status',
            filter: 'active=eq.true'
          },
          (payload) => {
            logger.debug('Presence: Realtime update', { 
              event: payload.eventType,
              userId: payload.new?.auth_user_id 
            });
            callback(payload);
          }
        )
        .subscribe();

      // Return unsubscribe function
      return () => {
        supabase.removeChannel(channel);
        logger.debug('Presence: Unsubscribed from realtime');
      };
    } catch (error) {
      logger.error('Presence: Failed to subscribe', { error: error.message });
      return () => {}; // noop unsubscribe
    }
  }
};

