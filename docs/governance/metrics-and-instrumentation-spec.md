# Metrics and Instrumentation Spec

> **Canonical, 2026-05-26 (Phil).** Tier-2 system logic for HOTMESS.

## Purpose

Define how HOTMESS measures whether the system is healthy, truthful, legible, and resistant to abuse.

Exists to:
- detect signal inflation early
- measure trust quality
- quantify readability
- detect saturation
- track launch readiness
- support moderation and ops decisions
- prevent "looks alive" from replacing "is alive"

## Core principle

**If the platform cannot measure it, it cannot govern it.** Metrics are operational controls, not vanity analytics.

## Measurement hierarchy

1. Safety
2. Truth
3. Trust
4. Readability
5. Density and saturation
6. Engagement
7. Monetization

If a metric conflicts with safety or truth, it loses.

## Metric design rules

Every core metric: bounded · time-aware · segmented by district and source type · comparable over time · alertable · tied to action threshold.

Metrics never: purely global · purely vanity-driven · uninterpretable · detached from moderation/product action.

## Core metric families

### 1. Safety metrics
safety flag rate · blocked item rate · harassment report rate · stalking-risk suppression count · unsafe boost count · moderator intervention rate · repeat offender rate.
*Rising safety incidents = system is failing before the user sees the problem.*

### 2. Truth metrics
verified truth coverage · venue claim accuracy rate · event timing accuracy rate · queue confirmation agreement · stale truth leakage rate · contradiction rate · false busy / false empty rate · correction latency.
*Truth metrics stay high even when activity is low.*

### 3. Trust metrics
trust score distribution · trust growth rate · trust decay rate · trust recovery rate · verification pass rate · restricted account rate · disputed source rate · source reversal rate.
*Inflation too fast → abuse follows. Collapse too easily → ecosystem becomes brittle.*

### 4. Readability metrics
visible item count by zoom · cluster collapse rate · duplicate suppression rate · label collision rate · clutter score · paid-item crowding rate · average scan time · map abandonment rate in dense views.
*Failing when the user cannot decide what matters quickly.*

### 5. Density and saturation metrics
signals per district · signals per km² · active sources per district · category dominance ratio · source concentration score · boost concentration score · saturation threshold hits · density volatility.
*Healthy only if it stays readable and balanced.*

### 6. Ranking quality metrics
click-through to useful action · route-start rate · save rate · confirmation rate · rank reversal rate after new truth · disagreement between top rank and verified reality · freshness alignment score · trusted relevance score.
*Top-ranked items should prove useful, not just popular.*

### 7. Engagement quality metrics
useful confirmations · repeat opens · route conversions · genuine check-ins · constructive replies · low-value tap rate · bot-like interaction rate · engagement-to-utility ratio.
*Volume without utility is a warning sign, not success.*

### 8. Launch readiness metrics
verified venue coverage · trusted promoter coverage · active moderation capacity · saturation headroom · stale leakage rate · abuse detection latency · source quality mix · district stability score.
*Readiness = the system can survive real pressure without manual rescue.*

## Core health indicators

1. **Signal inflation rate** — signals increasing relative to useful activity.
2. **Average visibility half-life** — too long → stale clutter; too short → useful items vanish.
3. **District congestion score** — crowded relative to readable capacity.
4. **Boost saturation rate** — how often boosts stop adding value.
5. **Trust-weighted engagement** — interaction from trusted, useful sources.
6. **Correction latency** — time to correct false/stale info; shorter better.
7. **Stale leakage rate** — outdated content still surfacing; keep very low.
8. **False urgency rate** — system displays/amplifies urgency that isn't real; aggressively controlled.

## District-level metrics

Per district: active signal count · active source count · verified venue coverage · momentum trend · density trend · trust distribution · boost concentration · category balance · suppression rate · stale leakage rate · report volume · correction speed.

