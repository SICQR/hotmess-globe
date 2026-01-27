import { createClient } from '@supabase/supabase-js';
import { getEnv, json, getBearerToken } from '../shopify/_utils.js';

/**
 * Disconnect Telegram from user's account
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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

  // Delete telegram user record
  const { error: deleteError } = await serviceClient
    .from('telegram_users')
    .delete()
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('Failed to disconnect Telegram:', deleteError);
    return json(res, 500, { error: 'Failed to disconnect' });
  }

  return json(res, 200, { success: true });
}
