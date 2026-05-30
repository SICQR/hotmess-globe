/**
 * claimPendingBetaCode — single source of truth for resolving a beta code
 * that a user submitted on /redeem BEFORE they were authenticated.
 *
 * Doctrine 11 (Silent State Death Is Forbidden): the system writes intent;
 * the system must close intent. A beta code in sessionStorage that no code
 * path ever reads is silent state death — forbidden.
 *
 * Primary call site: src/pages/auth/callback.jsx (after referral block).
 *   First guaranteed authenticated state. Deterministic. Provider-agnostic.
 *
 * Fallback call site: src/components/shell/BootRouter.jsx READY state.
 *   Catches stale sessions, refreshed tabs, interrupted OAuth, mobile
 *   deep-link inconsistencies. The same helper, idempotent — running it
 *   twice does nothing harmful because sessionStorage.removeItem clears
 *   the key on first success.
 *
 * On success: writes hm_arrival_signal = 'founding_access_confirmed' to
 *   sessionStorage so the next render (Pulse) can surface a quiet, subtle
 *   confirmation line. No modal. No confetti. Operational confidence.
 *
 * On failure: writes hm_arrival_signal = 'founding_access_failed' so the
 *   user sees their intent did NOT resolve — failure is visible, not silent.
 *   Code is left in sessionStorage so /redeem can be retried.
 *
 * Phil 2026-05-29 — PR 4 of the auth consolidation sequence.
 */
import { supabase } from '@/components/utils/supabaseClient';

const PENDING_KEY = 'hm_pending_beta_code';
const SIGNAL_KEY = 'hm_arrival_signal';

export type BetaClaimResult =
  | { state: 'none' }                      // no pending code
  | { state: 'claimed'; until?: string }    // success
  | { state: 'invalid' }                    // code not valid
  | { state: 'exhausted' }                  // already used
  | { state: 'expired' }                    // window closed
  | { state: 'no_token' }                   // not authed yet (fallback path)
  | { state: 'transport_error' };           // network / server down

export async function claimPendingBetaCode(): Promise<BetaClaimResult> {
  let code: string | null = null;
  try { code = sessionStorage.getItem(PENDING_KEY); } catch { /* private mode */ }
  if (!code) return { state: 'none' };

  let token: string | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token || null;
  } catch { /* swallow */ }
  if (!token) {
    // Don't clear the key — caller will retry once authed.
    return { state: 'no_token' };
  }

  try {
    const res = await fetch('/api/beta/redeem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });
    const json = await res.json().catch(() => ({}));

    if (res.ok && json?.ok !== false) {
      try {
        sessionStorage.removeItem(PENDING_KEY);
        sessionStorage.removeItem('hm_referral_code');
        sessionStorage.setItem(SIGNAL_KEY, 'founding_access_confirmed');
      } catch { /* private mode */ }
      return { state: 'claimed', until: json?.beta_access_until };
    }

    // 4xx with a known error code from /api/beta/redeem
    const err = (json?.error || '').toString();
    let state: BetaClaimResult['state'] = 'invalid';
    if (err === 'code_exhausted') state = 'exhausted';
    else if (err === 'code_expired') state = 'expired';
    else if (err === 'invalid_code' || err === 'code_required') state = 'invalid';
    else state = 'invalid';

    try { sessionStorage.setItem(SIGNAL_KEY, 'founding_access_failed'); } catch { /* swallow */ }
    // Note: we DO clear the code on a 4xx — the server has confirmed it's
    // invalid/exhausted/expired, so retrying with the same value will not
    // succeed. Failure state is visible via SIGNAL_KEY.
    try { sessionStorage.removeItem(PENDING_KEY); } catch { /* swallow */ }
    return { state };
  } catch {
    // Network / server down. Leave the code in storage; transport_error means
    // try again later (BootRouter fallback will rerun on next READY render).
    try { sessionStorage.setItem(SIGNAL_KEY, 'founding_access_failed'); } catch { /* swallow */ }
    return { state: 'transport_error' };
  }
}

/**
 * Read the one-shot arrival signal written by claimPendingBetaCode and clear
 * it. Use this in the Pulse / OS arrival render so the line shows for exactly
 * one mount and never repeats. Returns null if no signal pending.
 */
export function consumeArrivalSignal(): 'founding_access_confirmed' | 'founding_access_failed' | null {
  try {
    const v = sessionStorage.getItem(SIGNAL_KEY);
    if (!v) return null;
    sessionStorage.removeItem(SIGNAL_KEY);
    if (v === 'founding_access_confirmed' || v === 'founding_access_failed') return v;
    return null;
  } catch {
    return null;
  }
}
