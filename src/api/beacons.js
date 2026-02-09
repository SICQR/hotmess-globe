/**
 * Beacon API - Unified Globe rendering system
 * 
 * LAW 3 (partial): Globe renders only beacons
 * Beacon types:
 * - social: Right Now presence (ephemeral, TTL-based)
 * - event: Events, parties, concerts
 * - market: Marketplace products (Shopify + P2P)
 * - radio: Live shows, broadcasts
 * - safety: Safety beacons, panic alerts
 * 
 * All live objects write to beacons table with appropriate type.
 * Globe subscribes to beacons and renders based on type.
 */

import { base44 } from '@/components/utils/supabaseClient';
import logger from '@/utils/logger';

export const beaconAPI = {
  /**
   * Get all active beacons (for Globe rendering)
   * Filters out expired beacons automatically
   */
  getActiveBeacons: async ({ type, city, limit = 100 } = {}) => {
    try {
      let query = base44.entities.Beacon.filter({ 
        active: true, 
        status: 'published' 
      });

      // Add type filter if specified
      if (type) {
        // Type filter needs to be added to the query params
        // base44.entities doesn't support dynamic filters well, so we use raw query
        const { data, error } = await base44.supabase
          .from('Beacon')
          .select('*')
          .eq('active', true)
          .eq('status', 'published')
          .eq('type', type)
          .limit(limit);

        if (error) throw error;

        // Filter out expired beacons client-side
        const now = new Date();
        const activeBeacons = (data || []).filter(beacon => {
          if (!beacon.expires_at) return true;
          const expiresAt = new Date(beacon.expires_at);
          return expiresAt > now;
        });

        return activeBeacons;
      }

      // Get all beacons without type filter
      const { data, error } = await base44.supabase
        .from('Beacon')
        .select('*')
        .eq('active', true)
        .eq('status', 'published')
        .limit(limit);

      if (error) throw error;

      // Filter out expired beacons
      const now = new Date();
      const activeBeacons = (data || []).filter(beacon => {
        if (!beacon.expires_at) return true;
        const expiresAt = new Date(beacon.expires_at);
        return expiresAt > now;
      });

      return activeBeacons;
    } catch (error) {
      logger.error('Beacons: Failed to get active beacons', { error: error.message });
      throw error;
    }
  },

  /**
   * Create a Right Now presence beacon (social type)
   * This is automatically called by presenceAPI.goRightNow()
   */
  createPresenceBeacon: async ({ userId, email, intent, location, ttlMinutes = 60 }) => {
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      const { data, error } = await base44.supabase
        .from('Beacon')
        .insert({
          type: 'social',
          status: 'published',
          active: true,
          title: `${email} is Right Now`,
          description: `Looking to ${intent}`,
          lat: location?.lat,
          lng: location?.lng,
          city: location?.city,
          owner_email: email,
          expires_at: expiresAt.toISOString(),
          metadata: {
            intent,
            userId,
            rightNow: true
          }
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Beacons: Created presence beacon', { 
        beaconId: data.id, 
        ttlMinutes 
      });

      return data;
    } catch (error) {
      logger.error('Beacons: Failed to create presence beacon', { error: error.message });
      throw error;
    }
  },

  /**
   * Deactivate user's presence beacons
   * This is automatically called by presenceAPI.stopRightNow()
   */
  deactivatePresenceBeacons: async (userEmail) => {
    try {
      const { data, error } = await base44.supabase
        .from('Beacon')
        .update({ active: false })
        .eq('type', 'social')
        .eq('owner_email', userEmail)
        .eq('active', true);

      if (error) throw error;

      logger.info('Beacons: Deactivated presence beacons', { userEmail });

      return data;
    } catch (error) {
      logger.error('Beacons: Failed to deactivate presence beacons', { error: error.message });
      throw error;
    }
  },

  /**
   * Subscribe to beacon changes (realtime)
   * Returns unsubscribe function
   */
  subscribeToBeacons: (callback) => {
    try {
      const channel = base44.supabase
        .channel('beacons_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'Beacon',
            filter: 'active=eq.true'
          },
          (payload) => {
            logger.debug('Beacons: Realtime update', { 
              event: payload.eventType,
              beaconId: payload.new?.id,
              type: payload.new?.type
            });
            callback(payload);
          }
        )
        .subscribe();

      // Return unsubscribe function
      return () => {
        base44.supabase.removeChannel(channel);
        logger.debug('Beacons: Unsubscribed from realtime');
      };
    } catch (error) {
      logger.error('Beacons: Failed to subscribe', { error: error.message });
      return () => {}; // noop unsubscribe
    }
  }
};

export default beaconAPI;
