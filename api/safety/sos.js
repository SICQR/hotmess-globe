/**
 * POST /api/safety/sos
 * Care As Kink — loud panic-button SOS server endpoint.
 *
 * Auth: Bearer token required.
 *
 * Mirrors `api/safety/get-out.js` but with type='sos' (loud, immediate). The
 * client SOSContext POSTs here on every silent gesture so a single source of
 * truth (the dispatcher) handles all multi-channel fan-out instead of the
 * client doing its own outbox writes.
 *
 * Type semantics:
 *   'sos'     → THIS endpoint — loud panic-button surface (immediate)
 *   'get_out' → api/safety/get-out — quiet 3-second-hold Care surface (discreet)
 * Both produce the same downstream cascade — only the audit type differs so
 * operators can distinguish surface in the dashboard.
 *
 * Body (optional): { lat?: number, lng?: number, trigger?: string }
 */
import { createClient } from '@supabase/supabase-js';
import { dispatchSafetyEvent } from '../notifications/dispatcher.js';

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
    console.error('[sos] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env');
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'unauthenticated' });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'invalid_token' });

  // Body parse — Vercel parses JSON bodies automatically when content-type is set.
  const body = (typeof req.body === 'object' && req.body) ? req.body : {};
  const { lat = null, lng = null, trigger = 'silent_gesture', escalation = false } = body;

  // ── Rate limits — cost + abuse + alert-fatigue protection ────────────────
  // Phil 2026-05-27: every SOS event triggers SMS fanout to trusted contacts
  // via Twilio at ~$0.04/SMS. Without caps a single user (or a stuck button)
  // could rack up serious money + spam contacts. Two layers:
  //   1. HOURLY: 3 / hour / user — bypass with escalation=true (worsening)
  //   2. DAILY:  10 / 24h / user — NO bypass. Hard ceiling on cost + alert-fatigue.
  //
  // Recipients per event also capped (dispatcher.js loadContacts .limit(3)) so
  // max SMS per day per user = 10 events × 3 contacts × 2 retries = 60. At
  // $0.04 that's $2.40/user/day worst case — bounded.

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneDayAgo  = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // 1. Hourly cap (escalation bypasses)
  if (!escalation) {
    const { count: recentHour } = await supabaseAdmin
      .from('safety_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'sos')
      .gte('created_at', oneHourAgo);
    if ((recentHour ?? 0) >= 3) {
      return res.status(429).json({
        error: 'rate_limited',
        message: "You've sent 3 help signals in the last hour. Confirm escalation only if your situation has worsened.",
        recent_count: recentHour,
        window: '1h',
      });
    }
  }

  // 2. Daily hard cap — NO escalation bypass
  const { count: recentDay } = await supabaseAdmin
    .from('safety_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('type', 'sos')
    .gte('created_at', oneDayAgo);
  if ((recentDay ?? 0) >= 10) {
    return res.status(429).json({
      error: 'daily_cap_reached',
      message: "Daily SOS cap reached (10 / 24h). For continued emergencies call 999.",
      recent_count: recentDay,
      window: '24h',
    });
  }

  try {
    const { data: eventRow, error: evErr } = await supabaseAdmin
      .from('safety_events')
      .insert({
        user_id: user.id,
        type: 'sos',
        metadata: { trigger, lat, lng, escalation: !!escalation },
      })
      .select('id')
      .single();

    if (evErr || !eventRow?.id) {
      console.error('[sos] safety_events insert failed:', evErr);
      return res.status(500).json({ error: 'event_insert_failed', message: evErr?.message });
    }

    // Fan-out via the dispatcher — Mode A (P0).
    let dispatch = null;
    try {
      dispatch = await dispatchSafetyEvent({
        supabase: supabaseAdmin,
        eventId: eventRow.id,
        mode: 'fanout',
      });
    } catch (dErr) {
      console.error('[sos] dispatcher error (non-fatal):', dErr);
    }

    return res.status(200).json({
      ok: true,
      event_id: eventRow.id,
      dispatch,
    });
  } catch (err) {
    console.error('[sos] error:', err);
    return res.status(500).json({ error: 'internal', message: err.message });
  }
}