Compare against: district's own history · similar districts · expected night-pattern curves. **Low activity is not unhealthy if it's truthful.**

## Source-level metrics

For users · venues · events · promoters: trust trajectory · signal accuracy · update consistency · report frequency · dispute frequency · boost usage · repetition behavior · decay performance.

Feeds ranking, cooldowns, moderation directly.

## Freshness metrics

median age of visible items · age distribution by view · % active · % decaying · % stale · % expired-but-influencing.

If too many visible items are stale → product is failing realtime integrity.

## Momentum metrics

Distinct from density. Rate of change, not absolute volume: arrival rate · queue growth rate · signal creation slope · cluster acceleration · update frequency change · local trend persistence.

## Readability metrics in detail

label overlap rate · cluster collapse rate · representative leader accuracy · user dwell time before action · backtrack rate · zoom-toggle frequency · item scan depth · map abandonment rate.

If users zoom in/out without acting → map too dense or too vague.

## Trust metrics in detail

trust score distribution by band · time spent in each band · trust gain per verified action · trust loss per abuse event · appeal success rate · suppression reversal rate · confidence gap (source claims vs observed).

Recovery too slow → punitive. Gain too fast → easy to game.

## Moderation metrics

report volume · median report resolution time · disputed item count · suppression count · restoration count · false positive suppression rate · false negative abuse rate · moderator workload · frozen source count · appealed actions.

Healthy when decisive, accurate, fast enough.

## Boost metrics

boost count by district · boost duration · boost conversion to utility · boost decay slope · boosted item concentration · paid share of visible surface · saturation threshold hits · boost abuse detection rate.

If boosts increase clutter without utility → clamp down.

## Monetization metrics

paid placement rate · paid visibility share · revenue per district · sponsor concentration · payment-to-utility ratio · revenue impact on readability · paid item survival time · paid item click-to-action rate.

**Never interpret without clarity and truth metrics attached.**

## Alert thresholds

| Class    | Meaning                          |
| -------- | -------------------------------- |
| green    | normal                           |
| amber    | watch                            |
| red      | intervention required            |
| critical | immediate ops or moderation now  |

Examples: stale leakage above threshold → red · false urgency spikes → critical · district congestion above limit → amber/red · boost concentration above cap → red · trust collapse in source class → review.

## Readiness gates

Do not expand launch unless: verified venue coverage above minimum · correction latency below threshold · stale leakage below threshold · district congestion below threshold · moderation response within SLA · trust distribution stable · boost concentration within cap · false urgency under control.

A district is not ready if it only **looks** active. It must be operationally stable.

## Instrumentation rules

1. Segmentable by: district · source type · trust band · view level · time window · state transition.
2. Available for: daily ops · moderation · ranking tuning · launch readiness · abuse review.
3. Answers: is this real? is this readable? is this safe? is this trusted? is this saturated? is this worth amplifying?
4. **No metric exists without an action owner.**

## Metric invariants

- Safety metrics outrank all others
- Truth metrics are non-negotiable
- Readability is operational, not aesthetic
- Quiet states count as valid outcomes
- Density without utility is a failure
- Boost success measured against utility, not exposure alone
- Trust and freshness always tracked together

## Recommended dashboard structure

**Top-level ops:** safety · truth · trust · readability · density · saturation · launch readiness.
**District:** activity · stale leakage · boost concentration · trust distribution · cluster health · moderation load.
**Source:** trust trajectory · dispute history · update accuracy · boost usage · suppression events.
**System:** platform inflation rate · global freshness decay · average half-life · correction latency · abuse containment performance.

## Implementation defaults for v1

- district-level metrics first
- source-level metrics second
- global metrics only for executive oversight
- alerting on stale leakage, boost concentration, trust collapse
- separate truth metrics from engagement metrics
- do not treat volume as health
- measure correction latency from report to resolution

## Final rule

**If a metric cannot trigger a decision, it is not a system metric. It is just reporting.**
