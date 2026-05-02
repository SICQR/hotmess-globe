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
  const { lat = null, lng = null, trigger = 'silent_gesture' } = body;

  try {
    const { data: eventRow, error: evErr } = await supabaseAdmin
      .from('safety_events')
      .insert({
        user_id: user.id,
        type: 'sos',
        metadata: { trigger, lat, lng },
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
