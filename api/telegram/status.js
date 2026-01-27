import { createClient } from '@supabase/supabase-js';
import { getEnv, json, getBearerToken } from '../shopify/_utils.js';

/**
 * Get Telegram connection status for current user
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', ['VITE_SUPABASE_ANON_KEY']);
  const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return json(res, 500, { error: 'Server configuration error' });
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return json(res, 401, { error: 'Missing authorization token' });
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { data: { user }, error: authError } = await anonClient.auth.getUser(accessToken);
  if (authError || !user) {
    return json(res, 401, { error: 'Invalid authorization token' });
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const { data: telegramUser, error } = await serviceClient
    .from('telegram_users')
    .select('telegram_id, username, first_name, notifications_enabled, linked_at, muted_until')
    .eq('user_id', user.id)
    .single();

  if (error || !telegramUser) {
    return json(res, 200, { connected: false });
  }

  return json(res, 200, {
    connected: true,
    username: telegramUser.username,
    firstName: telegramUser.first_name,
    notificationsEnabled: telegramUser.notifications_enabled,
    linkedAt: telegramUser.linked_at,
    mutedUntil: telegramUser.muted_until,
  });
}
