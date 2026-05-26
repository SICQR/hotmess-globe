/**
 * POST /api/notifications/push-subscribe
 *
 * Notification stack PR 2 of 4 — browser push subscribe endpoint.
 *
 * Body: { subscription: { endpoint, keys: { p256dh, auth } }, user_agent? }
 * Auth: Supabase JWT in Authorization: Bearer <token>
 *
 * Upserts into push_subscriptions for the authed user. UNIQUE(user_id, endpoint)
 * handles dedup across re-subscribes on the same browser.
 *
 * Responses:
 *   200 { ok: true, id }
 *   400 { error: 'bad_body' }
 *   401 { error: 'unauthorized' }
 *   500 { error }
 */

import { getBearerToken, json, readJsonBody } from '../shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from '../routing/_utils.js';

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'unauthorized' });

  const { error: supaError, anonClient, serviceClient } = getSupabaseServerClients();
  if (supaError) return json(res, 500, { error: supaError });

  const { user, error: userError } = await getAuthedUser({ anonClient, accessToken });
  if (userError || !user?.id) return json(res, 401, { error: 'unauthorized' });

  const body = await readJsonBody(req);
  const sub = body?.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  const userAgent = typeof body?.user_agent === 'string' ? body.user_agent.slice(0, 500) : null;

  if (!endpoint || !p256dh || !auth) {
    return json(res, 400, {
      error: 'bad_body',
      detail: 'subscription.endpoint, keys.p256dh, keys.auth required',
    });
  }

  const db = serviceClient || anonClient;
  const nowIso = new Date().toISOString();

  const { data, error } = await db
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        user_agent: userAgent,
        last_used_at: nowIso,
      },
      { onConflict: 'user_id,endpoint' }
    )
    .select('id')
    .single();

  if (error) {
    console.error('[push-subscribe] upsert failed:', error.message || error);
    return json(res, 500, { error: error.message || 'upsert_failed' });
  }

  return json(res, 200, { ok: true, id: data?.id });
}
