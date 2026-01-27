import { getBearerToken, json, getQueryParam } from '../shopify/_utils.js';
import { getSupabaseServerClients } from '../routing/_utils.js';

/**
 * Fetch a user profile by username
 * GET /api/profile/by-username?username=<username>
 * 
 * Returns the user profile with personal details hidden from other users.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const username = getQueryParam(req, 'username');
  
  if (!username || typeof username !== 'string' || !username.trim()) {
    return json(res, 400, { error: 'Username is required' });
  }

  const { error: supaErr, serviceClient, anonClient } = getSupabaseServerClients();

  if (supaErr || !serviceClient) {
    return json(res, 500, { error: 'Database connection failed' });
  }

  // Check if the requester is authenticated
  const accessToken = getBearerToken(req);
  let viewerUserId = null;
  
  if (accessToken && anonClient) {
    const { data: { user }, error } = await anonClient.auth.getUser(accessToken);
    if (!error && user) {
      viewerUserId = user.id;
    }
  }

  try {
    // Lookup user by username (case-insensitive)
    const { data: userRecord, error } = await serviceClient
      .from('User')
      .select('*')
      .ilike('username', username.trim())
      .maybeSingle();

    if (error) {
      console.error('[profile/by-username] Database error:', error);
      return json(res, 500, { error: 'Failed to fetch profile' });
    }

    if (!userRecord) {
      return json(res, 404, { error: 'Profile not found' });
    }

    // Check if this is the user's own profile
    const isOwnProfile = viewerUserId && userRecord.auth_user_id === viewerUserId;

    // Build response - hide sensitive fields from other users
    const publicProfile = {
      id: userRecord.id,
      username: userRecord.username,
      display_name: userRecord.display_name,
      avatar_url: userRecord.avatar_url,
      bio: userRecord.bio,
      city: userRecord.city,
      profile_type: userRecord.profile_type,
      xp: userRecord.xp,
      level: Math.floor((userRecord.xp || 0) / 1000) + 1,
      photos: userRecord.photos,
      interests: userRecord.interests,
      preferred_vibes: userRecord.preferred_vibes,
      music_taste: userRecord.music_taste,
      looking_for: userRecord.looking_for,
      meet_at: userRecord.meet_at,
      tags: userRecord.tags,
      tag_ids: userRecord.tag_ids,
      verified: userRecord.verified,
      verified_seller: userRecord.verified_seller,
      membership_tier: userRecord.membership_tier,
      // Seller fields
      seller_tagline: userRecord.seller_tagline,
      seller_bio: userRecord.seller_bio,
      shop_banner_url: userRecord.shop_banner_url,
      // Location (for travel time calculations)
      lat: userRecord.lat,
      lng: userRecord.lng,
      last_lat: userRecord.last_lat,
      last_lng: userRecord.last_lng,
      // Social (hidden from non-connections)
      social_links: isOwnProfile ? userRecord.social_links : undefined,
      // Visibility settings
      substances_visibility: userRecord.substances_visibility,
      aftercare_visibility: userRecord.aftercare_visibility,
      essentials_visibility: userRecord.essentials_visibility,
      // Timestamps
      created_at: userRecord.created_at,
      updated_at: userRecord.updated_at,
      last_seen: userRecord.last_seen,
    };

    // Only include these fields if it's the user's own profile
    if (isOwnProfile) {
      publicProfile.email = userRecord.email;
      publicProfile.full_name = userRecord.full_name;
      publicProfile.auth_user_id = userRecord.auth_user_id;
    }

    return json(res, 200, { user: publicProfile });
  } catch (err) {
    console.error('[profile/by-username] Unexpected error:', err);
    return json(res, 500, { error: 'Failed to fetch profile' });
  }
}
