import { getEnv, getQueryParam, json } from '../shopify/_utils.js';
import { getSupabaseServerClients } from '../routing/_utils.js';

const getSecret = () => getEnv('OUTBOX_CRON_SECRET', ['CRON_SECRET']);

const isRunningOnVercel = () => {
  const flag = process.env.VERCEL || process.env.VERCEL_ENV;
  return !!flag;
};

const isVercelCronRequest = (req) => {
  // Vercel sends this header on scheduled cron invocations
  const value = getHeader(req, 'x-vercel-cron');
  if (String(value || '') === '1') return true;
  // Vercel also sends Authorization: Bearer <CRON_SECRET> when CRON_SECRET is set
  const auth = getHeader(req, 'authorization');
  const secret = getEnv('CRON_SECRET', ['OUTBOX_CRON_SECRET']);
  if (auth && secret && auth === `Bearer ${secret}`) return true;
  return false;
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

  // If no secret is configured: block in production, allow in dev/preview
  if (!secret && !allowVercelCron) {
    const vercelEnv = process.env.VERCEL_ENV || '';
    const nodeEnv = process.env.NODE_ENV || '';
    const isProduction = vercelEnv === 'production' || nodeEnv === 'production';
    if (isProduction) {
      return json(res, 401, { error: 'CRON_SECRET not configured' });
    }
    // Dev/preview without secret — allow through for testing
  }

  const waToken = process.env.WHATSAPP_ACCESS_TOKEN ? process.env.WHATSAPP_ACCESS_TOKEN.trim() : null;
  const waPhone = process.env.WHATSAPP_PHONE_NUMBER_ID ? process.env.WHATSAPP_PHONE_NUMBER_ID.trim() : null;
  console.log('[dispatch] Env Check - WA_PHONE:', waPhone, 'WA_TOKEN starts with:', waToken ? waToken.substring(0, 10) : null);

  const { error, serviceClient } = getSupabaseServerClients();
  if (error) return json(res, 500, { error });

  // Pull a small batch to keep execution time bounded.
  const nowIso = new Date().toISOString();

  const { data: allItems } = await serviceClient.from('notification_outbox').select('id, status, channel, send_at, metadata').order('send_at', { ascending: false }).limit(10);
  console.log('[dispatch] All outbox items:', allItems);

  const { data: items, error: loadError } = await serviceClient
    .from('notification_outbox')
    .select('*')
    .eq('status', 'queued')
    .or(`send_at.is.null,send_at.lte.${nowIso}`)
    .order('created_date', { ascending: true })
    .limit(25);

  if (loadError) {
    console.error('[dispatch] loadError:', loadError);
    // If the table doesn't exist yet (42P01), return empty result instead of 500
    if (loadError.code === '42P01' || (loadError.message && loadError.message.includes('does not exist'))) {
      return json(res, 200, { queued: 0, sent: 0, failed: 0, note: `notification_outbox table not created yet. Error: ${loadError.message}` });
    }
    return json(res, 500, { error: loadError.message || 'Failed to load outbox', code: loadError.code });
  }

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

      if (channel === 'push') {
        if (!item.user_email) throw new Error('user_email required for push channel');

        // Resolve user_id from email
        const { data: profile } = await serviceClient
          .from('profiles')
          .select('id')
          .eq('email', item.user_email)
          .single();

        if (!profile?.id) throw new Error('User not found for push');

        const pushRes = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'}/api/notifications/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: profile.id,
            title: item.title || 'HOTMESS',
            body: item.message || '',
            url: item.metadata?.link || '/',
            tag: item.notification_type || 'hotmess',
          }),
        });

        if (!pushRes.ok) throw new Error(`Push API returned ${pushRes.status}`);

        const { error: updateError } = await serviceClient
          .from('notification_outbox')
          .update({ status: 'sent', sent_at: nowIso })
          .eq('id', item.id);

        if (updateError) throw updateError;
        sent += 1;
        continue;
      }

      if (channel === 'whatsapp') {
        const phone = item.metadata?.contact_phone || item.metadata?.phone;
        if (!phone) throw new Error('Phone number required for WhatsApp channel');

        // Clean phone number (remove +, spaces, etc.)
        const cleanPhone = phone.replace(/\D/g, '');

        const waRes = await fetch(`https://graph.facebook.com/v17.0/${waPhone}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${waToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanPhone,
            type: 'template',
            template: {
              name: 'safety_alert_v1',
              language: { code: 'en_GB' },
              components: [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: item.metadata?.user_name || 'Your friend' },
                    { type: 'text', text: item.message || 'needs assistance' },
                    { type: 'text', text: item.metadata?.location_str || 'Location unavailable' }
                  ]
                }
              ]
            }
          }),
        });

        if (!waRes.ok) {
          const text = await waRes.text();
          let errorData;
          try {
            errorData = JSON.parse(text);
          } catch {
            errorData = { raw: text };
          }
          throw new Error(`WhatsApp API error (${waRes.status}): ${JSON.stringify(errorData)}`);
        }

        const { error: updateError } = await serviceClient
          .from('notification_outbox')
          .update({ status: 'sent', sent_at: nowIso })
          .eq('id', item.id);

        if (updateError) throw updateError;
        sent += 1;
        continue;
      }

      // Email channel: not configured yet
      const { error: updateError } = await serviceClient
        .from('notification_outbox')
        .update({ status: 'blocked', sent_at: null, metadata: { ...(item.metadata || {}), blocked_reason: 'provider_not_configured' } })
        .eq('id', item.id);

      if (updateError) throw updateError;
      failed += 1;
    } catch (err) {
      console.error('[dispatch] Error processing item:', item.id, err);
      await serviceClient
        .from('notification_outbox')
        .update({ status: 'failed', metadata: { ...(item.metadata || {}), error: err.message } })
        .eq('id', item.id);
      failed += 1;
    }
  }

  return json(res, 200, {
    queued: (items || []).length,
    sent,
    failed,
    total_in_db: (allItems || []).length,
    debug: allItems 
  });
}
