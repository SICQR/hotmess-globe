/**
 * POST /api/feedback
 *
 * Pulse Feedback System — emotional/cultural/trust telemetry.
 * Accepts feedback from any user (authenticated or anonymous).
 *
 * Phil 2026-05-27 — "HOW'S IT FEEL?" floating button.
 *
 * Body:
 *   {
 *     type: 'bug' | 'confusing' | 'unsafe' | 'vibe' | 'idea' | 'love',
 *     text?: string,
 *     rating?: 1-5,             // optional, for vibe/love
 *     screenshot_data_url?: string, // base64 png, uploaded to storage
 *     metadata?: object,        // route, tier, viewport, flags, etc — auto-attached client-side
 *   }
 * Returns: 200 { ok: true, id, escalated?: true }
 *
 * Unsafe type also returns escalated:true so the client can route into
 * the existing /api/safety report flow.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = (SUPABASE_URL && SERVICE_KEY)
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null;

const VALID_TYPES = ['bug', 'confusing', 'unsafe', 'vibe', 'idea', 'love'];

// Crude rate limit — anon users get 5/hour by device_id; authed get 20/hour.
const RATE = { anon: 5, authed: 20 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!admin) return res.status(500).json({ error: 'server_misconfigured' });

  const body = (typeof req.body === 'object' && req.body) ? req.body : {};
  const type = String(body.type || '').toLowerCase();
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'invalid_type' });

  // Resolve user from JWT if present.
  let userId = null;
  const auth = req.headers.authorization?.replace('Bearer ', '').trim();
  if (auth) {
    const { data: { user } } = await admin.auth.getUser(auth).catch(() => ({ data: { user: null } }));
    userId = user?.id || null;
  }

  const metadata = (body.metadata && typeof body.metadata === 'object') ? body.metadata : {};
  const deviceId = metadata.device_id || null;
  const sessionId = metadata.session_id || null;

  // Rate limit
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  if (userId || deviceId) {
    const { count } = await admin
      .from('beta_feedback')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo)
      .or(userId ? `user_id.eq.${userId}` : `device_id.eq.${deviceId}`);
    const limit = userId ? RATE.authed : RATE.anon;
    if ((count ?? 0) >= limit) {
      return res.status(429).json({ error: 'rate_limited', window: '1h', limit });
    }
  }

  // Screenshot upload (optional). Base64 data URL → storage bucket `feedback`.
  let screenshotUrl = null;
  if (typeof body.screenshot_data_url === 'string' && body.screenshot_data_url.startsWith('data:image/')) {
    try {
      const m = body.screenshot_data_url.match(/^data:(image\/\w+);base64,(.+)$/);
      if (m) {
        const mime = m[1];
        const ext = mime.split('/')[1] || 'png';
        const bytes = Buffer.from(m[2], 'base64');
        // Cap at 2MB to prevent abuse.
        if (bytes.length < 2 * 1024 * 1024) {
          const path = `${new Date().toISOString().slice(0, 10)}/${userId || 'anon'}-${Date.now()}.${ext}`;
          const { error: upErr } = await admin.storage
            .from('feedback')
            .upload(path, bytes, { contentType: mime, upsert: false });
          if (!upErr) {
            const { data: pub } = admin.storage.from('feedback').getPublicUrl(path);
            screenshotUrl = pub?.publicUrl || null;
          }
        }
      }
    } catch (_e) { /* swallow — feedback never breaks UX */ }
  }

  const rating = Number.isFinite(body.rating) ? Math.max(1, Math.min(5, Math.round(body.rating))) : null;

  const { data, error } = await admin.from('beta_feedback').insert({
    user_id: userId,
    feedback_type: type,
    text: body.text ? String(body.text).slice(0, 4000) : null,
    rating,
    screenshot_url: screenshotUrl,
    path: metadata.path || null,
    session_id: sessionId,
    device_id: deviceId,
    user_agent: req.headers['user-agent'] || null,
    metadata: {
      ...metadata,
      ip_hash: req.headers['x-forwarded-for']
        ? Buffer.from(String(req.headers['x-forwarded-for']).split(',')[0]).toString('base64').slice(0, 12)
        : null,
    },
    // Unsafe + harassment/consent indicators auto-escalate to investigating state
    state: type === 'unsafe' ? 'escalated' : 'new',
  }).select('id').single();

  if (error) {
    console.error('[feedback] insert error:', error.message);
    return res.status(500).json({ error: 'insert_failed' });
  }

  // Fire analytics event for funnel tracking
  try {
    await admin.from('analytics_events').insert({
      user_id: userId,
      event_name: 'feedback_submitted',
      category: 'feedback',
      label: type,
      value: rating,
      properties: {
        feedback_type: type,
        has_text: !!body.text,
        has_screenshot: !!screenshotUrl,
        path: metadata.path || null,
        device_id: deviceId,
        session_id: sessionId,
      },
    });
  } catch (_e) { /* swallow */ }

  return res.status(200).json({
    ok: true,
    id: data?.id,
    escalated: type === 'unsafe',
  });
}
