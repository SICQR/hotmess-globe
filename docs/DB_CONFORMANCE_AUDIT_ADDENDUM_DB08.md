# Audit Addendum — DB-08 / DB-09 (found while completing DB-01 frontend)

Tracing the DB-01 fix to the UI surfaced a leak that **outranks DB-01**. Recorded here;
folds into `doctrine-conformance.json`.

## DB-08 — CRITICAL — `profiles` broadcasts precise coordinates to any logged-in user
**Three-layer evidence**
- **Code:** `src/components/utils/queryConfig.jsx` → `useAllUsers` runs
  `supabase.from('profiles').select('*')` directly from the browser; `src/pages/Connect.jsx`
  (l.224-235) then computes a **precise client-side Haversine** from `u.lat/u.lng`.
- **DB (live JWT-scoped probe, 2026-06-30):** as an ordinary `authenticated` user,
  `SELECT … FROM profiles WHERE id <> me` → **223 rows visible, 114 leak precise
  `last_lat`+`last_lng`**. Anon → 0 (RLS blocks). Policy `profiles_read_visible_authed`
  `USING (is_visible AND NOT is_demo)` grants row-wide read of every visible profile, and
  the coordinate columns carry `authenticated` SELECT, so exact coords ride along.
- **Doctrine:** sacred-invariant #2/#3 (no exact tracking), `48-spatial-identity-exposure`.

**Why it dominates DB-01:** `nearby_candidates_secure` was carefully built to fuzz coords,
but the raw `profiles` table read bypasses the function entirely. Banding the RPC distance
(DB-01) is defense-in-depth; **this is the actual front door.**

**Risk:** any of the 226 beta users (and any future member) can pull 100+ members' exact
home/now coordinates with one authenticated API call. Anti-stalking invariant broken in prod.

**Fix (staged, UNAPPLIED):**
- `supabase/migrations/20260630181002_db08_profiles_revoke_coord_columns.sql` —
  `REVOKE SELECT (last_lat,last_lng,location) ON profiles FROM anon, authenticated`.
- `src/components/utils/queryConfig.jsx` — both `profiles.select('*')` calls replaced with an
  explicit safe column list (coords removed). **Sequencing: client change ships first/with the
  REVOKE**, else `select('*')` throws "permission denied for column last_lat".
- After the fix, Connect's precise-Haversine branch can't run (no coords) and falls back to the
  banded RPC distance — so DB-08 + DB-01 together make displayed distance coarse end-to-end.

**Verify:** as authenticated user B, `SELECT last_lat FROM profiles WHERE id<>auth.uid()` →
permission denied / null; plus a Nearby UI screenshot showing banded distance.

## DB-09 — HIGH — same policy over-exposes PII (noted, NOT fixed here)
The same `profiles_read_visible_authed` row-wide read also returns `email`, `phone`,
`pin_code_hash`, `stripe_subscription_id`, `telegram_link_token`, `telegram_chat_id` to every
authenticated user via `select('*')`. Out of scope for this CRITICAL-fix pass (and the grid
currently uses `email` as a join key, so the fix needs that refactor). Flagged for Phil:
minimise the authenticated-visible column set / move to a `profiles_card` view or SECDEF RPC.
The DB-08 client change already removes coords; PII minimisation is a follow-up.
