/**
 * POST /api/safety/get-out
 * Care As Kink — GET OUT trigger (Chunk 04a)
 *
 * Auth: Bearer token required
 * - Loads backup contacts from trusted_contacts where role='backup'
 * - Clears user's beacon from right_now_posts (no trace)
 * - Queues notification_outbox entries for each backup contact
 * - Returns { ok, notified, cleared }
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'unauthenticated' });

  // Verify token
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'invalid_token' });

  try {
    // Load backup contacts
    const { data: contacts } = await supabaseAdmin
      .from('trusted_contacts')
      .select('contact_name, contact_phone')
      .eq('user_id', user.id)
      .eq('role', 'backup')
      .limit(2);

    // Load last known location from profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('last_lat, last_lng, display_name')
      .eq('id', user.id)
      .single();

    // Clear beacon — no trace
    await supabaseAdmin
      .from('right_now_posts')
      .delete()
      .eq('user_id', user.id);

    // Queue notifications for each backup contact
    const notified = [];
    if (contacts && contacts.length > 0) {
      const outboxRows = contacts.map(c => ({
        user_id: user.id,
        type: 'get_out_trigger',
        status: 'queued',
        payload: {
          contact_name: c.contact_name,
          contact_phone: c.contact_phone,
          triggered_by: profile?.display_name || 'A friend',
          lat: profile?.last_lat,
          lng: profile?.last_lng,
          triggered_at: new Date().toISOString(),
        },
      }));

      await supabaseAdmin.from('notification_outbox').insert(outboxRows);
      notified.push(...contacts.map(c => c.contact_name));
    }

    return res.status(200).json({
      ok: true,
      notified,
      cleared: true,
    });
  } catch (err) {
    console.error('[get-out] error:', err);
    return res.status(500).json({ error: 'internal', message: err.message });
  }
}
