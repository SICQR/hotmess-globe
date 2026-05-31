# D20 — HOTMESS Identity Doctrine

**The HOTMESS theory of identity. Foundational. All downstream doctrines inherit.**

**Status:** Locked
**Written:** 2026-05-31
**Author:** Phil
**Supersedes:** D03 (identity-system-spec) becomes a subordinate technical spec under D20.
**Inherited by:** D01, D02, D08, D09, D10, D11, D15, D17, D19, D21, D22, D24, D25, D28, D31, D32, D33.

---

## §0. Sacred Identity Rule

**A user may be socially pseudonymous while remaining legally accountable to the platform.**

This single sentence unlocks the entire HOTMESS operating system. It is the architectural breakthrough that lets queer nightlife, safety, compliance, and pseudonymity coexist without contradiction.

Every clause that follows is a structural defence of this sentence.

---

## §1. Core Thesis

**HOTMESS verifies capability, not social legitimacy.**

Verification exists to answer only these questions:
- Can this person safely participate?
- Can this person transact?
- Can this person be trusted with escalation paths?
- Can this person recover access?
- Can HOTMESS satisfy its legal obligations?

Verification does NOT answer:
- Is this person important?
- Is this person desirable?
- Is this person popular?
- Is this person socially authentic enough?

The first list is binary capability. The second list is hierarchy. HOTMESS is built on the first; queer nightlife products that drift into the second always die culturally before they die commercially.

---

## §2. The Four Identity Layers

HOTMESS identity is **four distinct realities** that share a user but never collapse into one another.

> **No layer may silently escalate privileges into another layer.**

That clause closes the structural loophole. No Stripe-KYC-becomes-marketplace-boost. No safety-trust-becomes-discovery-priority. No recovery-success-becomes-trust-weighting. No venue-partnership-becomes-profile-credibility. Cross-layer effects must be explicit, audited, and documented in this doctrine — never silent, never automatic, never inferred.

| Layer | Purpose | Visibility |
|---|---|---|
| **Presence Identity** | How you appear socially | Public (under D08 visibility state) |
| **Safety Identity** | Trusted-contact + escalation confidence | Private; surfaces only on safety events |
| **Legal Identity** | Payments, age, compliance | Private; never surfaces to other users |
| **Recovery Identity** | Reclaiming access after loss / ban / device change | Private; activated only on access events |

These layers must not bleed into each other. Specifically:

- Legal Identity (real name, document number, address, tax ID) **never** appears in Presence or Safety surfaces. Not in profiles, not in chats, not in marketplace listings, not in dispute UI shown to other users, not in moderation transcripts shared cross-user.
- Safety Identity (trusted contact list, SOS routing, escalation tree) **never** appears in Presence or Legal surfaces. A buyer never sees who a seller's SOS contacts are. A finance reconciliation never lists a user's care network.
- Presence Identity (display name, avatar, bio, beacons) carries **no** Legal Identity by default. Pseudonymous presence is the default state; legal name appearing in presence is opt-in and reversible.
- Recovery Identity (backup email, phone, trusted-contact attestation, device binding) is used only during access recovery and never as a participation signal.

This separation is how HOTMESS preserves off-grid dignity, nightlife fluidity, pseudonymity, safety, and compliance **simultaneously**. Most platforms can't solve this because they store identity as one collapsed blob. HOTMESS does not.

---

## §3. Identity Extraction — Prohibited

HOTMESS does not require, request, or reward forced exposure as a path to trust.

Explicitly banned:
- Forcing face photos
- Forcing public names
- Forcing social-account linking (Instagram, X, Telegram public handles)
- Forcing public handles to be real or verifiable
- Coercive profile completion ("complete your profile to use the app")
- "Trust through exposure" framing in any onboarding or messaging copy
- Gating basic discovery, beacons, or messaging behind photo upload
- "Users with more info get more matches" pattern
- "Show your face for better visibility" pattern
- Verified-badge culture (no creator-style blue checks, no "real user" pips)

