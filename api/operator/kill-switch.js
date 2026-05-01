/**
 * POST /api/operator/kill-switch
 * Activate or deactivate a kill switch. Scope enforcement enforced here.
 * Body: { venue_id?, key, scope, scope_id?, action: 'on'|'off', reason? }
 * Confirmation level: HIGH (double confirm required in UI)
 * Auto-expires after 4h.
 * Flag: v6_night_operator_panel
 */
import { verifyOperator, supabaseAdmin } from '../_verify.js';

const VALID_KEYS   = ['ghosted_grid', 'beacon_drops', 'new_messages', 'global'];
const VALID_SCOPES = ['venue', 'event', 'city', 'global'];
const AUTO_EXPIRE_MS = 4 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { venue_id, key, scope, scope_id, action, reason } = req.body;
  if (!key || !scope || !action) {
    return res.status(400).json({ error: 'key, scope, action required' });
  }
  if (!VALID_KEYS.includes(key))   return res.status(400).json({ error: 'Invalid key' });
  if (!VALID_SCOPES.includes(scope)) return res.status(400).json({ error: 'Invalid scope' });
  if (!['on', 'off'].includes(action)) return res.status(400).json({ error: 'action must be on or off' });

  // city/global scope requires admin — pass null venue_id to trigger admin check in verifyOperator
  const verifyVenueId = (scope === 'city' || scope === 'global') ? null : (venue_id || null);
  const ctx = await verifyOperator(req, res, verifyVenueId);
  if (!ctx) return;

  // city/global kill switches: admin only
  if ((scope === 'city' || scope === 'global') && !ctx.isAdmin) {
    await supabaseAdmin.from('operator_audit_log').insert({
      user_id: ctx.user.id, venue_id: venue_id || null,
      action_type: action === 'on' ? 'kill_switch_on' : 'kill_switch_off',
      scope, payload: { key, scope_id, reason: reason || null }, outcome: 'denied',
    });
    return res.status(403).json({ error: 'Admin role required for city/global kill switch' });
  }

  // venue kill switch: validate scope_id matches operator's venue
  if (scope === 'venue' && !ctx.isAdmin && scope_id !== venue_id) {
    return res.status(403).json({ error: 'scope_id must match your venue_id' });
  }

  const resolvedScopeId = scope_id || venue_id || null;
  const actionType = action === 'on' ? 'kill_switch_on' : 'kill_switch_off';
  const now = new Date();

  if (action === 'on') {
    const autoExpiresAt = new Date(now.getTime() + AUTO_EXPIRE_MS).toISOString();

    const { error } = await supabaseAdmin
      .from('safety_switches')
      .upsert({
        key,
        scope,
        scope_id: resolvedScopeId,
        active: true,
        set_by: ctx.user.id,
        set_at: now.toISOString(),
        reason: reason || null,
        auto_expires_at: autoExpiresAt,
      }, { onConflict: 'key,scope,scope_id' });

    if (error) return res.status(500).json({ error: 'Failed to activate kill switch' });

    await supabaseAdmin.from('operator_audit_log').insert({
      user_id: ctx.user.id, venue_id: venue_id || null,
      action_type: actionType, scope,
      payload: { key, scope_id: resolvedScopeId, reason: reason || null, auto_expires_at: autoExpiresAt },
      outcome: 'success',
    });

    return res.status(200).json({ active: true, auto_expires_at: autoExpiresAt });
  } else {
    // OFF: clear the switch
    const { error } = await supabaseAdmin
      .from('safety_switches')
      .update({ active: false, set_at: now.toISOString(), set_by: ctx.user.id })
      .eq('key', key)
      .eq('scope', scope)
      .filter('scope_id', resolvedScopeId ? 'eq' : 'is', resolvedScopeId);

    if (error) return res.status(500).json({ error: 'Failed to deactivate kill switch' });

    await supabaseAdmin.from('operator_audit_log').insert({
      user_id: ctx.user.id, venue_id: venue_id || null,
      action_type: actionType, scope,
      payload: { key, scope_id: resolvedScopeId },
      outcome: 'success',
    });

    return res.status(200).json({ active: false });
  }
}
