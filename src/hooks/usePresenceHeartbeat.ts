/**
 * usePresenceHeartbeat
 *
 * Two duties:
 *  A) profiles.last_seen + is_online every 5 minutes — drives Ghosted online dots
 *  B) user_presence upsert every 60 seconds — drives Globe user dots (with GPS)
 *
 * Called once in App.jsx (wraps all routes including OS mode paths).
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

const PROFILE_INTERVAL_MS = 30 * 1000; // 30 seconds (faster for testing discovery)
const PRESENCE_INTERVAL_MS = 30 * 1000; // 30 seconds

/** Best-effort GPS coords — returns null if unavailable or denied */
async function getCoords(userId: string): Promise<{ lat: number; lng: number } | null> {
  // 1. Check consent from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('location_consent')
    .eq('id', userId)
    .single();

  if (!profile?.location_consent) {
    console.log('[LocationService] No location consent. Skipping sync.');
    return null;
  }

  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
    );
  });
}

export function usePresenceHeartbeat() {
  const profileIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    // ── A) profiles.last_seen (5 min) ────────────────────────────────────────
    const updateLastSeen = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user?.id) return;
        userIdRef.current = user.id;

        const coords = await getCoords(user.id);

        const profileUpdate: Record<string, any> = {
          last_seen: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          is_online: true
        };

        if (coords) {
          profileUpdate.location = `POINT(${coords.lng} ${coords.lat})`;
          profileUpdate.last_lat = coords.lat;
          profileUpdate.last_lng = coords.lng;
        }

        await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('id', user.id);
      } catch {
        // Non-critical
      }
    };

    // ── B) user_presence upsert (60 s) — drives Globe dots ──────────────────
    const upsertPresence = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user?.id) return;
        userIdRef.current = user.id;

        const coords = await getCoords(user.id);

        const payload: Record<string, unknown> = {
          user_id: user.id,
          status: 'online',
          is_online: true,
          last_seen_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        };

        if (coords) {
          // Part B: Use PostGIS format (POINT(lng lat)) - longitude FIRST
          payload.location = `POINT(${coords.lng} ${coords.lat})`;
        }

        await supabase.from('user_presence').upsert(payload, { onConflict: 'user_id' });
      } catch {
        // Non-critical
      }
    };

    // ── Immediate heartbeat on mount ──────────────────────────────────────────
    updateLastSeen();
    upsertPresence();

    profileIntervalRef.current = setInterval(updateLastSeen, PROFILE_INTERVAL_MS);
    presenceIntervalRef.current = setInterval(upsertPresence, PRESENCE_INTERVAL_MS);

    // ── Visibility change — re-heartbeat on foreground ────────────────────────
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateLastSeen();
        upsertPresence();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ── Cleanup: go offline ──────────────────────────────────────────────────
    return () => {
      if (profileIntervalRef.current) clearInterval(profileIntervalRef.current);
      if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Best-effort offline write (fire and forget)
      const uid = userIdRef.current;
      if (uid) {
        supabase
          .from('profiles')
          .update({ is_online: false })
          .eq('id', uid)
          .then(() => { });
        supabase
          .from('user_presence')
          .update({ is_online: false, status: 'offline' })
          .eq('user_id', uid)
          .then(() => { });
      }
    };
  }, []);
}
