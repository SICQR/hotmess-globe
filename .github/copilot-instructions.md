# Copilot instructions (hotmess-globe)

## Big picture
- Frontend: React 18 + Vite 6 in `src/`, Tailwind + shadcn/ui components.
- Backend: Supabase is the source of truth for auth + CRUD.
- Migration state: legacy code still calls `base44.*`, but `src/api/base44Client.js` is now a Supabase-backed compatibility layer.

## Dev workflow
- Install: `npm install`
- Run: `npm run dev`
- Build/preview: `npm run build` / `npm run preview`
- Lint: `npm run lint` / `npm run lint:fix`
- Typecheck: `npm run typecheck` (uses `jsconfig.json`; it is intentionally scoped)

## Environment (Supabase)
- Required (see `.env.example`):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Optional:
  - `VITE_SUPABASE_STORAGE_BUCKET` (used by `base44.integrations.Core.UploadFile` shim)

## Routing & navigation
- Routes are generated from `src/pages.config.js` (NOT file-based).
- The URL path is the page key: `/${PageKey}`.
- Use `createPageUrl()` from `src/utils/index.ts` for internal links.
- Auth entry point: `Login` page in `src/pages/Login.jsx`.

## Data access patterns (during migration)
- Preferred for new code: import `supabase` from `src/api/supabaseClient.js`.
- Legacy-compatible (keep working while refactoring):
  - `base44.auth.*` maps to Supabase Auth (`me()` returns `{ email, ...user_metadata }`).
  - `base44.entities.<Table>.*` maps to `supabase.from('<Table>')`:
    - `.filter(where, sort?, limit?)` supports simple equality filters + sort like `'-created_date'`.
  - `base44.functions.<name>(body)` maps to `supabase.functions.invoke('<name>')`.
  - `base44.integrations.Core.UploadFile({ file })` uploads to Supabase Storage and returns `{ file_url }`.

## Project conventions / sharp edges
- Path alias: `@/` maps to `src/` (see `jsconfig.json`).
- Auth + onboarding redirects are enforced in `src/Layout.jsx` (consent/onboarding/profile completeness).
- Lint/typecheck are scoped (ESLint ignores `src/lib/**` + `src/components/ui/**`; `jsconfig.json` excludes `src/api/**`).
- Legacy Base44 Deno handlers still exist in `functions/` but are considered migration targets (Supabase Edge Functions/RPC should replace them).
