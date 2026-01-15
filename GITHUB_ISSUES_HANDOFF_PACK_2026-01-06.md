# GitHub Issues Pack — HOTMESS Globe (Handoff)

**Date**: 2026-01-06  
**How to use**: For each issue below: copy **Title**, create issue, paste **Body**, apply **Labels**.

---

## P0 — Production Readiness / Safety

### ISSUE-P0-001: Create `.env.example` + document required environment variables

**Labels**: `documentation`, `devops`, `high-priority`

**Body**:
```markdown
## Problem
Project lacks a root `.env.example`, making onboarding and ops error-prone.

## Goals
- Provide a canonical list of required environment variables.
- Clearly separate **client-side (Vite `VITE_*`)** vs **server-side runtime secrets**.

## Deliverables
- [ ] Add `.env.example` at repo root.
- [ ] Add short section in `README.md` describing local setup using `.env.local`.

## Variables to include (no real secrets)
### Client-side (Vite)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MAPBOX_ACCESS_TOKEN` (if used)
- `VITE_STRIPE_PUBLISHABLE_KEY` (if used)

### Server-side only (Vercel runtime)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (optional, scraper LLM mode)
- `OPENAI_MODEL` (optional)
- `EVENT_SCRAPER_SOURCES_JSON` (optional, if still env-driven)
- `EVENT_SCRAPER_CRON_SECRET` (optional)
- Shopify secrets required by `api/shopify/*`
- SoundCloud secrets required by `api/soundcloud/*`

## Acceptance Criteria
- A new dev can run:
  - `npm i`
  - copy `.env.example` → `.env.local`
  - set values
  - `npm run dev`
- No secrets are committed.

## References
- Deployment guide: `DEPLOYMENT.md`
- CI/CD guide: `CI_CD_SETUP.md`
```

---

### ISSUE-P0-002: Fix `npm run typecheck` failures and keep typecheck green

**Labels**: `bug`, `code-quality`, `high-priority`

**Body**:
```markdown
## Problem
Typecheck is intermittently failing (exit code 2 reported). Tooling also reports Tailwind class conflicts in labels.

## Scope
- Fix all current typecheck issues.
- Add guardrails to avoid regressions.

## Known error signal
- Tailwind class list includes both `block` and `flex` (conflicting display utilities) in `src/pages/CreateBeacon.jsx`.

## Steps
- [ ] Run `npm run typecheck`.
- [ ] Fix reported issues one-by-one.
- [ ] Re-run `npm run typecheck` until exit code 0.
- [ ] Run `npm run build` to ensure production build still passes.

## Acceptance Criteria
- `npm run typecheck` passes locally and in CI.
- `npm run build` passes.
```

---

### ISSUE-P0-003: Add Sentry error tracking (frontend) with production sourcemaps

**Labels**: `feature`, `observability`, `high-priority`

**Body**:
```markdown
## Problem
No production-grade error tracking; failures are hard to debug.

## Scope
- Add Sentry to frontend.

## Implementation Notes
- Integrate at app entry + error boundaries.
- Configure production sourcemaps (Vite + Sentry).

## Files to inspect
- `src/components/error/ErrorBoundary.jsx`
- `src/components/error/PageErrorBoundary.jsx`
- `src/main.jsx`

## Checklist
- [ ] Create Sentry project
- [ ] Add `SENTRY_DSN` to Vercel env
- [ ] Install packages: `@sentry/react` (+ optional `@sentry/vite-plugin`)
- [ ] Initialize Sentry in `src/main.jsx`
- [ ] Capture exceptions from error boundaries
- [ ] Verify event appears in Sentry from production

## Acceptance Criteria
- A forced error in production is captured by Sentry.
- Stack traces are readable (sourcemaps configured).
- No PII or secrets are included in payloads.
```

---

### ISSUE-P0-004: Add CSP + security headers compatible with embeds (Mapbox/SoundCloud)

**Labels**: `security`, `devops`, `high-priority`

**Body**:
```markdown
## Problem
No Content Security Policy and weak/default headers increase XSS risk.

## Scope
- Add CSP and baseline headers.
- Ensure external services still work (Mapbox, SoundCloud, Supabase, etc.).

## Checklist
- [ ] Draft CSP policy
- [ ] Implement headers via Vercel config (or middleware)
- [ ] Validate:
  - auth flows
  - API calls
  - embeds (SoundCloud)
  - maps (Mapbox)
- [ ] Add report-only mode first (optional) then enforce.