Queer nightlife products always drift toward *"show more of yourself to be trusted."* HOTMESS rejects that drift at the doctrine level. Trust comes from the things listed in §4, not from disclosure.

---

## §4. Where Trust Actually Comes From

Trust is accrued, not extracted. The inputs are:

- **Continuity** — account longevity, return cadence, presence stability
- **Behaviour** — exchange completion rate, dispute outcomes, moderation signal weight
- **Mutual graph** — relationship density inside the HOTMESS community (subject to D08)
- **Accountability** — willingness to participate in safety / dispute / care flows
- **Escalation survivability** — has the user navigated SOS, care, or dispute paths in good faith?
- **Platform confidence** — internal weighting from D24 (Contextual Trust Weighting) based on the above

None of these are visible to other users as scores, badges, or ranks. They inform the system's behaviour quietly. Per D24: the OS feels different to high-trust users without ever telling them they are high-trust users.

> **Trust weighting may never use desirability, attractiveness, follower density, engagement farming, or social popularity as inputs.**

Specifically prohibited from ever entering D24: profile-tap counts, likes, message volume, response rate, photo engagement, "fan" counts, view-through metrics, beacon-tap heatmaps tied to identity, any signal whose underlying value is "how much do other people want this user." That entire class of input is rejected. The platform that absorbs those signals becomes Grindr-with-better-copy. HOTMESS is structurally not that.

---

## §5. Public Display Rules

### §5.1 What CAN appear publicly (opt-in only)

- Chosen display name (pseudonym permitted)
- Optional avatar
- Optional pronouns
- Optional bio
- Optional location precision (city / neighbourhood, subject to D08)
- Optional event participation tags
- Optional commerce activity (per D19)

### §5.2 What CANNOT appear publicly (ever)

- Real name (unless the user explicitly opts in, with a reversible toggle)
- Email
- Phone
- Trusted contacts
- Verification documents or document state
- IP, device info, or location precision beyond user-chosen
- Payment details, payout state
- Exact age (only "18+" status; never date of birth, never bracket like "30s")
- Verification tier or score
- Internal trust weighting

**Age aesthetics are not system classification.** HOTMESS does not infer age categories. Social language like "young," "mature," "twink," "daddy," "boy," "older" remains **self-described social language only** — never a system classification, never a recommendation system input, never a search facet computed by the platform. Users may describe themselves in those terms in their own bio; the system does not derive them, store them as structured fields, or use them in any matching, ranking, or routing logic. The moment those become system categories, the recommendation layer turns into a desirability hierarchy. Doctrinally rejected.

### §5.3 No Verification Display

Explicitly prohibited from any HOTMESS UI:
- Public verification tiers ("Verified Member," "Bronze / Silver / Gold")
- Visible trust scores or seller scores
- Creator-style blue checks or coloured pips
- "Top member," "Top seller," "Power user"
- Verified-seller badges in marketplace listings (see D19 §5.10)
- Profile prestige inflation (followers, "fans," anything countable that performs status)

A future contributor will eventually want to ship "Verified Pro Seller" badge to boost conversion. This doctrine is the answer.

---

## §6. Pseudonymity is First-Class

Pseudonymous accounts are **not** a limited tier. Users on pseudonymous accounts receive **full** platform access:
- Selling and buying (Preloved, Drops, Tickets — per D19)
- Beacons (Drop, Looking, Selling, Convergence — per D12 / D19 §6.10)
- SOS and Care suite
- Messaging and mutual relationships (per D25 when written)
- Event participation
- Globe and Pulse presence

Pseudonymity does not reduce D24 trust weighting input. A long-running pseudonymous account with strong behavioural trust is weighted identically to a long-running account with legal name on the public profile.

> **Disclosure is not a trust accelerant.**

