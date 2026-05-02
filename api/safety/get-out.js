/**
 * POST /api/safety/get-out
 * Care As Kink — GET OUT trigger (Chunk 04a)
 *
 * Auth: Bearer token required
 * - Logs an audit row in safety_events with type='get_out'
 *   ↳ Type semantics across the codebase:
 *       'sos'     → loud panic-button SOS surface (SOSContext.tsx, immediate)
 *       'get_out' → quiet 3-second-hold Care surface (this endpoint, discreet)
 *     Both produce the same downstream cascade — only the audit type differs.
 * - Loads contacts from trusted_contacts where notify_on_sos=true (up to 5 per
 *   CareAsKink spec). The legacy role='backup' filter never matched real data —
 *   schema default and all production rows use role='trusted'.
 * - Clears user's beacon from right_now_posts (no trace)
 * - Queues notification_outbox entries for each contact
 * - Returns { ok, notified, cleared, event_id }
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  if (!supabaseAdmin) {
    console.error('[get-out] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env');
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'unauthenticated' });

  // Verify token
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'invalid_token' });

  try {
    // Load contacts that opted in to SOS notifications (up to 5 per CareAsKink spec)
    const { data: contacts } = await supabaseAdmin
      .from('trusted_contacts')
      .select('contact_name, contact_phone, contact_email')
      .eq('user_id', user.id)
      .eq('notify_on_sos', true)
      .limit(5);

    // Load last known location + display name from profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('last_lat, last_lng, display_name, email')
      .eq('id', user.id)
      .single();

    const triggeredBy = profile?.display_name || 'A friend';
    const lat = profile?.last_lat ?? null;
    const lng = profile?.last_lng ?? null;
    const locStr = (lat != null && lng != null)
      ? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`
      : 'Location unavailable';

    // Audit row in safety_events (table columns: user_id, type, metadata)
    const { data: eventRow } = await supabaseAdmin
      .from('safety_events')
      .insert({
        user_id: user.id,
        type: 'get_out',
        metadata: { trigger: 'care_get_out', lat, lng, contact_count: contacts?.length || 0 },
      })
      .select('id')
      .single();

    // Clear beacon — no trace
    await supabaseAdmin
      .from('right_now_posts')
      .delete()
      .eq('user_id', user.id);

    // Queue notifications for each backup contact via the outbox dispatcher
    const notified = [];
    if (contacts && contacts.length > 0) {
      const triggeredAt = new Date().toISOString();
      const outboxRows = contacts.map(c => ({
        user_id: user.id,
        user_email: c.contact_email || profile?.email || user.email,
        notification_type: 'sos_alert',
        title: '🆘 HOTMESS Safety — Get Out triggered',
        message: `${triggeredBy} pressed Get Out. Last known location: ${locStr}`,
        channel: c.contact_phone ? 'whatsapp' : 'email',
        metadata: {
          type: 'get_out',
          user_id: user.id,
          user_name: triggeredBy,
          location_str: locStr,
          contact_phone: c.contact_phone || null,
          contact_email: c.contact_email || null,
          event_id: eventRow?.id || null,
          triggered_at: triggeredAt,
        },
      }));

      const { error: outboxErr } = await supabaseAdmin
        .from('notification_outbox')
        .insert(outboxRows);
      if (outboxErr) {
        console.error('[get-out] notification_outbox insert failed:', outboxErr);
      } else {
        notified.push(...contacts.map(c => c.contact_name));
      }
    }

    return res.status(200).json({
      ok: true,
      notified,
      cleared: true,
      event_id: eventRow?.id || null,
    });
  } catch (err) {
    console.error('[get-out] error:', err);
    return res.status(500).json({ error: 'internal', message: err.message });
  }
}
