/**
 * Shared admin verification helper for admin-only API routes.
 * Validates a bearer token and confirms the user has admin privileges.
 */

import { createClient } from '@supabase/supabase-js';

const getServiceClient = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<{ error: string|null, user: object|null }>}
 */
export async function verifyAdmin(req) {
  const supabase = getServiceClient();
  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) return { error: 'Unauthorized', user: null };

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
  if (authError || !user) return { error: 'Invalid token', user: null };

  const { data: profile } = await supabase
    .from('User')
    .select('id, is_admin, role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile?.is_admin && profile?.role !== 'admin') {
    return { error: 'Admin access required', user: null };
  }

  return { error: null, user };
}

/**
 * Returns the appropriate HTTP status code for a verifyAdmin error string.
 * @param {string} error
 * @returns {number}
 */
export function adminErrorStatus(error) {
  return error === 'Admin access required' ? 403 : 401;
}
