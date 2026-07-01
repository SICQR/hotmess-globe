# SOS Safety — remediation plan (SOS consent gate + lifecycle)

Live-verified 2026-06-30. One CRITICAL fix already APPLIED; the rest need a deploy and/or a Phil
decision because they change **who gets paged in an emergency** — not something to ship silently.

## DONE — applied + verified in prod (safe, no app dependency)
**`sos_dispatch_audit` view lockdown (CRITICAL data leak).** The view exposed **169 real SOS
dispatch records** (recipient phones/emails + rendered message bodies) to `anon` + `authenticated`
with full read/write/delete, running as owner so it bypassed underlying RLS. Nothing in app code,
triggers, or functions referenced it. Applied: `REVOKE ALL FROM anon, authenticated` +
`SET (security_invoker = true)`. Verified: authenticated/anon read = false, service_role = true.

## DECISION NEEDED (Phil) — the consent gate
**Finding CV-CONSENT-01:** SOS fan-out (`api/notifications/dispatcher.js loadContacts`,
`api/safety/get-out.js`, `alert.js`, `check-ins.js`, `api/cron/safety-checkin-escalate.js`) selects
contacts on `notify_on_sos=true` with **no `accepted_at` gate**. Doctrine (drafted D59/D60) says
only two-party-consented contacts may be paged.

**The trap:** live data is **8 contacts, 8 SOS-enabled, 0 accepted, 0 declined, only 2 ever
invited.** A naive hard gate (`AND accepted_at IS NOT NULL`) would make **SOS reach nobody** for
every user — a safety regression as bad as the leak. Root cause: adding a contact never sends the
acceptance invite (`invitation_sent_at` null for 6/8).

**Recommended rollout (my pick — option B):**
- **A. Hard gate now** — correct doctrine, but SOS silently reaches 0 people until users re-consent. Unsafe alone.
- **B. Gate + backfill invites + interim grace (recommended).** (1) Ship invite-on-add so new contacts get an accept/decline invite. (2) Fire invitations to the 8 existing pending contacts now. (3) Gate fan-out on `accepted_at`, BUT for a defined grace window, still page pending contacts *with an explicit consent notice in the message* and alert the owner "your contacts haven't confirmed." (4) After the window, hard-gate. No one loses SOS reach mid-transition; consent converges.
- **C. Owner-attested interim** — treat contacts the owner explicitly re-affirms as consented. Weaker than B on the two-party principle.

Your call on A/B/C and the grace-window length. I'll implement the chosen one as a reviewed PR (not auto-deployed — protected `production` branch + real-world safety).

## NEEDS A DEPLOY (staged as code, not auto-shipped)
**CV-LIFECYCLE-01 — SOS events never close.** `safety_events.resolved_at` exists but is never
written; **all 39 events are open.** The resolve path `src/lib/safety.ts` reads/writes/subscribes to
**`safety_incidents`, which does not exist** (7 references incl. a realtime subscription). So the
entire `safety.ts` module is broken against the live schema.
- Fix: determine whether `safety.ts` is the live resolve path (repoint `safety_incidents` →
  `safety_events`, mapping columns) or dead code superseded by `api/safety/*` (remove it). Requires
  tracing imports — a careful code change, not a blind sed. Then add a resolve write + optionally a
  cron to auto-close stale events past a TTL.

**Invite-on-add.** `src/components/sheets/L2SafetySheet.jsx` inserts a contact with
`notify_on_sos:true` but never calls `api/safety/dispatch-invitation.js`. Wire the insert to fire the
invitation so consent can actually be collected (prerequisite for option B).

## Suggested PR
`fix/safety-sos` bundling: lifecycle repoint/removal, invite-on-add, and the chosen consent-gate
option. Deployed via a reviewed `main → production` release, since it changes emergency behaviour.
The audit-view lockdown is already live and needs no deploy.
