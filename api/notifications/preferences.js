import { getBearerToken, json, readJsonBody } from '../shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from '../routing/_utils.js';
import { bestEffortRateLimit, minuteBucket } from '../_rateLimit.js';
import { getRequestIp } from '../routing/_utils.js';

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { error, anonClient, serviceClient } = getSupabaseServerClients();
  if (error) return json(res, 500, { error });

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing bearer token' });

  const { user, error: userError } = await getAuthedUser({ anonClient, accessToken });
  if (userError || !user?.email) return json(res, 401, { error: 'Invalid auth token' });

  const userEmail = user.email;

  if (method === 'GET') {
    const { data, error: dbError } = await serviceClient
      .from('notification_preferences')
      .select('*')
      .eq('user_email', userEmail)
      .maybeSingle();

    if (dbError) return json(res, 500, { error: dbError.message || 'Failed to load preferences' });

    return json(res, 200, {
      preferences: data || {
        user_email: userEmail,
        push_enabled: false,
        email_enabled: false,
        marketing_enabled: false,
        order_updates: true,
        message_updates: true,
        event_updates: true,
        safety_updates: true,
      },
    });
  }

  const ip = getRequestIp(req);
  const rl = await bestEffortRateLimit({
    serviceClient,
    bucketKey: `notifprefs:${user.id || userEmail}:${ip || 'noip'}:${minuteBucket()}`,
    userId: user.id || null,
    ip,
    windowSeconds: 60,
    maxRequests: 20,
  });

  if (rl.allowed === false) {
    return json(res, 429, { error: 'Rate limit exceeded', remaining: rl.remaining ?? 0 });
  }

  const body = (await readJsonBody(req)) || {};
  const allowed = [
    'push_enabled',
    'email_enabled',
    'marketing_enabled',
    'order_updates',
    'message_updates',
    'event_updates',
    'safety_updates',
  ];

  const patch = {};
  for (const key of allowed) {
    if (typeof body[key] === 'boolean') patch[key] = body[key];
  }

  const payload = { user_email: userEmail, ...patch };

  const { data, error: upsertError } = await serviceClient
    .from('notification_preferences')
    .upsert(payload, { onConflict: 'user_email' })
    .select('*')
    .single();

  if (upsertError) return json(res, 500, { error: upsertError.message || 'Failed to save preferences' });
  return json(res, 200, { preferences: data });
}
