/**
 * POST /api/notifications/push
 * Send a web push notification to a specific user.
 *
 * Body: { user_id, title, body, url?, tag?, icon? }
 *
 * Uses server-side VAPID keys + service role key — never exposed to client.
 */

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = process.env.SUPABASE_URL         || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const VAPID_PUBLIC_KEY     = process.env.VAPID_PUBLIC_KEY  || process.env.VITE_VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE_KEY    = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT        = process.env.VAPID_SUBJECT     || 'mailto:hello@hotmessldn.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[push] VAPID keys not configured');
    return res.status(500).json({ error: 'Push service not configured' });
  }

  if (!SUPABASE_SERVICE_KEY) {
    console.warn('[push] SUPABASE_SERVICE_ROLE_KEY not set');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const { user_id, title, body, url = '/', tag = 'hotmess', icon = '/icons/icon-192.png' } = req.body || {};

  if (!user_id || !title || !body) {
    return res.status(400).json({ error: 'Missing required fields: user_id, title, body' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Look up push subscription
  const { data: sub, error: subError } = await supabase
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
      await supabase.from('push_subscriptions').delete().eq('user_id', user_id);
    }

    console.error('[push] sendNotification failed:', msg);
    return res.status(500).json({ error: msg });
  }
}
