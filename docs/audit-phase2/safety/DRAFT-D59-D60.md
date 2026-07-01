# DRAFT — D59 & D60 (Safety / SOS Doctrine)

**Status:** DRAFT for ratification. **Drafted:** 2026-06-30.
**Inherits from:** `sacred-invariants.md` (Safety is invariant #1; "anti-stalking is structural, not policy"; "signals always expire"; "if a rule can't be state-transitioned it's not production-ready"), `15-care-language-doctrine.md` (the substrate is care; the wrapper is nightlife), `11-arrival-state-doctrine.md` (failure stays in the doctrinal voice), `63-nominator-sovereignty-doctrine.md` (ratified sibling).
**Closes findings:** CV-CONSENT-01/02/03, CV-LIFECYCLE-01, CV-SCHEMA-01, CV-ESCALATION-01, CV-RLS-01, CV-EMERGCONTACTS-01 (see `CONFORMANCE.md`).

> **Numbering note.** The Phase-2 brief labelled D59 = "Safety/SOS orchestration" and D60 = "two-party trusted-contact agreement." The ratified `63-nominator-sovereignty-doctrine.md` already cross-references them inverted: **D59 = Trusted Contact as Two-Party Agreement** (recipient side, sibling of D63's nominator side) and **D60 = Safety Event Orchestration.** Live code (`accept-token.js`, `_acceptance-token.js`, `_invitation-templates.js`) cites "D59 S1/S2" for the invitation/acceptance flow. **This draft follows D63 + the code** to avoid contradicting ratified doctrine. If Phil prefers the brief's labels, swap the two numbers wholesale — the content is otherwise unaffected.

---
---

# D59 — Trusted Contact as Two-Party Agreement

## §1 — Principle

> **A trusted contact is a relationship two people agreed to, not a phone number one person typed.**

Nominating someone is a *request*, not a fact. The relationship becomes real only when the recipient confirms it. Until then they are a *pending invitation*, never a "trusted contact," and the platform must never page them, name them as trusted, or count them as protection. The substrate is care (D15): being asked to hold someone's safety is intimate, and consent is the whole of the intimacy.

This doctrine governs the **recipient side** of the safety stack. Its sibling D63 governs the **nominator side** (how nominations appear). Together they make the trusted-contact relationship a symmetric, consented, revocable contract.

## §2 — Invariants

1. **Consent gates live contact.** No SOS, Get Out, check-in alert, or escalation may message a contact whose `accepted_at IS NULL`. A pending or declined contact is never a live destination. *(Closes CV-CONSENT-01.)* This is structural, not policy — it lives in the query, not the runbook (Sacred Invariant #3).
2. **Account-free acceptance.** The recipient is not required to be (or become) a HOTMESS user. The HMAC acceptance token *is* the authentication. *(Inherits existing `_acceptance-token.js` design.)*
3. **Recipient owns their reachability.** Post-acceptance, the recipient's `confirmed_*` channels and `channel_preference_order` are the source of truth and override nominator-typed `contact_*`. *(Closes CV-CONSENT-02.)*
4. **Decline is dignified and final-until-reinvited.** A declined contact (`declined_at` set) is never re-paged and never silently re-armed; re-inviting requires a fresh nominator action and a fresh token. Decline notifications to the nominator follow D63 §3 (no name on glanceable surfaces).
5. **One canonical contact oracle.** `trusted_contacts` is the only table that defines who may be paged. No parallel contact store may carry `notify_on_sos`. *(Closes CV-EMERGCONTACTS-01.)*
6. **Tokens expire.** Acceptance tokens carry a bounded TTL (30 days) and are HMAC-verified; the stored `acceptance_token` column is non-authoritative. *(Closes CV-CONSENT-03.)*
7. **The state word never lies.** Contact count and network state derive from one oracle (`get_my_safety_network_summary` / `safety_network_health`); UI never re-counts raw rows. *(Inherits D63 §8.)*

## §3 — Enforcement (concrete)

**DB constraints / migrations (stage as migrations; do not auto-apply):**
- Keep `accepted_at`, `declined_at`, `decline_reason`, `acceptance_token_expires_at`, `confirmed_*`, `channel_preference_order` (all present live).
- Add a partial index `WHERE accepted_at IS NOT NULL` on `trusted_contacts(user_id)` to make the consented-contact lookup cheap.
- Deprecate `emergency_contacts`: drop or rename to `emergency_contacts_deprecated`, remove its `notify_on_sos`.

**Code (the gate):**
- Every contact-load query MUST chain `.not('accepted_at','is',null)`:
  `dispatcher.js loadContacts`, `get-out.js`, `check-ins.js` (tier-1), `safety-checkin-escalate.js` (tier-2), `alert.js`.
- `loadContacts` MUST `select` and prefer `confirmed_phone/email/whatsapp/telegram*` over `contact_*`, and honour `channel_preference_order`.

**RPC:** `get_my_safety_network_summary()` is the single oracle for `{total, accepted, pending, declined, state}`. All cards read it (already true for `CareSuiteCard`, `SafetyNetworkCard`, `Home`).

**Cron:** a daily "stale pending" sweep marks invitations un-accepted after their token TTL as `expired` (for honest network-health reporting), never auto-accepting.

**Tests (must exist + fail closed):**
- `dispatch_excludes_unconsented`: seed 1 accepted + 1 pending contact; assert SOS pages exactly the accepted one.
- `decline_is_terminal`: declined contact is never returned by `loadContacts`.
- `confirmed_channel_preferred`: when `confirmed_phone` set, dispatch uses it over `contact_phone`.
- `zero_consented_routes_to_ops`: user with only pending contacts -> SOS routes to Phil ops-alert, **never** to an unconsented number (joint with D60 §3).
- `token_expiry_rejected`: expired HMAC token cannot accept.

## §4 — Failure modes (must stay in the doctrinal voice — D11/D15)

- **No consented contacts at SOS time.** Never silent, never page a stranger. Route to ops-alert (D60). Copy to the user stays care-voiced, never accusatory: not "You have no valid contacts" but the smoking-area register (D15 §2).
- **Recipient channel unreachable.** Fall through `channel_preference_order`; log to `safety_delivery_log`; do not invent a fallback number.
- **Invitation pending forever.** Surfaced as a network-health nudge (D63 §6 PENDING amendment), never as a fake "protected" state.

## §5 — Companion refs

`sacred-invariants.md` (#1, #3, #4) · D15 Care Language (invitation + decline copy) · **D63 Nominator Sovereignty** (the nominator side of this exact contract; D63 §1, §3, §8) · D60 below (consumes the consented set) · D49 Entity Ontology (Existence/Broadcast/Perception split for contact entities).

---
---

# D60 — Safety Event Orchestration (SOS lifecycle)

## §1 — Principle

> **An SOS is a lifecycle the system owns from press to closure — never a fire-and-forget log line.**

When someone signals for help, the platform takes responsibility for the *whole arc*: dispatch to consented contacts, escalation if unanswered, a loud failure path if dispatch itself fails, and an explicit, audited resolution. A safety event with no end state is not safety — it is a record nobody closed. The substrate is care (D15): the system protects, escalates, recovers, and then *says it's over* honestly.

This doctrine governs the **event side** of the safety stack: `safety_events`, `safety_alerts`, `safety_delivery_log`, `sos_dispatch_audit`, `aa_escalation_log`, and the crons that move them. It consumes the consented contact set defined by D59.

## §2 — Invariants

1. **Every safety event has a closed lifecycle.** `active -> resolved | expired`. `resolved_at` (or `expired`) MUST be writable and written; an event cannot live forever. *(Closes CV-LIFECYCLE-01, CV-SCHEMA-01; inherits Sacred Invariant #5 "signals always expire" + #13 "must be state-transitioned".)*
2. **An SOS is never silent.** If dispatch reaches no consented contact, it escalates to the ops-alert path. The failure of the failure-detector is unacceptable on safety. *(Inherits the post-Glen `sos-health-check.js` design.)*
3. **Only consented destinations.** Orchestration pages only the D59-consented set. The ops-alert path is the sole exception (a known internal operator, not a nominated stranger). *(Joint with D59 §2.1; closes CV-CONSENT-01.)*
4. **Escalation expires.** Any area/AA escalation (`aa_escalation_log`) carries a TTL and an auto-resolve; no escalation is permanent. *(Closes CV-ESCALATION-01; inherits Sacred Invariant #5.)*
5. **All safety-event tables are RLS-protected.** Every table holding recipient destinations or message bodies enforces RLS; service-role-only writes, owner-only reads. *(Closes CV-RLS-01.)*
6. **Rate-limited but never blocked under worsening.** Hourly cap is bypassable by explicit escalation; daily cap is a hard cost/alert-fatigue ceiling. *(Inherits existing `sos.js` 3/h + 10/day design.)*
7. **Nominator-sovereignty applies to event notifications.** Event-state pushes (acknowledged, responder-named) follow D63 Class-A rules: no naming a responder on a lock screen without ratification. *(Inherits D63 §6, §10.)*

## §3 — Enforcement (concrete)

**State machine (DB):**
- `safety_events.resolved_at` — written by resolution; add CHECK-able status via metadata or a `status` enum (`active|resolved|expired`).
- Add a `resolve_stale_safety_events` cron: events `active` beyond a max-open TTL (e.g. 24h) auto-transition to `expired` with an audit note, so no event is eternally open.

**Resolution path:**
- New endpoint `POST /api/safety/resolve` (JWT; own events only; RLS-checked) writes `resolved_at`.
- Repoint `src/lib/safety.ts panicResolve()` from the phantom `safety_incidents` to `safety_events`. *(Closes CV-SCHEMA-01.)*

**Escalation (AA):**
- If/when `aa_escalation_log` is activated: write on SOS P0 dispatch (in `dispatcher.js`), default `zone_radius_km` + TTL; `resolve_aa_escalations` cron sets `resolved_at` at `created_at + ttl`; admin-resolve action via the existing `aa_escalation_admin_resolve` RLS policy. Until built, annotate the table as deferred so it does not read as live. *(Closes CV-ESCALATION-01.)*

**RLS migration (stage; do not auto-apply):**
- `ALTER TABLE sos_dispatch_audit ENABLE ROW LEVEL SECURITY;`
- `CREATE POLICY sos_dispatch_audit_service ON sos_dispatch_audit FOR ALL TO service_role USING (true) WITH CHECK (true);`
- optional owner-read via `safety_event_id -> safety_events.user_id`.
- Doctrine clause: **all safety tables FORCE RLS.** *(Closes CV-RLS-01.)*

**Health-check (keep + harden):** `sos-health-check.js` continues to escalate undelivered events to Phil every minute; extend it to also flag events `active` past the max-open TTL (lifecycle health, not just delivery health).

**Tests (must exist + fail closed):**
- `event_resolves`: resolve endpoint sets `resolved_at`; row leaves `active`.
- `stale_event_auto_expires`: event older than TTL becomes `expired` via cron.
- `undelivered_escalates_to_ops`: event with no successful `safety_delivery_log` row triggers ops-alert.
- `aa_escalation_expires`: escalation row auto-resolves at TTL.
- `audit_rls_enforced`: anon/auth cannot SELECT `sos_dispatch_audit`.
- `daily_cap_hard`: 11th SOS in 24h is rejected even with escalation flag.

## §4 — Failure modes (doctrinal voice — D11 §"Failure stays in the doctrinal voice")

- **Dispatch fully fails.** Ops-alert fires; the user-facing line is reassuring and present-tense, never a diagnostic ("Signal weak" is forbidden per ProximityFailureSystem voice table). The system adapts; it does not apologise.
- **Event never resolved by user.** Cron expires it after the max-open TTL with an audit trail; the user is met with care-voiced aftercare (D15), not a clinical "incident closed."
- **Escalation orphaned.** TTL auto-resolve guarantees no permanent area escalation; an orphaned escalation is a test failure, not a runtime state.
- **Cost runaway.** Daily hard cap holds; rate-limit copy stays in the care register ("Confirm escalation only if your situation has worsened").

## §5 — Companion refs

`sacred-invariants.md` (#1, #5, #13, #14 "every alert has an owner") · D15 Care Language (all event + aftercare copy) · D11 Arrival (failure voice) · `HOTMESS-ProximityFailureSystem.txt` (failure-voice lexicon: never write a diagnostic) · `HOTMESS-CareAsKink.txt` (Get Out / AA escalation semantics) · **D59 above** (supplies the consented contact set) · **D63 Nominator Sovereignty** (event-notification naming rules, §6/§10).

---

## Appendix — Finding -> Doctrine closure map

| Finding | Severity | Closed by |
|---|---|---|
| CV-CONSENT-01 | CRITICAL | D59 §2.1, §3 (consent gate) + D60 §2.3 |
| CV-LIFECYCLE-01 | CRITICAL | D60 §2.1, §3 (resolve endpoint + state machine) |
| CV-SCHEMA-01 | HIGH | D60 §3 (repoint `panicResolve` to `safety_events`) |
| CV-ESCALATION-01 | HIGH | D60 §2.4, §3 (AA TTL + auto-resolve) |
| CV-RLS-01 | HIGH | D60 §2.5, §3 (enable RLS on `sos_dispatch_audit`) |
| CV-CONSENT-02 | MEDIUM | D59 §2.3 (confirmed channels + quiet hours) |
| CV-EMERGCONTACTS-01 | MEDIUM | D59 §2.5 (single canonical oracle) |
| CV-CONSENT-03 | LOW | D59 §2.6 (token expiry; stored token non-authoritative) |
