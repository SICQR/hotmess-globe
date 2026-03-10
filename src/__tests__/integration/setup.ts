/// <reference types="node" />
/**
 * Integration test setup — shared Supabase clients and test helpers.
 *
 * Uses the REAL production Supabase (axxwdjmbwkvqhcpwters) via service-role
 * for admin operations and per-user JWTs for RLS assertions.
 *
 * ⚠️  These tests mutate real data — they clean up after themselves but should
 *     NOT be run against a prod instance with real users unless scoped to test rows.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://axxwdjmbwkvqhcpwters.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY required for integration tests');
if (!ANON_KEY) throw new Error('SUPABASE_ANON_KEY required for integration tests');

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

/** Admin client — bypasses RLS */
export const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Anon client — subject to RLS */
export const anon = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Create an authenticated client for a specific user (by JWT) */
export function clientAs(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// ---------------------------------------------------------------------------
// Known test users (Phil & Glen — already exist in production)
// ---------------------------------------------------------------------------
export const TEST_USERS = {
  phil: {
    email: 'scanme@sicqr.com',
    authId: '36f5f0f2-9a59-46e5-b5bc-065850968d4b',
  },
  glen: {
    email: 'glen@mccartyltd.com',
    authId: '54852f62-cde0-44c4-829b-2c9eef721758',
  },
} as const;

// ---------------------------------------------------------------------------
// London coordinates for geospatial tests
// ---------------------------------------------------------------------------
export const GEO = {
  /** Soho — central London */
  soho: { lat: 51.5134, lng: -0.1340 },
  /** Vauxhall — ~2.5 km south */
  vauxhall: { lat: 51.4862, lng: -0.1226 },
  /** Stratford — ~10 km east */
  stratford: { lat: 51.5430, lng: -0.0034 },
  /** Manchester — ~260 km north (out of range) */
  manchester: { lat: 53.4808, lng: -2.2426 },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a unique test thread ID prefix for easy cleanup */
export function testThreadPrefix(): string {
  return `__test_${Date.now()}_`;
}

/** Small delay for Supabase Realtime propagation */
export function wait(ms = 300): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Sign in as a test user and return an authenticated client */
export async function signInAsTestUser(
  email: string,
  password: string,
): Promise<{ client: SupabaseClient; accessToken: string; userId: string }> {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`Sign-in failed for ${email}: ${error?.message}`);
  return {
    client,
    accessToken: data.session.access_token,
    userId: data.user.id,
  };
}

export { SUPABASE_URL, SERVICE_ROLE_KEY, ANON_KEY };
