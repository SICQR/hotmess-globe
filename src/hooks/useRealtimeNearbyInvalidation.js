import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';

// Supabase Realtime helper: when other users update presence/location
// (public."User" updates), invalidate the local nearby queries so lists
// stay fresh without aggressive polling.
export default function useRealtimeNearbyInvalidation({
  enabled,
  queryKeys = [],
  minInvalidateMs = 5000,
} = {}) {
  const queryClient = useQueryClient();
  const lastInvalidateAtRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('realtime-nearby-invalidate')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'User',
        },
        () => {
          const now = Date.now();
          if (now - lastInvalidateAtRef.current < minInvalidateMs) return;
          lastInvalidateAtRef.current = now;

          for (const key of queryKeys) {
            if (!key) continue;
            queryClient.invalidateQueries({ queryKey: key });
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [enabled, minInvalidateMs, queryClient, queryKeys]);
}
