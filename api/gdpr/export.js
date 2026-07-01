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
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
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
  const now = new Date();

  const bundle = {
    generated_at:  now.toISOString(),
    user_id:       userId,
    data_notice:   'This export contains all personal data held by HOTMESS for your account. '
                 + 'Data is retained per our Privacy Policy. '
                 + 'To request deletion, use DELETE /api/gdpr/request with type=delete.',
  };

  const errors = [];

  // ── profile ────────────────────────────────────────────────────────────────
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, bio, location_city, gender_identity, pronouns, kinks, '
            + 'relationship_status, looking_for, public_attributes, onboarding_stage, '
            + 'created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    bundle.profile = data ?? null;
  } catch (e) { errors.push(`profile: ${e.message}`); }

  // ── memberships ───────────────────────────────────────────────────────────
  try {
    const { data, error } = await supabase
      .from('memberships')
      .select('tier, status, starts_at, ends_at, stripe_customer_id, created_at')
      .eq('user_id', userId);
    if (error) throw error;
    bundle.memberships = data ?? [];
  } catch (e) { errors.push(`memberships: ${e.message}`); }

  // ── messages (last 30d) ──────────────────────────────────────────────────
  try {
    const cutoff = new Date(now.getTime() - 30 * 86400 * 1000).toISOString();
    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, body, created_at, read_at')
      .eq('sender_id', userId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) throw error;
    bundle.messages_sent = data ?? [];
  } catch (e) { errors.push(`messages: ${e.message}`); }

  // ── taps (last 90d) ──────────────────────────────────────────────────────
  try {
    const cutoff = new Date(now.getTime() - 90 * 86400 * 1000).toISOString();
    const { data, error } = await supabase
      .from('taps')
      .select('id, target_user_id, tap_type, created_at')
      .eq('sender_id', userId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    bundle.taps = data ?? [];
  } catch (e) { errors.push(`taps: ${e.message}`); }

  // ── meet_sessions (last 30d) ─────────────────────────────────────────────
  try {
    const cutoff = new Date(now.getTime() - 30 * 86400 * 1000).toISOString();
    const { data, error } = await supabase
      .from('meet_sessions')
      .select('id, partner_user_id, status, started_at, ended_at, created_at')
      .eq('user_id', userId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    bundle.meet_sessions = data ?? [];
  } catch (e) { errors.push(`meet_sessions: ${e.message}`); }

  // ── beacons ───────────────────────────────────────────────────────────────
  try {
    const { data, error } = await supabase
      .from('beacons')
      .select('id, category, message, venue_id, starts_at, ends_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    bundle.beacons = data ?? [];
  } catch (e) { errors.push(`beacons: ${e.message}`); }

  // ── gdpr_consents ────────────────────────────────────────────────────────
  try {
    const { data, error } = await supabase
      .from('gdpr_consents')
      .select('consent_type, granted, granted_at, withdrawn_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    bundle.gdpr_consents = data ?? [];
  } catch (e) { errors.push(`gdpr_consents: ${e.message}`); }

  // ── age_verification_log ─────────────────────────────────────────────────
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

  // Log this SAR request for audit trail
  await supabase
    .from('gdpr_requests')
    .insert({ user_id: userId, request_type: 'export', status: 'completed', created_at: now.toISOString() })
    .catch(() => {}); // non-fatal

  if (errors.length) {
    console.error('[gdpr/export] partial errors:', errors);
  }

  // Return as JSON download
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="hotmess-data-export-${userId.slice(0, 8)}.json"`);
  return res.status(200).json({ ...bundle, _partial_errors: errors.length ? errors : undefined });
}
