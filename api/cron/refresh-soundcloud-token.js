/**
 * Cron Job: Refresh SoundCloud Token
 * Proactively refreshes SoundCloud OAuth token before expiry
 * 
 * Runs: Every 6 hours
 * Schedule in vercel.json: "0 */6 * * *"
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!supabaseServiceKey) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('[Cron/SoundCloud] Checking token expiry...');

    // Get current token
    const { data: tokenRow, error: fetchError } = await supabase
      .from('soundcloud_oauth_tokens')
      .select('*')
      .eq('account_key', 'default')
      .single();

    if (fetchError || !tokenRow) {
      console.log('[Cron/SoundCloud] No token found, skipping');
      return res.status(200).json({ message: 'No token to refresh' });
    }

    if (!tokenRow.refresh_token) {
      console.log('[Cron/SoundCloud] No refresh token, skipping');
      return res.status(200).json({ message: 'No refresh token available' });
    }

    // Check if token expires within 24 hours
    const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : 0;
    const now = Date.now();
    const refreshWindow = 24 * 60 * 60 * 1000; // 24 hours

    if (expiresAt > now + refreshWindow) {
      const hoursUntilExpiry = Math.round((expiresAt - now) / (60 * 60 * 1000));
      console.log(`[Cron/SoundCloud] Token valid for ${hoursUntilExpiry} more hours, skipping`);
      return res.status(200).json({ 
        message: 'Token still valid',
        expires_in_hours: hoursUntilExpiry,
      });
    }

    // Call the refresh endpoint
    const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://hotmess.london'}/api/soundcloud/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await refreshResponse.json();

    if (!refreshResponse.ok) {
      console.error('[Cron/SoundCloud] Refresh failed:', result);
      return res.status(500).json({ error: 'Refresh failed', details: result });
    }

    console.log('[Cron/SoundCloud] Token refreshed successfully');
    return res.status(200).json({ 
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('[Cron/SoundCloud] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
