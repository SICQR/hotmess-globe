/**
 * Personas API: Individual profile operations
 * GET /api/personas/[profileId] - Get profile details
 * PATCH /api/personas/[profileId] - Update profile
 * DELETE /api/personas/[profileId] - Soft delete profile
 */

import { getBearerToken, json, getQueryParam } from '../shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from '../routing/_utils.js';
import { validateProfileData, resolveEffectiveProfile } from './_utils.js';
import { withRateLimit } from '../middleware/rateLimiter.js';

async function handler(req, res) {
  const { method } = req;

  if (!['GET', 'PATCH', 'DELETE'].includes(method)) {
    res.setHeader('Allow', 'GET, PATCH, DELETE');
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

  // Extract profileId from URL
  const profileId = getProfileIdFromUrl(req);
  if (!profileId) {
    return json(res, 400, { error: 'Profile ID is required' });
  }

  const client = serviceClient || anonClient;
  const accountId = user.id;

  // Verify ownership
  const { data: profile, error: fetchError } = await client
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .maybeSingle();

  if (fetchError) {
    console.error('[personas/[profileId]] Fetch error:', fetchError);
    return json(res, 500, { error: 'Failed to fetch profile' });
  }

  if (!profile) {
    return json(res, 404, { error: 'Profile not found' });
  }

  if (profile.account_id !== accountId) {
    return json(res, 403, { error: 'Access denied' });
  }

  switch (method) {
    case 'GET':
      return handleGetProfile(res, profile, client);
    case 'PATCH':
      return handleUpdateProfile(req, res, profile, client);
    case 'DELETE':
      return handleDeleteProfile(res, profile, client);
    default:
      return json(res, 405, { error: 'Method not allowed' });
  }
}

/**
 * Extract profileId from request URL
 */
function getProfileIdFromUrl(req) {
  // URL pattern: /api/personas/[profileId]
  const url = req.url || '';
  const match = url.match(/\/api\/personas\/([^/?]+)/);
  return match ? match[1] : null;
}

/**
 * GET /api/personas/[profileId] - Get profile details with effective resolution
 */
async function handleGetProfile(res, profile, client) {
  try {
    // Get related data
    const [overridesResult, rulesResult] = await Promise.all([
      client
        .from('profile_overrides')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle(),
      client
        .from('profile_visibility_rules')
        .select('*')
        .eq('profile_id', profile.id)
        .order('priority', { ascending: true }),
    ]);

    // Resolve effective profile
    const effectiveProfile = await resolveEffectiveProfile({
      profileId: profile.id,
      serviceClient: client,
    });

    return json(res, 200, {
      profile,
      overrides: overridesResult.data || null,
      visibility_rules: rulesResult.data || [],
      effective_profile: effectiveProfile,
    });
  } catch (err) {
    console.error('[personas/[profileId]] Get error:', err);
    return json(res, 500, { error: 'Internal server error' });
  }
}

/**
 * PATCH /api/personas/[profileId] - Update profile
 */
async function handleUpdateProfile(req, res, profile, client) {
  try {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return json(res, 400, { error: 'Invalid JSON body' });
    }

    // Cannot change kind
    if (body.kind && body.kind !== profile.kind) {
      return json(res, 400, { error: 'Cannot change profile kind' });
    }

    // Cannot change account_id
    if (body.account_id && body.account_id !== profile.account_id) {
      return json(res, 400, { error: 'Cannot change account_id' });
    }

    // Build update data
    const updateData = {};
    const allowedFields = [
      'type_key',
      'type_label',
      'active',
      'expires_at',
      'inherit_mode',
      'override_location_enabled',
      'override_location_lat',
      'override_location_lng',
      'override_location_label',
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Validate update data
    const validation = validateProfileData({ ...profile, ...updateData }, false);
    if (!validation.valid) {
      return json(res, 400, { error: 'Validation failed', details: validation.errors });
    }

    // Increment version for optimistic concurrency
    updateData.version = profile.version + 1;

    // Update profile
    const { data: updatedProfile, error: updateError } = await client
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id)
      .eq('version', profile.version) // Optimistic lock
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return json(res, 409, { error: 'Profile was modified by another request' });
      }
      console.error('[personas/[profileId]] Update error:', updateError);
      return json(res, 500, { error: 'Failed to update profile' });
    }

    // Update overrides if provided
    if (body.overrides_json !== undefined || body.photos_mode !== undefined || body.photos_json !== undefined) {
      const overridesUpdate = {};
      if (body.overrides_json !== undefined) overridesUpdate.overrides_json = body.overrides_json;
      if (body.photos_mode !== undefined) overridesUpdate.photos_mode = body.photos_mode;
      if (body.photos_json !== undefined) overridesUpdate.photos_json = body.photos_json;

      // Upsert overrides
      const { error: overridesError } = await client
        .from('profile_overrides')
        .upsert({
          profile_id: profile.id,
          ...overridesUpdate,
        }, {
          onConflict: 'profile_id',
        });

      if (overridesError) {
        console.error('[personas/[profileId]] Overrides update error:', overridesError);
      }
    }

    return json(res, 200, { profile: updatedProfile });
  } catch (err) {
    console.error('[personas/[profileId]] Update error:', err);
    return json(res, 500, { error: 'Internal server error' });
  }
}

/**
 * DELETE /api/personas/[profileId] - Soft delete profile
 */
async function handleDeleteProfile(res, profile, client) {
  try {
    // Cannot delete MAIN profile
    if (profile.kind === 'MAIN') {
      return json(res, 400, { error: 'Cannot delete main profile' });
    }

    // Soft delete
    const { error: deleteError } = await client
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        active: false,
      })
      .eq('id', profile.id);

    if (deleteError) {
      console.error('[personas/[profileId]] Delete error:', deleteError);
      return json(res, 500, { error: 'Failed to delete profile' });
    }

    return json(res, 200, { success: true, message: 'Profile deleted' });
  } catch (err) {
    console.error('[personas/[profileId]] Delete error:', err);
    return json(res, 500, { error: 'Internal server error' });
  }
}

export default withRateLimit(handler, { tier: 'api' });
