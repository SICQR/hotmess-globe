/**
 * POST /api/notifications/push-send
 *
 * Notification stack PR 2 of 4 — internal browser push send.
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}  (server-to-server only)
 *
 * Body: { user_id, title, body, url?, tag?, notification_id? }
 *
 * Reads all push_subscriptions rows for user_id (multi-browser), sends each via
 * web-push. On 410/404 (Gone) deletes that subscription row. If notification_id
 * is given, updates notification_outbox.status to 'sent'/'failed' + error_detail.
 *
 * Returns:
 *   200 { ok, sent, failed, gone, results: [...] }
 *   401 unauthorized   (bad/missing CRON_SECRET)
 *   400 bad_body
 *   503 vapid_not_configured
 *   404 no_subscriptions
 */

import '../_silence-dep0169.js';
import webpush from 'web-push';
import { json, readJsonBody, getEnv } from '../shopify/_utils.js';
import { getSupabaseServerClients } from '../routing/_utils.js';

const VAPID_PUBLIC_KEY  = getEnv('VAPID_PUBLIC_KEY',  ['VITE_VAPID_PUBLIC_KEY']);
const VAPID_PRIVATE_KEY = getEnv('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT     = getEnv('VAPID_SUBJECT') || 'mailto:hello@hotmessldn.com';

function getAuthHeader(req) {
  const h = req.headers?.authorization || req.headers?.Authorization;
  return Array.isArray(h) ? h[0] : h;
}

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return json(res, 500, { error: 'cron_secret_not_configured' });
  }
  const auth = getAuthHeader(req);
  if (auth !== `Bearer ${cronSecret}`) {
    return json(res, 401, { error: 'unauthorized' });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return json(res, 503, { error: 'vapid_not_configured' });
  }

  const body = await readJsonBody(req);
  const { user_id, title, body: pushBody, url, tag, notification_id } = body || {};
  if (!user_id || !title || !pushBody) {
    return json(res, 400, { error: 'bad_body', detail: 'user_id, title, body required' });
  }

  const { error: clientError, serviceClient, anonClient } = getSupabaseServerClients();
  if (clientError) return json(res, 500, { error: clientError });
  const db = serviceClient || anonClient;
  if (!db) return json(res, 500, { error: 'no_db_client' });

  const { data: subs, error: subsErr } = await db
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', user_id);

  if (subsErr) {
    return json(res, 500, { error: subsErr.message || 'subs_lookup_failed' });
  }
  if (!subs || subs.length === 0) {
    if (notification_id) {
      await db.from('notification_outbox')
        .update({ status: 'failed', error_detail: 'no_subscriptions', updated_at: new Date().toISOString() })
        .eq('id', notification_id);
    }
    return json(res, 404, { error: 'no_subscriptions' });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const payload = JSON.stringify({
    title,
    body: pushBody,
    url: url || '/pulse',
    tag: tag || 'hotmess-notification',
  });

  let sent = 0;
  let failed = 0;
  let gone = 0;
  const results = [];

  await Promise.all(subs.map(async (row) => {
    const subscription = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };
    try {
      await webpush.sendNotification(subscription, payload);
      sent += 1;
      results.push({ id: row.id, ok: true });
      // best-effort touch last_used_at
      try {
        await db.from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', row.id);
      } catch { /* ignore */ }
    } catch (err) {
      const status = err?.statusCode;
      const msg = err?.body || err?.message || String(err);
      if (status === 410 || status === 404) {
        gone += 1;
        try {
          await db.from('push_subscriptions').delete().eq('id', row.id);
        } catch (delErr) {
          console.error('[push-send] failed to delete gone subscription:', delErr?.message || delErr);
        }
        results.push({ id: row.id, ok: false, gone: true, status });
      } else {
        failed += 1;
        console.error('[push-send] sendNotification failed:', status, msg);
        results.push({ id: row.id, ok: false, status, error: msg });
      }
    }
  }));

  if (notification_id) {
    const anyOk = sent > 0;
    const status = anyOk ? 'sent' : 'failed';
    const errorDetail = anyOk
      ? null
      : (results.find((r) => !r.ok)?.error || (gone > 0 ? 'all_subscriptions_gone' : 'send_failed'));
    try {
      await db.from('notification_outbox')
        .update({
          status,
          error_detail: errorDetail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', notification_id);
    } catch (e) {
      console.warn('[push-send] notification_outbox status update failed:', e?.message || e);
    }
  }

  return json(res, 200, { ok: true, sent, failed, gone, results });
}
