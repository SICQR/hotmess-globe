/**
 * Web Push channel.
 *
 * Pushes to the contact's device only when the contact is an internal HOTMESS user
 * with a valid push_subscriptions row. External backups (most cases) skip this
 * channel — handled at the dispatcher level by checking contact.user_id_if_internal.
 *
 * On 410/404 from the push service, the stale subscription is deleted.
 */
import '../../_silence-dep0169.js';
import webPush from 'web-push';
import { buildAlertCopy } from './_types.js';

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  try {
    webPush.setVapidDetails('mailto:safety@hotmessldn.com', pub, priv);
    vapidConfigured = true;
    return true;
  } catch {
    return false;
  }
}

export async function send(opts) {
  const { contact, user, event, ackUrl, supabase } = opts;

  if (!contact.user_id_if_internal) {
    return { ok: false, skipped: true, error: 'contact_not_internal_user' };
  }
  if (!ensureVapid()) {
    // Provider not configured = skipped, not failed (consistent with other channels).
    return { ok: false, skipped: true, error: 'vapid_not_configured' };
  }

  const { data: subs, error: subErr } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, keys, subscription')
    .eq('user_id', contact.user_id_if_internal);

  if (subErr) return { ok: false, error: `lookup_failed:${subErr.message}` };
  if (!subs || subs.length === 0) {
    return { ok: false, skipped: true, error: 'no_push_subscription' };
  }

  const copy = buildAlertCopy({ user, event, ackUrl });
  const payload = JSON.stringify({
    title: copy.title,
    body: copy.short,
    icon: '/favicon.svg',
    tag: `safety-${event.id}`,
    data: { url: ackUrl || '/', ack_url: ackUrl, event_id: event.id, kind: 'safety' },
  });

  let lastErr = null;
  let delivered = 0;
  for (const row of subs) {
    try {
      let endpoint = row.endpoint;
      let keys = row.keys;
      if (!endpoint && row.subscription) {
        const sub = typeof row.subscription === 'string' ? JSON.parse(row.subscription) : row.subscription;
        endpoint = sub?.endpoint;
        keys = sub?.keys;
      }
      if (!endpoint || !keys) continue;
      const parsedKeys = typeof keys === 'string' ? JSON.parse(keys) : keys;
      await webPush.sendNotification(
        { endpoint, keys: { p256dh: parsedKeys.p256dh, auth: parsedKeys.auth } },
        payload,
        { TTL: 86400, urgency: 'high' },
      );
      delivered++;
    } catch (err) {
      lastErr = err;
      // Stale subscription — clean up so future attempts don't keep failing
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', row.id);
      }
    }
  }

  if (delivered > 0) return { ok: true, providerId: `webpush:${delivered}` };
  return { ok: false, error: lastErr ? `webpush:${lastErr.statusCode || ''}:${lastErr.message || ''}` : 'no_delivered' };
}
