/**
 * usePresence Hook
 * 
 * Tracks online users using Supabase Presence.
 * Shows who's live on the Globe in real-time.
 * 
 * Part of the HotMess OS Integration - makes user presence visible globally.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { base44 } from '@/api/base44Client';

/**
 * Hook to manage user presence and track online users
 * @param {Object} options - Configuration options
 * @returns {Object} - Presence state and controls
 */
export const usePresence = (options = {}) => {
  const {
    channelName = 'hotmess-presence',
    updateInterval = 30000, // Update presence every 30 seconds
    enableLocationSharing = false,
  } = options;

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [myPresence, setMyPresence] = useState(null);
  const [channel, setChannel] = useState(null);

  // Initialize presence channel
  useEffect(() => {
    let presenceChannel = null;
    let intervalId = null;

    const initPresence = async () => {
      try {
        // Get current user
        const user = await base44.auth.me();
        if (!user) {
          console.log('[Presence] No authenticated user');
          return;
        }

        // Create presence channel
        presenceChannel = supabase.channel(channelName, {
          config: {
            presence: {
              key: user.email || user.id,
            },
          },
        });

        // Track presence state
        presenceChannel
          .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            const users = Object.keys(state).map((key) => {
              const presences = state[key];
              return presences[0]; // Get first presence for this key
            });
            
            setOnlineUsers(users);
            console.log('[Presence] Online users:', users.length);
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            console.log('[Presence] User joined:', key, newPresences);
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            console.log('[Presence] User left:', key, leftPresences);
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              // Send initial presence
              const location = enableLocationSharing
                ? await getCurrentLocation()
                : null;

              const presence = {
                user_id: user.id,
                email: user.email,
                full_name: user.full_name,
                avatar_url: user.avatar_url,
                online_at: new Date().toISOString(),
                ...(location && { lat: location.lat, lng: location.lng }),
              };

              await presenceChannel.track(presence);
              setMyPresence(presence);
              console.log('[Presence] Tracking started');

              // Update presence periodically
              intervalId = setInterval(async () => {
                const updatedLocation = enableLocationSharing
                  ? await getCurrentLocation()
                  : null;

                const updatedPresence = {
                  ...presence,
                  online_at: new Date().toISOString(),
                  ...(updatedLocation && {
                    lat: updatedLocation.lat,
                    lng: updatedLocation.lng,
                  }),
                };

                await presenceChannel.track(updatedPresence);
                setMyPresence(updatedPresence);
              }, updateInterval);
            }
          });

        setChannel(presenceChannel);
      } catch (error) {
        console.error('[Presence] Init error:', error);
      }
    };

    initPresence();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (presenceChannel) {
        presenceChannel.untrack();
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [channelName, updateInterval, enableLocationSharing]);

  // Get user's current location
  const getCurrentLocation = useCallback(async () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('[Presence] Geolocation error:', error);
          resolve(null);
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  }, []);

  // Update presence status (e.g., "Ghosted", "Available")
  const updateStatus = useCallback(
    async (status) => {
      if (!channel || !myPresence) return;

      try {
        const updatedPresence = {
          ...myPresence,
          status,
          online_at: new Date().toISOString(),
        };

        await channel.track(updatedPresence);
        setMyPresence(updatedPresence);

        // Also update in beacons table for Globe visualization
        const user = await base44.auth.me();
        if (user) {
          await supabase
            .from('Beacon')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('created_by', user.email);
        }

        console.log('[Presence] Status updated:', status);
      } catch (error) {
        console.error('[Presence] Update status error:', error);
      }
    },
    [channel, myPresence]
  );

  return {
    onlineUsers,
    myPresence,
    updateStatus,
    isTracking: !!channel,
  };
};

export default usePresence;
