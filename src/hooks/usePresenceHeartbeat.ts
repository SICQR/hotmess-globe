/**
 * usePresenceHeartbeat
 *
 * Two duties:
 *  A) profiles.last_seen + is_online every 5 minutes — drives Ghosted online dots
 *  B) user_presence upsert every 30 seconds — drives Globe user dots
 *
 * Called once in App.jsx (wraps all routes including OS mode paths).
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

const PROFILE_INTERVAL_MS  = 5 * 60 * 1000; // 5 minutes
const PRESENCE_INTERVAL_MS = 30 * 1000;      // 30 seconds

export function usePresenceHeartbeat() {
  const profileIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const presenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // ── A) profiles.last_seen (5 min) ────────────────────────────────────────
    const updateLastSeen = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user?.id) return;

        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString(), is_online: true })
          .eq('id', user.id);
      } catch {
        // Non-critical
      }
    };

    // ── B) user_presence upsert (30 s) — drives Globe dots ──────────────────
    const upsertPresence = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user?.id) return;

        await supabase.from('user_presence').upsert({
          user_id:      user.id,
          status:       'online',
          last_seen_at: new Date().toISOString(),
          expires_at:   new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        }, { onConflict: 'user_id' });
      } catch {
        // Non-critical
      }
    };

    updateLastSeen();
    upsertPresence();

    profileIntervalRef.current  = setInterval(updateLastSeen,  PROFILE_INTERVAL_MS);
    presenceIntervalRef.current = setInterval(upsertPresence, PRESENCE_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateLastSeen();
        upsertPresence();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (profileIntervalRef.current)  clearInterval(profileIntervalRef.current);
      if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
