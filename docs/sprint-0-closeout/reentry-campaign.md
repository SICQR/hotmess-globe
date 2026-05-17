# Sprint 0 closeout — Founding cohort reentry campaign

**Brief:** `02_reentry_campaign.md`  
**Branches merged:** `feat/founding-reentry-campaign` (PR #270, squash `441c673`)  
**Database:** `rfoftonnlwudilafhfkl` — migration `20260518010000_reentry_campaign` applied LIVE  
**Outcome:** **QUEUED + PAUSED — Phil preview sent. Awaiting "ship it" before flipping the 128 paused rows to sent.**

---

## Token + RPC architecture (summary)

- **Token format:** `<profileId>.<hex(hmacSHA256(profileId, REENTRY_SECRET))>` — same shape as portal tokens (PR #262/#263). Stateless; the hash is stored in `reentry_tokens` only for replay-detection.
- **`reentry_tokens` table:** `(id, profile_id, token_hash UNIQUE, expires_at, consumed_at, created_at)`. 30-day TTL. Single-use enforced by `consumed_at`.
- **`assign_founding_status_slot(profile_id)` RPC:** SECURITY DEFINER. Acquires a row-level lock on `cohort_locks` via `SELECT … FOR UPDATE`, then re-checks current allocations and writes the slot atomically. Idempotent — a second call with the same profile returns the existing assignment. No double-allocation possible even under contention.
- **Race rules:** original_50 (cap 50, Dean is #1 by grandfather) → founding (cap 115) → early.
- **`REENTRY_SECRET`** added to Vercel `hotmess-globe` env (Production + Development). Preview env not yet set — not launch-blocking, runtime path is prod-only.

## Cohort math (post-migration, pre-campaign)

```
Total profiles:        154
profiles with email:   129 (via auth.users.email join)
profiles no email:      25  (skipped, not enqueueable)
founding_status set:     1  (Dean, original_50 #1, grandfathered)
founding_status NULL:  153  (race candidates after the campaign fires)
```

## Outbox enqueue — final state (paused)

```
notification_outbox rows for notification_type='reentry-invitation':
  status='paused'    128 rows
  status='queued'      0 rows
  status='sent'        0 rows
  total              128 rows
```

128 = 154 − 25 (no email) − 1 (Dean) = exactly the brief's intent for the
emailable cohort. Dean is NOT in the outbox queue (verified — `dean_in_queue
= NULL` on the post-enqueue audit query).

Three anonymised sample rows:

| local_part (front of email) | first_name | status | channel | send_at |
|---|---|---|---|---|
| `j****` | `Jake` | paused | email | `2026-05-18T07:00:00Z` |
| `m****` | `Marcus` | paused | email | `2026-05-18T07:00:00Z` |
| `s****` | `Steve` | paused | email | `2026-05-18T07:00:00Z` |

## Phil-preview gate

**Preview sent.** One Resend email to `scanme@sicqr.com` from `Phil Gizzie <phil@hotmessldn.com>`, subject "You showed up too early.", body verbatim from `docs/sprint-0-closeout/reentry-email-copy.md`. Token URL renders with Dean's profile ID (safe — Dean is already provisioned, the link is informational; the actual ship pass uses per-profile tokens).

- **Resend message ID:** `e60970d6-4193-4e90-a5a0-fd11bdbcc54f`
- **HTTP status from Resend:** 200
- **Sent at:** 2026-05-17 ~00:30 UTC

Cowork has STOPPED. Awaiting Phil's `"ship it"` reply.

## On "ship it" — what Cowork will do

1. Verify the 128 paused rows still hold (audit query).
2. Run `MODE=ship CONFIRM_SHIP=yes node scripts/reentry-send.mjs` against Phil's Mac with prod env pulled (and wiped after).
3. The dispatcher iterates each paused row, mints a fresh token per profile (deterministic from `profile_id + REENTRY_SECRET`), renders the HTML with `first_name` from the metadata, POSTs to Resend, flips row to `status='sent'` with `sent_at=now()` and `metadata.resend_id=<id>`. Rate-limited 50ms between sends.
4. **Known gap to patch at ship time:** 67 of the 128 rows were backfilled via direct SQL after the script timeout interrupted the per-profile auth-admin loop. Those backfilled rows have `metadata.needs_token_mint=true` and no `reentry_url` yet. The ship dispatcher will mint the URL per row from `profile_id` so this is functionally a no-op — the same deterministic token is produced either way. Two-line patch to `scripts/reentry-send.mjs` runShip() to handle this case will land in the ship commit.
5. Post a follow-up summary: sent count, failed count, Resend IDs per row.

## What ships at Monday 07:00 UTC

Per the original brief that's when the cron fires. The existing
`notifications/process.js` cron will NOT see these rows because:
- they're `status='paused'` (cron filters on queued/pending)
- `notification_type='reentry-invitation'` isn't in the cron's email-eligible list
- the cron's template isn't compatible with Phil-voice apology copy

The Monday 07:00 UTC cron is therefore NOT the dispatch path. Cowork's `MODE=ship` script is the dispatch path, fired manually on Phil's "ship it" reply. This is intentional — see `.cowork/build-decisions.md` decision 02-A for the long-term question.

## Race-state snapshot

**Pre-campaign (now):**
```
original_50:    1  (Dean)
founding:       0
early:          0
NULL:         153
```

**Expected through Monday + Tuesday as people click the email:**
```
original_50:   1 + (first 49 reentry-completers)
founding:      next 115 reentry-completers
early:         everyone after that who completes
NULL:          (154 − completers) — these stay un-onboarded;
               next visit treats them as new users
```

The `assign_founding_status_slot` RPC is the single point of truth — Phil can watch the race live with:

```sql
SELECT founding_status, COUNT(*)
FROM profiles
WHERE founding_status IS NOT NULL
GROUP BY 1
ORDER BY 1;
```

## What was built

- Migration: `supabase/migrations/20260518010000_reentry_campaign.sql` (LIVE)
- API: `api/auth/reentry-verify.js`, `api/auth/reentry-complete.js`
- UI: `src/pages/ReentryPage.jsx`, wired into `src/App.jsx` at `/reentry`
- Email: `email-templates/reentry-invitation.mjml` + `docs/sprint-0-closeout/reentry-email-copy.md`
- Dispatcher: `scripts/reentry-send.mjs` (preview / enqueue / ship modes)
- Build-decisions log: `.cowork/build-decisions.md` (decision 02-A)
- Vercel env: `REENTRY_SECRET` added to hotmess-globe Production + Development

## Out of scope — intentionally deferred

- Welcome-page polish (richer /portal-style landing) — Sprint 1
- `'recovery'` member cohort + matching tier visual — Sprint 1+ (flagged in brief 03)
- Migration of `notification_outbox` + `process.js` to support custom MJML templates + arbitrary FROM — see decision 02-A
- REENTRY_SECRET on Vercel Preview env — runtime is Production-only for now

## Summary

**Status: queued-and-paused / phil-preview-sent / awaiting "ship it".** Migration applied, code merged, 128 paused rows in outbox, Dean grandfathered correctly, Phil's preview email landed. Cowork holds until Phil replies.
