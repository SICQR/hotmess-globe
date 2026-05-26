# Observability and Alerting Spec

> **Canonical, 2026-05-26 (Phil).** Tier-2 system logic for HOTMESS.

## Purpose

Define how HOTMESS detects problems in real time, escalates them, and routes them to the right response.

Sits below: [Ranking Constitution](../governance/ranking-constitution.md) · [Signal Economics](../governance/signal-economics-spec.md) · [Trust System](../governance/trust-system-spec.md) · [Developer Rules Checklist](../governance/developer-rules-checklist.md) · [Ranking Formula Spec](../governance/ranking-formula-spec.md) · [Launch Ops Playbook](./launch-ops-playbook.md) · [Metrics and Instrumentation](./metrics-and-instrumentation-spec.md).

**Its job is not to report performance. Its job is to detect failure early enough to act.**

## Core principle

Observability exists to preserve **truth, safety, trust, and readability** under pressure. If the system cannot notice when it is lying, cluttering, over-amplifying, or being gamed, the stack will eventually collapse.

## Observability priorities

1. Safety
2. Truth
3. Trust
4. Readability
5. Saturation
6. Launch stability
7. Monetization side effects

**Alerting always favors prevention over explanation.**

## Alert philosophy

An alert should mean one of: user safety may be compromised · truth integrity may be compromised · trust systems may be being gamed · readability degrading fast · saturation creating platform damage · moderation intervention needed · launch assumptions breaking.

**Alerts must be actionable. If nobody can do anything, it should not fire.**

## Alert classes

| Class      | When                                                                |
| ---------- | ------------------------------------------------------------------- |
| Info       | non-urgent system changes or expected transitions                   |
| Watch      | trend moving in wrong direction, not yet damaging                   |
| Warning    | damage likely soon if nothing changes                               |
| Critical   | active damage happening now                                         |
| Emergency  | immediate intervention required                                     |

Examples — **Info**: district entering quiet · boost window ending normally · trust score adjusting. **Watch**: mild boost concentration increase · trust decay accelerating · stale leakage creeping up. **Warning**: district congestion rising fast · unresolved reports accumulating · visible stale content near threshold. **Critical**: false urgency spike · safety-risk content spreading · trust collapse in source class · district unreadable. **Emergency**: runaway spam burst · active abuse campaign · misinformation amplification event · major ranking failure.

## Alert triggers

Combine: threshold breaches · rate-of-change spikes · anomaly detection · policy violations · repeated moderation events · source concentration anomalies · trust band collapse · stale leakage spikes · boost saturation events.

Single-point noise should not dominate. Persistent or clustered abnormalities should.

### Trigger types

1. **Threshold** — metric crosses predefined boundary (stale leakage above limit).
2. **Rate** — metric changes too quickly (trust drops sharply in short window).
3. **Pattern** — known bad pattern appears (repeated false busy from one venue cluster).
4. **Correlation** — multiple weak signals together (boost concentration ↑ + report volume ↑ + engagement quality ↓).
5. **Policy** — hard rule violated (paid item exceeding cap · unverified source gaining forbidden prominence).

## Core observability domains

### 1. Safety observability
harassment reports · stalking-risk suppressions · unsafe content visibility · repeat offender behavior · moderator emergency actions.

### 2. Truth observability
contradiction rate · correction latency · false urgency rate · false busy rate · false empty rate · stale truth leakage.

### 3. Trust observability
trust collapses · trust inflation · abnormal recovery speed · source band migration · dispute clustering · verification reversals.

### 4. Readability observability
label collisions · item count by zoom · cluster overload · item clutter score · scan failure patterns · abandonment during dense views.

### 5. Saturation observability
boost concentration · repeated source dominance · district saturation level · category imbalance · paid share of visible surface.

### 6. Launch observability
venue coverage · source mix · moderation response time · trust seeding performance · abuse pattern emergence · quiet-state health.

### 7. Monetization observability
paid item crowding · paid truth distortion · sponsor concentration · boost-to-utility ratio · revenue impact on readability.

## Dashboard structure

**Executive:** safety · truth · trust · readability · saturation · launch readiness.
**Ops:** district anomalies · alert queue · saturation hotspots · stale leakage · boost concentration · source dominance.
**Moderation:** disputed items · unsafe content · high-risk sources · freezes · appeals · false-positive suppression review.
**Launch:** district-specific rollout · density behavior · venue trust coverage · promoter concentration · manual intervention needs.
**Source:** trust trajectory · error patterns · abuse flags · suppression history · appeal outcomes.

## Threshold design

District-specific where possible · view-specific where needed · source-type aware · time-windowed · tied to action ownership.

Not too sensitive — false alarms weaken trust in the system.

Logic: green (normal variance) · amber (concerning trend) · red (immediate review) · critical (automated suppression or human intervention now).

## Practical thresholds (examples)

