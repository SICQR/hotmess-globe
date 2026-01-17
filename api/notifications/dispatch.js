import { getEnv, getQueryParam, json } from '../shopify/_utils.js';
import { getSupabaseServerClients } from '../routing/_utils.js';

const getSecret = () => getEnv('OUTBOX_CRON_SECRET', ['CRON_SECRET']);

const isRunningOnVercel = () => {
  const flag = process.env.VERCEL || process.env.VERCEL_ENV;
  return !!flag;
};

const isVercelCronRequest = (req) => {
  const value = getHeader(req, 'x-vercel-cron');
  return String(value || '') === '1';
};

const getHeader = (req, name) => {
  const value = req?.headers?.[name] || req?.headers?.[name.toLowerCase()] || req?.headers?.[name.toUpperCase()];
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
};

export default async function handler(req, res) {
  const method = (req.method || 'POST').toUpperCase();
  if (method !== 'POST' && method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const secret = getSecret();
  const allowVercelCron = isRunningOnVercel() && isVercelCronRequest(req);

  // Best practice:
  // - scheduled runs: allow Vercel Cron header
  // - manual/admin runs: allow secret (header or query)
  // If a secret is configured, require either (cron header) OR (valid secret).
  if (secret && !allowVercelCron) {
    const providedHeader = getHeader(req, 'x-cron-secret');
    const providedQuery =
      getQueryParam(req, 'secret') ||
      getQueryParam(req, 'cron_secret') ||
      getQueryParam(req, 'x_cron_secret');
    const provided = providedHeader || providedQuery;

    if (!provided || String(provided) !== String(secret)) {
      return json(res, 401, { error: 'Unauthorized' });
    }
  }

  // If no secret is configured, only allow Vercel Cron when deployed.
  if (!secret && isRunningOnVercel() && !allowVercelCron) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  const { error, serviceClient } = getSupabaseServerClients();
  if (error) return json(res, 500, { error });

  // Pull a small batch to keep execution time bounded.
  const nowIso = new Date().toISOString();

  const { data: items, error: loadError } = await serviceClient
    .from('notification_outbox')
    .select('*')
    .eq('status', 'queued')
    .or(`send_at.is.null,send_at.lte.${nowIso}`)
    .order('created_date', { ascending: true })
    .limit(25);

  if (loadError) return json(res, 500, { error: loadError.message || 'Failed to load outbox' });

  let sent = 0;
  let failed = 0;

  for (const item of items || []) {
    try {
      const channel = String(item.channel || 'in_app');

      if (channel === 'in_app') {
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
        continue;
      }

      // Email/push channels are intentionally not delivered here until a provider is configured.
      const { error: updateError } = await serviceClient
        .from('notification_outbox')
        .update({ status: 'blocked', sent_at: null, metadata: { ...(item.metadata || {}), blocked_reason: 'provider_not_configured' } })
        .eq('id', item.id);

      if (updateError) throw updateError;
      failed += 1;
    } catch {
      failed += 1;
    }
  }

  return json(res, 200, { queued: (items || []).length, sent, failed });
}
