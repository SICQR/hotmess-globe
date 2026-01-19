import { createClient } from '@supabase/supabase-js';

export const createSupabaseClients = ({ supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey }) => {
  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { anonClient, serviceClient };
};

export const getAuthedEmail = async ({ anonClient, accessToken }) => {
  const { data, error } = await anonClient.auth.getUser(accessToken);
  if (error || !data?.user?.email) return { email: null, user: null };
  return { email: data.user.email, user: data.user };
};

export const isAdminUser = async ({ anonClient, serviceClient, accessToken, email }) => {
  // 1) Prefer role in auth metadata
  const { data: userData, error: userErr } = await anonClient.auth.getUser(accessToken);
  if (userErr || !userData?.user) return false;
  const roleFromMetadata = userData.user.user_metadata?.role;
  if (roleFromMetadata === 'admin') return true;

  // 2) Fallback to profile table role, if present
  const tryTables = ['User', 'users'];
  for (const table of tryTables) {
    const { data, error } = await serviceClient.from(table).select('role').eq('email', email).maybeSingle();
    if (error) continue;
    if (data?.role === 'admin') return true;
  }

  return false;
};
