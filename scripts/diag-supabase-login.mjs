import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

const missing = {
  hasUrl: !!url,
  hasAnon: !!anonKey,
  hasEmail: !!email,
  hasPassword: !!password,
};

if (!missing.hasUrl || !missing.hasAnon || !missing.hasEmail || !missing.hasPassword) {
  console.log(JSON.stringify({ ok: false, reason: 'missing_env', ...missing }, null, 2));
  process.exit(0);
}

const supabase = createClient(url, anonKey);

const { data, error } = await supabase.auth.signInWithPassword({ email, password });

if (error) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        status: error.status ?? null,
        name: error.name ?? null,
        message: error.message ?? null,
      },
      null,
      2
    )
  );
  process.exit(0);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      user: data?.user ? { id: data.user.id } : null,
      session: data?.session
        ? { has_access_token: !!data.session.access_token, expires_at: data.session.expires_at }
        : null,
    },
    null,
    2
  )
);
