/**
 * GET /api/resolve-user-email?uid=<auth_user_id>
 *
 * For authenticated users only: resolve a user's auth_user_id to their email.
 * Used by chat system to look up email for creating chat threads.
 *
 * Returns: { email: "user@example.com" }
 * Error: 401 if not authenticated, 404 if user not found
 */

import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getEnv, getQueryParam, json } from './shopify/_utils.js';
import { getSupabaseServerClients } from './routing/_utils.js';

const normalizeId = (value) => String(value || '').trim();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  // Require authentication
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  const uid = getQueryParam(req, 'uid');
  if (!uid) {
    return json(res, 400, { error: 'Missing required query param: uid' });
  }

  const { error: supaErr, serviceClient, anonClient } = getSupabaseServerClients();

  // Validate token first
  let validatedUser = null;
  if (anonClient) {
    const { data, error } = await anonClient.auth.getUser(accessToken);
    if (error || !data?.user) {
      return json(res, 401, { error: 'Invalid token' });
    }
    validatedUser = data.user;
  }

  // If service role is configured, use it to resolve UID to email
  if (!supaErr && serviceClient?.auth?.admin?.getUserById) {
    try {
      const { data, error } = await serviceClient.auth.admin.getUserById(normalizeId(uid));
      if (error || !data?.user?.email) {
        return json(res, 404, { error: 'User not found' });
      }
      return json(res, 200, { email: data.user.email });
    } catch {
      return json(res, 404, { error: 'User not found' });
    }
  }

  // Fallback: if no service role but we have an authed client, query the profiles table
  // This only works if RLS allows querying by auth_user_id
  if (anonClient && validatedUser) {
    try {
      const { data, error } = await anonClient
        .from('profiles')
        .select('email')
        .eq('id', normalizeId(uid))
        .maybeSingle();

      if (error || !data?.email) {
        return json(res, 404, { error: 'User not found' });
      }
      return json(res, 200, { email: data.email });
    } catch {
      return json(res, 404, { error: 'User not found' });
    }
  }

  return json(res, 500, { error: 'Unable to resolve user' });
}
