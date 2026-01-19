import { getBearerToken, json, readJsonBody } from '../shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from '../routing/_utils.js';

export default async function handler(req, res) {
  if ((req.method || 'GET').toUpperCase() === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'PATCH') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing bearer token' });

  const { error: supaError, anonClient, serviceClient } = getSupabaseServerClients();
  if (supaError) return json(res, 500, { error: supaError });

  const { user, error: userError } = await getAuthedUser({ anonClient, accessToken });
  if (userError) return json(res, 401, { error: 'Invalid auth token' });

  const email = user?.email;
  if (!email) return json(res, 400, { error: 'Missing user email' });

  if (method === 'GET') {
    const { data, error } = await serviceClient
      .from('notification_preferences')
      .select('*')
      .eq('user_email', email)
      .maybeSingle();

    if (error) return json(res, 500, { error: error.message });

    return json(res, 200, {
      user_email: email,
      ...(data || {
        push_enabled: false,
        email_enabled: false,
        marketing_enabled: false,
        order_updates: true,
        message_updates: true,
        event_updates: true,
        safety_updates: true,
      }),
    });
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
  const updates = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) updates[key] = !!body[key];
  }

  // Upsert so the UI can PATCH without a prior row.
  const { data, error } = await serviceClient
    .from('notification_preferences')
    .upsert({ user_email: email, ...updates }, { onConflict: 'user_email' })
    .select('*')
    .single();

  if (error) return json(res, 500, { error: error.message });
  return json(res, 200, data);
}