That sentence is one of the core philosophical breaks between HOTMESS and mainstream social products. Mainstream products treat exposure as proof of legitimacy: more face, more name, more linked accounts → more trust. HOTMESS rejects that equation entirely. Trust is behavioural and temporal, not photographic and biographical. This protects queer ambiguity, nightlife fluidity, experimentation, safety, pseudonymity, and masculinity without exposure pressure. Future contributors: this sentence is foundational. Do not weaken it.

The only thing pseudonymity gates is **legal-identity-bound capability** — and that gate is per-capability, not blanket:
- Receiving payouts above a jurisdictional threshold requires Legal Identity verification (per D21).
- Cross-border high-value ticket resale may require additional KYC (per D21).
- Account recovery after device loss requires Recovery Identity attestation (per §8).

In all those cases, the legal identity stays in the Legal layer. It does not propagate to Presence. The pseudonym remains.

---

## §7. Verification Methods, By Layer

Verification methods are layer-specific. A method valid for one layer does not automatically satisfy another.

### §7.1 Presence Identity verification
- Account creation
- Email confirmation
- Optional avatar upload
- Optional bio
- Pseudonymous handle permitted; uniqueness check; no real-name requirement
- No age proof at this layer

### §7.2 Safety Identity verification
- Optional trusted-contact registration (Telegram, phone, email per contact)
- SOS routing acceptance
- Care preferences declaration
- Recovery-question registration
- Re-confirmation cycle (periodic, low-friction)

### §7.3 Legal Identity verification
- Age confirmation (18+) at first marketplace listing, first ticket purchase, or first 18+ content engagement — whichever comes first
- Stripe Connect KYC at first payout request
- Document verification for high-value ticket resale (threshold defined in D21)
- Tax ID collection at Pro+ seller tier
- AML / sanctions screening per jurisdictional requirement

### §7.4 Recovery Identity verification
- Backup email
- Backup phone
- Trusted-contact attestation (a registered safety contact can vouch for account ownership during recovery)
- Device binding (last-known device, last-known auth session)
- Recovery questions answered

Each method belongs to its layer. A user who completes Stripe Connect KYC has verified Legal Identity. That fact does NOT make their Presence Identity "verified" in any visible sense. The Presence display does not change.

---

## §8. Cross-Layer Information Boundaries

The four-layer model is enforced at the data layer, not just the UI layer. Code shape:

- Legal Identity stored in a logically separate table / namespace with stricter RLS than Presence.
- Safety Identity (contacts, SOS routing) stored separately from Presence; never joined to Presence in any user-facing query.
- Recovery Identity accessed only by the recovery flow; never read during normal operation.
- Internal trust weights (D24) computed from cross-layer signals but exposed publicly **only** as behaviour, never as values.

A useful test: if you can write a Postgres view that joins all four layers into a single user-facing JSON object, the architecture is wrong. The layers should be queryable together only by privileged, audit-logged paths (moderation tooling, legal compliance, the user themselves on their own account settings).

> **Convenience is not justification for layer collapse.**

Future engineers will argue that joining the tables is easier, that maintaining four namespaces is overhead, that one user-blob is "cleaner." All correct on engineering ergonomics. All wrong on doctrine. The four-layer model is the architecture; convenience does not override it. If a proposed refactor would collapse layers in the name of simplicity, the refactor is rejected.

---

## §9. Off-Grid Compatibility (D08 Hook)

A user in `off_grid` visibility state retains:
- Full Legal Identity standing (payouts, age compliance, tax)
- Full Recovery Identity standing
- Full Safety Identity standing (SOS still works, trusted contacts still notify)

Their Presence Identity is suppressed per D08 — they do not appear in nearby surfaces, do not emit presence signals (per D19 §1 Presence Integrity), and their commerce activity does not reconstruct presence.

The four-layer model is what makes this possible. Without separation, off-grid would either break compliance (you'd lose payouts) or leak presence (you'd be discoverable through Safety or Legal surfaces). The separation is the architectural enabler of off-grid as a real state.

