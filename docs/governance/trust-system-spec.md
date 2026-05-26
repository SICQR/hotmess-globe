# Trust System Spec

> **Canonical, 2026-05-26 (Phil).** Tier-1 immutable governance for HOTMESS.

## Purpose

The Trust System defines how credibility is earned, lost, applied, and enforced across HOTMESS.

It exists to:
- protect map integrity
- reduce abuse and spam
- support truthful ranking
- shape signal persistence
- determine who can amplify what
- keep the ecosystem legible under pressure

**Trust is not reputation theater. Trust is operational permission.**

## Core principle

Trust measures how much the system can safely **believe, amplify, and persist** a source's claims.

**High trust** → more reliability · more ranking stability · more amplification tolerance · softer throttling · longer signal persistence.
**Low trust** → more skepticism · shorter lifespan · stricter limits · faster suppression · lower influence on district views.

Trust is a **dynamic operating variable**, not a static badge.

## What trust applies to

Signals · users · venues · events · promoters · district-level visibility · boost eligibility · moderation confidence · suppression thresholds. Tied to ecosystem behavior, not purely social.

## Core trust principles

1. **Trust is earned** — no source starts with full authority.
2. **Trust decays** — credibility does not remain forever without continued good behavior.
3. **Trust is contextual** — trustworthy for one signal type may be weak for another.
4. **Trust is behavioral** — observed accuracy beats identity claims.
5. **Trust is bounded** — no actor immune to correction.
6. **Trust must protect truth** — prefer honest uncertainty over confident falsehood.
7. **Trust must be reversible** — bad behavior reduces authority quickly enough to matter.

## Trust layers

1. **User trust** — reliability of signals/reports/interactions.
2. **Venue trust** — accuracy of live status, hours, operational claims.
3. **Event trust** — dependability of details, timing, attendance.
4. **Promoter trust** — accuracy and non-abusive promotion patterns.
5. **District trust context** — overall local signal environment confidence.

## Trust inputs

**Positive:** verification · historical accuracy · low report rate · consistent updates · corroborated claims · low abuse · strong moderation history · useful engagement over time.

**Negative:** misinformation · repeated false claims · harassment · spam · impersonation · location abuse · repeated disputes · manipulated activity · unresolved reports.

Trust reflects both quality and consistency.

## Trust accumulation

Increases gradually, not instantly. Good behavior: accurate signals repeatedly · correct stale-info updates · honest venue confirms · corroboration from others · low report rates over time · avoiding spam/repetition.

Grows **faster** when source is verified · claims repeatedly confirmed · behaves consistently over long window.
Grows **slower** when source is new · unverified · acts in dense or disputed environments.

## Trust decay

Triggers: inactivity over long windows · stale/uncorrected data · repeated low-quality posts · unresolved disputes · contradictory updates · spam-like behavior · sudden posting-pattern changes.

Decay varies by actor: venues decay slower with stable history · users decay faster if infrequent/inconsistent · promoters decay faster if over-amplifying or misrepresenting.

**Trust is not permanent. If behavior changes, trust follows.**

## Verification tiers

| Tier            | Authority                                                                  |
| --------------- | -------------------------------------------------------------------------- |
| Unverified      | no special authority · stricter limits · shorter persistence · lower amplification |
| Soft verified   | some historical confidence · moderate authority · limited boost privileges |
| Verified        | strong confidence · longer persistence · better ranking stability · higher trust ceiling |
| High-trust      | consistently accurate · low abuse · stronger operational authority · tolerance for rapid updates |
| Restricted      | flagged or under review · limited trust · reduced visibility · tighter moderation |

Verification is revocable.

## Trust and ranking

Influences: rank position · signal decay rate · visibility persistence · district dominance limits · suppression thresholds · boost effectiveness.

**High trust** stays visible longer · needs fewer confirmations · survives mild uncertainty better.
**Low trust** decays faster · requires more corroboration · loses visibility earlier when disputed.

Trust does not replace freshness. A trusted stale claim is still stale.

## Trust and economics

**High trust** allows: longer durations · shorter cooldowns · slightly more flexibility · better amplification efficiency · more stable visibility.
**Low trust** causes: longer cooldowns · shorter durations · lower boost efficiency · stronger saturation penalties · more aggressive throttling.

