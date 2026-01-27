/**
 * Cron Job: Deactivate Expired Profiles
 * 
 * This endpoint should be called periodically (e.g., every minute via Vercel Cron)
 * to automatically deactivate profiles whose expires_at timestamp has passed.
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/deactivate-expired-profiles",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */

import { json } from '../shopify/_utils.js';
import { getSupabaseServerClients } from '../routing/_utils.js';

// Verify cron secret for security (optional but recommended)
const verifyCronSecret = (req) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // No secret configured, allow all
  
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;
  
  return authHeader === `Bearer ${cronSecret}`;
};

export default async function handler(req, res) {
  // Only allow GET (for cron) or POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  // Verify cron secret
  if (!verifyCronSecret(req)) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  const { error: supaErr, serviceClient } = getSupabaseServerClients();
  
  if (supaErr || !serviceClient) {
    console.error('[cron/deactivate-expired-profiles] Supabase not configured');
    return json(res, 500, { error: 'Server configuration error' });
  }

  try {
    const now = new Date().toISOString();

    // Find all active profiles with expires_at <= now
    const { data: expiredProfiles, error: fetchError } = await serviceClient
      .from('profiles')
      .select('id, account_id, type_key, type_label, expires_at')
      .eq('active', true)
      .not('expires_at', 'is', null)
      .lte('expires_at', now)
      .is('deleted_at', null);

    if (fetchError) {
      console.error('[cron/deactivate-expired-profiles] Fetch error:', fetchError);
      return json(res, 500, { error: 'Failed to fetch expired profiles' });
    }

    if (!expiredProfiles || expiredProfiles.length === 0) {
      return json(res, 200, {
        success: true,
        message: 'No expired profiles to deactivate',
        deactivated: 0,
      });
    }

    console.log(`[cron/deactivate-expired-profiles] Found ${expiredProfiles.length} expired profiles`);

    // Deactivate all expired profiles
    const profileIds = expiredProfiles.map((p) => p.id);
    
    const { error: updateError, count } = await serviceClient
      .from('profiles')
      .update({
        active: false,
        updated_at: now,
      })
      .in('id', profileIds);

    if (updateError) {
      console.error('[cron/deactivate-expired-profiles] Update error:', updateError);
      return json(res, 500, { error: 'Failed to deactivate profiles' });
    }

    console.log(`[cron/deactivate-expired-profiles] Deactivated ${count || profileIds.length} profiles`);

    // Optionally create notifications for profile owners
    try {
      const notifications = expiredProfiles.map((profile) => ({
        user_email: null, // We'd need to look up email from account_id
        type: 'profile_expired',
        title: 'Persona Expired',
        message: `Your "${profile.type_label || profile.type_key}" persona has expired and been deactivated.`,
        metadata: {
          profile_id: profile.id,
          profile_type: profile.type_key,
        },
      }));

      // For each profile, look up the user email and create notification
      for (const profile of expiredProfiles) {
        const { data: user } = await serviceClient
          .from('User')
          .select('email')
          .eq('auth_user_id', profile.account_id)
          .maybeSingle();

        if (user?.email) {
          await serviceClient
            .from('notifications')
            .insert({
              user_email: user.email,
              type: 'profile_expired',
              title: 'Persona Expired',
              message: `Your "${profile.type_label || profile.type_key}" persona has expired and been deactivated.`,
              metadata: {
                profile_id: profile.id,
                profile_type: profile.type_key,
              },
            });
        }
      }
    } catch (notifError) {
      // Don't fail the job for notification errors
      console.error('[cron/deactivate-expired-profiles] Notification error:', notifError);
    }

    return json(res, 200, {
      success: true,
      message: `Deactivated ${profileIds.length} expired profiles`,
      deactivated: profileIds.length,
      profiles: expiredProfiles.map((p) => ({
        id: p.id,
        type_key: p.type_key,
        type_label: p.type_label,
        expired_at: p.expires_at,
      })),
    });
  } catch (err) {
    console.error('[cron/deactivate-expired-profiles] Unexpected error:', err);
    return json(res, 500, { error: 'Internal server error' });
  }
}
