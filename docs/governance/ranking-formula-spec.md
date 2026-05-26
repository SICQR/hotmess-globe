# Ranking Formula Spec

> **Canonical, 2026-05-26 (Phil).** Tier-2 system logic.
> Implements the [Ranking Constitution](./ranking-constitution.md) as scoring + ordering + suppression logic.

## Purpose

Define how HOTMESS scores, orders, and suppresses items for visibility.

## Core principle

**Ranking is not popularity. Ranking is controlled relevance under governance constraints.**

## Ranking hierarchy

Implements the canonical 8-layer hierarchy from [`sacred-invariants.md#decision-hierarchy`](./sacred-invariants.md#decision-hierarchy):

**Safety → Truth → Trust → Freshness → Momentum → Readability → Relevance → Monetization**

**If a lower layer conflicts with a higher layer, the higher layer wins.** Each of the 8 layers below maps to a scoring component (gate, weighting, or suppression rule) in the order above.

## Inputs to ranking

Primary inputs:
- safety status
- verified truth status
- source trust score
- item freshness
- local momentum
- category balance
- district density
- readability pressure
- user intent
- engagement quality
- boost state
- payment state

## Hard exclusions

An item must be suppressed or heavily downranked if:
- it is unsafe
- it is stale beyond threshold
- it is contradicted by verified truth
- it is from a source below trust minimum
- it creates saturation beyond cap
- it is paid-promoted beyond allowed bounds
- it causes readability failure

## Ranking components

### 1. Safety gate
Unsafe items cannot rank normally. If risky, reduce visibility or suppress immediately. **Safety override is absolute.**

### 2. Truth gate
Contradicted, stale, or unverified claims cannot outrank verified truth. If truth confidence is low, the item should not receive top placement.

### 3. Trust weighting
Source trust affects rank, but only inside the truth and safety bounds. Newly trusted sources should not leapfrog established verified sources without evidence.

### 4. Freshness weighting
Recent items gain lift only while they remain plausibly current. Freshness decays over time. Expired items should not retain prominence.

### 5. Momentum weighting
Items gaining real local traction get controlled lift. Momentum must be current and source-aware. **Momentum is not the same as historical volume.**

### 6. Readability weighting
Dense districts should reduce redundant prominence. Cluster overload pushes the system toward representative items, not every item. **No rank should create unreadable surfaces.**

### 7. Relevance weighting
User intent matters after the governance gates above. Relevance should improve usefulness, not override truth.

### 8. Monetization weighting
Paid influence is bounded and secondary. Payment may affect placement within a safe and truthful envelope only. Paid items may not displace better verified items beyond cap.

## Rank suppression rules

Suppress or cap items when any of these are true:
- false urgency detected
- stale leakage detected
- cluster saturation exceeded
- source repetition dominates
- boost concentration too high
- category imbalance too extreme
- label or surface readability is harmed

## Tie-breaking

If two items are otherwise equal, prefer:
- newer verified truth
- higher trust source
- better readability fit
- lower saturation cost
- stronger local momentum
- better user utility

If still equal, **preserve diversity.**

## District-aware ranking

Ranking must adapt by district:
- Dense districts require stronger readability controls.
- Quiet districts should not be artificially inflated.
- Every district ranks relative to its own history and expected pattern.

## Source-type aware ranking

Different source types rank differently:

| Source     | Bias                                                |
| ---------- | --------------------------------------------------- |
| Venues     | higher truth weight                                 |
| Events     | higher freshness and timing sensitivity             |
| Users      | stronger trust and abuse controls                   |
| Promoters  | strongest saturation and payment constraints        |

## Freshness and decay behavior

- Visible rank decays as content ages.
- Decay speed varies by item type.
- Expired items may remain accessible but lose visibility priority.

## Boost interaction

- Boosts may increase exposure only inside governance bounds.
- Boosts must never override safety or truth.
- Boosted items downweighted when saturation rises.
- **Boost success measured by utility, not exposure alone.**

## Negative ranking signals

Reduce rank when:
- contradictions appear
- user reports accumulate
- corrections arrive
- stale state detected
- duplicate content floods the district
- trust declines
- item is overrepresented relative to value

## Output requirements

Ranking output should include:
- final score
- rank band
- suppression reason (if any)
- freshness state
- trust state
- district adjustment
- boost adjustment
- explanation metadata for review

## Explanation rule

**Every ranked item should be explainable in governance terms.**
If ranking cannot be explained, it is not reviewable.

## Testing requirements

The ranking formula should be tested against:
- safe vs unsafe
- true vs false
- fresh vs stale
- trusted vs untrusted
- dense vs sparse districts
- boosted vs organic
- quiet vs active states

## Failure modes to avoid

- popularity masquerading as truth
- boost masquerading as relevance
- stale content staying elevated
- dense districts becoming unreadable
- trust inflating too quickly
- payment overpowering governance

## Final rule

A ranking system is only acceptable if it **improves utility without violating safety, truth, freshness, or readability.**
