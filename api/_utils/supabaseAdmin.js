/**
 * Server-side Supabase client (service role).
 *
 * Use ONLY where the endpoint truly requires admin behaviour:
 *   - push notification fan-out (reading device tokens)
 *   - safety alert dispatch (reading trusted contacts)
 *   - AI context reads (summarised, not raw PII)
 *
 * Prefer the anon client + user's JWT for user-scoped operations.
 */

import { createClient } from '@supabase/supabase-js';

let _admin = null;
let _anon = null;

function getUrl() {
  return (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  );
}

function getServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

function getAnonKey() {
  return (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  );
}

/**
 * Service-role client — bypasses RLS. Use sparingly.
 */
export function supabaseAdmin() {
  const url = getUrl();
  const key = getServiceKey();
  if (!url || !key) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
  }
  if (!_admin) {
    _admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}

/**
 * Anon client — respects RLS. Use for user-scoped reads with a JWT.
 */
export function supabaseAnon() {
  const url = getUrl();
  const key = getAnonKey();
  if (!url || !key) {
    throw new Error('SUPABASE_URL or SUPABASE_ANON_KEY not set');
  }
  if (!_anon) {
    _anon = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _anon;
}

/**
 * Extract Bearer token from request.
 */
export function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/**
 * Get authenticated user from Bearer token.
 * Returns { user, error }.
 */
export async function getAuthedUser(req) {
  const token = getBearerToken(req);
  if (!token) return { user: null, error: 'No auth token' };

  try {
    const anon = supabaseAnon();
    const { data, error } = await anon.auth.getUser(token);
    if (error || !data?.user) return { user: null, error: error?.message || 'Invalid token' };
    return { user: data.user, error: null };
  } catch (e) {
    return { user: null, error: e.message };
  }
}
