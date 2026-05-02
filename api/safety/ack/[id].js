/**
 * GET /api/safety/ack/:id?token=<hex>
 *
 * Off-app acknowledgement endpoint. Backup contacts hit this from SMS / WhatsApp
 * / email links to confirm they've reached the user. The HMAC token binds the
 * link to the specific delivery row so leaked URLs can't be replayed across
 * events.
 *
 * Side effects:
 *   - safety_delivery_log row → status='acked', acked_at=now()
 *   - safety_events row metadata.acked_count incremented (best-effort)
 *
 * Returns a minimal HTML page. Voice acks come through a different endpoint
 * (/api/safety/voice-response/:id, Twilio TwiML callback).
 */
import { createClient } from '@supabase/supabase-js';
import { verifyAckToken } from '../_ack-token.js';

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    : null;

const ackPage = (title, body) => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  :root { color-scheme: dark; }
  html,body { margin:0; padding:0; background:#050507; color:#fff; font-family: -apple-system, system-ui, sans-serif; }
  main { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
  .card { max-width:420px; text-align:center; }
  h1 { font-weight:500; font-size:20px; margin:0 0 12px; color:#C8962C; letter-spacing:0.02em; }
  p { font-size:15px; line-height:1.55; opacity:0.86; margin:0 0 8px; }
  .muted { font-size:12px; opacity:0.5; margin-top:18px; }
</style></head>
<body><main><div class="card">
  <h1>${title}</h1>
  <p>${body}</p>
  <p class="muted">HOTMESS — care as kink</p>
</div></main></body></html>`;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(ackPage('Method not allowed', 'This link only works as a tap.'));
  }
  if (!supabase) {
    res.statusCode = 500;
    return res.end(ackPage('Server error', 'Try again in a minute.'));
  }

  // Vercel routes [id].js as req.query.id; for safety also parse from URL.
  let deliveryId = req?.query?.id;
  let token = req?.query?.token;
  if (!deliveryId || !token) {
    try {
      const u = new URL(req.url, 'http://localhost');
      const parts = u.pathname.split('/').filter(Boolean); // ['api','safety','ack','<id>']
      deliveryId = deliveryId || parts[parts.length - 1];
      token = token || u.searchParams.get('token');
    } catch { /* fall through */ }
  }
  if (!deliveryId || !token) {
    res.statusCode = 400;
    return res.end(ackPage('Bad link', 'This link is missing required information.'));
  }

  // Look up the delivery row to know which user to bind the HMAC to.
  const { data: row, error } = await supabase
    .from('safety_delivery_log')
    .select('id, user_id, safety_event_id, channel, status, acked_at')
    .eq('id', deliveryId)
    .maybeSingle();

  if (error || !row) {
    res.statusCode = 404;
    return res.end(ackPage('Not found', 'This safety alert link is invalid or has expired.'));
  }

  if (!verifyAckToken(row.id, row.user_id, token)) {
    res.statusCode = 401;
    return res.end(ackPage('Bad signature', 'This link could not be verified.'));
  }

  // Idempotent: if already acked, just confirm.
  if (row.acked_at) {
    res.statusCode = 200;
    return res.end(ackPage('Already confirmed', 'Thanks — your acknowledgement was already on file.'));
  }

  const nowIso = new Date().toISOString();
  await supabase
    .from('safety_delivery_log')
    .update({ status: 'acked', acked_at: nowIso, delivered_at: row.delivered_at ?? nowIso })
    .eq('id', row.id);

  // Best-effort: bump ack count on the safety_events row for telemetry.
  try {
    const { data: ev } = await supabase
      .from('safety_events')
      .select('id, metadata')
      .eq('id', row.safety_event_id)
      .maybeSingle();
    if (ev) {
      const meta = (ev.metadata && typeof ev.metadata === 'object') ? ev.metadata : {};
      const next = { ...meta, acked_count: (Number(meta.acked_count) || 0) + 1, last_ack_at: nowIso };
      await supabase.from('safety_events').update({ metadata: next }).eq('id', ev.id);
    }
  } catch { /* non-fatal */ }

  res.statusCode = 200;
  return res.end(ackPage(
    'Got it — thank you',
    'Your acknowledgement has been recorded. The user will know help has reached them.',
  ));
}
