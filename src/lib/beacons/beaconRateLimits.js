// Beacon rate-limit / spam-control helper (SERVER-SIDE ONLY).
// Implements the enforcement surface for docs/GLOBE_BEACON_REPUTATION_AND_SPAM_CONTROL.md.
//
// Calls the SECURITY DEFINER RPC `check_beacon_concurrent_limit`, which is granted
// to `service_role` only — so this must run with a service-role Supabase client
// (e.g. inside an /api route), never the public/anon client. Reputation/spam tables
// are RLS deny-all (invisible); only the service role can touch them.
//
// IMPORTANT: this is NOT yet wired into the beacon-creation path. Enforcement is a
// deliberate, flagged rollout — wrong enforcement can block legitimate beacons, and
// emergency types must never be throttled. Every function here FAILS OPEN (allows
// the beacon) on any error, so wiring it can never harden into a creation outage.

export const CONCURRENT_LIMITS = { chill: 1, event: 3, ticket: 2, preloved: 5, default: 5 };
export const EMERGENCY_TYPES = ['sos', 'help', 'need_help'];

export function isEmergencyType(type) {
  return EMERGENCY_TYPES.includes(String(type || '').toLowerCase());
}

// Returns { allowed, current, limit, emergency? }. Fails OPEN on any error.
export async function checkBeaconConcurrentLimit(serviceClient, ownerId, type) {
  if (isEmergencyType(type)) return { allowed: true, emergency: true };
  if (!serviceClient || !ownerId) return { allowed: true, reason: 'no-client-or-owner' };
  try {
    const { data, error } = await serviceClient.rpc('check_beacon_concurrent_limit', {
      p_owner: ownerId,
      p_type: type,
    });
    if (error) return { allowed: true, reason: 'rpc-error', error: error.message };
    return data || { allowed: true };
  } catch (e) {
    return { allowed: true, reason: 'exception' };
  }
}

// Quiet moderation log (non-public). Fire-and-forget; never throws.
export async function logSpamEvent(serviceClient, { ownerId, beaconId, eventType, detail } = {}) {
  if (!serviceClient || !eventType) return;
  try {
    await serviceClient.from('beacon_spam_events').insert({
      owner_id: ownerId || null,
      beacon_id: beaconId || null,
      event_type: eventType,
      detail: detail || {},
    });
  } catch (e) { /* non-fatal — moderation logging must never break a write */ }
}
