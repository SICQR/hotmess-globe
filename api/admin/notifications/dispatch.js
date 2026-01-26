import { getBearerToken, json } from '../../shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from '../../routing/_utils.js';
import { bestEffortRateLimit, minuteBucket } from '../../_rateLimit.js';
import { getRequestIp } from '../../routing/_utils.js';

export default async function handler(req, res) {
  const method = (req.method || 'POST').toUpperCase();
  if (method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { error, anonClient, serviceClient } = getSupabaseServerClients();
  if (error) return json(res, 500, { error });

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing bearer token' });

  const { user, error: userError } = await getAuthedUser({ anonClient, accessToken });
  if (userError || !user?.email) return json(res, 401, { error: 'Invalid auth token' });

  const ip = getRequestIp(req);
  const rl = await bestEffortRateLimit({
    serviceClient,
    bucketKey: `adminnotifdispatch:${user.id || user.email}:${ip || 'noip'}:${minuteBucket()}`,
    userId: user.id || null,
    ip,
    windowSeconds: 60,
    maxRequests: 6,
  });

  if (rl.allowed === false) {
    return json(res, 429, { error: 'Rate limit exceeded', remaining: rl.remaining ?? 0 });
  }

  const { data: profile, error: profileError } = await serviceClient
    .from('User')
    .select('email, role')
    .eq('email', user.email)
    .maybeSingle();

  if (profileError) {
    return json(res, 500, { error: profileError.message || 'Failed to load user profile' });
  }

  if (profile?.role !== 'admin') {
    return json(res, 403, { error: 'Admin privileges required' });
  }

  const nowIso = new Date().toISOString();

  const { data: items, error: loadError } = await serviceClient
    .from('notification_outbox')
    .select('*')
    .eq('status', 'queued')
    .or(`send_at.is.null,send_at.lte.${nowIso}`)
    .order('created_date', { ascending: true })
    .limit(50);

  if (loadError) return json(res, 500, { error: loadError.message || 'Failed to load outbox' });

  let sent = 0;
  let failed = 0;

  for (const item of items || []) {
    try {
      const channel = String(item.channel || 'in_app');
      if (channel !== 'in_app') {
        const { error: updateError } = await serviceClient
          .from('notification_outbox')
          .update({ status: 'blocked', metadata: { ...(item.metadata || {}), blocked_reason: 'provider_not_configured' } })
          .eq('id', item.id);

        if (updateError) throw updateError;
        failed += 1;
        continue;
      }

      const link = typeof item?.metadata?.link === 'string' ? item.metadata.link : null;

      const { error: insertError } = await serviceClient.from('notifications').insert({
        user_email: item.user_email,
        type: item.notification_type,
        title: item.title || 'Notification',
        message: item.message || '',
        link,
        metadata: item.metadata || {},
        read: false,
      });

      if (insertError) throw insertError;

      const { error: updateError } = await serviceClient
        .from('notification_outbox')
        .update({ status: 'sent', sent_at: nowIso })
        .eq('id', item.id);

      if (updateError) throw updateError;
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return json(res, 200, { queued: (items || []).length, sent, failed });
}
