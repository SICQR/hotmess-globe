/**
 * useGlobeData Hook
 * 
 * Real-time hook for Globe data with Supabase Presence and Postgres Changes.
 * Listens for new beacons and triggers visual "Pulse" effects.
 * 
 * Part of the HotMess OS Integration - makes the Globe react to new users and beacons.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

/**
 * Hook to listen for real-time beacon updates
 * @param {Function} onNewBeacon - Callback when a new beacon is inserted
 * @returns {Array} beacons - Array of beacons
 */
export const useGlobeData = (onNewBeacon) => {
  const [beacons, setBeacons] = useState([]);

  useEffect(() => {
    // 1. Listen for new Beacons (Social/Shop/Events)
    const channel = supabase
      .channel('globe-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Beacon' },
        (payload) => {
          console.log('[useGlobeData] New beacon:', payload.new);
          
          setBeacons((prev) => [...prev, payload.new]);
          
          // Trigger callback for visual effects (e.g., pulse in Three.js scene)
          if (onNewBeacon && typeof onNewBeacon === 'function') {
            onNewBeacon(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Beacon' },
        (payload) => {
          console.log('[useGlobeData] Updated beacon:', payload.new);
          
          setBeacons((prev) =>
            prev.map((beacon) =>
              beacon.id === payload.new.id ? payload.new : beacon
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'Beacon' },
        (payload) => {
          console.log('[useGlobeData] Deleted beacon:', payload.old);
          
          setBeacons((prev) =>
            prev.filter((beacon) => beacon.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNewBeacon]);

  return beacons;
};

export default useGlobeData;
