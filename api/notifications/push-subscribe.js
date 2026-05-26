/**
 * api/notifications/push-subscribe.js
 *
 * Saves a browser Web Push subscription to push_subscriptions for the
 * authenticated user. Subsequent calls with the same endpoint overwrite
 * (UNIQUE(user_id, endpoint) handles dedup).
 *
 * Brief: PR 2 of the HOTMESS notification stack (Phil 2026-05-26).
 * Doctrine: opt-in only — this route writes only when the user clicked
 * subscribe; nothing in this file prompts permission on its own.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function badAuth(res) {
  return res.status(401).json({ error: 'unauthorized' });
}
function badRequest(res, msg) {
  return res.status(400).json({ error: msg || 'bad_request' });
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'supabase_not_configured' });
  }

  // 1. Verify auth via Supabase JWT
  const auth = req.headers.authorization || req.headers.Authorization;
  const match = auth && String(auth).match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];
  if (!token) return badAuth(res);

  const sbUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await sbUser.auth.getUser(token);
  if (userErr || !userData?.user?.id) return badAuth(res);
  const userId = userData.user.id;

  // 2. Validate body
  const body = await readBody(req);
  const subscription = body?.subscription;
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const authKey = subscription?.keys?.auth;
  if (!endpoint || !p256dh || !authKey) {
    return badRequest(res, 'missing_subscription_keys');
  }

  // 3. Upsert (service role so RLS doesn't block; we still write user_id from
  //    the verified JWT, never from the body)
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const ua = body?.user_agent || req.headers['user-agent'] || null;
  const { error } = await sb
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth: authKey,
        user_agent: ua ? String(ua).slice(0, 500) : null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' }
    );
  if (error) {
    console.warn('[push-subscribe] upsert failed:', error.message);
    return res.status(500).json({ error: 'upsert_failed', detail: error.message });
  }

  return res.status(200).json({ ok: true });
}
