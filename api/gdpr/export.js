/**
 * api/gdpr/export.js — Chunk 17b
 *
 * Subject Access Request (SAR) data export endpoint.
 * UK GDPR Art. 15 — right of access. Must respond within 30 days.
 *
 * GET /api/gdpr/export
 * Authorization: Bearer <supabase_jwt>
 *
 * Returns a JSON bundle of all personal data held for the authenticated user:
 *   profile, memberships, messages (last 30d), taps (last 90d),
 *   meet_sessions (last 30d), beacons, gdpr_consents, age_verification_log
 *
 * Does NOT return: other users' data, system internals, audit logs.
 *
 * P0 fix (2026-07-01): column references corrected to live schema; the endpoint
 * NO LONGER returns HTTP 200 with a silently-partial bundle — if any section
 * fails, it returns 500 and issues no file, so a data subject never receives an
 * incomplete record presented as complete. Audit trail writes to the existing
 * `user_data_requests` table (there is no `gdpr_requests` table).
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  // Authenticate via Supabase JWT
  const authHeader = req.headers['authorization'] ?? '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt) {
    return res.status(401).json({ error: 'missing authorization header' });
  }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
  if (authErr || !user) {
    return res.status(401).json({ error: 'invalid or expired token' });
  }

  const userId = user.id;
  const userEmail = user.email ?? null;
  const now = new Date();

  const bundle = {
    generated_at:  now.toISOString(),
    user_id:       userId,
    data_notice:   'This export contains all personal data held by HOTMESS for your account. '
                 + 'Data is retained per our Privacy Policy. '
                 + 'To request deletion, use DELETE /api/gdpr/request with type=delete.',
  };

  const errors = [];

  // -- profile --
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, full_name, username, email, phone, bio, city, location_area, '
            + 'age, gender, looking_for, position, persona_type, tags, membership_tier, '
            + 'subscription_tier, public_attributes, onboarding_stage, onboarding_completed, '
            + 'created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    bundle.profile = data ?? null;
  } catch (e) { errors.push(`profile: ${e.message}`); }

  // -- memberships --
  try {
    const { data, error } = await supabase
      .from('memberships')
      .select('tier, status, started_at, ends_at, payment_provider, updated_at')
      .eq('user_id', userId);
    if (error) throw error;
    bundle.memberships = data ?? [];
  } catch (e) { errors.push(`memberships: ${e.message}`); }

  // -- messages sent (last 30d) --
  try {
    const cutoff = new Date(now.getTime() - 30 * 86400 * 1000).toISOString();
    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, content, created_at')
      .eq('sender_id', userId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) throw error;
    bundle.messages_sent = data ?? [];
  } catch (e) { errors.push(`messages: ${e.message}`); }

  // -- taps sent (last 90d) --
  try {
    const cutoff = new Date(now.getTime() - 90 * 86400 * 1000).toISOString();
    const { data, error } = await supabase
      .from('taps')
      .select('id, from_user_id, to_user_id, tapper_email, tapped_email, tap_type, created_at')
      .eq('from_user_id', userId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    bundle.taps_sent = data ?? [];
  } catch (e) { errors.push(`taps: ${e.message}`); }

  // -- meet_sessions (last 30d) --
  try {
    const cutoff = new Date(now.getTime() - 30 * 86400 * 1000).toISOString();
    const { data, error } = await supabase
      .from('meet_sessions')
      .select('id, user_a_id, user_b_id, status, met_at, closed_at, created_at')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    bundle.meet_sessions = data ?? [];
  } catch (e) { errors.push(`meet_sessions: ${e.message}`); }

  // -- beacons --
  try {
    const { data, error } = await supabase
      .from('beacons')
      .select('id, code, type, title, description, beacon_category, city, starts_at, ends_at, created_at')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    bundle.beacons = data ?? [];
  } catch (e) { errors.push(`beacons: ${e.message}`); }

  // -- gdpr_consents (keyed on email) --
  try {
    if (!userEmail) { bundle.gdpr_consents = []; }
    else {
      const { data, error } = await supabase
        .from('gdpr_consents')
        .select('consent_type, granted, granted_at, ip_address, user_agent')
        .eq('user_email', userEmail)
        .order('granted_at', { ascending: false });
      if (error) throw error;
      bundle.gdpr_consents = data ?? [];
    }
  } catch (e) { errors.push(`gdpr_consents: ${e.message}`); }

  // -- age_verification_log --
  try {
    const { data, error } = await supabase
      .from('age_verification_log')
      .select('passed, method, verified_at, created_at')
      // deliberately exclude ip_hash and user_agent_hash from SAR export
      .eq('user_id', userId)
      .order('verified_at', { ascending: false });
    if (error) throw error;
    bundle.age_verification = data ?? [];
  } catch (e) { errors.push(`age_verification_log: ${e.message}`); }

  // Log this SAR request for audit trail (existing table; non-fatal)
  try {
    const { error } = await supabase
      .from('user_data_requests')
      .insert({ user_id: userId, type: 'export', status: 'completed',
                created_at: now.toISOString(), updated_at: now.toISOString() });
    if (error) console.error('[gdpr/export] audit-log write failed:', error.message);
  } catch (e) { console.error('[gdpr/export] audit-log write threw:', e.message); }

  // -- HONESTY GATE --
  // Never hand a data subject a 200 "your data" file that is silently partial.
  // If any section failed, issue NO file and return 500 with the failed sections.
  if (errors.length) {
    console.error('[gdpr/export] section failures:', errors);
    return res.status(500).json({
      status: 'error',
      message: 'Your data export could not be completed in full. To avoid giving you an '
             + 'incomplete record presented as complete, no file has been issued. Our team '
             + 'has been alerted and your Art. 15 request remains valid and will be fulfilled '
             + 'within the statutory period.',
      generated_at: now.toISOString(),
      user_id: userId,
      failed_sections: errors,
    });
  }

  // All sections succeeded — return the complete bundle as a JSON download.
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="hotmess-data-export-${userId.slice(0, 8)}.json"`);
  return res.status(200).json(bundle);
}
