# D22 — HOTMESS Temporal Doctrine

**What deserves permanence. What deserves to be forgotten.**
**The memory architecture of a nightlife OS.**

**Status:** Draft for Phil's sign-off
**Written:** 2026-05-31
**Author:** Phil
**Inherits from:** D08 (visibility), D15 (care language), D20 (identity layers), D34 (trajectory).
**Inherited by:** D21 (payments), D24 (trust weighting), D25 (messaging), D31 (venue partner power), D32 (AI & automation), D33 (memory & permanence), all future surfaces that store anything.

---

## §0. Sacred Temporal Rules

Two sentences sit above everything else in this doctrine. Both are constitutional.

> **HOTMESS should remember enough to preserve continuity, but never enough to reconstruct a life.**

> **HOTMESS supports the right to become unknown again.**

The first sentence is the architecture. Two failure modes, both prevented by the same line: too little memory breaks continuity, too much memory enables reconstruction. The architecture lives in the middle.

The second sentence is the emotional axis. Queer lives require recovering ambiguity — through transition, sobriety, scene exits, name changes, returning after time away, surviving abuse. The right to become unknown again is the architectural commitment that HOTMESS supports these movements without breaking legal accountability. It is not GDPR phrasing. It is not privacy-tech language. It is the HOTMESS register — human, nocturnal, infrastructural, emotionally intelligent.

Together: the first sentence defines what to remember; the second defines who gets to fade.

---

## §1. The Architectural Question

D22 is not a privacy policy doctrine. It is the **Temporal Doctrine**.

The wrong question to ask of a retention architecture: *"how long do we keep data?"*

The right question: **"what kind of memory is morally legitimate for a nightlife OS?"**

Mainstream platforms answer the wrong question. They keep what they can keep, for as long as compliance permits, accumulating indefinite logs justified by analytics, debugging, abuse detection, training data, and "future product needs." That accumulation is how nightlife and social systems accidentally become surveillance systems — not through a single decision, but through:

- indefinite retention
- convenience logging
- analytics accumulation
- unresolved joins
- cached trajectories
- "temporary" debugging
- undeleted media
- message persistence drift

D22 closes the gap between HOTMESS philosophy and HOTMESS storage. The OS philosophy is already ahead — D08, D14, D20, D34, D33 placeholder. The storage philosophy catches up here.

---

## §1.5. Memory Has Emotional Tone

Different memory kinds should *feel* different. Implementation language must carry the emotional register of the memory it stores, or the doctrine's emotional intelligence is lost in the code.

| Memory Type | Emotional Character |
|---|---|
| Presence memory | Fleeting |
| Beacon memory | Atmospheric |
| Mutual memory | Warm but degradable |
| Care memory | Protected |
| Legal memory | Cold, invisible |
| Recovery memory | Quiet, non-performative |

Practical consequence: code names, log shapes, UI surfaces, and copy referring to these memories must match the tone above. Logging Presence memory with the same gravity as Legal memory blurs the doctrine. Surfacing Care memory with the same language as Mutual memory breaks the §5 protection. Tone is part of the architecture.

---

## §2. The Five Kinds of Memory

HOTMESS distinguishes five categorically different kinds of memory. Each has its own retention behaviour, its own access rules, its own destruction path. No memory operates on the wrong category's rules.

| Memory Kind | Example | Purpose |
|---|---|---|
| **Trajectory memory** | "Phil was at Eagle at 2:14am" | Operational; never persists long |
| **Continuity memory** | "These two users have crossed paths repeatedly" | Pattern preservation, no reconstruction |
| **Atmospheric memory** | "Vauxhall active after 2am during Pride weekend" | City-mood, aggregate, non-reversible |
| **Evidentiary memory** | "Dispute thread, SOS dispatch, moderation transcript" | Safety/legal continuity, quarantined access |
| **Care memory** | "User invoked aftercare check-in at 4am" | Safety preservation, never socialised |

These five are not interchangeable. Trajectory memory cannot bleed into Atmospheric in identifiable form. Care memory cannot leak into Continuity as trust signal. Evidentiary memory cannot surface in social discovery. The architecture enforces these boundaries — convenience does not override them (D20 §8 hook).

---

## §3. The Three-Tier Memory Architecture

The structural backbone. Maps the five memory kinds onto the system's actual storage behaviour:

