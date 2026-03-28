/**
 * usePresenceHeartbeat — Updates profiles.last_seen every 5 minutes
 *
 * Grindr pattern: users seen within 10 minutes show as "online" (green dot).
 * This heartbeat ensures last_seen stays fresh while the app is open.
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function usePresenceHeartbeat() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const updateLastSeen = async () => {
      try {
        // getSession() reads from localStorage — no network call
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user?.id) return;

        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString(), is_online: true })
          .eq('id', user.id);
      } catch {
        // Silently fail — presence is non-critical
      }
    };

    // Update immediately on mount
    updateLastSeen();

    // Then every 5 minutes
    intervalRef.current = setInterval(updateLastSeen, HEARTBEAT_INTERVAL_MS);

    // Also update on visibility change (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateLastSeen();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
