import { getBearerToken, json } from '../shopify/_utils.js';
import { getEnv } from '../routing/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from '../routing/_utils.js';

const isEnabled = () => {
  const flag = getEnv('MEMBERSHIPS_ENABLED', ['VITE_MEMBERSHIPS_ENABLED']);
  return String(flag || '').toLowerCase() === 'true';
};

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  if (!isEnabled()) {
    return json(res, 200, { enabled: false, subscription: null });
  }

  const { error, anonClient, serviceClient } = getSupabaseServerClients();
  if (error) return json(res, 500, { error });

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing bearer token' });

  const { user, error: userError } = await getAuthedUser({ anonClient, accessToken });
  if (userError || !user?.email) return json(res, 401, { error: 'Invalid auth token' });

  const { data, error: dbError } = await serviceClient
    .from('subscriptions')
    .select('*')
    .eq('user_email', user.email)
    .order('created_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dbError) return json(res, 500, { error: dbError.message || 'Failed to load subscription' });

  return json(res, 200, { enabled: true, subscription: data || null });
}
