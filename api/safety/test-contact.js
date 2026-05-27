/**
 * POST /api/safety/test-contact
 *
 * Owner-only "send test alert" — lets a user verify a trusted contact's number
 * is actually reachable BEFORE they need it in a real emergency. The biggest
 * silent failure mode is a typo'd phone number that nobody finds out about
 * until the actual SOS fires and the SMS lands in dead-letter.
 *
 * Auth: Bearer token required.
 * Body: { contact_id: uuid }
 * Returns:
 *   200 { ok: true, provider_id, message: 'sent' }
 *   400 { error: 'no_phone' | 'contact_not_found' }
 *   401 unauthenticated / not-owner
 *   500 { error: 'twilio_failed', detail }
 *
 * Rate-limited to 5 per contact per hour via safety_alerts row inspection
 * (alert_type='test') so users can't accidentally use this as a free SMS pipe.
 */
import { createClient } from '@supabase/supabase-js';
import { sendSms } from '../notifications/channels/sms.js';
import { send as sendTelegram } from '../notifications/channels/telegram.js';

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    : null;

const HOURLY_LIMIT = 5;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!supabaseAdmin) return res.status(500).json({ error: 'server_misconfigured' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'unauthenticated' });
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'invalid_token' });

  const body = (typeof req.body === 'object' && req.body) ? req.body : {};
  const contactId = String(body.contact_id || '').trim();
  if (!contactId) return res.status(400).json({ error: 'contact_id_required' });

  // Ownership check + phone lookup in one shot.
  const { data: contact, error: lookupErr } = await supabaseAdmin
    .from('trusted_contacts')
    .select('id, contact_name, contact_phone, contact_telegram_chat_id, contact_telegram_handle, user_id')
    .eq('id', contactId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (lookupErr) {
    console.error('[test-contact] lookup error:', lookupErr.message);
    return res.status(500).json({ error: 'lookup_failed' });
  }
  if (!contact) return res.status(404).json({ error: 'contact_not_found' });
  if (!contact.contact_phone) return res.status(400).json({ error: 'no_phone' });

  // Hourly rate limit per contact.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabaseAdmin
    .from('safety_alerts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('contact_id', contact.id)
    .eq('alert_type', 'test')
    .gte('created_at', oneHourAgo);
  if ((recentCount ?? 0) >= HOURLY_LIMIT) {
    return res.status(429).json({ error: 'rate_limited', limit: HOURLY_LIMIT, window: '1h' });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();
  const ownerName = profile?.display_name?.trim() || 'A friend';
  const contactName = contact.contact_name?.trim() || 'there';
  const text = `Hi ${contactName}, ${ownerName} added you as a trusted contact on HOTMESS. This is a test — no action needed. If they ever press SOS, you'll get a real alert.`;

  // Pre-write queued audit row.
  const { data: alertRow, error: insErr } = await supabaseAdmin
    .from('safety_alerts')
    .insert({
      user_id: user.id,
      contact_id: contact.id,
      alert_type: 'test',
      channel: 'sms',
      status: 'queued',
      payload: { source: 'test-contact', contact_name: contact.contact_name },
    })
    .select('id')
    .maybeSingle();

  if (insErr || !alertRow?.id) {
    console.error('[test-contact] safety_alerts insert failed:', insErr?.message);
    return res.status(500).json({ error: 'audit_failed' });
  }

  const result = await sendSms({ to: contact.contact_phone, body: text });

  // 2026-05-27 Phil — best-effort Telegram side-channel test. If the contact
  // has completed the /start handshake with @HotmessAuthBot (chat_id present),
  // also fire a Telegram test message. Failure does NOT affect the response;
  // SMS remains the authoritative test result for the UI badge.
  if (contact.contact_telegram_chat_id) {
    try {
      await sendTelegram({
        chatId: contact.contact_telegram_chat_id,
        text: `${ownerName} added you as a trusted contact on HOTMESS. This is a test — no action needed. Real SOS alerts will come via this chat.`,
      });
    } catch (_tgErr) {
      // Silent — SMS already handles UI feedback.
    }
  }


  if (result.ok) {
    await supabaseAdmin.from('safety_alerts')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        payload: { source: 'test-contact', provider_id: result.providerId ?? null },
      })
      .eq('id', alertRow.id);
    return res.status(200).json({ ok: true, provider_id: result.providerId ?? null, message: 'sent' });
  }

  await supabaseAdmin.from('safety_alerts')
    .update({
      status: result.skipped ? 'skipped' : 'failed',
      error_message: (result.error ?? 'unknown_error').slice(0, 500),
    })
    .eq('id', alertRow.id);
  return res.status(result.skipped ? 400 : 500).json({
    ok: false,
    error: result.error ?? 'twilio_failed',
    skipped: !!result.skipped,
  });
}