Trust does not create unlimited economic power.

## Trust and boosting

**High trust:** boosts more effective within bounds · slightly longer · saturate later.
**Low trust:** boosts decay faster · saturate earlier · cap more aggressively.

**Important rule: boosts can help visibility but cannot manufacture credibility.**

## Trust and suppression

Suppression becomes easier as trust decreases. Low-trust sources face: lower rank persistence · faster hiding · stronger repetition penalties · quicker cluster collapse · more aggressive review.

Suppression based on behavior, not just status.

## Trust and reports

Reports are signals, not truth by themselves. Handling considers: reporter trust · reported source trust · report volume · repeat-report patterns · corroboration · time window · category.

A single report should not automatically destroy a source. Repeated credible reports matter quickly.

### Report weighting logic

**High-trust reporter** → stronger signal · higher confidence · more likely to trigger review.
**Low-trust reporter** → weaker signal · may still matter if corroborated.
**High-trust reported source** → should not be suppressed too easily without evidence.
**Low-trust reported source** → easier to throttle or review.

Reports feed into trust decay and moderation queues.

## Venue trust

Reflects: operational accuracy · hours accuracy · queue honesty · live status reliability · update consistency · user dispute history · moderation outcomes.

False claims → lose visibility · lose boost eligibility · lose district influence · lower confidence score.
Strong accuracy → more persistent visibility · better ranking stability · stronger confidence in live state claims.

## Promoter trust

High-risk because incentivized to amplify movement. Depends on: event details accuracy · honesty of promotion · update quality · saturation behavior · abuse history · dispute rate · venue alignment.

Promoters never allowed to turn promotion into misinformation. Affects: event amplification · boost caps · district saturation tolerance · timing window control.

## User trust

Good signals: accurate location-adjacent reporting · consistent non-spammy activity · useful confirmations · low abuse history · stable contribution patterns.

Bad signals: repeated fake claims · stalking-like behavior · harassment · location manipulation · repeated low-value posting · repeat abuse reports.

Mainly influences: how much system believes user signals · how fast signals decay · amplifiability · rate-limit aggressiveness.

## Contextual trust

Trust varies by context. Examples: a user trusted for "going out" but not queue claims; a venue trusted for hours but not crowd estimates; a promoter trusted for lineup but not attendance.

Trust is not one number. It is a category-specific confidence layer.

**Recommended categories:** location confidence · timing confidence · occupancy confidence · event accuracy · abuse risk · identity consistency.

## Appeals and correction

There must be paths for: source correction · report dispute · moderation review · trust restoration · suppression appeal · verification-loss appeal.

Appeals are not instant resets. But they are real.

## Trust recovery

Recoverable, but slowly. Requires: sustained good behavior · accurate updates · lack of new reports · successful verification · moderation approval when needed.

Easier than starting from zero, harder than one-off good behavior.

## Trust freezing

When evidence unclear · reports conflicting · abuse risk high · venue/promoter claim could cause harm. Freezing preferable to overreacting.

## Trust and privacy

Must not require invasive tracking. Built from: behavioral consistency · direct submissions · corroborated claims · moderation outcomes. **Does not rely on exact personal surveillance.** Hard invariant.

## Trust invariants

- Trust is earned
- Trust decays
- Trust is contextual
- Trust affects visibility
- Trust affects amplification
- Trust cannot be bought into full dominance
- Trust must be revocable
- Trust must protect truth over optics
- Trust cannot require exact user tracking

## Decision hierarchy

When trust conflicts with other factors, the canonical 8-layer hierarchy in [`sacred-invariants.md#decision-hierarchy`](./sacred-invariants.md#decision-hierarchy) applies:

**Safety → Truth → Trust → Freshness → Momentum → Readability → Relevance → Monetization**

A trusted false claim still loses (Truth > Trust). A low-trust truthful claim may be shown with caution. No payment overrides safety or core truth.

## Operational questions to lock next

- exact trust score ranges
- trust decay curves
- verification requirements by actor type
- report weighting formulas
- category-specific trust models
- recovery thresholds
- freeze and appeal triggers
- how trust affects boost caps
- how quickly trust changes after abuse
