/**
 * useTaps — Tap / Woof interaction logic
 *
 * Loads the current user's sent taps on mount so profile cards can
 * show an amber "already tapped" state. Provides sendTap() to
 * toggle a tap/woof on a target profile email.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

export type TapType = 'tap' | 'woof';

/** Composite key: `${tapper_email}|${tapped_email}|${tap_type}` */
type TapKey = string;

const makeTapKey = (tapperEmail: string, tappedEmail: string, tapType: TapType): TapKey =>
  `${tapperEmail}|${tappedEmail}|${tapType}`;

export function useTaps(myEmail: string | null) {
  // Set of TapKey for quick lookup
  const [sentTaps, setSentTaps] = useState<Set<TapKey>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Load existing sent taps on mount (or when myEmail changes)
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
        // If the table doesn't exist (404/PGRST), silently degrade
        if (error) {
          console.warn('[useTaps] taps table unavailable:', error.message);
          setIsLoading(false);
          return;
        }
        const keys = new Set<TapKey>(
          (data || []).map((row: { tapped_email: string; tap_type: string }) =>
            makeTapKey(myEmail, row.tapped_email, row.tap_type as TapType)
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

  const isTapped = useCallback(
    (tappedEmail: string, tapType: TapType): boolean => {
      if (!myEmail) return false;
      return sentTaps.has(makeTapKey(myEmail, tappedEmail, tapType));
    },
    [myEmail, sentTaps]
  );

  /**
   * Toggle a tap or woof.
   * Returns the new state: true = tapped, false = un-tapped.
   */
  const sendTap = useCallback(
    async (
      tappedEmail: string,
      tappedName: string,
      tapType: TapType
    ): Promise<boolean> => {
      if (!myEmail) return false;

      const key = makeTapKey(myEmail, tappedEmail, tapType);
      const alreadyTapped = sentTaps.has(key);

      if (alreadyTapped) {
        // Optimistic removal
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
          .eq('tap_type', tapType);

        if (delErr) console.warn('[useTaps] delete failed:', delErr.message);
        return false;
      }

      // Optimistic add
      setSentTaps((prev) => new Set(prev).add(key));

      const { error } = await supabase.from('taps').insert({
        tapper_email: myEmail,
        tapped_email: tappedEmail,
        tap_type: tapType,
      });

      if (error) {
        // Rollback on error
        setSentTaps((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        return false;
      }

      // Fire notification to the tapped user (best-effort, table may not exist yet)
      const myName = myEmail.split('@')[0] ?? 'Someone';
      supabase
        .from('notifications')
        .insert({
          user_email: tappedEmail,
          type: tapType === 'woof' ? 'woof' : 'tap',
          title: tapType === 'woof' ? 'New Woof!' : 'New Tap!',
          message: `${tappedName ? tappedName : myName} sent you a ${tapType}!`,
          read: false,
        })
        .then(({ error: notifErr }) => {
          if (notifErr) console.warn('[useTaps] notification insert failed:', notifErr.message);
        })
        .catch(() => {});

      return true;
    },
    [myEmail, sentTaps]
  );

  return { sentTaps, isTapped, sendTap, isLoading };
}
