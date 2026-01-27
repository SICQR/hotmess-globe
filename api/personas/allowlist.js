/**
 * Personas API: Allowlist management
 * GET /api/personas/allowlist?profile_id=X - List allowlisted users
 * POST /api/personas/allowlist - Add user to allowlist
 * DELETE /api/personas/allowlist?profile_id=X&viewer_id=Y - Remove from allowlist
 */

import { getBearerToken, json, getQueryParam } from '../shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from '../routing/_utils.js';

export default async function handler(req, res) {
  const { method } = req;

  if (!['GET', 'POST', 'DELETE'].includes(method)) {
    res.setHeader('Allow', 'GET, POST, DELETE');
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

  const client = serviceClient || anonClient;
  const accountId = user.id;

  switch (method) {
    case 'GET':
      return handleListAllowlist(req, res, accountId, client);
    case 'POST':
      return handleAddToAllowlist(req, res, accountId, client);
    case 'DELETE':
      return handleRemoveFromAllowlist(req, res, accountId, client);
    default:
      return json(res, 405, { error: 'Method not allowed' });
  }
}

/**
 * Verify profile ownership
 */
async function verifyProfileOwnership(profileId, accountId, client) {
  const { data: profile, error } = await client
    .from('profiles')
    .select('id, account_id')
    .eq('id', profileId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !profile) {
    return { owned: false, error: 'Profile not found' };
  }

  if (profile.account_id !== accountId) {
    return { owned: false, error: 'Access denied' };
  }

  return { owned: true, profile };
}

/**
 * GET - List allowlisted users for a profile
 */
async function handleListAllowlist(req, res, accountId, client) {
  const profileId = getQueryParam(req, 'profile_id');
  if (!profileId) {
    return json(res, 400, { error: 'profile_id is required' });
  }

  const ownership = await verifyProfileOwnership(profileId, accountId, client);
  if (!ownership.owned) {
    return json(res, 403, { error: ownership.error });
  }

  // Get allowlist entries with user info
  const { data: entries, error } = await client
    .from('profile_allowlist_users')
    .select(`
      viewer_user_id,
      created_at
    `)
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[personas/allowlist] List error:', error);
    return json(res, 500, { error: 'Failed to fetch allowlist' });
  }

  // Get user details for each viewer
  const viewerIds = (entries || []).map((e) => e.viewer_user_id);
  let users = [];
  
  if (viewerIds.length > 0) {
    const { data: userRecords } = await client
      .from('User')
      .select('auth_user_id, email, full_name, avatar_url')
      .in('auth_user_id', viewerIds);
    
    users = userRecords || [];
  }

  // Merge user data with entries
  const enrichedEntries = (entries || []).map((entry) => {
    const user = users.find((u) => u.auth_user_id === entry.viewer_user_id);
    return {
      viewer_user_id: entry.viewer_user_id,
      created_at: entry.created_at,
      user: user || null,
    };
  });

  return json(res, 200, { allowlist: enrichedEntries });
}

/**
 * POST - Add user to allowlist
 */
async function handleAddToAllowlist(req, res, accountId, client) {
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return json(res, 400, { error: 'Invalid JSON body' });
  }

  const { profile_id, viewer_user_id, viewer_email } = body;

  if (!profile_id) {
    return json(res, 400, { error: 'profile_id is required' });
  }

  if (!viewer_user_id && !viewer_email) {
    return json(res, 400, { error: 'viewer_user_id or viewer_email is required' });
  }

  const ownership = await verifyProfileOwnership(profile_id, accountId, client);
  if (!ownership.owned) {
    return json(res, 403, { error: ownership.error });
  }

  // Resolve viewer_user_id from email if needed
  let resolvedViewerUserId = viewer_user_id;
  if (!resolvedViewerUserId && viewer_email) {
    const { data: viewer } = await client
      .from('User')
      .select('auth_user_id')
      .eq('email', viewer_email.toLowerCase().trim())
      .maybeSingle();

    if (!viewer?.auth_user_id) {
      return json(res, 404, { error: 'User not found with that email' });
    }
    resolvedViewerUserId = viewer.auth_user_id;
  }

  // Cannot add yourself
  if (resolvedViewerUserId === accountId) {
    return json(res, 400, { error: 'Cannot add yourself to allowlist' });
  }

  // Add to allowlist
  const { data: entry, error } = await client
    .from('profile_allowlist_users')
    .upsert({
      profile_id,
      viewer_user_id: resolvedViewerUserId,
    }, {
      onConflict: 'profile_id,viewer_user_id',
    })
    .select()
    .single();

  if (error) {
    console.error('[personas/allowlist] Add error:', error);
    return json(res, 500, { error: 'Failed to add to allowlist' });
  }

  return json(res, 201, { entry });
}

/**
 * DELETE - Remove user from allowlist
 */
async function handleRemoveFromAllowlist(req, res, accountId, client) {
  const profileId = getQueryParam(req, 'profile_id');
  const viewerId = getQueryParam(req, 'viewer_id');

  if (!profileId) {
    return json(res, 400, { error: 'profile_id is required' });
  }

  if (!viewerId) {
    return json(res, 400, { error: 'viewer_id is required' });
  }

  const ownership = await verifyProfileOwnership(profileId, accountId, client);
  if (!ownership.owned) {
    return json(res, 403, { error: ownership.error });
  }

  const { error } = await client
    .from('profile_allowlist_users')
    .delete()
    .eq('profile_id', profileId)
    .eq('viewer_user_id', viewerId);

  if (error) {
    console.error('[personas/allowlist] Remove error:', error);
    return json(res, 500, { error: 'Failed to remove from allowlist' });
  }

  return json(res, 200, { success: true });
}
