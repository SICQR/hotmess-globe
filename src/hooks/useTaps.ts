/**
 * useTaps — Boo interaction logic + mutual match detection
 *
 * Uses UUID-based from_user_id/to_user_id columns (migrated from email FK).
 * Still writes email columns for backwards compatibility during transition.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { pushNotify } from '@/lib/pushNotify';

export type TapType = 'boo';

type TapKey = string;

const makeKey = (fromId: string, toId: string): TapKey => `${fromId}|${toId}|boo`;

/**
 * @param myUserId - auth.uid() of the current user
 * @param myEmail  - email of the current user (kept for backwards-compat writes)
 */
export function useTaps(myUserId: string | null, myEmail?: string | null) {
  const [sentTaps, setSentTaps] = useState<Set<TapKey>>(new Set());
  /** User IDs of people who boo'd ME */
  const [receivedFrom, setReceivedFrom] = useState<Set<string>>(new Set());
  const [dailyBoos, setDailyBoos] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!myUserId) {
      setSentTaps(new Set());
      setReceivedFrom(new Set());
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    // Fetch sent AND received boos in parallel using UUID columns
    Promise.all([
      supabase
        .from('taps')
        .select('to_user_id, tapped_email, created_at')
        .eq('from_user_id', myUserId)
        .eq('tap_type', 'boo'),
      supabase
        .from('taps')
        .select('from_user_id, tapper_email')
        .eq('to_user_id', myUserId)
        .eq('tap_type', 'boo'),
    ])
      .then(([sentRes, receivedRes]) => {
        if (cancelled) return;

        if (sentRes.error) {
          console.warn('[useTaps] sent query failed:', sentRes.error.message);
        }
        if (receivedRes.error) {
          console.warn('[useTaps] received query failed:', receivedRes.error.message);
        }

        const todayStr = new Date().toISOString().split('T')[0];
        let todayCount = 0;

        const sentKeys = new Set<TapKey>(
          (sentRes.data || [])
            .filter((row) => row.to_user_id)
            .map((row) => {
              if (row.created_at && row.created_at.startsWith(todayStr)) {
                todayCount++;
              }
              return makeKey(myUserId, row.to_user_id)
            })
        );
        setSentTaps(sentKeys);
        setDailyBoos(todayCount);

        const recvSet = new Set<string>(
          (receivedRes.data || [])
            .filter((row) => row.from_user_id)
            .map((row) => row.from_user_id)
        );
        setReceivedFrom(recvSet);

        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [myUserId]);

  /** Check if we already boo'd this person (by user ID) */
  const isTapped = useCallback(
    (targetUserId: string, _tapType?: TapType): boolean => {
      if (!myUserId) return false;
      return sentTaps.has(makeKey(myUserId, targetUserId));
    },
    [myUserId, sentTaps]
  );

  /** Check if this person also boo'd us back (mutual match) */
  const isMutualBoo = useCallback(
    (theirUserId: string): boolean => {
      if (!myUserId) return false;
      const iBoodThem = sentTaps.has(makeKey(myUserId, theirUserId));
      const theyBoodMe = receivedFrom.has(theirUserId);
      return iBoodThem && theyBoodMe;
    },
    [myUserId, sentTaps, receivedFrom]
  );

  /** Check if this person has boo'd me (regardless of whether I boo'd them) */
  const hasReceivedBoo = useCallback(
    (theirUserId: string): boolean => receivedFrom.has(theirUserId),
    [receivedFrom]
  );

  /**
   * Toggle a boo.
   * Returns { sent: boolean, mutual: boolean }
   *   sent = true means boo was placed, false means it was removed
   *   mutual = true means both users have now boo'd each other
   */
  const sendTap = useCallback(
    async (
      targetUserId: string,
      targetName: string,
      _tapType?: TapType
    ): Promise<{ sent: boolean; mutual: boolean }> => {
      if (!myUserId) return { sent: false, mutual: false };

      const key = makeKey(myUserId, targetUserId);
      const alreadyDone = sentTaps.has(key);

      if (alreadyDone) {
        setSentTaps((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });

        const { error: delErr } = await supabase
          .from('taps')
          .delete()
          .eq('from_user_id', myUserId)
          .eq('to_user_id', targetUserId)
          .eq('tap_type', 'boo');

        if (delErr) console.warn('[useTaps] delete failed:', delErr.message);
        return { sent: false, mutual: false };
      }

      setSentTaps((prev) => new Set(prev).add(key));

      // Resolve emails for backwards-compat columns
      let myEmailVal = myEmail || '';
      let targetEmail = '';
      try {
        if (!myEmailVal) {
          const { data: me } = await supabase.from('profiles').select('email').eq('id', myUserId).maybeSingle();
          myEmailVal = me?.email || '';
        }
        const { data: target } = await supabase.from('profiles').select('email').eq('id', targetUserId).maybeSingle();
        targetEmail = target?.email || '';
      } catch { /* best-effort */ }

      const { error } = await supabase.from('taps').insert({
        from_user_id: myUserId,
        to_user_id: targetUserId,
        tapper_email: myEmailVal,
        tapped_email: targetEmail,
        tap_type: 'boo',
      });

      if (error) {
        setSentTaps((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        return { sent: false, mutual: false };
      }

      // Check for mutual boo
      const theyBoodMe = receivedFrom.has(targetUserId);

      // Resolve sender display name
      let myDisplayName: string = 'Someone';
      try {
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', myUserId)
          .maybeSingle();
        if (myProfile?.display_name) myDisplayName = myProfile.display_name;
      } catch { /* best-effort */ }

      if (theyBoodMe) {
        const matchTitle = 'It\'s a match! 👻';
        const matchBody = `You and ${myDisplayName} both boo'd each other!`;

        supabase
          .from('notifications')
          .insert({
            user_email: targetEmail,
            type: 'match',
            title: matchTitle,
            message: matchBody,
            read: false,
          })
          .then(({ error: notifErr }) => {
            if (notifErr) console.warn('[useTaps] match notification failed:', notifErr.message);
          })
          .catch(() => {});

        pushNotify({
          emails: targetEmail ? [targetEmail] : [],
          title: matchTitle,
          body: matchBody,
          tag: 'match',
          url: '/ghosted',
        });
      } else {
        const notifTitle = 'Boo\'d you! 👻';
        const notifBody = `${myDisplayName} boo'd you!`;

        supabase
          .from('notifications')
          .insert({
            user_email: targetEmail,
            type: 'boo',
            title: notifTitle,
            message: notifBody,
            read: false,
          })
          .then(({ error: notifErr }) => {
            if (notifErr) console.warn('[useTaps] notification insert failed:', notifErr.message);
          })
          .catch(() => {});

        pushNotify({
          emails: targetEmail ? [targetEmail] : [],
          title: notifTitle,
          body: notifBody,
          tag: 'boo',
          url: '/ghosted',
        });
      }

      return { sent: true, mutual: theyBoodMe };
    },
    [myUserId, myEmail, sentTaps, receivedFrom]
  );

  return { sentTaps, isTapped, sendTap, isMutualBoo, hasReceivedBoo, dailyBoos, isLoading };
}
