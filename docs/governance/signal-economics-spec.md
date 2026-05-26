# Signal Economics Spec

> **Canonical, 2026-05-26 (Phil).** Tier-1 immutable governance for HOTMESS.

## Purpose

Signal Economics defines the scarcity, lifecycle, and amplification rules for HOTMESS signals.

It exists to:
- keep the map legible
- preserve freshness
- prevent spam and inflation
- make visibility feel earned
- protect trust
- support monetization without corrupting the system

**Signal economics is not pricing alone. It is the operating physics of attention.**

## Core principle

Signals must feel **scarce enough to matter** and **frequent enough to keep the map alive**.

Too cheap → noise, trust collapse, visibility meaningless.
Too scarce → dead map, no contribution, never alive.

The goal is **controlled scarcity**.

## What counts as a signal

Signals are temporary, lightweight acts of presence or intent. Examples: going out · here now · moving to venue · crew arriving · queue building · energy rising · afters · event starting · event ending.

Signals should be: short-lived · context-specific · location-fuzzy · easy to understand · hard to abuse.

## Core economic rules

1. **Signals are finite** — every signal has a limit; nothing lasts forever.
2. **Signals decay** — every signal visibly weakens over time.
3. **Signals are tiered** — verified venue/promoter signals carry more authority than casual user signals.
4. **Visibility is bounded** — a signal can rise, but only within its allowed range.
5. **Boosts are constrained** — paid amplification cannot break trust, safety, or readability.
6. **Quiet is valid** — low activity is a real state; the economics support honest emptiness.

## Signal types

### 1. User intent signals
Examples: going out · here now · looking for a room · heading there · crew up.
Role: lightweight · frequent · short-lived · low authority at city scale.

### 2. Venue state signals
Examples: open · busy · queueing · afterhours · closing soon.
Role: higher authority · more stable · slower decay · useful for macro ranking.

### 3. Event signals
Examples: starting soon · live now · at capacity · nearly done.
Role: scheduled · time-bound · good for routing · strong in district/city views.

### 4. Promoter signals
Examples: boosted event · featured tonight · lineup live · last entry.
Role: amplification layer · monetizable · bounded by trust and saturation.

## Signal creation rights

**Users** — personal intent signals; cannot impersonate venue truth; cannot flood the map.
**Venues** — venue state signals; update hours/operational states; confirm live conditions.
**Promoters** — event signals; boost event visibility; cannot override venue or safety constraints.
**Moderators / ops** — verify, suppress, or correct disputed signals; mark stale or misleading entries.

## Default quotas (conservative at launch)

**Users:** 1 active intent signal · 1 new signal per cooldown window · limited repeated posting in same district.
**Trusted users:** slightly higher limits · shorter cooldowns · more tolerance for legitimate updates.
**Venues:** multiple operational updates · still rate-limited · live status not spammable.
**Promoters:** event updates allowed · boosts capped · district saturation enforced.

## Durations (starting ranges)

| Signal type           | Default       | Max                                  |
| --------------------- | ------------- | ------------------------------------ |
| User intent           | 60–120 min    | 4 hours                              |
| Venue state           | 2–4 hours     | until venue status changes / end of night |
| Event                 | until start   | until event end                      |
| Promoter boost        | 30–90 min     | short windows only; faster decay than core venue truth |

Durations depend on trust: higher trust → modestly longer; low trust → shorter persistence.

## Cooldowns

Anti-spam infrastructure. Exist at: per user · per signal type · per district · per venue · per promoter.

**Free users** — longer cooldowns · fewer active signals · stricter repetition penalties.
**Premium users** — shorter cooldowns · more control · *not* more authority.
**Trusted users** — adaptive cooldowns · better tolerance for useful updates.
**Low-trust accounts** — longer cooldowns · tighter quotas · reduced amplification.

Cooldowns punish repetition, not legitimate movement.

## Saturation rules

The point where more signals reduce usefulness. The system caps:
- visible signals per zoom level
- repeated signals from the same source
- boosted items per district
- promoted items per time window
- category dominance

District saturation prevents: promoter flooding · sponsor takeover · duplicate venue spam · user noise overpowering. A district should never feel occupied by one kind of signal alone.

## Boost mechanics

**Allowed:** increase prominence within fair range · improve placement among similarly trusted items · extend visibility slightly · help important events cut through noise.

**Not allowed:** override safety · override trust · erase stale status · permanently dominate a district · manufacture activity · acceptable unreadable clutter.

Boosts decay quickly. Boosts do not become permanent structural advantage.

**Recommended behavior:** strong at start · rapidly tapering · capped by district saturation · capped by trust score · capped by freshness.

## Trust interaction

High trust → longer duration · softer decay · smaller cooldowns · better ranking persistence · more efficient boosts.
Low trust → faster decay · harsher throttling · weaker amplification · more aggressive suppression · lower district influence.

Trust is a **rate modifier on the whole signal economy** — not cosmetic.

## Signal lifecycle

**created → active → decaying → stale → expired → removed.** Visibility reflects state. See [signal-lifecycle.md](../architecture/signal-lifecycle.md) for detail.

## Quiet-state economics

When density is low: verified venues carry more weight · scheduled events more visible · quiet districts remain visible as quiet · **do not fake heat**.

Quiet framed as: low current activity · still usable for planning · not a failure state.

## Congestion pricing (optional, later)

During peak congestion: boosts cost more · district caps tighten · visibility windows shorten · repetition penalties increase.

Introduce only if needed. Do not overcomplicate the MVP.

## Economic hierarchy

Privilege sources in this order:

1. Verified venue truth
2. Verified event truth
3. Trusted promoter updates
4. Trusted user signals
5. Free user signals
6. Low-trust or unverified items

Users do not matter less — infrastructure truth must stay stable.

## Anti-inflation rules

No endless posting · no unlimited boosts · no duplicate flood strategies · no permanent visibility · no fake urgency loops.

If a source tries to dominate: shorten durations · reduce placement · increase cooldowns · cap amplification · suppress repetition.

## Readability protection

Readability is an **economic constraint**. When dense: collapse into clusters · hide lower-priority items first · paid items must not remain at the expense of clarity · strongest representative signal survives, not every duplicate.

**The map stays useful before it stays monetizable.**

## Immutable invariants

- Signals are finite
- Signals always expire
- Visibility must be earned
- Boosts are bounded
- Quiet periods are valid
- Trust outranks payment
- Readability outranks revenue
- Safety outranks engagement
- Stale data must not masquerade as current

See [sacred-invariants.md](../doctrine/sacred-invariants.md).

## Implementation questions to lock next

- exact signal durations by type
- exact cooldowns by tier
- active signal quotas per user
- boost caps per district
- how trust modifies decay
- how saturation is detected
- how long boost effects last
- when a signal is hidden vs dimmed
- whether premium changes quantity or just control


---

## Doctrine + invariants

This spec inherits from the canonical roots:

- [`../doctrine/product-doctrine.md`](../doctrine/product-doctrine.md) — the constitutional root narrative + operational loops.
- [`../doctrine/sacred-invariants.md`](../doctrine/sacred-invariants.md) — the 18 rules that cannot be relaxed + the canonical 8-layer decision hierarchy.

If this spec conflicts with either, **the root wins.**
