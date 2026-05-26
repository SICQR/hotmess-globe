# Launch Ops Playbook

> **Canonical, 2026-05-26 (Phil).** Tier-3 runtime operations for HOTMESS.

## Purpose

Define how HOTMESS is introduced, controlled, and stabilized in live markets.

Sits below: [Ranking Constitution](../governance/ranking-constitution.md) · [Signal Economics](../governance/signal-economics-spec.md) · [Trust System](../governance/trust-system-spec.md) · [Developer Rules Checklist](../governance/developer-rules-checklist.md) · [Ranking Formula Spec](../governance/ranking-formula-spec.md).

Turns the system into an operating rollout plan.

## Core principle

**Launch is not growth at all costs. Launch is controlled density creation.**

The goal: seed enough truthful activity that the map feels alive, without allowing spam, manipulation, or unreadable clutter to form before the trust system can defend the product.

## Launch objectives

1. **Create early legibility** — users immediately understand what the map is for · districts don't look empty or fake · live truth visible before volume exists.
2. **Seed trusted activity** — prioritise verified venues · honest events · reliable promoters · avoid opening too broadly too early.
3. **Prevent early inflation** — narrow boost rights · strict quotas · harsh repetition penalties.
4. **Build habit without noise** — users find utility fast · no synthetic activity needed.
5. **Protect trust from the start** — bad early data causes long-term damage · bias toward caution.

## Launch posture

Conservative posture for v1: limited geography · limited source classes · limited boost availability · aggressive moderation · tight density caps · narrow permission scope.

**The system should feel slightly underfilled rather than overrun.**

## Launch phases

### Phase 1 — Seeded private/semi-private pilot
Goal: verify mechanics · test ranking and decay · observe density · refine trust flows.
Characteristics: small district count · curated venues · controlled promoters · no broad open posting.

### Phase 2 — Constrained public release
Goal: expose real behavior · observe organic signal patterns · validate quiet-state behavior · test abuse resistance.
Characteristics: limited user creation · strict rate limits · manual monitoring · fast intervention.

### Phase 3 — Expanded city rollout
Goal: scale without breaking readability or trust.
Characteristics: more districts · more venues · wider event ingestion · automated saturation protections.

### Phase 4 — Multi-district maturation
Goal: normalise operations · reduce manual intervention · tune trust and density heuristics.
Characteristics: stable operational playbooks · more automation · localised policy adjustments.

## District selection

**Prioritise** districts with: active nightlife · venue concentration · event density · known browsing utility · manageable geographic boundaries.

**Avoid** districts that are: too sparse · too chaotic · too large · too dependent on perfect data · too vulnerable to spam domination.

A district should be **small enough to stay legible and large enough to be useful.**

## Venue onboarding

Requirements: verified identity · location confirmation · hours confirmation · operational state ownership · update accountability · moderation contact path.

Sequence: top venues first · trusted small venues second · broader venue onboarding later. Behavior observed before granting wide update authority.

## Event onboarding

Early requirements: verified venue association · clear timing · responsible promoter identity · explicit end time/window · limited boost eligibility.

Event data validated before influencing district perception. Avoid early event spam becoming the default UX.

## Promoter onboarding

Treated as high-risk (amplification actors). Launch rules: small set of trusted promoters · narrow boost rights · cap concurrent promotions · monitor saturation closely · strong penalties for misleading activity.

Promoters prove reliability before gaining flexibility.

## User onboarding

Contribute, but don't flood. Defaults: conservative posting quota · 1 active intent signal · strict repetition controls · stronger limits for new accounts · modest permission growth with trust.

Users rewarded for truthful participation, not volume.

## Trust seeding

Use: manual verification · curated source lists · history-based confidence · moderator review · corroborated claims.

Trust must not be inflated by raw activity alone. At launch, trust prefers: known venues · known events · known operators · obvious truth over volume.

## Density orchestration

