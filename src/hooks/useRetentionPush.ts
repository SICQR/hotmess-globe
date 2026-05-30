/**
 * useRetentionPush — Client-side push notification triggers
 *
 * Runs on visibility change (app resume) and checks:
 *   1. New music drop since last visit → push
 *   2. Pulse activity spike → push
 *   3. Radio live + user was inactive → push
 *   4. Unfinished stem interest (24h) → push
 *   5. Preview abandon (24h) → push
 *
 * All pushes go through the rate limiter (max 2/day, no dupe type in 6h).
 * Push is shown via showLocalNotification (foreground) — background pushes
 * come from the Edge Function triggered server-side.
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { showLocalNotification } from '@/lib/notifications/showNotification';
import {
  getNotifTemplate,
  canSendPush,
  recordPush,
  getRecentIntents,
  type NotifType,
} from '@/lib/notifications/templates';

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 min minimum between checks
const LS_LAST_CHECK = 'hm_push_last_check';

function shouldCheck(): boolean {
  try {
    const last = localStorage.getItem(LS_LAST_CHECK);
    if (!last) return true;
    return Date.now() - parseInt(last, 10) > CHECK_INTERVAL;
  } catch {
    return true;
  }
}

function markChecked(): void {
  try {
    localStorage.setItem(LS_LAST_CHECK, String(Date.now()));
  } catch { /* noop */ }
}

async function tryPush(type: NotifType, vars?: Record<string, string | number>): Promise<boolean> {
  if (!canSendPush(type)) return false;
  const t = getNotifTemplate(type, vars);
  await showLocalNotification(t.title, t.body, t.url, t.tag);
  recordPush(type);
  return true;
}

async function runChecks(): Promise<void> {
  if (!shouldCheck()) return;
  markChecked();

  const lastVisit = localStorage.getItem('hm_last_visit');
  const since = lastVisit || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Priority 1: Music drop
  try {
    const { count } = await supabase
      .from('label_releases')
      .select('id', { count: 'exact', head: true })
      .gte('release_date', since)
      .eq('is_active', true);

    if (count && count > 0) {
      const sent = await tryPush('music_drop');
      if (sent) return; // Only one push per check
    }
  } catch { /* non-fatal */ }

  // Priority 2: Pulse activity spike
  try {
    const { count } = await supabase
      .from('right_now_status')
      .select('id', { count: 'exact', head: true })
      .gte('expires_at', new Date().toISOString());

    if (count && count >= 3) {
      const sent = await tryPush('pulse_activity', { count });
      if (sent) return;
    }
  } catch { /* non-fatal */ }

  // Priority 3: Radio live (check if shows table has active show)
  try {
    const now = new Date().toISOString();
    const { data: liveShow } = await supabase
      .from('shows')
      .select('id')
      .lte('start_time', now)
      .gte('end_time', now)
      .limit(1)
      .maybeSingle();

    if (liveShow) {
      const sent = await tryPush('radio_live');
      if (sent) return;
    }
  } catch { /* non-fatal */ }

  // Priority 4: Stem interest (viewed stem sheet but didn't buy, 24h ago)
  const stemIntents = getRecentIntents('stem_view');
  if (stemIntents.length > 0) {
    // Only trigger if intent is >2h old (give them time, not pressure)
    const oldest = stemIntents[0];
    if (Date.now() - oldest.ts > 2 * 60 * 60 * 1000) {
      const sent = await tryPush('stem_interest');
      if (sent) return;
    }
  }

  // Priority 5: Preview abandon
  const abandonIntents = getRecentIntents('preview_abandon');
  if (abandonIntents.length > 0) {
    const oldest = abandonIntents[0];
    if (Date.now() - oldest.ts > 2 * 60 * 60 * 1000) {
      await tryPush('preview_abandon');
    }
  }
}

/**
 * Hook that runs retention push checks on:
 *   - Initial mount (app open)
 *   - Visibility change (tab/app resume)
 *
 * All checks are rate-limited and non-blocking.
 */
export function useRetentionPush(): void {
  const ranRef = useRef(false);

  useEffect(() => {
    // Run once on mount (app open)
    if (!ranRef.current) {
      ranRef.current = true;
      runChecks().catch(() => {});
    }

    // Run on visibility change (app resume from background)
    function onVisible() {
      if (document.visibilityState === 'visible') {
        runChecks().catch(() => {});
      }
    }

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
}
