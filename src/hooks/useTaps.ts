/**
 * useTaps — Boo interaction logic + mutual match detection
 *
 * Loads SENT and RECEIVED boos on mount so we can:
 * - Show amber "already boo'd" state on profile cards
 * - Detect mutual boos (both A→B and B→A exist)
 * - Trigger match celebrations on mutual detection
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { pushNotify } from '@/lib/pushNotify';

export type TapType = 'boo';

type TapKey = string;

const makeKey = (from: string, to: string): TapKey => `${from}|${to}|boo`;

export function useTaps(myEmail: string | null) {
  const [sentTaps, setSentTaps] = useState<Set<TapKey>>(new Set());
  /** Emails of people who boo'd ME */
  const [receivedFrom, setReceivedFrom] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!myEmail) {
      setSentTaps(new Set());
      setReceivedFrom(new Set());
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    // Fetch sent AND received boos in parallel
    Promise.all([
      supabase
        .from('taps')
        .select('tapped_email')
        .eq('tapper_email', myEmail)
        .eq('tap_type', 'boo'),
      supabase
        .from('taps')
        .select('tapper_email')
        .eq('tapped_email', myEmail)
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

        const sentKeys = new Set<TapKey>(
          (sentRes.data || []).map((row: { tapped_email: string }) =>
            makeKey(myEmail, row.tapped_email)
          )
        );
        setSentTaps(sentKeys);

        const recvSet = new Set<string>(
          (receivedRes.data || []).map((row: { tapper_email: string }) => row.tapper_email)
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
  }, [myEmail]);

  /** Check if we already boo'd this person */
  const isTapped = useCallback(
    (tappedEmail: string, _tapType?: TapType): boolean => {
      if (!myEmail) return false;
      return sentTaps.has(makeKey(myEmail, tappedEmail));
    },
    [myEmail, sentTaps]
  );

  /** Check if this person also boo'd us back (mutual match) */
  const isMutualBoo = useCallback(
    (theirEmail: string): boolean => {
      if (!myEmail) return false;
      const iBoodThem = sentTaps.has(makeKey(myEmail, theirEmail));
      const theyBoodMe = receivedFrom.has(theirEmail);
      return iBoodThem && theyBoodMe;
    },
    [myEmail, sentTaps, receivedFrom]
  );

  /** Check if this person has boo'd me (regardless of whether I boo'd them) */
  const hasReceivedBoo = useCallback(
    (theirEmail: string): boolean => receivedFrom.has(theirEmail),
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
      tappedEmail: string,
      tappedName: string,
      _tapType?: TapType
    ): Promise<{ sent: boolean; mutual: boolean }> => {
      if (!myEmail) return { sent: false, mutual: false };

      const key = makeKey(myEmail, tappedEmail);
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
          .eq('tapper_email', myEmail)
          .eq('tapped_email', tappedEmail)
          .eq('tap_type', 'boo');

        if (delErr) console.warn('[useTaps] delete failed:', delErr.message);
        return { sent: false, mutual: false };
      }

      setSentTaps((prev) => new Set(prev).add(key));

      const { error } = await supabase.from('taps').insert({
        tapper_email: myEmail,
        tapped_email: tappedEmail,
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

      // Check for mutual boo — did they already boo us?
      const theyBoodMe = receivedFrom.has(tappedEmail);

      // Resolve sender display name
      let myDisplayName: string = 'Someone';
      try {
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('email', myEmail)
          .maybeSingle();
        if (myProfile?.display_name) myDisplayName = myProfile.display_name;
      } catch {
        // best-effort
      }

      if (theyBoodMe) {
        // Mutual match! Notify both parties
        const matchTitle = 'It\'s a match! 👻';
        const matchBodyForThem = `You and ${myDisplayName} both boo'd each other!`;

        supabase
          .from('notifications')
          .insert({
            user_email: tappedEmail,
            type: 'match',
            title: matchTitle,
            message: matchBodyForThem,
            read: false,
          })
          .then(({ error: notifErr }) => {
            if (notifErr) console.warn('[useTaps] match notification failed:', notifErr.message);
          })
          .catch(() => {});

        pushNotify({
          emails: [tappedEmail],
          title: matchTitle,
          body: matchBodyForThem,
          tag: 'match',
          url: '/ghosted',
        });
      } else {
        // One-way boo notification
        const notifTitle = 'Boo\'d you! 👻';
        const notifBody = `${myDisplayName} boo'd you!`;

        supabase
          .from('notifications')
          .insert({
            user_email: tappedEmail,
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
          emails: [tappedEmail],
          title: notifTitle,
          body: notifBody,
          tag: 'boo',
          url: '/ghosted',
        });
      }

      return { sent: true, mutual: theyBoodMe };
    },
    [myEmail, sentTaps]
  );

  return { sentTaps, isTapped, sendTap, isMutualBoo, hasReceivedBoo, isLoading };
}
