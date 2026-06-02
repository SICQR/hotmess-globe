# Phase 0 — Closeout Criteria

**Status:** Locked Phil 2026-06-02
**Path:** `docs/doctrine/slices/phase-0-closeout-criteria.md`
**Companion to:** `docs/doctrine/slices/cinematic-mockup-slice-ladder.md` §3.0
**Purpose:** prevent Phase 0 from becoming endless stabilization purgatory

---

## §0 Why this exists

Phil's exact warning 2026-06-02:

> *"Do NOT let 'small Phase 0 fixes' become 'endless stabilization purgatory.' Phase 0 should close when communication continuity feels coherent, routing feels trustworthy, sheets stop breaking, boo logic behaves correctly, notifications behave consistently — not when every tiny UI imperfection is solved. Otherwise cinematic Phase 1 never begins."*

Without explicit exit criteria, Phase 0 will drift. Every new bug surfaced during stabilization becomes a candidate for inclusion. Stabilization budgets without closing conditions consume themselves.

This doc locks the closing conditions. Once met, Phase 1 begins. Bugs surfaced after closure get triaged into Phase 1+ backlog — not absorbed into Phase 0.

---

## §1 The nine exit criteria — LOCK

Phase 0 closes when **all nine** of the following are verifiably true on production. No subjective "feels good enough" — each row is testable.

| # | Criterion | Verification method | Status |
| --- | --- | --- | --- |
| 1 | **Sheet retract** — chat sheet can be dragged-down-to-dismiss reliably from any region (pip, title bar, messages area at scrollTop=0) | Chrome MCP on Mac + iPhone PWA touch test | PR #832 shipped; verifying this turn |
| 2 | **Bell visible on Pulse** — BellRailIcon renders ABOVE the existing Pulse rail icons (z-index resolved) | Chrome MCP DOM probe + visual screenshot | Fix shipping this turn |
| 3 | **Search relocation** — Pulse top-bar search input gone; search rail icon present on Pulse, opens D35 §13.4-compliant ambient overlay | Chrome MCP DOM probe + UX walk | Pending |
| 4 | **Radio rail icon** — Radio icon present on right rail on Pulse / Ghosted / Music / Shop (D16 §10.1 Tier 4) | Chrome MCP DOM probe across all 4 pages | Pending |
| 5 | **Notification tap stability** — tapping a notification opens the correct surface without Web Lock contention crash (#537 closed) | Field walk: send notification → tap → land in thread | Pending |
| 6 | **Push trigger coverage** — push fires for all notification type values, not just `type='message'` (#542 closed) | DB probe: send each notification type → verify push subscription delivery row | Pending |
| 7 | **Boo write reliability** — boo write succeeds end-to-end with no silent failures. Multi-persona walk: one mutual boo + one declined + one ambient sweep all produce expected DB state + UI reflection | Field walk + DB probe | Pending |
| 8 | **Thread continuity** — open thread → receive new message → reply → close → reopen → all messages present, no reorder, no duplicate, no loss | Chrome MCP field walk | Pending |
| 9 | **Onboarding push opt-in** — new account → step 3 opt-in → subscribed in `push_subscriptions` table → test push lands as banner | Manual walk: new test account through full flow | Pending |

---

## §2 What this does NOT include — explicit

Per Phil's "no purgatory" guardrail, Phase 0 does NOT block on:

- Every UI imperfection
- Subjective "feels weird" reports without reproducible failure
- Aesthetic polish on surfaces that function correctly
- Edge cases that only appear under deliberately broken conditions
- Optimization passes
- New features
- Doctrine ratification beyond what's already locked (D44, D50, D51, D52)
- Items in the parked-task list (#190, #204, #225, #234, #274, #279, #352, #360, #361, #379, #412, #428, #437, #463, #470, #497, #514, #537–#542, #549, #550, #552, #553, #554) — these are deferred to Phase 1 or beyond unless they intersect with the nine criteria above

Surface a regression that breaks one of the nine criteria → that's a Phase 0 incident. Anything else → Phase 1+ backlog.

---

## §3 The drift detector

If Phase 0 is open more than 7 calendar days from this lock (2026-06-02), Phil and Claude jointly review:

1. Which criteria are blocked and why
2. Whether any criterion needs to be amended or downgraded
3. Whether any criterion is overscoped and needs splitting

The review is a doctrine event, not a status meeting. The default outcome is: close Phase 0 with whatever is verifiably true, move unmet criteria into Phase 1 as gating prerequisites for the specific slices that need them. The substrate does not wait on every criterion forever.

This is the anti-purgatory release valve.

---

## §4 Ship sequence within Phase 0

No mandated order. Quick wins (1-line fixes, single-component changes) ship as standalone PRs. Larger items (search overlay) get their own slice doc.

**Suggested order (lowest-friction first):**

1. Verify P0.1 (sheet retract) on Mac via Chrome MCP — no code needed, just verification
2. Ship P0.2 (bell z-index) — 1-line fix
3. Ship P0.4 (radio rail icon) — small component addition, parallels P0.2 in the rail layer
4. Audit + ship P0.5 (notification tap stability) and P0.6 (push trigger coverage) together — they share the push-dispatcher layer
5. P0.7 (onboarding push opt-in) — verification walk
6. P0.8 (thread continuity) — verification walk; close out follow-ups if drift surfaces
7. P0.3 (search relocation) — biggest build; gets its own slice doc + PR
8. P0.9 (boo write reliability) — close #513 / #514 reconciliation

---

## §5 Exit ritual

When all nine criteria are verifiably met:

1. Claude posts a Phase 0 closeout PR with a screenshot/console-log evidence pack for each criterion
2. Phil ratifies the closeout PR
3. Phase 1 (Slice 1 — Cinematic base globe pass) opens its first PR

No ambiguity. No drift. No purgatory.

---

*End of Phase 0 closeout criteria.*
