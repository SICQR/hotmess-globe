import { createClient } from '@supabase/supabase-js';

const requireEnv = (key) => {
  const v = process.env[key];
  if (!v || !String(v).trim()) throw new Error(`Missing required env var: ${key}`);
  return String(v).trim();
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const findAuthUserByEmail = async (supabase, email) => {
  const target = normalizeEmail(email);
  if (!target) return null;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = Array.isArray(data?.users) ? data.users : [];
    const match = users.find((u) => normalizeEmail(u?.email) === target);
    if (match) return match;
    if (users.length < 200) break;
  }

  return null;
};

const ensureAuthUser = async ({ supabase, email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error('E2E_EMAIL is required');

  const existing = await findAuthUserByEmail(supabase, normalizedEmail);

  if (!existing?.id) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: String(password || ''),
      email_confirm: true,
      user_metadata: {
        full_name: 'E2E User',
      },
    });

    if (error) throw error;
    if (!data?.user?.id) throw new Error('Failed to create auth user');

    return data.user;
  }

  // Always set the password to match the env var so E2E is deterministic.
  const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
    password: String(password || ''),
    email_confirm: true,
  });

  if (updateError) throw updateError;
  return updated?.user || existing;
};

const ensureProfileRow = async ({ supabase, email, authUserId }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !authUserId) return;

  const nowIso = new Date().toISOString();

  const tables = ['User', 'users'];

  for (const table of tables) {
    try {
      // Try by auth_user_id first.
      const byAuth = await supabase
        .from(table)
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (!byAuth.error && byAuth.data) return;

      // Then try by email.
      const byEmail = await supabase
        .from(table)
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!byEmail.error && byEmail.data) {
        if (String(byEmail.data.auth_user_id || '') !== String(authUserId)) {
          await supabase
            .from(table)
            .update({ auth_user_id: authUserId, updated_at: nowIso, updated_date: nowIso })
            .eq('id', byEmail.data.id);
        }
        return;
      }

      // Insert minimal row.
      const insert = await supabase
        .from(table)
        .insert({
          email: normalizedEmail,
          auth_user_id: authUserId,
          full_name: 'E2E User',
          avatar_url: null,
          created_at: nowIso,
          created_date: nowIso,
          updated_at: nowIso,
          updated_date: nowIso,
        })
        .select()
        .single();

      if (!insert.error) return;

      // If the insert failed due to schema drift (missing columns), retry with a smaller payload.
      const retry = await supabase
        .from(table)
        .insert({
          email: normalizedEmail,
          auth_user_id: authUserId,
        })
        .select()
        .single();

      if (!retry.error) return;

      // If table exists but columns/RLS prevent writes, don't hard-fail: auth user is the critical part.
      return;
    } catch (error) {
      const message = String(error?.message || '').toLowerCase();
      const missingTable =
        String(error?.code || '').toUpperCase() === '42P01' ||
        message.includes('does not exist') ||
        message.includes('could not find the table') ||
        message.includes('schema cache');

      if (missingTable) continue;
      // Non-fatal: profile row best-effort.
      return;
    }
  }
};

const main = async () => {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const email = requireEnv('E2E_EMAIL');
  const password = requireEnv('E2E_PASSWORD');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const user = await ensureAuthUser({ supabase, email, password });
  await ensureProfileRow({ supabase, email, authUserId: user?.id ? String(user.id) : null });

  // Keep stdout terse (useful in CI logs).
  console.log(`[e2e] Ensured auth user: ${normalizeEmail(email)}`);
};

main().catch((err) => {
  console.error('[e2e] ensure-e2e-user failed:', err?.message || String(err));
  process.exit(1);
});
