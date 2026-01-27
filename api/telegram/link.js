import { createClient } from '@supabase/supabase-js';
import { getEnv, json, getBearerToken } from '../shopify/_utils.js';
import crypto from 'crypto';

const LINK_TOKEN_EXPIRY_MINUTES = 15;

/**
 * Generate a deep link for connecting Telegram account
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

  // Generate unique token
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + LINK_TOKEN_EXPIRY_MINUTES * 60 * 1000);

  // Store token
  const { error: insertError } = await serviceClient.from('telegram_link_tokens').upsert({
    user_id: user.id,
    token,
    expires_at: expiresAt.toISOString(),
    created_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  if (insertError) {
    console.error('Failed to store link token:', insertError);
    return json(res, 500, { error: 'Failed to generate link' });
  }

  // Get bot username
  const botUsername = getEnv('TELEGRAM_BOT_USERNAME') || 'HotmessGlobeBot';

  // Generate deep link
  const deepLink = `https://t.me/${botUsername}?start=${token}`;

  return json(res, 200, {
    deepLink,
    expiresAt: expiresAt.toISOString(),
    expiresInMinutes: LINK_TOKEN_EXPIRY_MINUTES,
  });
}