| Memory Tier | Decay Behaviour | What It Preserves |
|---|---|---|
| **Trajectory memory** | Aggressive decay — minutes to days, never weeks for identifiable form | Operational presence and movement |
| **Continuity memory** | Slower decay — months for crossings; asymmetric per user | Mutual rhythm without biographical detail |
| **Atmospheric memory** | Persistent aggregate — irreversible into individual trajectory | City emotional residue, scene rhythms |

A practical example of all three operating together:

You drop a beacon in Soho at 1am. Within an hour, the beacon expires (Trajectory). Within a week, the fact that you and another user crossed at that beacon may be preserved if you become mutuals (Continuity, only for the pair, asymmetric). Within a month, the fact that Soho's 1am density was high that Saturday persists in the city-mood aggregate (Atmospheric, no individual reconstruction).

The same event leaves residue at three temporal scales, in three different identifiability registers. None of the three can be reverse-engineered into the others.

The three terms — **trajectory, continuity, atmosphere** — are canonical HOTMESS vocabulary. They sit alongside *off-grid*, *shared trajectory*, and *dignity floor* as foundational nouns the OS is built from. Future contributors implementing any retention behaviour must be able to answer: *which of the three am I implementing?* If the answer is unclear, the design is unclear.

### §3.1 Decay Is Architecture, Not Loss

A conceptual inversion that must travel through every implementer's head:

> **Decay is not unfortunate deletion. Decay is dignity-preserving architecture.**

Mainstream platforms treat data loss as a failure mode — uptime metrics, backup completeness, "lost message" recovery flows, "you accidentally deleted X, want to restore?" The implicit framing is that retention is the default-good and deletion is the default-bad.

HOTMESS inverts this. The default-good is the appropriate decay for each memory kind. Retention beyond decay schedule is the failure mode. Backups that survive the decay schedule are bugs. Caches that outlive their underlying retention are bugs. "Restore deleted message" is doctrinally suspect.

This inversion is technically clarifying as well as philosophically right: it converts retention into an explicit decision (what survives, why, for how long) instead of an implicit accumulation.

---

## §4. The Irreversibility Rule

> **Atmospheric memory must be non-reversible into individual trajectory memory.**

This is the sacred sentence that makes D22 actual architecture rather than theatre.

The aggregation pipeline that produces Atmospheric memory must structurally destroy reconstructability. Specifically prohibited:

- "Hidden raw data" stored alongside aggregates "just in case"
- Internal-only identifiable logs that survive the aggregation step
- Admin-accessible underlying-trajectory data
- Aggregation that retains per-user breakdowns even if hidden from UI
- Aggregation that retains timestamps fine-grained enough to reconstruct individual movement
- Aggregation that retains location precision fine-grained enough to identify specific beacons

The transformation is **one-way**. If a debugger or admin can answer the question "who was at Eagle at 2:14am last Saturday?" from atmospheric logs, the pipeline fails D22 §4 and the data must be destroyed.

City memory is allowed to persist. Individual movement underneath that city memory is not retrievable. The architecture enforces this through the destruction of raw inputs at aggregation time, not through access controls layered on top of retained data.

> **Irreversibility must survive ownership change.**

This is a governance-survival clause. Acquisition, investor pressure, venue partnerships, moderator escalation, AI migration, analytics rebuilds — none of these may re-enable reconstruction. A future operator who argues "the new infra stack needs raw event retention again" is doctrinally wrong, regardless of business case. The architectural decision is binding across governance changes. If irreversibility lives only as a current-team policy, it isn't architecture; it's a habit. D22 requires it to be the former.

### §4.1 The Anti-Creep Rule

Atmospheric memory has a single, binding restriction on its use:

> **Aggregate atmosphere may influence ambience, never enforcement.**

Permitted uses of atmospheric memory:
- City-mood rendering on the globe
- Heatmaps of district activity
- Atmospheric language in copy ("Vauxhall was heavy this weekend")
- Time-of-night rhythm cues
- Editorial curation informed by aggregate density
- Care-resource placement informed by aggregate need

Doctrinally prohibited uses, regardless of how the technical case is framed:
- Predictive policing of any kind
- Behavioural restriction based on density patterns
- Moderation escalation derived from atmospheric signals
- Desirability ranking influenced by where users have been
- Crowd suppression at specific venues
- Venue scoring or shadow-ranking of partners
- Recommendation systems that weight users on aggregate trajectory
- Surge pricing or scarcity-based commerce affordances