## Acceptance Criteria
- CSP header present in production responses.
- No critical app breakage.
- Document CSP in `SECURITY.md`.
```

---

### ISSUE-P0-005: Add rate limiting to sensitive `/api/*` routes

**Labels**: `security`, `backend`, `high-priority`

**Body**:
```markdown
## Problem
Sensitive serverless endpoints can be abused without throttling.

## Targets
- `api/events/cron.js`
- `api/events/scrape.js`
- `api/events/diag.js`
- `api/soundcloud/*`
- `api/shopify/*`

## Checklist
- [ ] Choose approach (in-handler token bucket vs Vercel edge middleware)
- [ ] Implement per-IP limits
- [ ] Return HTTP 429 with consistent body
- [ ] Ensure admin-only endpoints still function

## Acceptance Criteria
- Requests over threshold return 429.
- Normal use unaffected.
- No secrets exposed in error responses.
```

---

## P1 — Architecture Direction

### ISSUE-P1-001: Document Supabase-only architecture + migration checklist

**Labels**: `architecture`, `documentation`, `high-priority`

**Body**:
```markdown
## Problem
Architecture is not described as a single, consistent stack, making onboarding and future work error-prone.

## Goal
Document and enforce a **Supabase-only** architecture:
- Supabase Auth + RLS for data access
- Vercel Serverless Functions under `/api/*` for privileged actions and third-party integrations

## Deliverables
- [ ] Add a 1-page architecture note to `IMPLEMENTATION_NOTES.md` covering:
  - auth model (session/token flow)
  - RLS expectations
  - which operations must be server-side
  - env vars required for local + Vercel
- [ ] Add a migration checklist for any remaining legacy SDK usage in the codebase (identify and remove).

## Acceptance Criteria
- Architecture note exists and matches current deployment.
- Follow-up tickets exist for removing any remaining legacy SDK usage.
```

---

## P2 — Event Scraper: Operationalization

### ISSUE-P2-001: Add scraper run history table + admin UI (auditable runs)

**Labels**: `feature`, `backend`, `admin`, `high-priority`

**Body**:
```markdown
## Problem
Scraper runs are not persisted, making it hard to confirm cron success/failures.

## Backend
Create a Supabase table to store runs, e.g. `event_scraper_runs`:
- `id` (uuid)
- `started_at`, `finished_at`
- `initiator` (`admin|cron`)
- `mode` (`sources|llm|body`)
- `cities` (text[] or json)
- `days_ahead` (int)
- `created_count`, `updated_count`, `error_count`
- `errors_json` (jsonb)
- `dry_run` (boolean)

Update:
- `api/events/scrape.js`
- `api/events/cron.js`

to write run rows.

## UI
Update Admin to show last N runs:
- `src/pages/AdminDashboard.jsx` (events tab)
- `src/components/admin/EventScraperControl.jsx`

## Acceptance Criteria
- Every manual scrape and cron invocation creates a run record.
- Admin can see runs and open details.
- Errors are visible without exposing secrets.
```

---

### ISSUE-P2-002: Define dedupe key + idempotent upserts for scraped events

**Labels**: `bug`, `backend`, `high-priority`

**Body**:
```markdown
## Problem
Multiple sources / repeated runs can create duplicates.

## Scope
- Decide and implement a canonical dedupe key.

## Suggested approach
Use a normalized key from:
- `source_url` (or source domain)
- normalized `title`
- normalized `venue`
- `start_time`

## Files
- `api/events/_scrape.js` (normalization helpers)
- `api/events/scrape.js` and `api/events/cron.js` (upsert)

## Acceptance Criteria
- Running scraper twice does not create duplicates.
- Upserts update existing rows deterministically.
```

---

### ISSUE-P2-003: Add moderation workflow for scraped events (pending → approved)

**Labels**: `feature`, `admin`, `high-priority`

**Body**:
```markdown
## Problem
Scraped events should not auto-publish without review.

## Scope
- Add moderation fields and enforce them.

## Steps
- [ ] Confirm event storage table + fields (likely Beacon table).
- [ ] Add `moderation_status` / `published` flag.
- [ ] Update public event lists to only show approved/published.
- [ ] Add Admin UI queue to approve/reject.

## Acceptance Criteria
- Newly scraped events are "pending".
- Only approved events appear publicly.
- Admin can approve/reject and see who/when.
```

---

### ISSUE-P2-004: Move scraper sources config from env → DB-managed sources

**Labels**: `feature`, `admin`, `backend`, `medium-priority`

**Body**:
```markdown
## Problem
Editing JSON in Vercel env (`EVENT_SCRAPER_SOURCES_JSON`) is brittle.

## Scope
- Store sources in DB.
- Provide admin UI to manage sources.

## Steps
- [ ] Create table `event_scraper_sources` (city, url, enabled, notes, created_at).
- [ ] Update scraper to read enabled sources from DB.
- [ ] Admin CRUD UI to add/remove sources.

## Acceptance Criteria
- Adding a new source does not require redeploy.
- Scraper uses DB config by default.
```

---

## P3 — SoundCloud Integration (Finish)

### ISSUE-P3-001: Complete SoundCloud OAuth end-to-end (connect/callback/status/disconnect)

**Labels**: `feature`, `integration`, `high-priority`

**Body**:
```markdown
## Problem
SoundCloud integration was previously flagged as incomplete/placeholder; needs full OAuth.

## Existing assets
- Server routes exist under `api/soundcloud/*`.
- Requirements doc: `docs/SOUNDCLOUD_API_FIELD_REQUIREMENTS.md`.

## Scope
- Implement OAuth authorization code flow.
- Store tokens server-side.
- Implement token refresh.
- Implement disconnect/revoke.

## Acceptance Criteria
- User can connect SoundCloud account.
- Status endpoint shows connected/disconnected.
- Token refresh works.
- Disconnect fully removes tokens.
- Tokens never reach client.
```

---

### ISSUE-P3-002: Secure token storage for SoundCloud OAuth (Supabase table + RLS)

**Labels**: `security`, `backend`, `high-priority`

**Body**:
```markdown
## Problem
OAuth tokens must be stored securely and not exposed to client.

## Scope
- Create Supabase table for oauth tokens.
- Enforce RLS so raw tokens are not readable.

## Acceptance Criteria
- Only server/service role can read raw tokens.
- Client can only see "connected" status.
- Clear revocation path.
```

---

### ISSUE-P3-003: Implement real SoundCloud upload pipeline + wire RecordManager UI

**Labels**: `feature`, `integration`, `admin`, `high-priority`

**Body**:
```markdown
## Problem
Uploads must work reliably with validation, errors, and progress.

## Scope
- Implement upload in `api/soundcloud/upload.js`.
- Wire UI in `src/components/admin/RecordManager.tsx`.

## Checklist
- [ ] Validate file type/size
- [ ] Upload to SoundCloud
- [ ] Persist metadata (track id/url)
- [ ] Show progress + clear failures

## Acceptance Criteria
- Real uploads work in production.
- UI shows connected status and upload result.
```

---

## P4 — QR Scanner + Ticket Validation

### ISSUE-P4-001: Implement working QR scanner UI (mobile camera)

**Labels**: `feature`, `mobile`, `high-priority`

**Body**:
```markdown
## Problem
Scan screen shows placeholder "Coming Soon".

## Scope
- Implement QR scanning with camera permissions.

## Where
- `src/pages/Scan.jsx`

## Checklist
- [ ] Choose library: `html5-qrcode` or `@zxing/library`
- [ ] Handle iOS Safari permissions and fallback flows
- [ ] Provide manual entry fallback

## Acceptance Criteria
- Works on iOS Safari + Android Chrome.
- Clear success/error UI.
```

---

### ISSUE-P4-002: Define QR payload formats + add signature verification

**Labels**: `security`, `backend`, `high-priority`

**Body**:
```markdown
## Problem
Tickets/beacons must not be forgeable.

## Scope
- Define versioned QR payload schema.
- Add HMAC/signature verification on server.

## Acceptance Criteria
- Modified payloads are rejected.
- Payload format is documented.
```

---

### ISSUE-P4-003: Build ticket validation + check-in endpoints with dedupe

**Labels**: `feature`, `backend`, `high-priority`

**Body**:
```markdown
## Problem
Need server-verified check-ins and duplicate scan prevention.

## Scope
- Add server endpoint(s) for validation/check-in.
- Add DB records for check-ins.

## Acceptance Criteria
- First scan records check-in.
- Second scan returns "already checked in".
- Audit trail exists.
```

---

## P5 — Mock Data Replacement

### ISSUE-P5-001: Replace globe overlay mock stats with real stats endpoint + caching

**Labels**: `feature`, `backend`, `medium-priority`

**Body**:
```markdown
## Problem
City overlay uses random/mock data.

## Scope
- Create real stats endpoint.
- Cache results.

## Acceptance Criteria
- No random data in production.
- Stats refresh on interval.
```

---

### ISSUE-P5-002: Implement real distance calculations on Connect page

**Labels**: `feature`, `mobile`, `medium-priority`

**Body**:
```markdown
## Problem
Connect uses mock distance values.

## Scope
- Use geolocation + Haversine.
- Sort/filter by distance.

## Where
- `src/pages/Connect.jsx`

## Acceptance Criteria
- Distance values are stable and correct.
```

---

## P6 — Marketplace / Payments / Orders

### ISSUE-P6-001: Define and enforce cart ownership model (auth_user_id vs email vs anonymous)

**Labels**: `architecture`, `backend`, `high-priority`

**Body**:
```markdown
## Problem
Mixed cart ownership models cause duplication and edge cases.

## Scope
- Decide canonical cart owner identity.
- Migrate or reconcile existing data.

## Acceptance Criteria
- One consistent cart model.
- No double carts for same user.
```

---

### ISSUE-P6-002: Stripe payment verification end-to-end (webhooks + idempotency)

**Labels**: `feature`, `payments`, `high-priority`

**Body**:
```markdown
## Problem
Payments must be server-authoritative.

## Scope
- Webhook verification.
- Idempotency keys.
- Correct order status transitions.

## Acceptance Criteria
- Successful payment reliably updates order.
- Retried webhook does not duplicate side effects.
```

---

## P7 — Shopify

### ISSUE-P7-001: Validate Shopify import/sync in production and surface failures in admin

**Labels**: `integration`, `backend`, `admin`, `medium-priority`

**Body**:
```markdown
## Problem
Import/sync must be reliable and observable.

## Where
- `api/shopify/import.js`
- `api/shopify/sync.js`

## Acceptance Criteria
- Import creates correct products/variants.
- Sync updates inventory.
- Errors are logged and visible in admin.
```

---

### ISSUE-P7-002: Add Shopify webhooks with signature verification

**Labels**: `integration`, `security`, `backend`, `medium-priority`

**Body**:
```markdown
## Problem
Polling-only sync is fragile; webhooks needed.

## Scope
- Implement webhook endpoints.
- Verify Shopify HMAC signatures.
- Handle retries.

## Acceptance Criteria
- Verified webhooks update DB.
- Invalid signatures rejected.
```

---

## P8 — Messaging/Notifications

### ISSUE-P8-001: Define messaging schema + RLS rules so only participants can read threads

**Labels**: `security`, `backend`, `medium-priority`

**Body**:
```markdown
## Problem
Messaging needs strong RLS to avoid data leaks.

## Scope
- Thread + message tables.
- Participant table.
- RLS policies.

## Acceptance Criteria
- Only participants can read/write.
- Admin tools (if any) are server-authorized.
```

---

## P9 — Code Quality / Tests

### ISSUE-P9-001: Migrate remaining `console.*` to structured logger

**Labels**: `code-quality`, `enhancement`, `high-priority`

**Body**:
```markdown
## Problem
Console logging is inconsistent and can leak sensitive details.

## Scope
- Replace remaining `console.log/warn` with `src/utils/logger.js`.

## Acceptance Criteria
- No `console.log` in production paths.
- Logger used with structured context.
```

---

### ISSUE-P9-002: Add `useCurrentUser` hook (or Supabase equivalent) and refactor pages to use it

**Labels**: `refactor`, `code-quality`, `medium-priority`

**Body**:
```markdown
## Problem
Current-user fetching logic is duplicated across many pages.

## Scope
- Create a reusable hook.
- Update pages to use it.

## Acceptance Criteria
- Duplication removed.
- Consistent loading/error handling.
```

---

### ISSUE-P9-003: Add golden-path tests and make tests blocking in CI when stable

**Labels**: `testing`, `devops`, `medium-priority`

**Body**:
```markdown
## Problem
Need minimum coverage to ship confidently.

## Scope
- Add tests for:
  - Auth flow basics
  - Marketplace add-to-cart
  - Checkout happy path (mocked)
  - Admin event scrape request (mocked)

## CI
- Once stable, make `test` job blocking in `.github/workflows/ci.yml`.

## Acceptance Criteria
- Tests run in CI.
- Coverage report generated (optional).
- CI blocks regressions.
```
```

---

## Optional “nice-to-have” issues to add later
- Lighthouse/perf budget
- Bundle analysis gate
- Accessibility audit + fixes
- Admin audit log table for sensitive actions
