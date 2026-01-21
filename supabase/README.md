# Supabase setup (hotmess-globe)

## Quick start (local dev)

1) Install deps

`npm install`

2) Set env

- Copy `.env.example` → `.env.local`
- Fill in at least:
	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_ANON_KEY`

3) Start local Supabase

From repo root:

`npx supabase start`

Then apply migrations + seed (fresh local DB):

`npx supabase db reset`

4) Start the app

`npm run dev`

The app runs at `http://localhost:5173`.

## Password reset links (important)

Supabase password reset/recovery links only work if the redirect URL matches where your app is running.

- Local app URL: `http://localhost:5173`
- Auth reset UI route: `/auth?mode=reset`

Hosted Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `http://localhost:5173` (local) or your prod URL (Vercel)
- **Redirect URLs**: include `http://localhost:5173/auth` and your prod `https://<domain>/auth`

Note: this repo’s local Supabase config is in `supabase/config.toml`.

## RLS policies (required for the app to fully work)
This repo expects to read/write data from Supabase tables. If RLS is enabled without policies, the app will sign in but profile CRUD (and most entity CRUD) will fail.

1) Open Supabase Dashboard → SQL Editor
2) Paste and run: `supabase/policies.sql`

## Migrations

Schema migrations live in `supabase/migrations/`.

- Local: `npx supabase db reset`
- Hosted: either run migrations via `npx supabase link` + `npx supabase db push`, or paste/run SQL in the Supabase Dashboard SQL editor.

### Notes
- The included policies assume a `public."User"` table with an `email` column.
- If you use `user_id` (UUID) instead, prefer policies based on `auth.uid()`.
