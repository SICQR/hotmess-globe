/**
 * SoundCloud Token Refresh API
 * Refreshes expired OAuth tokens automatically
 */

import { createClient } from '@supabase/supabase-js';
import { getEnv, json } from '../shopify/_utils.js';
import { refreshAccessToken, getSoundCloudConfig } from './_soundcloud.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return json(res, 500, { error: 'Database not configured' });
  }

  const { clientId, clientSecret } = getSoundCloudConfig();
  if (!clientId || !clientSecret) {
    return json(res, 409, { error: 'SoundCloud not configured' });
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Get current token
    const { data: tokenRow, error: fetchError } = await serviceClient
      .from('soundcloud_oauth_tokens')
      .select('*')
      .eq('account_key', 'default')
      .single();

    if (fetchError || !tokenRow) {
      return json(res, 404, { error: 'No SoundCloud connection found' });
    }

    if (!tokenRow.refresh_token) {
      return json(res, 400, { error: 'No refresh token available - reconnect SoundCloud' });
    }

    // Check if token is actually expired (with 5 min buffer)
    const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : 0;
    const now = Date.now();
    const bufferMs = 5 * 60 * 1000; // 5 minutes

    if (expiresAt > now + bufferMs) {
      return json(res, 200, { 
        message: 'Token still valid',
        expires_at: tokenRow.expires_at,
        expires_in_seconds: Math.round((expiresAt - now) / 1000),
      });
    }

    // Refresh the token
    const newTokens = await refreshAccessToken(tokenRow.refresh_token);

    if (!newTokens || !newTokens.access_token) {
      throw new Error('Failed to refresh token - no access token returned');
    }

    // Calculate new expiry
    const newExpiresAt = newTokens.expires_in 
      ? new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
      : null;

    // Update stored token
    const { error: updateError } = await serviceClient
      .from('soundcloud_oauth_tokens')
      .update({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || tokenRow.refresh_token, // Keep old if not returned
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('account_key', 'default');

    if (updateError) {
      throw new Error(`Failed to save refreshed token: ${updateError.message}`);
    }

    console.log('[SoundCloud] Token refreshed successfully');

    return json(res, 200, {
      success: true,
      expires_at: newExpiresAt,
      expires_in_seconds: newTokens.expires_in || null,
    });

  } catch (error) {
    console.error('[SoundCloud] Token refresh failed:', error);
    return json(res, 500, { 
      error: 'Token refresh failed',
      details: error.message,
    });
  }
}
