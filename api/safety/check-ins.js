/**
 * POST /api/safety/check-ins  — create / extend / cancel a check-in
 * GET  /api/safety/check-ins  — cron sweep: alert on missed check-ins
 *
 * Cron: every 2 minutes (vercel.json)
 * Flow: front-end creates a safety_checkins row with expires_at.
 *       This cron finds rows where expires_at < now, status != 'checked_in',
 *       alerted_at IS NULL, then fires SOS-style alerts to trusted contacts.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://hotmessldn.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // ── POST: create / extend / cancel ──────────────────────────────────────
  if (req.method === 'POST') {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

    const { action, duration_minutes, note, location } = req.body || {};

    if (action === 'cancel') {
      await supabase
        .from('safety_checkins')
        .update({ status: 'checked_in', updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('alerted_at', null);
      return res.status(200).json({ ok: true, action: 'cancelled' });
    }

    if (action === 'extend' && duration_minutes) {
      const newExpiry = new Date(Date.now() + duration_minutes * 60 * 1000).toISOString();
      await supabase
        .from('safety_checkins')
        .update({ expires_at: newExpiry, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('alerted_at', null);
      return res.status(200).json({ ok: true, action: 'extended', expires_at: newExpiry });
    }

    // Default: create new check-in
    const mins = parseInt(duration_minutes) || 30;
    const expiresAt = new Date(Date.now() + mins * 60 * 1000).toISOString();

    const { data: checkin, error: insertErr } = await supabase
      .from('safety_checkins')
      .insert({
        user_id: user.id,
        status: 'active',
        alert_status: 'pending',
        duration_minutes: mins,
        expires_at: expiresAt,
        check_in_time: new Date().toISOString(),
        note: note || null,
        location: location || null,
      })
      .select()
      .single();

    if (insertErr) return res.status(500).json({ error: insertErr.message });
    return res.status(200).json({ ok: true, checkin });
  }

  // ── GET: cron sweep for missed check-ins ─────────────────────────────────
  if (req.method === 'GET') {
    // Verify cron secret
    const cronSecret = process.env.CRON_SECRET;
    const auth = req.headers.authorization;
    if (cronSecret && auth !== `Bearer ${cronSecret}` && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find expired, un-alerted check-ins
    const { data: missed, error: fetchErr } = await supabase
      .from('safety_checkins')
      .select('*')
      .lt('expires_at', new Date().toISOString())
      .neq('status', 'checked_in')
      .is('alerted_at', null)
      .limit(50);

    if (fetchErr) return res.status(500).json({ error: fetchErr.message });
    if (!missed?.length) return res.status(200).json({ ok: true, alerted: 0 });

    let alerted = 0;

    for (const checkin of missed) {
      try {
        // Mark alerted immediately to prevent double-fire
        await supabase
          .from('safety_checkins')
          .update({
            alerted_at: new Date().toISOString(),
            alert_status: 'fired',
            updated_at: new Date().toISOString(),
          })
          .eq('id', checkin.id);

        // Get user info
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, email')
          .eq('id', checkin.user_id)
          .single();

        const userName = profile?.display_name || profile?.email || 'Your friend';
        const overdueMins = Math.round((Date.now() - new Date(checkin.expires_at).getTime()) / 60000);

        // Get trusted contacts for this user
        const { data: contacts } = await supabase
          .from('trusted_contacts')
          .select('*')
          .eq('user_id', checkin.user_id)
          .eq('notify_on_sos', true);

        for (const contact of contacts || []) {
          await supabase.from('notification_outbox').insert({
            user_id: checkin.user_id,
            user_email: contact.contact_email || profile?.email,
            notification_type: 'checkin_missed',
            title: '⏰ Check-in Missed — HOTMESS Safety',
            message: `${userName} was supposed to check in ${overdueMins} minute(s) ago and hasn't responded. Please check on them.`,
            channel: contact.contact_phone ? 'whatsapp' : 'email',
            metadata: {
              type: 'checkin_missed',
              user_id: checkin.user_id,
              user_name: userName,
              checkin_id: checkin.id,
              overdue_minutes: overdueMins,
              contact_phone: contact.contact_phone || null,
              note: checkin.note || null,
              location: checkin.location || null,
            },
          });
        }

        // Also create an in-app notification for the user themselves
        await supabase.from('notification_outbox').insert({
          user_id: checkin.user_id,
          user_email: profile?.email,
          notification_type: 'checkin_expired',
          title: '⏰ Your check-in timer expired',
          message: 'Your safety check-in timer has expired. Your trusted contacts have been notified.',
          channel: 'push',
          metadata: { checkin_id: checkin.id },
        });

        alerted++;
      } catch (err) {
        console.error('[check-ins cron] Error processing checkin', checkin.id, err.message);
      }
    }

    return res.status(200).json({ ok: true, alerted, total: missed.length });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
