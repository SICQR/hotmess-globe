/**
 * useTaps — Boo interaction logic
 *
 * Loads the current user's sent boos on mount so profile cards can
 * show an amber "already boo'd" state. Provides sendBoo() to
 * toggle a boo on a target profile email.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { pushNotify } from '@/lib/pushNotify';

export type TapType = 'boo';

/** Composite key: `${booer_email}|${boo'd_email}` */
type TapKey = string;

const makeKey = (from: string, to: string): TapKey => `${from}|${to}|boo`;

export function useTaps(myEmail: string | null) {
  const [sentTaps, setSentTaps] = useState<Set<TapKey>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!myEmail) {
      setSentTaps(new Set());
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    supabase
      .from('taps')
      .select('tapped_email, tap_type')
      .eq('tapper_email', myEmail)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('[useTaps] taps table unavailable:', error.message);
          setIsLoading(false);
          return;
        }
        const keys = new Set<TapKey>(
          (data || []).map((row: { tapped_email: string; tap_type: string }) =>
            makeKey(myEmail, row.tapped_email)
          )
        );
        setSentTaps(keys);
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

  /**
   * Toggle a boo. Returns true = boo'd, false = un-boo'd.
   */
  const sendTap = useCallback(
    async (
      tappedEmail: string,
      tappedName: string,
      _tapType?: TapType
    ): Promise<boolean> => {
      if (!myEmail) return false;

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
        return false;
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
        return false;
      }

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

      const notifTitle = 'Boo\'d you! 👻';
      const notifBody = `${myDisplayName} boo'd you!`;

      // In-app notification
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

      // Push notification
      pushNotify({
        emails: [tappedEmail],
        title: notifTitle,
        body: notifBody,
        tag: 'boo',
        url: '/ghosted',
      });

      return true;
    },
    [myEmail, sentTaps]
  );

  return { sentTaps, isTapped, sendTap, isLoading };
}