**Safety** — sudden abuse report spike · repeated stalking-risk content from same cluster · unsafe content escaping moderation.
**Truth** — correction latency exceeds SLA · false busy claims rise above limit · stale content surfacing as current.
**Trust** — score collapse in district cluster · verification reversals exceed expected rate · trust inflation in new account cohort.
**Readability** — label overlap crosses view threshold · cluster count exceeds visible capacity · abandonment rises in dense views.
**Saturation** — paid share of visible items exceeds cap · single promoter dominates local visibility · repeated boost patterns crowd organic relevance.
**Launch** — district remains synthetic-looking after rollout · low trust coverage persists too long · moderation can't keep pace.

## Alert routing

Targets: ops · moderation · trust systems owner · ranking owner · launch lead · product lead · emergency response.

Routing rules:
- safety → moderation first
- truth → ranking + moderation
- trust anomalies → trust systems owner
- saturation → ops + ranking
- launch issues → launch lead
- platform-wide failures → all relevant owners

Every alert: severity · owner · timestamp · scope · root signal · recommended first action.

## Escalation ladder

1. **Detect** — system identifies anomaly or threshold breach.
2. **Classify** — safety/truth/trust/readability/saturation/launch.
3. **Route** — correct owner or team.
4. **Contain** — automatic throttles, suppression, freezes, caps if needed.
5. **Review** — human/on-call owner inspects context.
6. **Resolve** — corrective action.
7. **Postmortem** — capture cause and what rule should change.

## Containment actions

May include: hiding a source · freezing a venue · reducing boost reach · tightening district caps · increasing rate limits · collapsing a cluster sooner · requiring verification before visibility · pausing a risky promotion.

Proportional — do not over-punish if evidence is weak.

## Incident states

Observed → Triaged → Contained → Investigating → Mitigated → Resolved → Monitored.

## Alert deduplication

Merge identical alerts within short window · group by district and source cluster · suppress repetitive alerts during known incidents · keep one canonical incident record · escalate only when severity changes.

Repeated alerts indicate persistent harm, not log spam.

## Noise control

Do not alert on: expected quiet states · harmless single-event fluctuations · normal decay behavior · minor trust drift · predictable boost expiry · temporary density changes resolving naturally.

**If observability becomes noisy, people will ignore real incidents.**

## Anomaly detection

Catch: unusual density bursts · trust manipulation · false urgency campaigns · promoter flooding · repeated report abuse · abnormal correction latency · sudden source dominance · new spam patterns.

Judge against: district history · time of day · day of week · venue type · source type · launch phase. A night district behaving like a night district is not an anomaly.

## Action ownership

- safety → moderation
- truth → ranking + moderation
- trust → trust systems owner
- saturation → ops + ranking
- launch → launch lead
- payment distortion → product + ops
- platform incidents → incident commander

If ownership is unclear, escalation fails.

## Alert metadata

Every alert: alert id · severity · category · district · source cluster · affected entities · triggering metrics · time window · last known good state · recommended action · owner · status.

## Suppression and false positives

Suppressible only with traceability: every suppressed alert logged · suppression has owner · repeated suppression triggers review · suppression must not hide true emergencies · alerts can be acknowledged/snoozed/resolved, never silently discarded.

False positives studied. False negatives treated more seriously.

## Incident response goals

Contain damage fast · preserve truth · protect users · keep map readable · prevent saturation spirals · restore trust quickly.

**Incident response should be faster than abuse adaptation.**

## Operational playbooks

**Safety:** suppress risky content → freeze source if needed → route to moderation → review scope and recurrence.
**Truth:** compare against verified → correct false data → reduce visibility on contradictory claims → restore corrected truth.
**Trust:** inspect trajectory → look for gaming → adjust bands if needed → freeze suspicious sources pending review.
**Saturation:** tighten boost caps → collapse clusters sooner → reduce repeated-source visibility → rebalance district mix.
**Launch:** slow rollout → add manual review → reduce source onboarding → adjust district controls.

## SLOs / response targets

info — no fixed urgency · watch — same-day review if persistent · warning — timely investigation · critical — rapid response · emergency — immediate intervention.

Exact SLAs vary by team/incident type but must be explicit.

## Observability invariants

- safety alerts outrank everything
- truth alerts cannot be ignored
- trust anomalies must be traceable
- quiet states are not alerts
- alert fatigue is a system failure
- every critical alert needs an owner
- containment must be reversible when appropriate
- observability must lead to action, not just awareness

## Implementation defaults for v1

- district-level alerts first
- source-cluster alert grouping
- automatic containment for critical safety and saturation incidents
- manual review for trust and truth edge cases


---

## Doctrine + invariants

This spec inherits from the canonical roots:

- [`../doctrine/product-doctrine.md`](../doctrine/product-doctrine.md) — the constitutional root narrative + operational loops.
- [`../doctrine/sacred-invariants.md`](../doctrine/sacred-invariants.md) — the 18 rules that cannot be relaxed + the canonical 8-layer decision hierarchy.

If this spec conflicts with either, **the root wins.**