If atmospheric memory is used for enforcement, the doctrine has been violated — and the technical pipeline must be rebuilt to remove the enforcement path. Atmosphere is mood. Enforcement requires individual decisions, which require individual data, which is not retained. The anti-creep rule prevents "atmosphere" from becoming surveillance by abstraction.

---

## §5. Care Memory Doctrine

Care cannot behave like ordinary social memory. The asymmetry is structural.

> **Care memory exists to preserve safety continuity, not identity permanence.**

> **Users should not have to repeatedly relive care events to remain protected by the system.**

Both sentences are binding. The first prevents care from drifting into reputation; the second prevents care from becoming permanent emotional surveillance.

### §5.1 The Five Care Memory Layers

| Layer | Behaviour |
|---|---|
| Immediate care state | Fully visible to active care workflows |
| Operational retention | Retained for platform safety / legal continuity |
| User-visible recall | Aggressively minimised |
| Long-term analytical memory | Aggregate only |
| Public / social propagation | Prohibited |

Concrete consequences:

- Invoking SOS never becomes social memory. The fact that you triggered SOS is not visible to anyone outside the active dispatch and the moderator pool.
- Care events never become trust prestige. D24 weighting must not increase because you used care.
- No "this user has prior incidents" leakage to other users.
- No venue visibility of user care history.
- No discovery weighting based on care invocation.
- No reputation mutation based on care patterns.

### §5.2 Care Erasure Model

Immediate full erasure is **not allowed**, because malicious actors could weaponise it instantly after incidents. Indefinite retention is also not allowed, because users must not fear invoking care for permanence reasons.

The middle architecture, mapped to §6 erasure states:

| State | Behaviour |
|---|---|
| Active retention | Operationally accessible (live workflow, dispatch) |
| Quarantined | Hidden from normal workflows; safety + legal access only |
| Restricted archive | Compliance / safety only; not surfaced in any user-facing query |
| Aggregate remainder | Statistical only; no individual reconstruction |
| Full destruction | After legal expiry window |

A typical care-event lifecycle: Active retention during dispatch and immediate follow-up. Quarantined after 90 days (configurable per event class). Restricted archive after one year. Aggregate remainder after two years. Full destruction after the statutory retention floor.

The user can request acceleration into the next state at any time, subject to safety-quarantine windows during which acceleration is blocked (the malicious-actor protection). But acceleration is one-way; the user cannot pull a care event back into Active retention to perform forgiveness or reconciliation — care memory is not socially permeable.

---

## §6. The Five Erasure States — Universal

The care model in §5.2 is one application. The universal model applies to all five memory kinds:

| State | What it means |
|---|---|
| **Active retention** | Operationally accessible to live workflows |
| **Quarantined** | Hidden from normal workflows; specific privileged access only, audit-logged |
| **Restricted archive** | Compliance / safety / legal only; never surfaces in any user-facing query, ever |
| **Aggregate remainder** | Statistical only; the irreversibility rule applies (§4) |
| **Full destruction** | After legal expiry; the row is gone |

Different memory kinds traverse these states on different schedules. Trajectory memory races through Active → Aggregate within days. Continuity memory holds in Active for weeks, Quarantined for months. Care memory follows §5.2. Evidentiary memory may stay Quarantined for years.

The schedule is per memory class, codified in the per-layer retention ladders in §9.

---

## §6.5 Asymmetric Forgetting

One of the most advanced primitives in the entire HOTMESS stack. Do not bury it; do not skim it.

**Memory between humans is never symmetrical.** Two people who shared a trajectory do not remember it the same way, do not weight it the same way, do not need it preserved the same way. The system that pretends memory is symmetrical lies about how human relationships actually work.

Examples of natural asymmetry HOTMESS must support:

- I forget you faster than you forget me. The night meant more to one of us. The system should not equalise this artificially.
- We shared a trajectory but not the same meaning. One of us was passing through; one of us was looking for something.
- A venue remembers crowds differently than it remembers individuals. The Eagle holds a memory of Pride 2024 in aggregate; it does not need to remember every face.
- The city remembers differently than the platform. London has held queer nightlife memory for decades; HOTMESS holds a much smaller slice and must know its place.
- A user wants to forget; a mutual wants to remember. Both are legitimate. The system supports both by separating their views.

**Implementation:**
- Mutual history is stored as two independent views, one per user, joined only at query time for the symmetric intersection (D24 trust weighting).
- Either user may prune their side without affecting the other's recollection.
- When one side prunes, the intersection — and therefore D24 weight — decays for both. Trust is mutual; its decay is shared even when its memory is not.
- Care events, marketplace handoffs, beacon crossings, chat threads all inherit this asymmetric model. None of them stores "the canonical truth" of an interaction; each user holds their version.