---

## §10. Coercive Patterns Prohibited

These patterns cannot ship. If a future feature proposal contains any of them, the proposal is doctrinally wrong:

- "Complete your profile to unlock [basic feature]" — when the basic feature is discovery, messaging, beacons, or care.
- "Users with more info get more matches / better visibility / more reach."
- "Show your face for better trust."
- "Verified profiles get priority."
- Onboarding flows that gate basic discovery on photo upload.
- "Trust" badges that require disclosure.
- Soft-coerced upsells that frame pseudonymity as a defect.
- "Premium verification" as a paid tier.
- Disclosure prompts that re-fire on every session ("complete your profile" nag).

The onboarding floor is: email + age + pseudonymous handle. Anything beyond that is opt-in, reversible, and rewarded with utility — not with social status.

### §10.1 No Trust Nudging

The subtle versions of coercion are equally prohibited. Specifically banned:

- "Complete your profile for more visibility"
- "People trust profiles with photos"
- "Add more details to improve replies"
- "Verified members respond more often"
- "Profiles with bios get 3x more …"
- "Suggested next step: add a photo"
- "Your profile is X% complete" (when the missing X% is voluntary identity disclosure)
- "Other users like you tend to add …"
- Soft prompts that re-fire after dismissal
- Any framing that ties personal disclosure to outcomes the platform actually controls

These nudges are how extraction culture enters products — not through a hard demand, but through a thousand tiny social-proof prompts. The hard versions are banned in §10; the soft versions are banned here. The doctrine applies to both with equal force.

---

## §11. Verification Lifecycle

Verification is **asynchronous to participation**.

> **You do not earn the right to be here.**

That sentence is anti-platform philosophy. Most apps treat participation as conditional legitimacy — prove yourself, then access. HOTMESS treats participation as ambient human presence first. Capability gates only fire when a capability is invoked. Preserve this sentence exactly; it is the philosophical floor of every onboarding decision.

- **New account:** Presence layer minimum. Email + age + handle. Full read access, full beacon access, full messaging.
- **Active participation:** Trust accrues from behaviour per §4. No additional verification requested.
- **Selling threshold:** First payout triggers Stripe Connect KYC. Legal Identity verified once, stored in Legal layer.
- **High-risk event:** Dispute, SOS, recovery, AML flag — pulls only the relevant identity layer into the flow. Other layers stay untouched.
- **Account recovery:** Recovery Identity activates; on success, normal participation resumes; on failure, escalation per §12.

The lifecycle is event-driven and minimal. Verification scales with what the user is doing, not with what they look like or how much they've posted.

---

## §12. Identity Loss & Reclamation

Four loss modes are doctrinally supported:

### §12.1 Device loss
Recovery via backup email + recovery questions, or trusted-contact attestation. Re-establishes Presence on a new device with full continuity. Mutuals, beacons, history preserved.

### §12.2 Email loss
Recovery via trusted-contact attestation + Recovery Identity backup. Email reissued. Presence preserved.

### §12.3 Forced revocation / ban appeal
A ban does not erase identity. The user retains Legal Identity for compliance (refund processing, dispute resolution, tax records per D22). Presence is suspended. Appeal path uses Recovery + Safety layers as evidence.

### §12.4 Memorialisation (D33 hook)
Deceased users transition to a memorialised state — Presence preserved as community memory, Legal cleared per D22 retention, Safety frozen. Detailed in D33 when written.

---

## §13. Compliance Floor

Verification gathered for compliance is **used only for compliance**:

- UK Online Safety Act — age verification for 18+ content
- GDPR — lawful basis for data collection, retention bounded per D22
- Stripe Connect KYC — payout enablement
- AML / sanctions screening — high-value transactions
- Local age verification regulations (UK / EU jurisdictional rules)

