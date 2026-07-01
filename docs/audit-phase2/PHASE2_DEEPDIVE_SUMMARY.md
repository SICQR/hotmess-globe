# Phase 2 — Deep-dive summary (5 gap surfaces)

Per-surface doctrine⇄code⇄DB conformance + drafted doctrine for the 5 surfaces the backbone
flagged as ungoverned. Read-only DB; no prod writes; doctrine DRAFTED not ratified. Each surface
has a `CONFORMANCE.md` (findings) + a `DRAFT-*.md` (house-format doctrine) under
`docs/audit-phase2/<surface>/`.

## New CRITICAL / HIGH findings (beyond the Phase 1 DB ledger)

**Safety / SOS — two CRITICALs (live):**
- **SOS pages people who never consented.** Fan-out (`dispatcher.js`, `get-out.js`, `check-ins.js`,
  `alert.js`) loads contacts on `notify_on_sos=true` with no `accepted_at` gate. Live data:
  **8/8 trusted_contacts are unconsented** — a real SOS today contacts non-agreeing third parties
  (consent / anti-stalking breach, Sacred Invariant #3). Acceptance machinery was built but never
  consumed.
- **SOS events never close.** `safety_events.resolved_at` is never written; the only resolve path
  (`safety.ts panicResolve`) writes to `safety_incidents`, **a table that doesn't exist**. Events
  stay open forever (breaks "signals always expire" + state-transition).
- Plus HIGH: `sos_dispatch_audit` has **RLS disabled** while holding recipient destinations + SOS
  message bodies; `aa_escalation_log` doctrine-named but unbuilt (no writers, no expiry).
- Naming note: brief's D59/D60 are inverted vs ratified `63-nominator-sovereignty`; drafts follow
  D63/code (D59 = two-party agreement, D60 = orchestration).

**Routing — anti-stalking leak (HIGH, live, DB-08-class):**
- **`routes` table is world-readable** (`routes_read` USING `true`) with precise origin/destination
  lat-lng, no fuzzing, nullable `expires_at`, public insert — a public, precise, potentially
  immortal path line (contra D14 no-surveillance-routing). `movement_updates` stores
  `heading_degrees` + repeated pings = reconstructable trail. No purge cron. The fix primitive
  (`fuzz_signal_point()`) already exists in the DB but isn't wired to these tables.

**Tickets / resale — HIGH:**
- FIFO resale queue is **decorative** (`match_resale_ticket` matches whoever pays first, not the
  queue head); the **founding 0% fee does not exist** (only 7% in prod, no founding flag on
  `market_sellers`); resale **markup leaks** (buyer pays seller price, payout uses face value, the
  delta is recorded nowhere); refund-on-resale is a TODO stub; `has_event_access` ignores
  `p_min_role` so **scanner-only vendors can export attendee emails + live QR tokens**.

**GDPR / retention — HIGH:**
- **No erasure** — delete/RTBF requests are recorded and never executed (app advertises deletion it
  can't perform). Retention sweep runs only on Vercel cron with **no DB backstop**. SAR export is
  **silently partial** (queries non-existent columns on `meet_sessions`/`gdpr_consents`, swallows
  errors). Confirms Phase 1 DB-09 (profiles broadcasts email/phone/pin_code_hash).

**Trust / demand-signal — HIGH:**
- `demand_signals` is a **fully-identified who-wanted-what-where-when ledger** (`user_id` +
  `product_id` + `city` + `member_tier` + `nearest_active_beacon_id` + timestamp) with **no row
  expiry** — the inverse of D33 substrate-incapability (weight decays at read time, the row lives
  forever). Cross-user leak is closed today by RLS but the attribution is retained permanently.

## Drafted doctrine produced (house format, ready for Phil review)
D59 + D60 (Safety/SOS + trusted-contact two-party agreement), ticket-resale doctrine,
GDPR/retention consolidation doctrine, D55 (demand-signal), D45/46/47 (movement & interaction
weight). Each cites the finding IDs it closes and inherits from the sacred invariants + care substrate.

## Recommended order to action (next session / Phil)
1. **Safety SOS consent gate + lifecycle** (CRITICAL, real-world safety).
2. **`routes` RLS lockdown + wire fuzzing** (CRITICAL-class anti-stalking, same family as DB-08).
3. GDPR erasure + SAR fix (legal). 4. Ticket resale fee/FIFO/markup integrity (revenue + fairness).
5. `demand_signals` expiry + de-identify. Then ratify the drafted doctrine.
