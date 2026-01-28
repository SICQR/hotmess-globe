/**
 * Vercel API Route: Follow/Unfollow User with Notifications
 * 
 * POST /api/social/follow
 * Body: { following_email: string, action: 'follow' | 'unfollow' }
 * 
 * Creates/deletes follow relationship and queues notification
 */

import { getBearerToken, json, readJsonBody } from '../shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from '../routing/_utils.js';
import { bestEffortRateLimit, minuteBucket } from '../_rateLimit.js';
import { getRequestIp } from '../routing/_utils.js';

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

  // Rate limit
  const ip = getRequestIp(req);
  const rl = await bestEffortRateLimit({
    serviceClient,
    bucketKey: `follow:${user.id || user.email}:${ip || 'noip'}:${minuteBucket()}`,
    userId: user.id || null,
    ip,
    windowSeconds: 60,
    maxRequests: 20,
  });

  if (rl.allowed === false) {
    return json(res, 429, { error: 'Rate limit exceeded', remaining: rl.remaining ?? 0 });
  }

  const body = (await readJsonBody(req)) || {};
  const { following_email, action } = body;

  if (!following_email || typeof following_email !== 'string') {
    return json(res, 400, { error: 'following_email is required' });
  }

  if (!action || !['follow', 'unfollow'].includes(action)) {
    return json(res, 400, { error: 'action must be "follow" or "unfollow"' });
  }

  if (following_email === user.email) {
    return json(res, 400, { error: 'Cannot follow yourself' });
  }

  try {
    if (action === 'follow') {
      // Check if already following
      const { data: existing } = await serviceClient
        .from('user_follows')
        .select('*')
        .eq('follower_email', user.email)
        .eq('following_email', following_email)
        .maybeSingle();

      if (existing) {
        return json(res, 200, { success: true, message: 'Already following', alreadyFollowing: true });
      }

      // Create follow relationship
      const { error: followError } = await serviceClient
        .from('user_follows')
        .insert({
          follower_email: user.email,
          following_email: following_email,
          created_at: new Date().toISOString(),
        });

      if (followError) {
        console.error('[Follow] Error creating follow:', followError);
        return json(res, 500, { error: 'Failed to follow user' });
      }

      // Get follower's name for notification
      const { data: followerData } = await serviceClient
        .from('User')
        .select('full_name, avatar_url')
        .eq('email', user.email)
        .single();

      const followerName = followerData?.full_name || 'Someone';

      // Queue notification for the followed user
      const { error: notifError } = await serviceClient
        .from('notification_outbox')
        .insert({
          user_email: following_email,
          notification_type: 'new_follower',
          title: 'New Follower',
          message: `${followerName} started following you`,
          metadata: {
            link: `/profile/${user.email}`,
            follower_email: user.email,
            follower_name: followerName,
            follower_avatar: followerData?.avatar_url,
          },
          status: 'queued',
          created_at: new Date().toISOString(),
          created_date: new Date().toISOString(),
        });

      if (notifError) {
        console.error('[Follow] Error queuing notification:', notifError);
        // Don't fail the follow action if notification fails
      }

      return json(res, 200, { success: true, message: 'Now following user' });
    } else {
      // Unfollow
      const { error: unfollowError } = await serviceClient
        .from('user_follows')
        .delete()
        .eq('follower_email', user.email)
        .eq('following_email', following_email);

      if (unfollowError) {
        console.error('[Follow] Error unfollowing:', unfollowError);
        return json(res, 500, { error: 'Failed to unfollow user' });
      }

      return json(res, 200, { success: true, message: 'Unfollowed user' });
    }
  } catch (error) {
    console.error('[Follow] Unexpected error:', error);
    return json(res, 500, { error: 'Internal server error' });
  }
}
