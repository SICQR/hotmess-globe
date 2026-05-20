# Ghosted audit — Location sharing (mutual-gated session)

**Status:** working (rebuilt 2026-05-20)
**Last verified in production:** 2026-05-20 — table + RLS + cron verification on prod.
**Evidence:** `ghosted_location_sessions` table live (mutual-gated INSERT via `has_mutual_boo`, party-only SELECT filtered by `revoked_at IS NULL AND expires_at > now()`, sharer-only revoke UPDATE). `ghosted_location_sessions_sweep` pg_cron job active (daily 03:17 UTC, deletes rows >24h past expiry/revocation).

## History of the bug this fixes
The legacy `handleShareLocation` inserted into the Safety `location_shares` table with columns that don't exist on it (`sender_id`/`receiver_id`/`lat`/`lng`). It failed silently in production — UI said "Location shared" while nothing was written. This was the original "failed location share" Phil flagged.

## Current behaviour
- Share Location is mutual-gated (`canInteract`); pre-mutual it blocks + logs to `consent_blocks`.
- Post-mutual: resolves/creates the direct thread, creates a `ghosted_location_sessions` row (15-min TTL via `createLocationSession`), posts a chat reference. Coordinates live in the session table, NOT chat history.
- Session auto-expires (RLS hides expired rows); sharer can revoke anytime; cron purges old rows.
- Two trust models kept separate: Ghosted (mutual boo) vs Safety `location_shares` (trusted-contact consent) — untouched.

## Never Silent compliance: **Y**
- Insert wrapped in `safeInsert` (dev-throws on column drift — prevents silent-fail recurrence).
- RLS denial → `logConsentBlock(reason:'rls_denied')`.
- Expiry is an explicit state (recipient sees expired, not a stale map).
