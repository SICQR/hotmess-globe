# Sacred Invariants

> **The rules that cannot be relaxed, ever, under any pressure — monetisation, growth, sponsor, or otherwise.** This is the ethical and operational spine of HOTMESS. Every other governance doc refers back here.
> Canonical, 2026-05-26. Synthesised from the [Product Brief](../HOTMESS_PRODUCT_BRIEF.md), [Revised Strategic Brief](../HOTMESS_REVISED_STRATEGIC_BRIEF.md), [Founder Critique](../HOTMESS_FOUNDER_CRITIQUE.md), [Ranking Constitution](./ranking-constitution.md), [Signal Economics](./signal-economics-spec.md), [Trust System](./trust-system-spec.md), [Metrics](./metrics-and-instrumentation-spec.md), and [Observability](./observability-and-alerting-spec.md).

## Why this document exists

Strong platforms are not differentiated by features. They are differentiated by what they **refuse** to do.

Every spec in this stack will be pressure-tested by monetisation, growth, sponsor lobbying, partner asks, "just-this-once" exceptions, and the slow drift of expedient decisions. The Sacred Invariants are the rules where the answer is always **no**, even when the answer would help a quarter or close a partner.

If any other governance doc contradicts something in this doc, **this doc wins.**

## Decision hierarchy

**Canonical. Every other governance doc references this list. Never restated, never re-ordered, never abbreviated.**

When rules conflict, priority is:

1. **Safety**
2. **Truth**
3. **Trust**
4. **Freshness**
5. **Momentum**
6. **Readability**
7. **Relevance**
8. **Monetization**

Anything below loses to anything above. No exceptions. A paid item that is unsafe loses. A trusted source whose claim is false loses. A fresh signal with no momentum loses to a slightly older one that's accelerating. Density that destroys readability loses.

> **Momentum** is the rate of change of activity (arrivals, queue growth, signal creation slope). It is distinct from Freshness (which is absolute recency) and distinct from raw historical Density. See [`ranking-formula-spec.md`](./ranking-formula-spec.md) for how the 8 layers map to scoring components.

## The Invariants

### Safety

1. **User safety outranks engagement.** Any feature, ranking choice, or monetisation lever that increases harassment, stalking, impersonation, or abuse risk is suppressed even if it performs well.
2. **No exact user tracking, ever, by default.** Locations are shown as fuzzy radii (≤ 200 m). Permanent presence markers are forbidden. Persistent user trails are forbidden.
3. **Anti-stalking is structural, not policy.** The data model itself must make stalking impossible, not just disallowed.

### Truth

4. **Stale data must not masquerade as live.** Every signal carries lifecycle state (created → active → decaying → stale → expired → removed) and visibility reflects it.
5. **Signals always expire.** Nothing is visible forever. Default expiry applies even when premium extends it.
6. **The system never pretends there is activity when there is not.** Quiet zones render as quiet. Empty space is part of the map language. Synthetic activity is a structural prohibition.

### Trust

7. **Trust outranks payment.** Paid visibility may improve prominence within bounded policy limits. It may never fully override trust, fully dominate a district, hide higher-trust items, or manufacture credibility.
8. **Trust is operational permission, not reputation theatre.** It is earned, decayable, contextual, reversible. No actor is ever immune to correction.
9. **Boosts can help visibility. Boosts cannot manufacture credibility.**

### Readability

10. **Map readability outranks revenue.** If the map cannot be read, no amount of paid placement is allowed to make it worse.
11. **Quiet nights are valid states.** Low activity is not failure. The product does not fake heat.
12. **No single source permanently dominates a district.** District caps prevent sponsor monopolies, promoter spam, venue overexposure, user flooding.

### Engineering & operations

13. **If a rule cannot be measured, enforced, audited, thresholded, rate-limited, or state-transitioned, it is not production-ready.** Aspirational policy is not policy.
14. **Every alert has an owner.** If ownership is unclear, escalation fails.
15. **Observability leads to action, not just awareness.** Metrics without action thresholds are reporting, not governance.

### Scope

16. **HOTMESS will not become a generic social network, dating app, swipe feed, or chat-first messenger.** The signal economy is the kernel. Messaging is secondary infrastructure.
17. **The signal engine is sacred.** UI, monetisation, venue tooling, trust+safety, atmosphere, and launch strategy all serve it. Not the other way around.
18. **The map is not decoration. The map IS the product.**

## How to use this document

- **Engineering** — every PR that touches ranking, visibility, signals, trust, payment, or location must be checked against this list. If a change weakens any invariant, the PR is rejected regardless of how much value it ships elsewhere.
- **Product** — every roadmap addition must specify which invariant it strengthens, which it leaves neutral, and which (if any) it puts under pressure. The third category requires an explicit waiver from Phil before work starts.
- **Ops / moderation / trust** — when a hard call lands between invariants, walk down the decision hierarchy (Safety → Truth → … → Monetization) and pick the highest-priority answer. Document the call.
- **Investors / partners / sponsors** — this is the platform's brand promise as a system, not just a marketing line. The invariants are non-negotiable in commercial conversations too.

## What this is *not*

- It is not a list of nice-to-haves.
- It is not flexible under pressure.
- It is not subject to A/B testing.
- It is not subject to "just for this campaign."
- It is not subject to "the metric will look better if we relax it."

If those conversations happen, the answer is: re-read this document.

## Companion docs

- [`../HOTMESS_PRODUCT_BRIEF.md`](../HOTMESS_PRODUCT_BRIEF.md) — north star (what HOTMESS is).
- [`../HOTMESS_REVISED_STRATEGIC_BRIEF.md`](../HOTMESS_REVISED_STRATEGIC_BRIEF.md) — go-to-market.
- [`../HOTMESS_FOUNDER_CRITIQUE.md`](../HOTMESS_FOUNDER_CRITIQUE.md) — refinements (district-first, scarcity-as-core, venue ops moat, atmosphere as computed layer).
- [`ranking-constitution.md`](./ranking-constitution.md) — visibility law.
- [`signal-economics-spec.md`](./signal-economics-spec.md) — scarcity, lifecycle, amplification.
- [`trust-system-spec.md`](./trust-system-spec.md) — credibility model.
- [`launch-ops-playbook.md`](./launch-ops-playbook.md) — controlled density rollout.
- [`metrics-and-instrumentation-spec.md`](./metrics-and-instrumentation-spec.md) — operational measurement.
- [`observability-and-alerting-spec.md`](./observability-and-alerting-spec.md) — detection and response.
