# Supabase setup (hotmess-globe)

## Required env
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

See `.env.example`.

## RLS policies (required for the app to fully work)
This repo expects to read/write data from Supabase tables. If RLS is enabled without policies, the app will sign in but profile CRUD (and most entity CRUD) will fail.

1) Open Supabase Dashboard → SQL Editor
2) Paste and run: `supabase/policies.sql`

### Notes
- The included policies assume a `public."User"` table with an `email` column.
- If you use `user_id` (UUID) instead, prefer policies based on `auth.uid()`.