Data gathered under any of these does not propagate to D24 trust weighting, D17 surface rendering, D19 marketplace ranking, or any user-visible decision. Compliance data lives in the Legal layer and is read only by compliance paths.

A user who provides their passport to Stripe Connect does not become "more trusted" in any user-facing sense. The doc clears KYC and goes back into the Legal namespace. The Presence layer is unchanged.

---

## §14. Identity Across Doctrines (Inheritance Map)

Every other doctrine inherits from D20. Specifically:

- **D08 Visibility** — visibility states act on Presence Identity. Legal / Safety / Recovery layers are unaffected by visibility state changes.
- **D19 Marketplace** — sellers transact with Legal Identity verified, but appear in marketplace surfaces with Presence Identity only. §1 Presence Integrity is enforceable because the layers are separate.
- **D21 Payments** — payout-eligible identity is Legal Identity. Verification flow operates on the Legal layer, never modifies Presence.
- **D22 Retention** — each layer has its own retention envelope. Presence may be deleted on RTBF while Legal is retained for tax. Recovery may outlive active Presence to support reactivation. D22 enforces per-layer retention windows.
- **D24 Trust Weighting** — inputs include behaviour and continuity (§4); outputs alter system behaviour quietly. D24 never produces a value that displays.
- **D25 Messaging** — message attribution uses Presence Identity. Abuse evidence may pull Legal layer for moderation under audit.
- **D31 Venue & Partner Power** — venues see Presence Identity only. Venues never receive Legal, Safety, or Recovery identity. No exceptions. **Venue trust does not propagate into platform trust weighting.** A user's standing with a partner venue, sponsored event, or premium space does not modify their D24 weighting, their visibility, or any system-side ranking. Otherwise partner relationships start manufacturing "trusted" users, which becomes class hierarchy at speed. The trust gradient that matters lives inside HOTMESS; venue relationships sit beside it, never feed into it.
- **D32 AI & Automation** — automated systems may read Presence and behavioural signals. They may not read Legal, Safety, or Recovery identity. AI does not get cross-layer access.
- **D33 Memory & Permanence** — memorialised Presence persists; Legal clears per D22; Safety frozen on memorialisation.

---

## §15. Acceptance Test

**No HOTMESS surface may publicly display a user's verification state, conflate the four identity layers, or condition participation on social exposure.**

If a tester can produce a surface that does any of those three things, the build fails D20 and does not ship.

A second test, for the data layer: if a single Postgres view can join Presence + Legal + Safety + Recovery into one user-facing object, the schema is wrong. The four layers must be queryable together only through privileged, audit-logged paths.

---

## §16. Final Operating Sentence

The constitutional sentence, restated:

**A user may be socially pseudonymous while remaining legally accountable to the platform.**

Everything in this doctrine is the architectural defence of that sentence. If a future feature, integration, or partner request would erode the ability of a HOTMESS user to be both — the request is doctrinally wrong, regardless of commercial framing.

> **Business pressure is not architectural authority.**

D31 is already on the horizon. Sponsor relationships, partner integrations, growth requests, and monetisation experiments will eventually push against this doctrine. D20 is the shield. Architecture decisions are made here, not in commercial negotiations.

### §16.1 What D20 Actually Solves

The contradiction almost every queer platform fails to solve: **how do you allow ambiguity without enabling impunity?**

Most systems pick one side and lose. Pure anonymity becomes chaos and unsafety. Pure verification becomes surveillance and exposure. The middle architecture has been theoretically described and practically absent.

D20 is that middle architecture:

- socially fluid
- legally accountable
- behaviourally weighted
- non-performative
- non-hierarchical

The four-layer identity model is the core invention. The Sacred Identity Rule is the constitutional statement. Everything else in this doctrine is the load-bearing scaffolding that keeps both ends standing simultaneously.

D20 is not a verification doctrine. It is the HOTMESS theory of identity.
