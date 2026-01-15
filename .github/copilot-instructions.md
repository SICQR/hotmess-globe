# Copilot instructions (hotmess-globe)

## Big picture
- Vite + React SPA. Canonical navigation lives in [docs/HOTMESS-LONDON-OS-BIBLE-v1.5.md](../docs/HOTMESS-LONDON-OS-BIBLE-v1.5.md).
- Routing is React Router in [src/App.jsx](../src/App.jsx): “Bible” routes (e.g. `/events`, `/market`) plus backward-compatible `/${PageName}` routes generated from `Pages`.
- Pages are registered in [src/pages.config.js](../src/pages.config.js). Add a page by importing the component and adding it to `PAGES`.
- Backend is Vercel Serverless Functions in `api/` (ESM `export default async function handler(req, res)`), with SPA rewrites in [vercel.json](../vercel.json).
- `functions/` contains deprecated Base44 edge-function stubs; don’t add new logic there—use `api/*` instead.

## Dev workflows
- Dev server: `npm run dev` (Vite on :5173). Preview: `npm run preview`. Seed data: `npm run seed:mock-profiles`.
- Tests: `npm test` / `npm run test:run` / `npm run test:ui` / `npm run test:coverage` (Vitest).
- Lint: `npm run lint` (quiet). Typecheck: `npm run typecheck` (TypeScript checks JS via `jsconfig.json`).
- Local `/api/*` in dev is implemented by the custom Vite middleware in [vite.config.js](../vite.config.js) (`localApiRoutes()`).
  - If you add a new `api/...` endpoint and need it to work in `npm run dev`, also add a route case there (or you’ll get a 404 locally while it still works on Vercel).
  - The middleware hydrates `req.query` (Connect doesn’t by default) and reloads env per request so `.env.local` edits apply without restart.

## Env + secrets
- Never commit secrets (`.env.local` is gitignored). Client-exposed env vars must be prefixed `VITE_`; server-only env vars (used by `api/*`) must NOT be `VITE_`.
- Server routes commonly require `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and (for routing/ETAs) `GOOGLE_MAPS_API_KEY`.

## Supabase + auth conventions
- Client Supabase + the “Base44 compatibility wrapper” live in [src/components/utils/supabaseClient.jsx](../src/components/utils/supabaseClient.jsx).
  - Many components still import `base44` from there; prefer extending that wrapper rather than introducing a new SDK.
  - Many newer modules import `base44` from [src/api/base44Client.js](../src/api/base44Client.js) (it re-exports the same wrapper).
  - Table names are legacy/dual-cased in places (e.g. `User` vs `users`, `Beacon` vs `beacons`). Follow the existing `*_TABLES` + `runWithTableFallback()` pattern.
- Prefer `base44.entities.*` helpers over raw `supabase.from(...)` when the table is already represented there (it also carries Base44-style conventions like `created_by`).
- Frontend auth flow is centralized in [src/lib/AuthContext.jsx](../src/lib/AuthContext.jsx) using `base44.auth.isAuthenticated()` and `base44.auth.me()`.
- When calling authenticated `/api/*` routes from the client, send the Supabase access token as a bearer token (example: [src/api/presence.js](../src/api/presence.js)).
  - Many APIs use a small helper that reads the Supabase session and attaches `Authorization: Bearer ...` (see [src/api/connectProximity.js](../src/api/connectProximity.js)).

## Serverless handler patterns (`api/*`)
- Prefer shared helpers:
  - `json(res, status, body)`, `getEnv()`, `getBearerToken()`, `readJsonBody()` from [api/shopify/_utils.js](../api/shopify/_utils.js)
  - Supabase server clients + auth helpers from [api/routing/_utils.js](../api/routing/_utils.js) (`getSupabaseServerClients()`, `getAuthedUser()`)
- Server-side Supabase requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (never expose the service role key to the client).
- Cron: Vercel hits `/api/events/cron` per [vercel.json](../vercel.json).

## Logging
- In frontend code, prefer the structured logger in [src/utils/logger.js](../src/utils/logger.js) (it redacts sensitive keys and is quiet in prod).
- Avoid adding noisy `console.*` in client code; if you must log, use `logger.{debug|info|warn|error}`.

## Imports + UI
- Path alias `@` maps to `src/` (configured in [vite.config.js](../vite.config.js)).
- UI is Tailwind + shadcn/Radix; reuse existing components in `src/components/ui/*` rather than introducing new styling systems.
