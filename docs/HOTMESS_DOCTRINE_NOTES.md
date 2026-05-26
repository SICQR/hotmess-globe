# HOTMESS GLOBE — DOCTRINE NOTES

> **Doctrine read of the Revised Strategic Brief.** Captures the agreement, the doctrinal principles to enforce, and the build-order recommendation.
> Source: Phil Gizzie, 2026-05-26 (canonical).

---

## WHAT CHANGED

- We've moved from **concept to system design**.
- The core question is now **execution**, not legitimacy.
- *"Realtime nightlife coordination layer"* is a stronger framing than "app" or "map".

---

## DOCTRINE READ

- The thesis is **credible**.
- The product kernel is the **signal engine**.
- The biggest risks are **density, ranking, trust, and venue incentives**.
- The main job now is **turning strategy into rules**.

---

## DOCTRINE — WHAT MUST BE TRUE

1. **District-first, not city-wide.**
2. **Scarcity is governance, not just monetization.**
3. **Trust must affect ranking and visibility.**
4. **Venue tools must be operationally useful, not just promotional.**
5. **Atmosphere must be computed, not just described.**
6. **The globe is a shell around the coordination system, not the whole product.**

---

## BUILD ORDER (next docs)

1. **Product Doctrine** — what HOTMESS is · what it is not · what must always be true · what can never happen.
2. **Ranking Logic** — what appears first · how trust works · how premium interacts with heat · how to suppress spam and clutter.
3. **Signal Economics** — how many signals a user can create · how long signals last · what boosts cost · how scarcity is enforced.
4. **Launch Operations** — which district first · which venues first · which promoters first · how to seed density without faking the whole city.
5. **Infrastructure Constraints** — moderation · abuse prevention · exact-location bans · data freshness · quiet-night handling.

---

## STRONGEST RECOMMENDATION

> **Treat the signal engine as the sacred core.**

Everything else serves it:
- UI
- monetization
- venue tooling
- trust and safety
- atmosphere
- launch strategy

---

## CURRENT STATUS vs THIS DOCTRINE

| Doctrine item                       | Status                                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| Product Doctrine                    | Implicit in [Revised Brief](./HOTMESS_REVISED_STRATEGIC_BRIEF.md) §16; not standalone yet |
| Ranking Constitution / Logic        | Drafted in PR #411 (`docs/governance/ranking-constitution.md`, 147 lines)               |
| Signal Economics                    | Drafted twice in PR #411 (`docs/governance/` + `docs/economics/` — needs reconciliation) |
| Launch Operations Playbook          | Drafted twice in PR #411 (`docs/ops/` + `docs/launch/` — needs reconciliation)          |
| Infrastructure Constraints Memo     | **NOT YET WRITTEN**                                                                     |
| Sacred Invariants                   | Drafted here in [`governance/sacred-invariants.md`](./governance/sacred-invariants.md)  |
| v1 Product Ruleset (exact defaults) | **NOT YET WRITTEN** — highest-leverage missing doc (see Critique recommendation)        |

---

## NEXT SINGLE-DOC RECOMMENDATION

- **v1 Product Ruleset** — turns this entire doctrine stack into the defaults engineering needs to start building Phase 1.
- Alternative (per doctrine read): **Ranking Constitution refinement** — pick up the PR #411 draft and bind it to the doctrine items above.

Both are within a day of work. Phil decides which goes first.
