/**
 * src/lib/analytics.ts — Chunk 17c
 *
 * Client-side analytics helper. Fire-and-forget POST to /api/analytics/track.
 * Never blocks rendering. Never throws to callers.
 *
 * Usage:
 *   import { track } from '@/lib/analytics';
 *   track('signup', 'onboarding', 'google_oauth');
 *   track('flag_exposure', 'flags', undefined, undefined, { flag_key: 'v6_aa_system' });
 *
 * 2026-05-30 — #343 fix. Previously: fetch fired with no Authorization header,
 * so /api/analytics/track resolved user_id=null on every call, including
 * post-auth events like signup / age_gate_passed / profile_complete. Server
 * code was correct; the client never sent the JWT. Now we await the supabase
 * session (cached in localStorage, sub-ms) and attach a Bearer token when one
 * exists. Anonymous events still work — Authorization is only added when the
 * user is signed in. beta_redeemed continues to work because it fires
 * server-side from api/beta/redeem.js, not from this helper.
 */

import { supabase } from '@/components/utils/supabaseClient';

export interface TrackEvent {
  event_name:  string;
  category?:   string;
  label?:      string;
  value?:      number;
  properties?: Record<string, unknown>;
}

// Per-session id, stable within a single tab. Generated lazily on first use,
// stored in sessionStorage so it survives in-tab navigation but resets on
// new-tab / fresh visit. Lets the digest join events to a single user-session
// for journey reconstruction without depending on auth.
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let sid = sessionStorage.getItem('hm_session_id');
    if (!sid) {
      sid = 'hm_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      sessionStorage.setItem('hm_session_id', sid);
    }
    return sid;
  } catch {
    return '';
  }
}

/**
 * track — send a single analytics event.
 * Errors are swallowed — analytics must never disrupt user flow.
 *
 * The function signature stays synchronous (returns void). The async work
 * happens inside an IIFE so callers never need to await.
 */
export function track(
  event_name: string,
  category?:  string,
  label?:     string,
  value?:     number,
  properties?: Record<string, unknown>,
): void {
  const payload: TrackEvent = { event_name, category, label, value, properties };
  const session_id = getSessionId();

  // Async resolve auth + fire. Caller stays sync.
  void (async () => {
    let authHeaders: Record<string, string> = {};
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authHeaders.Authorization = `Bearer ${session.access_token}`;
      }
    } catch {
      // No session available — fire anonymous, same as before.
    }

    // Best-effort POST — no await, no catch bubbling
    fetch('/api/analytics/track', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(session_id ? { 'X-HM-Session-Id': session_id } : {}),
      },
      body: JSON.stringify({ ...payload, session_id: session_id || undefined }),
      // keepalive allows the request to outlive page unload
      keepalive: true,
    }).catch(() => { /* swallow — analytics must not disrupt UX */ });
  })();
}

/**
 * trackOnce — send an event only once per session per key.
 * Useful for flag_exposure and first_* events to avoid flooding.
 */
const _sent = new Set<string>();

export function trackOnce(
  dedupeKey:   string,
  event_name:  string,
  category?:   string,
  label?:      string,
  value?:      number,
  properties?: Record<string, unknown>,
): void {
  if (_sent.has(dedupeKey)) return;
  _sent.add(dedupeKey);
  track(event_name, category, label, value, properties);
}