The hardest launch problem is not content — it is density. The map must feel alive without becoming unreadable.

- show fewer items than the system can technically hold
- cluster early and aggressively
- prefer representative leaders
- suppress duplicates quickly
- leave space for context
- do not overfill quiet districts

**Per-view tuning:** street → strict local relevance · venue → operational truth first · district → cluster leaders only · city → broad utility, not full completeness.

## Moderation readiness

Day-one minimum capabilities: verify source claims · suppress bad actors · freeze disputed states · restore corrected records · review high-impact boosts · audit district anomalies.

Moderation must act faster than abuse can compound. **If moderation cannot keep pace, launch scope is too wide.**

## Saturation monitoring

Live ops metric, not postmortem. Track: signals per district · boosts per district · source concentration · category dominance · cluster collision rate · unreadable density score · average visible item age · stale item leakage.

If saturation rises: tighten caps · shorten boost windows · increase repetition penalties · collapse more aggressively · slow new contributions. **Density problems are operational incidents.**

## Early market controls

Keep market mechanics constrained: low boost limits · short promotion windows · narrow payment influence · category caps · source caps · district caps · manual intervention rights.

The system is not allowed to self-amplify too early.

## Quiet-state handling

Show real emptiness · surface verified upcoming events · avoid fake urgency · use quiet as a legitimate state.

**Do not solve quiet with deception. Solve it with truthful utility.**

## Abuse prevention at launch

Watch for: spam bursts · fake busy claims · promoter flooding · repetitive duplicates · boost abuse · location manipulation · false urgency loops · trust gaming.

Response: immediate throttling · visibility reduction · trust penalty · review queue · source restriction if needed.

**Launch should assume hostile optimization exists.**

## Operational dashboards

Essential health signals: active signal count · trusted signal ratio · district saturation score · boost concentration · stale leakage rate · report volume · suppression count · venue verification coverage · event accuracy rate · user contribution quality.

If metrics degrade → reduce launch surface area.

## Manual override policy

Ops can: pause boosts · freeze districts · suppress sources · restore removed items · reweight verified truth · limit new signups in hot zones.

**Manual override is a feature, not a failure, during launch.**

## Launch sequencing priority

1. verified venues
2. verified events
3. trusted promoters
4. trusted users
5. broader user contributions
6. monetized amplification

**Do not invert this sequence. Monetization must not arrive before truth stability.**

## Launch invariants (day one)

- trust outranks payment
- truth outranks trust
- safety outranks everything
- quiet states are valid
- stale data must not look live
- boosts are bounded
- density must remain readable
- source dominance must be capped
- moderation must be able to intervene
- launch should be conservative by default

## Failure modes to avoid

1. **Synthetic heat** — system looks active but isn't truthful.
2. **Boost collapse** — paid amplification overwhelms readability.
3. **Trust inflation** — bad actors gain authority too quickly.
4. **Density overload** — too much signal destroys legibility.
5. **Quiet panic** — overreacting to low activity and faking life.
6. **Venue gaming** — venues exaggerate queue/occupancy.
7. **Promoter flooding** — promoters occupy too much of the district.
8. **Slow moderation** — abuse compounds before intervention.

## Recommended launch defaults

Small district count · limited source onboarding · strict posting quotas · short boost windows · aggressive cluster collapse · conservative trust growth · visible stale decay · strong manual moderation · narrow monetization rules.

## Implementation rule

If a launch rule cannot be enforced as a **cap · threshold · state transition · permission flag · moderation action · dashboard metric**, it is not ready for rollout.


---

## Doctrine + invariants

This spec inherits from the canonical roots:

- [`../doctrine/product-doctrine.md`](../doctrine/product-doctrine.md) — the constitutional root narrative + operational loops.
- [`../doctrine/sacred-invariants.md`](../doctrine/sacred-invariants.md) — the 18 rules that cannot be relaxed + the canonical 8-layer decision hierarchy.

If this spec conflicts with either, **the root wins.**
