/**
 * GET /api/cron/sos-health-check
 *
 * Runs every minute (vercel.json schedule). Queries safety_events created in
 * the last 5 minutes whose dispatch hasn't produced at least one successful
 * delivery to anyone, and escalates each undelivered event to Phil via every
 * channel that has credentials.
 *
 * Why this exists: post-Glen (2026-05-17, 8 silent SOS presses). Even with
 * the dispatcher hardened, a single misconfigured contact / expired token /
 * Twilio outage could silently drop an SOS. The health-check makes the
 * failure path itself loud — if dispatch ever stays unacknowledged for a
 * minute, Phil's phone rings independently. Failure of the failure-detector
 * is unacceptable on safety.
 *
 * Auth: standard Vercel cron — Bearer ${CRON_SECRET} OR x-vercel-cron header.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).end(JSON.stringify(body));
}

function isAuthorized(req) {
  if (req.headers['x-vercel-cron']) return true;
  const cronSecret = process.env.CRON_SECRET || process.env.OUTBOX_CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== 'production';
  const auth = req.headers.authorization || '';
  return auth === `Bearer ${cronSecret}`;
}

async function notifyPhilDirect(message) {
  // Best-effort escalation: SMS via Twilio (if creds set) + Telegram (if
  // chat id set). WhatsApp omitted — until token is rotated, it's noise.
  const results = { sms: null, telegram: null };

  const philPhone = process.env.PHIL_OPS_PHONE?.trim();
  if (philPhone) {
    try {
      const { sendSms } = await import('../notifications/channels/sms.js');
      const r = await sendSms({ to: philPhone, body: message });
      results.sms = { ok: !!r.ok, error: r.error || null };
    } catch (e) {
      results.sms = { ok: false, error: e?.message || 'sms_threw' };
    }
  } else {
    results.sms = { ok: false, error: 'PHIL_OPS_PHONE not set' };
  }

  const philChatId = process.env.PHIL_TELEGRAM_CHAT_ID?.trim();
  if (philChatId && process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: philChatId, text: message }),
      });
      results.telegram = { ok: tgRes.ok, error: tgRes.ok ? null : `telegram_${tgRes.status}` };
    } catch (e) {
      results.telegram = { ok: false, error: e?.message || 'telegram_threw' };
    }
  } else {
    results.telegram = { ok: false, error: 'PHIL_TELEGRAM_CHAT_ID or TELEGRAM_BOT_TOKEN not set' };
  }
  return results;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(res, 405, { error: 'method_not_allowed' });
  }
  if (!isAuthorized(req)) return json(res, 401, { error: 'unauthorized' });
  if (!supabaseUrl || !serviceKey) return json(res, 200, { skipped: 'no_supabase_env' });

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Find SOS / get_out events in the last 5 minutes whose dispatch hasn't
  // produced at least one delivered/sent row in safety_delivery_log. Avoids
  // race with the dispatcher itself by ignoring events less than 30 sec old
  // (give the inline fan-out a fair chance to complete first).
  const since = new Date(Date.now() - 5 * 60_000).toISOString();
  const cutoffNew = new Date(Date.now() - 30_000).toISOString();

  const { data: events, error } = await supabase
    .from('safety_events')
    .select('id, user_id, type, created_at, metadata')
    .gte('created_at', since)
    .lte('created_at', cutoffNew)
    .in('type', ['sos', 'get_out']);
  if (error) return json(res, 500, { error: 'event_query_failed', message: error.message });

  let undelivered = 0;
  let escalated = 0;
  const detail = [];

  for (const ev of events ?? []) {
    const { data: deliveries } = await supabase
      .from('safety_delivery_log')
      .select('status')
      .eq('safety_event_id', ev.id)
      .in('status', ['delivered', 'sent']);
    const successCount = (deliveries ?? []).length;
    if (successCount > 0) continue;

    undelivered++;

    // Already-escalated check: look for a marker row of channel='health_check'
    const { data: prior } = await supabase
      .from('safety_delivery_log')
      .select('id')
      .eq('safety_event_id', ev.id)
      .eq('channel', 'health_check')
      .maybeSingle();
    if (prior) {
      detail.push({ event_id: ev.id, action: 'already_escalated' });
      continue;
    }

    const message = `🚨 HOTMESS SOS DISPATCH FAILED\nEvent ${ev.id.slice(0,8)} (${ev.type}) from user ${ev.user_id.slice(0,8)} at ${ev.created_at}.\nZero successful channels. Intervene manually — call the user, then check Vercel logs for /api/safety/sos and /api/notifications/dispatcher.`;
    const r = await notifyPhilDirect(message);
    escalated++;

    // Record the escalation attempt
    await supabase.from('safety_delivery_log').insert({
      safety_event_id: ev.id,
      user_id: ev.user_id,
      trusted_contact_id: null,
      channel: 'health_check',
      attempt_number: 1,
      status: (r.sms?.ok || r.telegram?.ok) ? 'sent' : 'failed',
      error: (r.sms?.ok || r.telegram?.ok)
        ? null
        : `sms:${r.sms?.error || 'n/a'} tg:${r.telegram?.error || 'n/a'}`,
      provider_response: r,
    });

    detail.push({ event_id: ev.id, escalation: r });
  }

  return json(res, 200, {
    ok: true,
    window_started: since,
    scanned: events?.length ?? 0,
    undelivered,
    escalated,
    detail,
  });
}
