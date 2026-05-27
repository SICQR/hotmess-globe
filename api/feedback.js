/**
 * POST /api/feedback — Pulse Feedback V1 (Phil locked 2026-05-27).
 *
 * Body: { type, text?, screenshot_data_url?, metadata? }
 * Types (exactly six): broken, confusing, unsafe, idea, love, other
 *
 * Server attaches: route, map_tier (from metadata), subscription_tier
 * (from profiles lookup), beta_active, viewport, device/session ids,
 * beacon_id (if present), user_agent.
 *
 * Auto-emotional-temperature tag (internal, not user-visible) — Phil
 * 2026-05-27 — categorises every submission into one of:
 *   friction, delight, trust, safety, identity, commerce, map, chat,
 *   onboarding, unknown.
 *
 * Unsafe type → state='escalated' immediately + always tagged 'safety'.
 * Returns 200 { ok, id, escalated? }.
 *
 * Isolation: any catch path returns 500/200 fast — never crashes caller.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = (SUPABASE_URL && SERVICE_KEY)
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null;

const VALID_TYPES = ['broken', 'confusing', 'unsafe', 'idea', 'love', 'other'];
const RATE = { anon: 5, authed: 20 };

// ── Emotional temperature classifier (Phil-locked tag set) ─────────────────
const TEMP_RULES = [
  // explicit type → temperature
  { match: { type: 'unsafe' },     temp: 'safety' },
  { match: { type: 'love' },       temp: 'delight' },
  // route-based fallbacks (path startsWith)
  { match: { path: '/onboarding' }, temp: 'onboarding' },
  { match: { path: '/auth' },       temp: 'onboarding' },
  { match: { path: '/sign-' },      temp: 'onboarding' },
  { match: { path: '/redeem' },     temp: 'onboarding' },
  { match: { path: '/chat' },       temp: 'chat' },
  { match: { path: '/messages' },   temp: 'chat' },
  { match: { path: '/pulse' },      temp: 'map' },
  { match: { path: '/market' },     temp: 'commerce' },
  { match: { path: '/shop' },       temp: 'commerce' },
  { match: { path: '/membership' }, temp: 'commerce' },
  { match: { path: '/profile' },    temp: 'identity' },
  { match: { path: '/care' },       temp: 'safety' },
  { match: { path: '/help' },       temp: 'safety' },
  // type fallbacks
  { match: { type: 'broken' },     temp: 'friction' },
  { match: { type: 'confusing' },  temp: 'friction' },
  { match: { type: 'idea' },       temp: 'identity' },
];

function classifyEmotionalTemperature(type, path) {
  for (const rule of TEMP_RULES) {
    if (rule.match.type && rule.match.type !== type) continue;
    if (rule.match.path && !(path || '').startsWith(rule.match.path)) continue;
    return rule.temp;
  }
  return 'unknown';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!admin) return res.status(500).json({ error: 'server_misconfigured' });

  const body = (typeof req.body === 'object' && req.body) ? req.body : {};
  const type = String(body.type || '').toLowerCase();
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'invalid_type' });

  // Resolve user from JWT if present (anonymous feedback allowed too).
  let userId = null;
  let subscriptionTier = null;
  let betaActiveServerSide = false;
  const auth = req.headers.authorization?.replace('Bearer ', '').trim();
  if (auth) {
    const { data: { user } } = await admin.auth.getUser(auth).catch(() => ({ data: { user: null } }));
    userId = user?.id || null;
    if (userId) {
      const { data: profile } = await admin.from('profiles')
        .select('subscription_tier, beta_access_until')
        .eq('id', userId).maybeSingle();
      subscriptionTier = profile?.subscription_tier || 'FREE';
      betaActiveServerSide = !!(profile?.beta_access_until && new Date(profile.beta_access_until) > new Date());
    }
  }

  const metadata = (body.metadata && typeof body.metadata === 'object') ? body.metadata : {};
  const deviceId = metadata.device_id || null;
  const sessionId = metadata.session_id || null;
  const path = metadata.path || null;

  // Rate limit
  if (userId || deviceId) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const filter = userId ? `user_id.eq.${userId}` : `device_id.eq.${deviceId}`;
    const { count } = await admin.from('beta_feedback')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo)
      .or(filter);
    const limit = userId ? RATE.authed : RATE.anon;
    if ((count ?? 0) >= limit) return res.status(429).json({ error: 'rate_limited', window: '1h', limit });
  }

  // Optional screenshot upload (capped 2MB)
  let screenshotUrl = null;
  if (typeof body.screenshot_data_url === 'string' && body.screenshot_data_url.startsWith('data:image/')) {
    try {
      const m = body.screenshot_data_url.match(/^data:(image\/\w+);base64,(.+)$/);
      if (m) {
        const mime = m[1], ext = mime.split('/')[1] || 'png';
        const bytes = Buffer.from(m[2], 'base64');
        if (bytes.length < 2 * 1024 * 1024) {
          const objPath = `${new Date().toISOString().slice(0, 10)}/${userId || 'anon'}-${Date.now()}.${ext}`;
          const { error: upErr } = await admin.storage.from('feedback').upload(objPath, bytes, { contentType: mime, upsert: false });
          if (!upErr) {
            const { data: pub } = admin.storage.from('feedback').getPublicUrl(objPath);
            screenshotUrl = pub?.publicUrl || null;
          }
        }
      }
    } catch (_e) { /* swallow */ }
  }

  const emotionalTemperature = classifyEmotionalTemperature(type, path);

  const serverMeta = {
    ...metadata,
    subscription_tier: subscriptionTier,
    beta_active: betaActiveServerSide,
    ip_hash: req.headers['x-forwarded-for']
      ? Buffer.from(String(req.headers['x-forwarded-for']).split(',')[0]).toString('base64').slice(0, 12)
      : null,
  };

  const { data, error } = await admin.from('beta_feedback').insert({
    user_id: userId,
    feedback_type: type,
    text: body.text ? String(body.text).slice(0, 4000) : null,
    rating: null,
    screenshot_url: screenshotUrl,
    path,
    session_id: sessionId,
    device_id: deviceId,
    user_agent: req.headers['user-agent'] || null,
    metadata: serverMeta,
    state: type === 'unsafe' ? 'escalated' : 'new',
    emotional_temperature: emotionalTemperature,
  }).select('id').single();

  if (error) {
    console.error('[feedback] insert error:', error.message);
    return res.status(500).json({ error: 'insert_failed' });
  }

  // Analytics event
  try {
    await admin.from('analytics_events').insert({
      user_id: userId,
      event_name: 'feedback_submitted',
      category: 'feedback',
      label: type,
      properties: {
        feedback_type: type,
        emotional_temperature: emotionalTemperature,
        has_text: !!body.text,
        has_screenshot: !!screenshotUrl,
        path,
        device_id: deviceId,
        session_id: sessionId,
        subscription_tier: subscriptionTier,
        beta_active: betaActiveServerSide,
      },
    });
  } catch (_e) { /* swallow */ }

  return res.status(200).json({ ok: true, id: data?.id, escalated: type === 'unsafe' });
}
