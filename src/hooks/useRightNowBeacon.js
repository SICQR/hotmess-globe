/**
 * useRightNowBeacon — Toggle "Right Now" status as a Lime beacon on the Globe
 *
 * When enabled: INSERT into Beacon with kind='social', user's location, expires in 4h.
 * When disabled: DELETE or deactivate the user's social beacon(s).
 *
 * @see docs/HOTMESS-LONDON-OS-REMAP-MASTER.md §5 Flow 3 (Ghosted), §6 Pulse contract
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

const RIGHT_NOW_EXPIRY_HOURS = 4;

/**
 * @param {{ userId: string | null, userLat?: number | null, userLng?: number | null }} options
 * @returns {{ isRightNow: boolean, toggle: (on: boolean) => Promise<boolean>, loading: boolean, error: string | null }}
 */
export function useRightNowBeacon({ userId, userLat = null, userLng = null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeBeaconId, setActiveBeaconId] = useState(null);

  useEffect(() => {
    if (!userId) {
      setActiveBeaconId(null);
      return;
    }
    const now = new Date().toISOString();
    supabase
      .from('Beacon')
      .select('id')
      .eq('promoter_id', userId)
      .eq('kind', 'social')
      .eq('active', true)
      .or(`end_at.gte.${now},end_at.is.null`)
      .maybeSingle()
      .then(({ data }) => setActiveBeaconId(data?.id ?? null));
  }, [userId]);

  const toggle = useCallback(
    async (on) => {
      if (!userId) {
        setError('Not signed in');
        return false;
      }
      setLoading(true);
      setError(null);
      try {
        if (on) {
          const lat = userLat ?? 51.5074;
          const lng = userLng ?? -0.1278;
          const endAt = new Date();
          endAt.setHours(endAt.getHours() + RIGHT_NOW_EXPIRY_HOURS);
          const { data, error: insertErr } = await supabase
            .from('Beacon')
            .insert({
              kind: 'social',
              active: true,
              status: 'published',
              lat,
              lng,
              city: 'London',
              title: 'Right Now',
              promoter_id: userId,
              end_at: endAt.toISOString(),
            })
            .select('id')
            .single();
          if (insertErr) throw insertErr;
          setActiveBeaconId(data?.id ?? null);
          return true;
        } else {
          const { error: deleteErr } = await supabase
            .from('Beacon')
            .delete()
            .eq('promoter_id', userId)
            .eq('kind', 'social');
          if (deleteErr) throw deleteErr;
          setActiveBeaconId(null);
          return true;
        }
      } catch (e) {
        console.warn('[useRightNowBeacon]', e);
        setError(e.message || 'Failed to update Right Now');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [userId, userLat, userLng]
  );

  return {
    isRightNow: !!activeBeaconId,
    toggle,
    loading,
    error,
    activeBeaconId,
  };
}
