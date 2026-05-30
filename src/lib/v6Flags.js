/**
 * v6 Feature Flag Resolution
 *
 * Resolution order (kill switch is checked first for every call):
 *   1. v6_all_off kill switch ON  → false for everything
 *   2. User in enabled_for_user_ids         → true
 *   3. enabled_globally OR cohort='all'     → true
 *   4. cohort='admins' AND role='admin'     → true
 *   5. otherwise                            → false
 *
 * 00A Safety Rule: getFlag() refuses to resolve beyond phil_only
 * when requires_phil_signoff_for_ramp=true and phil_signoff_note is null/empty.
 *
 * Kill-switch bypass: infrastructure chunks (01, 13, 17a-c) have no flag — they
 * are always-on by design and unaffected by v6_all_off.
 */

import { supabase } from '@/components/utils/supabaseClient';

export const PHIL_UUID = '302040e5-c2ac-4fb3-a192-70598aa7b962';

// In-memory cache: { [flagKey]: { data, ts } }
const _cache = {};
const CACHE_TTL_MS = 60_000; // 1 minute

let _killSwitchCache = null;
let _killSwitchTs    = 0;

// ── helpers ──────────────────────────────────────────────────────────────────

async function _fetchKillSwitch() {
  const now = Date.now();
  if (_killSwitchCache !== null && now - _killSwitchTs < CACHE_TTL_MS) {
    return _killSwitchCache;
  }
  const { data } = await supabase
    .from('feature_flags')
    .select('enabled_globally')
    .eq('flag_key', 'v6_all_off')
    .single();
  _killSwitchCache = data?.enabled_globally === true;
  _killSwitchTs    = now;
  return _killSwitchCache;
}

async function _fetchFlag(flagKey) {
  const now = Date.now();
  if (_cache[flagKey] && now - _cache[flagKey].ts < CACHE_TTL_MS) {
    return _cache[flagKey].data;
  }
  const { data } = await supabase
    .from('feature_flags')
    .select('enabled_globally, enabled_for_user_ids, enabled_for_cohort, requires_phil_signoff_for_ramp, phil_signoff_note')
    .eq('flag_key', flagKey)
    .single();
  _cache[flagKey] = { data: data ?? null, ts: now };
  return data ?? null;
}

// Bust cache for a specific flag (call after a flip)
export function bustFlagCache(flagKey) {
  delete _cache[flagKey];
  if (flagKey === 'v6_all_off') {
    _killSwitchCache = null;
    _killSwitchTs    = 0;
  }
}

// ── public API ───────────────────────────────────────────────────────────────

/**
 * Resolve a feature flag for a given user.
 * @param {string}  flagKey  - e.g. 'v6_aa_system'
 * @param {string}  userId   - auth.uid()
 * @param {string}  userRole - 'admin' | 'user' | etc.
 * @returns {Promise<boolean>}
 */
export async function resolveFlag(flagKey, userId, userRole = 'user') {
  // 1. Kill switch
  if (await _fetchKillSwitch()) return false;

  const flag = await _fetchFlag(flagKey);
  if (!flag) return false;

  // 00A: safety rule — if ramp requires signoff and no note exists,
  // refuse to resolve true for anyone who is not phil_only.
  const isPhil = userId === PHIL_UUID;
  if (
    flag.requires_phil_signoff_for_ramp &&
    !flag.phil_signoff_note &&
    flag.enabled_for_cohort !== 'phil_only' &&
    !flag.enabled_for_user_ids?.includes(userId)
  ) {
    // Allow Phil himself even without signoff note (he's the one who gives it)
    if (!isPhil) return false;
  }

  // 2. User explicitly listed
  if (Array.isArray(flag.enabled_for_user_ids) && flag.enabled_for_user_ids.includes(userId)) {
    return true;
  }

  // 3. Global / all cohort
  if (flag.enabled_globally || flag.enabled_for_cohort === 'all') return true;

  // 4. Admins cohort
  if (flag.enabled_for_cohort === 'admins' && userRole === 'admin') return true;

  return false;
}

/**
 * Write an audit log entry for a flag flip.
 * @param {string} flagKey
 * @param {string} actorId
 * @param {string} action  - 'cohort_change'|'add_user'|'remove_user'|'global_on'|'global_off'|'kill_switch_on'|'kill_switch_off'
 * @param {*}      fromVal
 * @param {*}      toVal
 * @param {string} [note]
 */
export async function logFlagFlip(flagKey, actorId, action, fromVal, toVal, note) {
  await supabase.from('feature_flag_audit_log').insert({
    flag_key:   flagKey,
    actor_id:   actorId,
    action,
    from_value: fromVal  != null ? fromVal  : null,
    to_value:   toVal    != null ? toVal    : null,
    note:       note     ?? null,
  });
}
