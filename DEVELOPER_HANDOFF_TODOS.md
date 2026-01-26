# HOTMESS Globe — Developer Handoff TODOs (Hyper-Detailed)

**Date**: 2026-01-06  
**Updated**: 2026-01-17  
**Goal**: Provide an execution-ready backlog for finishing features, wiring, and polish.  
**Sources**: INCOMPLETE_FEATURES.md, ISSUES-TRACKER.md, DEPLOYMENT.md, SECURITY.md, CI_CD_SETUP.md, CODE_QUALITY_RECOMMENDATIONS.md, TEST_SETUP.md.

---

## 0) Read This First (Key Facts + Decisions)

### 0.0 Recent updates (since 2026-01-06)
- Market restoration: creators lane is reachable at `/market/creators` and Shopify remains canonical at `/market`.
- Cart UX: added a unified cart drawer (Shopify + creators tabs) and wired it into the Market layout.
- Marketplace behavior: Shopify-backed items now add to the Shopify cart (and route to Shopify PDP when needed).
- API hardening: added best-effort DB-backed rate limiting + idempotency for Scan check-in, plus extended rate limiting to high-risk endpoints.
- CSP: enforced via `Content-Security-Policy` headers in `vercel.json`.

### 0.1 What’s already working (baseline)
- Vercel serverless API routes exist under `api/`.
- Event Scraper works via:
  - Admin UI → `POST /api/events/scrape`
  - Vercel Cron → `GET /api/events/cron` (configured in `vercel.json`)
  - Diagnostics → `GET /api/events/diag`
- CI/CD workflows exist in `.github/workflows/`:
  - `ci.yml` runs lint/typecheck/build/security and deploys to Vercel on push to `main`.
  - `security.yml` runs dependency + secret scanning.

### 0.2 Architecture (single direction)
This project is **Supabase-only** for auth + data, with **Vercel Serverless Functions** under `/api/*` for privileged operations and third-party integrations.

**Deliverable**: Add a short architecture note to `IMPLEMENTATION_NOTES.md` describing:
- Supabase Auth + RLS model
- Serverless endpoints and what runs client-side vs server-side
- Required env vars for local + Vercel

---

## 1) Environment + Ops Setup (Must-Haves)

### 1.x Quick dev sanity: seed mock nearby profiles (so UI changes are visible)
If the Nearby People panel shows "No one nearby", it usually means there are no users with `last_lat/last_lng` set.

Run this once (requires server env vars `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`):

- `npm run seed:mock-profiles -- --lat 51.5074 --lng -0.1278 --count 16 --spread_m 3500`

Then open Globe → Nearby People. Paid users will show ETAs; free users show distance only.

### 1.1 Create `.env.example` (currently missing)
**Why**: onboarding + CI + production parity.  
**Deliverable**: a root `.env.example` with comments.

