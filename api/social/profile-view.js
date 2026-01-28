/**
 * Vercel API Route: Track Profile View
 * 
 * POST /api/social/profile-view
 * Body: { viewed_email: string }
 * 
 * Records profile view and queues notification at threshold
 */

import { getBearerToken, json, readJsonBody } from '../shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from '../routing/_utils.js';
import { bestEffortRateLimit, minuteBucket } from '../_rateLimit.js';
import { getRequestIp } from '../routing/_utils.js';

const VIEW_NOTIFICATION_THRESHOLD = 5; // Notify every N views

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { error, anonClient, serviceClient } = getSupabaseServerClients();
  if (error) return json(res, 500, { error });

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing bearer token' });

  const { user, error: userError } = await getAuthedUser({ anonClient, accessToken });
  if (userError || !user?.email) return json(res, 401, { error: 'Invalid auth token' });

  // Rate limit: prevent spam view tracking
  const ip = getRequestIp(req);
  const rl = await bestEffortRateLimit({
    serviceClient,
    bucketKey: `profile-view:${user.id || user.email}:${ip || 'noip'}:${minuteBucket()}`,
    userId: user.id || null,
    ip,
    windowSeconds: 60,
    maxRequests: 30,
  });

  if (rl.allowed === false) {
    return json(res, 429, { error: 'Rate limit exceeded', remaining: rl.remaining ?? 0 });
  }

  const body = (await readJsonBody(req)) || {};
  const { viewed_email } = body;

  if (!viewed_email || typeof viewed_email !== 'string') {
    return json(res, 400, { error: 'viewed_email is required' });
  }

  if (viewed_email === user.email) {
    // Don't track self-views
    return json(res, 200, { success: true, message: 'Self-view not tracked' });
  }

  try {
    // Record profile view
    const { error: viewError } = await serviceClient
      .from('profile_views')
      .insert({
        viewer_email: user.email,
        viewed_email: viewed_email,
        viewed_at: new Date().toISOString(),
      });

    if (viewError) {
      console.error('[ProfileView] Error recording view:', viewError);
      // Continue even if view recording fails
    }

    // Check total views today for notification threshold
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayViews, error: countError } = await serviceClient
      .from('profile_views')
      .select('id', { count: 'exact', head: true })
      .eq('viewed_email', viewed_email)
      .gte('viewed_at', today.toISOString());

    if (!countError && todayViews !== null) {
      const viewCount = todayViews;
      
      // Notify at thresholds (5, 10, 20, 50, 100 views)
      const notifyThresholds = [5, 10, 20, 50, 100];
      const shouldNotify = notifyThresholds.includes(viewCount);
      
      if (shouldNotify) {
        try {
          // Check if we already sent notification for this threshold today
          const { data: existingNotif } = await serviceClient
            .from('notification_outbox')
            .select('id')
            .eq('user_email', viewed_email)
            .eq('notification_type', 'profile_views')
            .gte('created_at', today.toISOString())
            .like('message', `%${viewCount}%`)
            .maybeSingle();

          if (!existingNotif) {
            await serviceClient
              .from('notification_outbox')
              .insert({
                user_email: viewed_email,
                notification_type: 'profile_views',
                title: 'Profile Views',
                message: `Your profile is getting attention - ${viewCount} views today!`,
                metadata: {
                  link: `/profile/${viewed_email}`,
                  view_count: viewCount,
                  date: new Date().toISOString(),
                },
                status: 'queued',
                created_at: new Date().toISOString(),
                created_date: new Date().toISOString(),
              });
          }
        } catch (err) {
          console.warn('[ProfileView] Failed to queue notification:', err);
        }
      }
    }

    return json(res, 200, { success: true, message: 'Profile view recorded' });
  } catch (error) {
    console.error('[ProfileView] Unexpected error:', error);
    return json(res, 500, { error: 'Internal server error' });
  }
}
