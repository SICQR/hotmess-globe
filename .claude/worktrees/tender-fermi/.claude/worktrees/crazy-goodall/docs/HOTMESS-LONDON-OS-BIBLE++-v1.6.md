# HOTMESS LONDON OS — BIBLE++ V1.6 (Jan 19, 2026)

This document extends (does not replace) the canonical V1.5 spec in docs/HOTMESS-LONDON-OS-BIBLE-v1.5.md.

V1.6 is a “ship-ready” pass:
- Supabase-first (auth, data, realtime, rate limits, caching)
- Vercel-safe (no exposed admin/demo routes, cron/auth hardened, CSP correct)
- Grindr-like grid polish (one-photo tiles, multi-photo profile detail, consistent cards)
- Reliability defaults (best-effort directions, no request storms)

---

## 0) Non-negotiables (carry-forward)

- 18+ gate before any social surface.
- Consent-first: ask → confirm yes → respect no.
- Safety actions reachable within 1 tap from SOCIAL surfaces.
- Calendar integration is internal only.
- Music integration is SoundCloud URN-first and rate-limit safe.

---

## 1) Locked navigation (V1.6)

Primary tabs remain locked from V1.5:

**HOME • PULSE • EVENTS • MARKET • SOCIAL • MUSIC • MORE**

---

## 2) V1.6 deltas (what changed vs V1.5)

### Product/UX

- Profile tiles show 1 primary photo; profile detail reveals up to 5 total photos.
- Card renderer is unified across grids (Globe/Connect/Social) and can use the holographic card style.
- Viewer-first ordering: “my profile is first” in grid ordering.
- Directions stay in-app and degrade gracefully when Google upstream fails.

### Reliability/performance

- Travel-time requests are bucketed and deduped client-side to avoid 429 storms.
- Directions API returns best-effort fallbacks so the UI never dead-ends.

### Production hardening

- Cron endpoints follow a consistent policy (Vercel cron header OR secret).
- Privacy/cost endpoints require Supabase bearer auth in production.
- CSP permits Supabase realtime websockets (`wss://*.supabase.co`).
- Auto-generated legacy `/${PageName}` routes are restricted in production (allowlist only).

---

## 3) Supabase-first rules (implementation contract)

### 3.1 Auth

- Client uses Supabase Auth sessions.
- Any authenticated `/api/*` call from the client sends: `Authorization: Bearer <access_token>`.
- Server verifies bearer tokens with Supabase anon client (`auth.getUser(token)`).

### 3.2 Data access

- Serverless functions may use the service role key for:
  - Admin-only jobs (cron cleanup, event scraping, outbox dispatch)
  - DB-backed caching + rate limiting
- **Never** expose service role to the client.

### 3.3 RLS expectations

- Public profile reads should be protected by RLS and/or server-side authorization.
- If service role is used to bypass RLS for convenience, the endpoint must still require a valid bearer token in production.

---

## 4) Canonical routes (V1.6)

V1.6 route map is the same as V1.5 unless explicitly noted.

### 4.1 Primary tabs

- HOME: `/`
- PULSE: `/pulse`
- EVENTS: `/events`, `/events/:id`
- MARKET: `/market`, `/market/:collection`, `/market/p/:handle`
- SOCIAL: `/social`, `/social/discover`, `/social/inbox`, `/social/u/:id`, `/social/t/:threadId`
- MUSIC: `/music`, `/music/live`, `/music/shows`, `/music/schedule`, `/music/releases`, `/music/releases/:slug`
- MORE: `/more`

### 4.2 Utilities + tools

- Safety stack: `/safety/*`
- Calendar stack: `/calendar/*`
- Scan stack: `/scan/*`
- Community stack: `/community/*`
- Leaderboard stack: `/leaderboard/*`

---

## 5) Serverless API contract (V1.6)

### 5.1 Required conventions

- All serverless handlers live in `api/*`.
- In local dev, new endpoints must be added to the Vite middleware router in `vite.config.js` if you want them to work under `npm run dev`.
- Authenticated endpoints require bearer token.

### 5.2 High-value endpoints (current)

- Routing:
  - `POST /api/routing/directions` (best-effort; may return approximate route)
  - `POST /api/routing/etas`
  - `POST /api/travel-time` (production: bearer required)
- Social discovery:
  - `GET /api/nearby` (bearer required)
  - `GET /api/profiles` (production: bearer required)
  - `GET /api/profile` (production: bearer required)
- Presence:
  - `POST /api/presence/update` (bearer required)
- Ops:
  - `GET /api/health` (public minimal; details require cron header or secret)

---

## 6) Cron + ops runbook (Vercel)

Vercel scheduled crons hit endpoints with `x-vercel-cron: 1`.

### 6.1 Cron auth policy

- Scheduled runs: allow Vercel Cron header.
- Manual runs: allow secret (header or query).

Recommended secrets (set in Vercel env):
- `OUTBOX_CRON_SECRET`
- `RATE_LIMIT_CLEANUP_SECRET`
- `EVENT_SCRAPER_CRON_SECRET`

### 6.2 Scheduled endpoints

- `/api/events/cron` (event ingestion)
- `/api/notifications/dispatch` (outbox delivery)
- `/api/admin/cleanup/rate-limits` (routing rate-limit cleanup)

---

## 7) Production security baseline

### 7.1 CSP/headers

- CSP is configured in `vercel.json`.
- Must include:
  - `connect-src` includes `https://*.supabase.co` and `wss://*.supabase.co`

### 7.2 Route exposure

- Do not expose demo/admin pages via public routes in production.
- Back-compat `/${PageName}` routes are allowlisted only.

### 7.3 Public endpoints

- Avoid public endpoints that leak:
  - secret presence metadata
  - PII (emails, exact locations)
  - Google API quota

---

## 8) Dev parity (Vite)

### 8.1 Local `/api/*` behavior

- Local dev `/api/*` calls are served by middleware in `vite.config.js`.
- When adding a new endpoint in `api/`, add a route case or you’ll see a local 404 even if Vercel works.

### 8.2 Env handling

- `.env.local` is reloaded per request.
- Client-exposed env vars must start with `VITE_`.
- Server-only env vars must NOT be `VITE_`.

---

## 9) Release checklist (V1.6)

### Must-pass before deploy

- `npm run lint`
- `npm run typecheck`
- `npm run test:ci`
- `npm run build`

### Vercel env vars set (minimum)

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (required for cron/admin features)

Recommended:
- `GOOGLE_MAPS_API_KEY`
- `OUTBOX_CRON_SECRET`
- `RATE_LIMIT_CLEANUP_SECRET`
- `EVENT_SCRAPER_CRON_SECRET`
- `HEALTH_SECRET`

---

## 10) Nice-to-haves (post-ship)

- E2E suite covering:
  - Age gate
  - Social first message consent
  - RSVP + calendar add
  - Market checkout start
- Analytics events for primary CTAs across the shell.
- Demo mode with seeded data + MSW for predictable QA.
- Error tracking (Sentry) for API failures + routing upstream degradation.