**Include (client-side / Vite):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MAPBOX_ACCESS_TOKEN` (if used)
- `VITE_STRIPE_PUBLISHABLE_KEY` (if used)

**Include (server-side only / Vercel runtime):**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (optional, for LLM-based scrape)
- `OPENAI_MODEL` (optional)
- `EVENT_SCRAPER_SOURCES_JSON` (optional if still env-driven)
- `EVENT_SCRAPER_CRON_SECRET` (optional/extra protection)
- Shopify + SoundCloud secrets as required by `api/shopify/*` and `api/soundcloud/*`

**Acceptance**: a new engineer can run `npm i && npm run dev` after copying env example to `.env.local`.

### 1.2 Lock down GitHub branch protections
- Require `CI Pipeline` checks to pass.
- Require at least 1 approval.
- Block force pushes to `main`.

### 1.3 Vercel configuration checklist
- Confirm Vercel project deploys **from `main`**.
- Confirm `vercel.json` is honored (cron + routes).
- Confirm runtime env vars exist and are set for Production.

---

## 2) P0 — Production Safety + Reliability (Ship Blockers)

### P0.1 NPM vulnerabilities are inconsistent in docs
**Problem**: `ISSUES-TRACKER.md` claims vulnerabilities exist; `SECURITY.md` claims 0 remaining.

**Steps**:
1. Run `npm audit` locally.
2. If vulnerabilities exist: fix with `npm audit fix` (and only `--force` if validated), re-run tests/build.
3. Update `ISSUES-TRACKER.md` and/or `SECURITY.md` to match reality.

**Acceptance**: CI `npm audit --audit-level=moderate` passes on main.

### P0.2 Add Sentry error tracking
**Where**: `src/components/error/ErrorBoundary.jsx`, `src/components/error/PageErrorBoundary.jsx`, `src/main.jsx`

**Steps**:
- Create Sentry project, add DSN to Vercel env.
- Install Sentry SDK + vite plugin if needed.
- Wire ErrorBoundary to report exceptions.
- Ensure sourcemaps are uploaded/available for production builds.

**Acceptance**: Forced error in prod shows up in Sentry with usable stack trace.

### P0.3 Add CSP + security headers
**Goal**: reduce XSS risk; support external embeds (Mapbox, SoundCloud, etc.)

**Status**: ✅ Enforced via `vercel.json` response headers

**Steps**:
- Define CSP policy.
- Implement headers at Vercel (headers config) or via middleware.
- Validate no breakage: auth, API calls, embeds.

**Acceptance**: CSP header present, no critical console CSP violations.

### P0.4 Rate limiting on serverless endpoints
**Targets**:
- `api/events/cron.js`, `api/events/scrape.js`, `api/events/diag.js`
- `api/soundcloud/*`, `api/shopify/*`

**Status**: PARTIAL (best-effort DB-backed limiter added and used on multiple endpoints; coverage can expand)

**Acceptance**: basic per-IP limits; friendly 429; no sensitive endpoints without any throttling.

### P0.5 Fix current failing `npm run typecheck` (and keep it green)
**Known**: tooling flagged Tailwind class conflict on `label` using both `block` and `flex`.

**Acceptance**: `npm run typecheck` exits 0.

---

## 3) P1 — Event Scraper: “Working” → “Operational, Auditable, Maintainable”

### P1.1 Add “Scrape Run” persistence + admin UI history
**Why**: Without run history, you can’t answer “did it run?”, “what changed?”, “what failed?”.

**Backend**:
- Add a Supabase table for runs (example fields):
  - `id`, `started_at`, `finished_at`, `mode` (`sources|llm|body`), `cities`, `days_ahead`, `created_count`, `updated_count`, `error_count`, `errors_json`, `dry_run`, `initiator` (`admin|cron`).

**UI**:
- In Admin, show latest N runs.

**Acceptance**:
- Every `/api/events/scrape` and `/api/events/cron` invocation creates a run row.
- Admin UI renders run list and details.

### P1.2 Define dedupe + idempotency rules
**Problem**: multiple sources will duplicate events.

**Steps**:
- Decide canonical unique key:
  - Prefer: `source_url` + normalized `title` + `start_time` + venue name/address.
- Implement deterministic normalization.
- Ensure upsert uses that key.

**Acceptance**: Running the scraper twice yields 0 duplicates.

### P1.3 Moderation workflow for scraped events
**Goal**: scraped events should not instantly publish without review.

**Steps**:
- Add/confirm fields on event rows (Beacon table) e.g. `moderation_status` / `published`.
- Admin queue to approve/reject.

**Acceptance**:
- Public event lists show only approved/published.
- Admin can approve with one click.

### P1.4 Move scraper sources config out of env vars (recommended)
**Problem**: editing JSON in Vercel env is fragile.

**Steps**:
- Create DB table: `event_scraper_sources` with city, url, enabled, notes.
- Admin UI CRUD for sources.
- Update backend to read from DB.

**Acceptance**: Adding a new source doesn’t require redeploy.

---

## 4) P2 — SoundCloud: Complete OAuth + Upload Pipeline (Currently flagged as placeholder)

**Primary docs**: `INCOMPLETE_FEATURES.md` + `docs/SOUNDCLOUD_API_FIELD_REQUIREMENTS.md`.

### P2.1 Confirm requirements + credentials
- Validate SoundCloud account tier/API access.
- Register OAuth app and confirm redirect URL(s).

**Acceptance**: creds exist in Vercel env (server-only), and redirect URL matches prod domain.

### P2.2 OAuth end-to-end
**Where**: `api/soundcloud/*`

**Steps**:
- Implement authorization code exchange.
- Store refresh + access tokens server-side.
- Implement refresh flow.
- Implement disconnect/revoke.

**Acceptance**:
- Connect → callback → status shows connected.
- Token refresh works (simulate expiry).

### P2.3 Secure token storage
**Steps**:
- Supabase table for oauth tokens with strict RLS.
- Service role writes; user can view “connected” status but never read raw tokens.

**Acceptance**: tokens never reach client; only server routes touch them.

### P2.4 Upload pipeline
**Where**: `api/soundcloud/upload.js` + UI `src/components/admin/RecordManager.tsx`

**Steps**:
- Validate file size/type.
- Upload to SoundCloud.
- Sync track metadata.
- Provide clear errors.

**Acceptance**: real audio upload succeeds and produces playable track link.

---

## 5) P3 — QR Scanner + Ticket Validation (Currently “Coming Soon”)

### P3.1 Implement scanner UI
**Where**: `src/pages/Scan.jsx` (and/or a scanner component)

**Steps**:
- Choose library (`html5-qrcode` or `@zxing/library`).
- Handle permissions (iOS Safari quirks).
- Provide “manual entry” fallback.

**Acceptance**: scanning works on iPhone + Android.

### P3.2 Define QR payload formats + security
**Steps**:
- Define payload schema(s) and versioning.
- Add signature/HMAC so QR can’t be forged.

**Acceptance**: backend rejects forged/modified payloads.

### P3.3 Build validation + check-in endpoint(s)
**Steps**:
- Create server route to validate ticket.
- Record check-in with dedupe protection.

**Acceptance**: duplicate scan returns deterministic “already checked in”.

---

## 6) P4 — Replace Mock/Placeholder Production Data

### P4.1 Globe overlay mock stats → real stats
**Steps**:
- Identify mock generator usage.
- Add endpoint returning real stats from DB.
- Cache results (30–60s) to control load.

**Acceptance**: no “random” data in production overlay.

### P4.2 Connect page distances → real geolocation
**Where**: `src/pages/Connect.jsx`

**Steps**:
- Request geolocation permission.
- Compute Haversine distances.
- Sort/filter by distance.

**Acceptance**: distances are stable and match real-world.

### P4.3 Query builder filters actually filter
**Steps**:
- Implement backend-supported filtering or client filtering with correct predicates.

**Acceptance**: applying filters changes result set predictably.

---

## 7) P5 — Marketplace / Payments / Orders: Finish Wiring + Polish

### P5.0 Cart UX unification + creators discoverability
**Status**: DONE (unified cart drawer; creators entry point from shop)

**Notes**:
- Single cart drawer with tabs for Shopify and creators carts.
- Market layout uses unified cart trigger across Market routes.
- Marketplace routes Shopify-backed items into Shopify cart/checkout flow.

### P5.1 Define cart ownership model
**Problem**: mixing email-based and auth_user_id carts creates confusion.

**Acceptance**: one consistent cart model with migration plan for existing carts.

### P5.2 Stripe end-to-end correctness
**Steps**:
- Verify webhooks.
- Use idempotency keys.
- Ensure order status updates are server-authoritative.

**Acceptance**: payment success reliably updates order; failures recover.

### P5.3 Mobile UX pass
**Acceptance**: no clipped CTAs; checkout usable on small screens.

---

## 8) P6 — Shopify: Operational Sync + Admin UX

### P6.1 Validate import/sync in production
**Where**: `api/shopify/import.js`, `api/shopify/sync.js`

**Acceptance**: import creates correct products/variants; sync updates inventory.

### P6.2 Add Shopify webhooks
**Acceptance**: signed webhooks update inventory and orders.

---

## 9) P7 — Messaging + Notifications: Reliability + RLS

### P7.1 Define DB model + RLS
**Acceptance**: only participants can read/write; moderation flows safe.

### P7.2 Unread counts/read receipts correctness
**Acceptance**: consistent across devices; no drift.

---

## 10) P8 — Membership: Make “premium” authoritative

### P8.1 Single source of truth
**Acceptance**: DB + payment provider decide membership; UI consumes that.

---

## 11) P9 — Code Quality + Test Coverage (Make CI meaningful)

### P9.1 Complete console logging migration
**Acceptance**: no `console.log` in production paths; structured logger used.

### P9.2 Add `useCurrentUser` hook (or supabase equivalent)
**Acceptance**: remove duplicated “fetch current user” code across pages.

### P9.3 Tests
**Acceptance**:
- Add “golden path” tests: auth, marketplace add-to-cart, checkout, admin scrape request.
- Make tests blocking in CI once stable.

---

## 12) Concrete “Next 10 Tickets” (Recommended Execution Order)

1. Create `.env.example` + update README setup steps.
2. Fix `npm run typecheck` to green and keep it green.
3. Sentry integration + verify prod reporting.
4. CSP + basic security headers.
5. Rate limiting for `/api/*`.
6. Event scraper: run history table + admin UI listing.
7. Event scraper: dedupe key + upsert rules.
8. SoundCloud: OAuth connect/status/disconnect end-to-end.
9. QR scanner: working camera scan + validation endpoint.
10. Marketplace: finalize cart ownership model + migrate.

---

## Appendix A — Quick Commands (Dev)
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm test` / `npm run test:run`

## Appendix B — Where To Look
- Event scraper API: `api/events/*`
- Admin UI: `src/pages/AdminDashboard.jsx` and `src/components/admin/*`
- Shopify API: `api/shopify/*`
- SoundCloud API: `api/soundcloud/*`
- CI: `.github/workflows/*`
