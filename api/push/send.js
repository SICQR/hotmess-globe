/**
 * POST /api/push/send
 *
 * Send a web push notification to a specific user by user_id.
 * Delegates to the same VAPID push logic as /api/notifications/push,
 * but exposed at the path the frontend actually calls.
 *
 * Body: { user_id, title, body, url?, tag?, icon? }
 *
 * Uses server-side VAPID keys — never exposed to client.
 */

import { success, failure, rejectMethod, readBody } from '../_utils/response.js';
import { supabaseAdmin } from '../_utils/supabaseAdmin.js';

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  if (rejectMethod(req, res, 'POST')) return;

  // Check VAPID config
  const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || process.env.VITE_VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hello@hotmessldn.com';

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn('[push/send] VAPID keys not configured — returning stub success');
    return success(res, { sent: false, reason: 'not_configured' });
  }

  const body = await readBody(req);
  const { user_id, title, body: pushBody, url = '/', tag = 'hotmess', icon = '/icons/icon-192.png' } = body;

  if (!user_id || !title || !pushBody) {
    return failure(res, 'Missing required fields: user_id, title, body', 400);
  }

  try {
    const db = supabaseAdmin();

    // Look up push subscription
    const { data: sub, error: subError } = await db
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id)
      .single();

    if (subError || !sub?.subscription) {
      // User has no push subscription — not an error, just skip
      return success(res, { sent: false, reason: 'no_subscription' });
    }

    let subscription;
    try {
      subscription = typeof sub.subscription === 'string'
        ? JSON.parse(sub.subscription)
        : sub.subscription;
    } catch {
      return failure(res, 'Invalid subscription format', 400);
    }

    // Dynamic import web-push (may not be available in all environments)
    let webpush;
    try {
      webpush = await import('web-push');
      if (webpush.default) webpush = webpush.default;
    } catch {
      console.warn('[push/send] web-push module not available');
      return success(res, { sent: false, reason: 'module_unavailable' });
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

    const payload = JSON.stringify({
      title,
      body: pushBody,
      icon,
      tag,
      data: { url },
    });

    await webpush.sendNotification(subscription, payload);
    return success(res, { sent: true });
  } catch (err) {
    // 410 Gone = subscription expired
    if (err.statusCode === 410) {
      try {
        const db = supabaseAdmin();
        await db.from('push_subscriptions').delete().eq('user_id', user_id);
      } catch { /* cleanup best-effort */ }
      return success(res, { sent: false, reason: 'subscription_expired' });
    }

    console.error('[push/send] Error:', err.message || err);
    return failure(res, 'Push delivery failed', 502);
  }
}
