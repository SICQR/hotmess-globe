
---

## SHIPPED — v3 dispatched (2026-05-17)

**Status:** SHIPPED. Phil's `"ship v3"` reply received; `MODE=ship CONFIRM_SHIP=yes` dispatched the paused queue.

**Final ship counts:**

```
notification_outbox rows for notification_type='reentry-invitation':
  status='paused'    0   (all flipped)
  status='queued'    0
  status='sent'    120   ← real human reach
  status='failed'    8   ← all demo*@hotmess.test (RFC-2606 reserved TLD, Resend daily_quota_exceeded)
  total            128
```

**Real human reach: 120/120.** The 8 failures are synthetic test accounts (`demo2@hotmess.test` through `demo9@hotmess.test`) seeded into the profiles table during earlier QA work. `.test` is RFC-2606 reserved; Resend correctly refused them with `daily_quota_exceeded`. They're not real cohort members and were never intended to receive the campaign — `notification_type='reentry-invitation'` retains the failed rows for audit; no remediation needed.

**Dispatch path:** `scripts/reentry-send.mjs MODE=ship CONFIRM_SHIP=yes`. Ran across two passes (first pass hit the default `do shell script` 120s timeout at ~115 sent; second pass picked up the remaining 13 paused rows since the script's `runShip()` query is naturally idempotent — only reads `status='paused'`). Each successful send updated the row's `metadata.resend_id` and flipped `status='sent'` + `sent_at=now()`.

**Subject as shipped:** `You showed up too early.` (clean, no `(v3 preview)` suffix; `SUBJECT_SUFFIX` env was unset in `MODE=ship`).

**Race state captured at ship-time:**
```
original_50:    1 (Dean, grandfathered)
founding:       0
early:          0
NULL:         153  (race candidates — will populate as inboxes click)
```

**Watch over the next 48h:** `SELECT founding_status, COUNT(*) FROM profiles WHERE founding_status IS NOT NULL GROUP BY 1 ORDER BY 1;` — Phil can monitor the race live.

**Resend dashboard signals:** Phil should watch open rate + reply count for sentiment. 120 emails dispatched from `phil@hotmessldn.com`; replies route directly to Phil per the brief's voice spec.