This is not a privacy mechanic. It is a humility mechanic. HOTMESS does not arbitrate which person's memory of a shared moment is "correct." Both versions persist; either may fade.

---

## §7. The Right to Become Unknown Again

This is the deepest emotional architecture in the doctrine.

> **HOTMESS supports recovering ambiguity, not just deleting accounts.**

Queer systems must support this because queer lives demand it:

- People transition
- People come out, un-come-out, re-come-out
- People become sober
- People leave nightlife and return
- People relocate scenes
- People survive abuse and want the abuser's view of them erased
- People change names
- People change selves

The mainstream pattern — one "delete account" button that nukes everything or nothing — fails all of these. HOTMESS supports the queer-life pattern instead:

- **Recover ambiguity** — Presence Identity (D20 §2.1) can be retired and rebuilt without losing Legal Identity standing. Old display name fades; new display name takes the floor; mutuals are not automatically informed.
- **Asymmetric forgetting** — A user can request that their participation in mutual history be forgotten *from their side* while the other party's recollection persists. The crossing becomes one-sided memory.
- **Scene exit** — A user can declare a scene exit; the system stops surfacing their historical signals in atmospheric memory (the aggregate persists; their individual contribution to it is no longer credited or linked).
- **Return** — A user returning after exit re-enters the OS as ambient presence; their past trajectory is not auto-surfaced to old mutuals. Re-introduction is the user's choice, not the system's.

The technical implication: identity persistence (D20) is decoupled from social-trace persistence (D22). A user can keep their Legal Identity continuity (for compliance, payouts, recovery) while shedding their socially-traceable identity completely. **Becoming socially untraceable without breaking legal accountability** is the architectural goal.

This principle may become one of the defining HOTMESS differentiators. No mainstream queer platform supports it cleanly. HOTMESS does.

---

## §8. Three Distinct Deletions

The flat "delete account" affordance is doctrinally insufficient. HOTMESS distinguishes three operations:

