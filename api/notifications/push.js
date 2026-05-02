/**
 * POST /api/notifications/push
 * Send a web push notification to a specific user.
 *
 * Body: { user_id, title, body, url?, tag?, icon? }
 *
 * Uses server-side VAPID keys + service role key — never exposed to client.
 */

import '../_silence-dep0169.js';
import webpush from 'web-push';
import { getSupabaseServerClients } from '../routing/_utils.js';
import { getEnv } from '../shopify/_utils.js';

const VAPID_PUBLIC_KEY  = getEnv('VAPID_PUBLIC_KEY',  ['VITE_VAPID_PUBLIC_KEY']);
const VAPID_PRIVATE_KEY = getEnv('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT     = getEnv('VAPID_SUBJECT') || 'mailto:hello@hotmessldn.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[push] VAPID keys not configured');
    return res.status(500).json({ error: 'Push service not configured' });
  }

  const { error: clientError, serviceClient, anonClient } = getSupabaseServerClients();
  if (clientError) return res.status(500).json({ error: clientError });

  const db = serviceClient || anonClient;

  const { user_id, title, body, url = '/', tag = 'hotmess', icon = '/icons/icon-192.png' } = req.body || {};

  if (!user_id || !title || !body) {
    return res.status(400).json({ error: 'Missing required fields: user_id, title, body' });
  }

  // Look up push subscription
  const { data: sub, error: subError } = await db
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', user_id)
    .single();

  if (subError || !sub?.subscription) {
    return res.status(404).json({ error: 'No push subscription for user' });
  }

  let subscription;
  try {
    subscription = typeof sub.subscription === 'string'
      ? JSON.parse(sub.subscription)
      : sub.subscription;
  } catch {
    return res.status(400).json({ error: 'Invalid subscription format' });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const payload = JSON.stringify({ title, body, url, tag, icon, data: { url } });

  try {
    await webpush.sendNotification(subscription, payload);
    return res.status(200).json({ ok: true });
  } catch (err) {
    const msg = err?.message || String(err);

    // Clean up expired/gone subscriptions
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      await db.from('push_subscriptions').delete().eq('user_id', user_id);
    }

    console.error('[push] sendNotification failed:', msg);
    return res.status(500).json({ error: msg });
  }
}
