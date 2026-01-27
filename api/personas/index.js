/**
 * Personas API: List and create profiles
 * GET /api/personas - List all profiles for the authenticated user
 * POST /api/personas - Create a new secondary profile
 */

import { getBearerToken, json } from '../shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from '../routing/_utils.js';
import {
  validateProfileData,
  countSecondaryProfiles,
  getMaxSecondaryProfilesForTier,
  SYSTEM_PROFILE_TYPES,
} from './_utils.js';
import { withRateLimit } from '../middleware/rateLimiter.js';

async function handler(req, res) {
  const { method } = req;

  if (method !== 'GET' && method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  const { error: supaErr, anonClient, serviceClient } = getSupabaseServerClients();
  if (supaErr || !anonClient) {
    return json(res, 500, { error: 'Server configuration error' });
  }

  const { user, error: authError } = await getAuthedUser({ anonClient, accessToken });
  if (authError || !user) {
    return json(res, 401, { error: 'Invalid auth token' });
  }

  const accountId = user.id;

  if (method === 'GET') {
    return handleListProfiles(res, accountId, serviceClient || anonClient);
  }

  if (method === 'POST') {
    return handleCreateProfile(req, res, accountId, user, serviceClient || anonClient);
  }
}

/**
 * GET /api/personas - List all profiles for the user
 */
async function handleListProfiles(res, accountId, client) {
  try {
    const { data: profiles, error } = await client
      .from('profiles')
      .select(`
        *,
        profile_overrides (*),
        profile_visibility_rules (*)
      `)
      .eq('account_id', accountId)
      .is('deleted_at', null)
      .order('kind', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[personas/index] List error:', error);
      return json(res, 500, { error: 'Failed to fetch profiles' });
    }

    return json(res, 200, {
      profiles: profiles || [],
      count: profiles?.length || 0,
    });
  } catch (err) {
    console.error('[personas/index] Unexpected error:', err);
    return json(res, 500, { error: 'Internal server error' });
  }
}

/**
 * POST /api/personas - Create a new secondary profile
 */
async function handleCreateProfile(req, res, accountId, user, client) {
  try {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return json(res, 400, { error: 'Invalid JSON body' });
    }

    // Only secondary profiles can be created via API
    if (body.kind && body.kind !== 'SECONDARY') {
      return json(res, 400, { error: 'Only secondary profiles can be created via API' });
    }

    // Check secondary profile limit
    const currentCount = await countSecondaryProfiles({ accountId, serviceClient: client });
    const userTier = user.user_metadata?.subscription_tier || 'basic';
    const maxAllowed = getMaxSecondaryProfilesForTier(userTier);

    if (currentCount >= maxAllowed) {
      return json(res, 403, {
        error: `Maximum secondary profiles limit reached (${maxAllowed} for ${userTier} tier)`,
        current_count: currentCount,
        max_allowed: maxAllowed,
      });
    }

    // Prepare profile data
    const profileData = {
      account_id: accountId,
      kind: 'SECONDARY',
      type_key: body.type_key || 'CUSTOM',
      type_label: body.type_label || body.type_key || 'Custom',
      active: body.active === true,
      expires_at: body.expires_at || null,
      inherit_mode: body.inherit_mode || 'FULL_INHERIT',
      override_location_enabled: body.override_location_enabled === true,
      override_location_lat: body.override_location_lat || null,
      override_location_lng: body.override_location_lng || null,
      override_location_label: body.override_location_label || null,
    };

    // Validate profile data
    const validation = validateProfileData(profileData, true);
    if (!validation.valid) {
      return json(res, 400, { error: 'Validation failed', details: validation.errors });
    }

    // Create the profile
    const { data: profile, error: createError } = await client
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (createError) {
      console.error('[personas/index] Create error:', createError);
      return json(res, 500, { error: 'Failed to create profile' });
    }

    // Create default visibility rule (not public by default for secondary profiles)
    // User must explicitly enable public visibility
    
    // Create profile_overrides record if overrides provided
    if (body.overrides_json || body.photos_mode || body.photos_json) {
      const overridesData = {
        profile_id: profile.id,
        overrides_json: body.overrides_json || {},
        photos_mode: body.photos_mode || 'INHERIT',
        photos_json: body.photos_json || null,
      };

      const { error: overridesError } = await client
        .from('profile_overrides')
        .insert(overridesData);

      if (overridesError) {
        console.error('[personas/index] Overrides create error:', overridesError);
        // Don't fail the whole request, just log
      }
    }

    return json(res, 201, { profile });
  } catch (err) {
    console.error('[personas/index] Unexpected error:', err);
    return json(res, 500, { error: 'Internal server error' });
  }
}

export default withRateLimit(handler, { tier: 'create' });
