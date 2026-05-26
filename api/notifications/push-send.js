/**
 * api/notifications/push-send.js
 *
 * Internal-only sender. Called by the notification processor (PR 4) for
 * push-worthy notifications (CRITICAL/HIGH per priority taxonomy).
 *
 * Auth: requires CRON_SECRET — same Bearer or ?secret= pattern used by
 * other internal HOTMESS routes (api/events/cron.js etc).
 *
 * On 410 Gone: deletes the subscription row immediately — do not retry
 * dead endpoints (delivery failure policy, doctrine 2026-05-26).
 *
 * Brief: PR 2 of the HOTMESS notification stack.
 */

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:phil@hotmessldn.com';
const CRON_SECRET =
  process.env.CRON_SECRET ||
  process.env.OUTBOX_CRON_SECRET ||
  process.env.EVENT_SCRAPER_CRON_SECRET;

function authorized(req) {
  if (!CRON_SECRET) return false;
  const header = req.headers?.authorization || req.headers?.Authorization;
  const match = header && String(header).match(/^Bearer\s+(.+)$/i);
  const headerToken = match?.[1] || null;
  const queryToken = req.query?.secret || null;
  return headerToken === CRON_SECRET || queryToken === CRON_SECRET;
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
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(503).json({ error: 'vapid_not_configured' });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'supabase_not_configured' });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  const body = await readBody(req);
  const userId = body?.user_id;
  const title = body?.title || 'HOTMESS';
  const text = body?.body || '';
  const url = body?.url || '/';
  const tag = body?.tag || 'hotmess-notif';
  const notificationId = body?.notification_id || null;
  if (!userId) return res.status(400).json({ error: 'missing_user_id' });

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // 1. Load all subscriptions for this user
  const { data: subs, error: subsErr } = await sb
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);
  if (subsErr) {
    return res.status(500).json({ error: 'load_subs_failed', detail: subsErr.message });
  }
  if (!subs || subs.length === 0) {
    return res.status(200).json({ ok: true, sent: 0, note: 'no_subscriptions' });
  }

  const payload = JSON.stringify({ title, body: text, url, tag });
  const results = [];
  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent += 1;
      results.push({ id: sub.id, ok: true });
      // touch last_used_at fire-and-forget
      sb.from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', sub.id)
        .then(() => {}, () => {});
    } catch (e) {
      failed += 1;
      const status = e?.statusCode || 0;
      const msg = e?.body || e?.message || 'unknown';
      results.push({ id: sub.id, ok: false, status, error: String(msg).slice(0, 200) });
      // 410 Gone / 404 Not Found — endpoint is dead, delete subscription
      if (status === 410 || status === 404) {
        await sb.from('push_subscriptions').delete().eq('id', sub.id).then(
          () => {},
          (err) => console.warn('[push-send] failed to delete dead sub:', err?.message)
        );
      }
    }
  }

  // 2. Optional: update notification_outbox row
  if (notificationId) {
    const allFailed = sent === 0 && failed > 0;
    const status = allFailed ? 'failed' : 'sent';
    const errorDetail = allFailed
      ? `push: all_failed (${failed} subs) at ${new Date().toISOString()}`
      : null;
    await sb
      .from('notification_outbox')
      .update({
        status,
        error_detail: errorDetail,
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .then(() => {}, (err) => console.warn('[push-send] outbox update failed:', err?.message));
  }

  return res.status(200).json({ ok: true, sent, failed, results });
}