| Operation | What it does | What it preserves |
|---|---|---|
| **Delete account** | Ends Presence; suspends Safety; pauses Recovery | Legal Identity for compliance window; Continuity memory in mutuals' view (until they accept asymmetric forgetting) |
| **Erase trajectory** | Forgets pattern memory (Trajectory + Continuity from the user's side) | Legal Identity standing; aggregate Atmospheric memory; Care memory under §5.2 quarantine rules |
| **Destroy legal obligations** | Removes the final retention floor | Only possible after statutory retention windows expire; not a user-initiated action |

These three operations are user-facing in different ways:

- Delete account is the social exit.
- Erase trajectory is the deeper exit — the user becomes hard-to-reconstruct even by HOTMESS.
- Destroy legal obligations is a passive event that happens on a timer, not a button. The user does not press it; the system reaches it.

A user wanting full erasure invokes Delete account, then Erase trajectory, then waits for legal expiry. The doctrine does not pretend these are the same.

---

## §9. Per-Layer Retention Ladders

D20 defined four identity layers. D22 defines retention for each, plus three additional categories:

### §9.1 Presence Identity retention
Aggressive decay. Live presence is operational only — minutes-to-hours. Historical presence (avatar, bio, display name) retained while account is active; cleared on Delete account.

### §9.2 Safety Identity retention
Long retention while account is active (safety primitives must work). On Delete account, Safety Identity moves to Quarantined; trusted contacts are notified of account closure but not of details. Restricted archive for the duration of any related open care event; Aggregate remainder thereafter.

### §9.3 Legal Identity retention
Compliance-bound. UK / EU statutory minimums for tax, payments, AML. Cannot be deleted before the statutory floor. Stored in the Legal namespace (D20 §8) with strict RLS. Never surfaced cross-layer.

### §9.4 Recovery Identity retention
Persists until the user actively renounces it. A user who deletes their account but later wants to recover that pseudonym can — Recovery Identity outlives Presence to support reactivation. Cleared only on explicit erasure or after a long inactivity window (suggest 24 months).

### §9.5 Convergence retention
Slower decay than Trajectory, faster than Continuity. Records of two users crossing at a venue persist for the pair (not for the system) for a window that supports "we crossed last weekend, want to chat?" affordances. Default 30 days; configurable per user. Asymmetric — each user can prune their side independently.

### §9.6 Mutual retention (asymmetric)
The doctrine-shaped part. Two users in a mutual relationship each hold a view of their shared history. Either party can prune their view without affecting the other's. Trust weighting (D24) uses the symmetric intersection — when one side prunes, the weighting decays for both. Trust is fragile; both parties have agency over it.

### §9.7 Media retention
Photos, voice notes, video, shared albums. All media is treated as expiring by default — explicit retention requires user action ("save to my profile permanently"). Default: ephemeral. Off-grid periods (D08) automatically expire media generated during them. Shared albums in chat threads decay with the thread; the thread's retention is governed by D25 when written.

---

## §10. Cross-Doctrine Inheritance

Every doctrine that stores anything inherits from D22. Specifically:

- **D08 Visibility** — off-grid users get the strongest retention protections. Media and trajectory created in off-grid state is ephemeral by default with no opt-in to persistence.
- **D14 Routing Continuity** — routes do not persist beyond the trajectory they served. Route history is operational only.
- **D15 Care Language** — care events follow §5.
- **D19 Marketplace** — listing data follows D19 §5.11 sunset combined with §9.7 media rules. Transaction logs hit Legal retention (§9.3).
- **D20 Identity** — the four layers each get their own retention ladder (§9.1–§9.4). The Postgres-view test (D20 §8) extends here: no view may join layers across retention boundaries.
- **D24 Trust Weighting** — D24 may only weight on data that currently exists in an accessible memory tier. Weighting on Quarantined or Archived data is prohibited; weighting on Aggregate is allowed only at aggregate scope.
- **D25 Messaging (future)** — message retention follows §9.7 for media, with thread-level retention to be defined in D25 itself. D22 binds: messages are not Legal Identity, they are Convergence memory, and they decay accordingly.
- **D31 Venue & Partner Power (future)** — venues never receive raw trajectory data. Venues may receive aggregate atmospheric data subject to §4 irreversibility. Partner-shared data has explicit retention contracts visible to the user.
- **D32 AI & Automation (future)** — AI systems may read what currently exists in the accessible memory tier. AI may not retain inferences past the underlying data's retention. Model training is bounded by aggregate-only access (§4).
- **D33 Memory & Permanence (future)** — D33 defines what persists into the long-term memorial layer (dead venues, departed mutuals, historical scenes). D22 hands D33 the architecture; D33 decides what crosses the long-decay threshold into permanent memory.
- **D34 Trajectory** — the trajectory ladder (D34 §2) maps directly to retention behaviour. Ambient stage is Trajectory memory (aggressive decay). Coordinated and Converged stages are Convergence memory. Trusted is Continuity. Care is §5.

---

## §10.5 The Rejection of Total Recall

Modern systems drift toward total recall: searchable everything, complete history, infinite scroll identity, permanent archives, "your data forever." HOTMESS explicitly rejects this drift.

> **Continuity is more important than exhaustive recall.**

The OS should feel like **nightlife memory**: emotionally persistent, informationally incomplete. You remember the night. You don't remember every face. You remember the rhythm. You don't remember the timestamps. The city carries the texture of what happened; the individual details have softened.

Doctrinally prohibited UI affordances:
- Full-history search across a user's own past beyond the current Active retention tier
- "Year in review" surfaces that reconstruct trajectory from aggregated data
- Permanent archives of expired beacons
- Searchable chat history beyond the message retention window
- Profile timelines that surface previously-decayed content
- Recovery affordances that pull data back from Quarantined or Restricted Archive states
- **Persistent behavioural replay** — AI systems, analytics dashboards, or "user journey" tooling that replays a user as a reconstructed behavioural simulation. This is the next-generation surveillance pattern, prohibited at the doctrine level before it can drift in.

When in doubt about whether a recall affordance is appropriate, ask: *would nightlife memory work like this?* If the affordance presumes a perfect log of personal history that a human would never have for their own life, the affordance is doctrinally wrong.

---

## §11. Operational Mechanics

The doctrine must be enforceable in code, not poetry. The architectural sections above set the philosophy; this section sets the engineering contracts that make it real.

### §11.1 Retention Ladders, Codified

Each per-layer ladder in §9 is implemented as a state machine. Rows carry a `retention_state` column with values from §6 (Active / Quarantined / Restricted Archive / Aggregate Remainder / Destroyed). State transitions are driven by scheduled jobs operating per memory class. The schedule is published in the doctrine appendix, audit-logged on execution, and reviewed quarterly.

### §11.2 Destruction Windows

Each memory class has a published destruction window — the duration after entering Restricted Archive before Full Destruction fires. Windows are not "guidance"; they are scheduled jobs that delete rows. Missing a destruction window is a bug, not a deferral. Backups containing data past its destruction window must be pruned.

### §11.3 Aggregation Transforms

The atmospheric aggregation pipeline (§4) is implemented as a one-way transform with these properties: raw inputs deleted on aggregation success; aggregates carry no foreign keys back to raw; aggregates carry coarse-grained time and location buckets only (configurable per memory class but never fine enough to identify); pipeline runs as a job, not a query, so admins cannot re-run "in detail mode."

### §11.4 DSAR Handling

Data Subject Access Requests under GDPR / UK DPA are honoured per the four-layer model (D20 §8). DSAR returns Presence, Safety, Recovery contents the user has standing to access. Legal layer contents are returned subject to compliance overrides. Mutual memory (asymmetric, §6.5) returns only the user's own view; the other party's view is not disclosed even on request. Care memory (§5) DSAR follows quarantine rules — the user receives summarised state, not raw transcripts of others' care actions involving them.

### §11.5 Cold Storage Rules

Cold storage exists only for Restricted Archive memory. Cold-stored data is encrypted at rest with keys held separately from operational systems; access requires explicit audit-logged ticket; access is bounded to compliance or safety investigation. Cold storage is not a "convenience archive"; it is the bridge between hot Quarantined state and Destruction.

### §11.6 Backup Destruction

Backups inherit retention. A row destroyed in production must be destroyed in backup within the backup-rotation window (default 30 days). Long-retained backups are bugs, not safety nets. The destruction of a row implies the destruction of its echoes; backup architecture must support this.

### §11.7 Derived-Data Handling

Aggregates, analytics tables, materialised views, trust weights, model embeddings — all derived data inherits the retention of its inputs. When an input is destroyed, derived data is recomputed without it. Derived data is not exempt from the doctrine just because it is not the original.

### §11.8 Cache Invalidation

Caches must respect retention. A cache holding a row beyond that row's retention window is a bug. CDN edge caches, in-memory caches, query-result caches, and client-side caches all inherit retention. Cache TTLs must not exceed the underlying data's retention envelope.

### §11.9 Moderation Retention

Moderation transcripts are Evidentiary memory under §2 / Restricted Archive under §6. They persist long enough to support pattern detection and appeal but are not surfaced cross-user. Moderation outcomes (warning, suspension, ban) attach to the affected user's Safety layer; the underlying transcripts attach to the moderation namespace and decay on the moderation schedule, not the user's account schedule.

### §11.10 Auditability

Every cross-layer query, every state transition, every cold-storage access, every DSAR fulfilment is audit-logged. Audit logs themselves are subject to retention (a longer envelope than the data they describe — typically 7 years for compliance). Audit logs are read-only by privileged audit roles only; they are not user-facing.

---

## §12. Acceptance Tests

Three binding tests. Each is independently sufficient to fail a build.

### §12.1 The Reconstruction Test
> If a deleted user can be reconstructed — name, presence pattern, social graph — from logs, aggregates, or admin tooling, the system fails D22.

### §12.2 The Care Leakage Test
> If a care event surfaces in social memory, trust weighting, venue visibility, or any user-facing query outside the active care workflow, the system fails D22 §5.

### §12.3 The Atmospheric Irreversibility Test
> If atmospheric memory can be reversed into individual trajectory memory by any code path — privileged or otherwise — the aggregation pipeline fails D22 §4 and must be rebuilt.

A fourth informal test for code reviewers: when in doubt about whether something should be retained, ask the §0 question. *"Does this remember enough to preserve continuity? Does this remember enough to reconstruct a life?"* If the second answer is yes, the retention is wrong.

---

## §13. Final Operating Sentence

**HOTMESS should remember enough to preserve continuity, but never enough to reconstruct a life.**

That sentence is the architecture. The doctrine above is the load-bearing scaffolding. Future contributors: if a feature, integration, or partner request requires breaking this sentence — the request is doctrinally wrong, regardless of the storage convenience it offers.

The OS becomes real here. Most nightlife and social systems accidentally become surveillance systems by accumulating memory they didn't need. HOTMESS does not, because D22 decides — explicitly, structurally, by category — what deserves permanence and what deserves to be forgotten.

The city remembers what cities remember. The system forgets what people deserve to leave behind.
