/**
 * useTypingIndicator — Broadcasts typing presence via Supabase Realtime
 *
 * Uses a broadcast channel (no DB writes) to emit typing events.
 * Channel: `typing:${threadId}`
 * Debounce: stops typing signal 2s after last sendTyping(true) call.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

interface TypingPayload {
  email: string;
  isTyping: boolean;
}

interface UseTypingIndicatorReturn {
  typingUsers: string[];
  sendTyping: (isTyping: boolean) => void;
}

export function useTypingIndicator(
  threadId: string | null | undefined,
  myEmail: string | null | undefined
): UseTypingIndicatorReturn {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubscribedRef = useRef(false);

  // Subscribe to the typing broadcast channel for this thread
  useEffect(() => {
    if (!threadId || !myEmail) return;

    const channelName = `typing:${threadId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }: { payload: TypingPayload }) => {
        if (!payload?.email || payload.email === myEmail) return;

        setTypingUsers((prev) => {
          if (payload.isTyping) {
            return prev.includes(payload.email) ? prev : [...prev, payload.email];
          } else {
            return prev.filter((e) => e !== payload.email);
          }
        });
      })
      .subscribe((status) => {
        isSubscribedRef.current = status === 'SUBSCRIBED';
      });

    channelRef.current = channel;
    isSubscribedRef.current = false;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      isSubscribedRef.current = false;
      setTypingUsers([]);
    };
  }, [threadId, myEmail]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!channelRef.current || !myEmail) return;

      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { email: myEmail, isTyping },
      });

      if (isTyping) {
        // Auto-stop after 2s of no sendTyping(true) calls
        if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
        stopTimerRef.current = setTimeout(() => {
          if (channelRef.current && myEmail) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'typing',
              payload: { email: myEmail, isTyping: false },
            });
          }
        }, 2000);
      } else {
        if (stopTimerRef.current) {
          clearTimeout(stopTimerRef.current);
          stopTimerRef.current = null;
        }
      }
    },
    [myEmail]
  );

  return { typingUsers, sendTyping };
}

export default useTypingIndicator;
