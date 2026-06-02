# D35 — Language Operating System

**Status:** Live · **Last updated:** 31 May 2026 · **Author of record:** Phil Gizzie (ratified) · **Author of draft:** Claude (HOTMESS Cowork)

**Doctrine class:** Constitutional · governs every other doctrine's surface expression.

**Inherits from:** D08 (Visibility), D11 (Arrival), D12 (Drop Beacon), D13 (Spatial Continuity), D14 (Routing Continuity), D15 (Care Language), D16 (Surface Layer), D17 (Surface Layer follow-up), D18 (Product Sheet), D19 (Marketplace), D20 (Identity / Age-Gating), D21 (Payment & Payout), D22 (Temporal), D24 (Contextual Trust), D25 (In-App Messaging), D28 (Refund & Cancellation), D31 (Venue & Partner Power), D32 (AI & Automation), D33 (Memory & Permanence), D34 (Trajectory).

**Bound to:** every text surface in the HOTMESS OS — UI strings, system-generated copy, notification templates, email templates, error messages, empty states, modal copy, form labels, button text, toast text, page titles, alt text, ARIA labels, push payloads, SMS payloads, Telegram payloads, marketing campaigns, legal pages, FAQ entries, onboarding screens, paywall hero copy, settings descriptions.

**Sister doctrine:** D15 (HOTMESS Care Language) — D35 is the universal layer; D15 is its strictest application zone for the care surface.

---

## Preamble — why this exists

The HOTMESS doctrine library now spans 34 documents. Each codifies what a surface should *do* — how trust accrues (D24), how messages reach their recipient (D25), how routes draw (D14), how care is named (D15), how memory dissolves (D33). What none of them codify is the *translation layer* between doctrine and surface. The result, until now, has been improvisation: 34 different contributors (humans, agents, and future-me) reading 34 doctrines and arriving at 34 different ways to say the same thing.

Drift returns every sprint because there is nowhere to look up *the* word for a thing, *the* tone for a state, *the* escalation for a context, *the* phrasing for absence. So contributors invent. The first PR sounds like queer nightlife. The next sounds like SaaS. The third sounds like a compliance portal. Within three taps the user has been spoken to by four different personalities, and the trust layer — which is the entire product — quietly cracks.

D35 closes that gap. It is not a brand guide and it is not a style sheet. It is the operating system for every word HOTMESS speaks to a user. Every other doctrine inherits from it for tone and vocabulary. New surfaces lookup, they do not invent. Drift becomes detectable because deviation now has a name.

This doctrine is intentionally written before the next monetisation, onboarding, or content sweep. Shipping copy without governance produces copy that has to be rewritten the next sprint. Doctrine first, surface second, observation third — per the HOTMESS Execution Rule.

---

## §0 — Language Layers

HOTMESS operates two distinct language layers. Every text surface belongs to exactly one. Layer is determined by **what the surface does to the user's nervous system**, not by where it sits in the codebase.

### Layer A — System Language

**Purpose:** to be trusted.

**Frame:** legally-adjacent infrastructure, not voice. If Brand Language is the nightlife, System Language is the venue security, the medic room, the payment rail, and the fire exits. The user should feel the distinction subconsciously — when System Language is speaking, they understand without being told that this is the part of HOTMESS that is load-bearing for their safety, their money, their legal status, and their account state. System Language is not the brand performing trustworthiness; it is the infrastructure being trustworthy.

**Used for:**

- Safety (Silent SOS, Trusted Contacts, check-in escalation, panic flows, harm reports)
- Moderation (warnings, suspensions, bans, appeals, content removal notices)
- Payments (charges, failures, retries, refunds, chargebacks, billing portal)
- Consent (age gate, location consent, notification consent, terms acceptance)
- Account state (creation confirmation, password reset, email verification, account deletion, data export)
- Legal (Terms, Privacy, Community Guidelines headers, GDPR notices)
- Verification (identity verification, age re-verification, venue verification, payout verification)
- Outages and incidents (degraded service, scheduled maintenance, partial failures)
- Off-grid state changes (D08 visibility transitions)

**Rules:**

1. **Direct.** One sentence per fact. No subordinate clauses where a stop will do.
2. **Stable.** Phrasing does not change between sessions. The user has read this before.
3. **Low-theatre.** No metaphor, no double meaning, no cleverness. No wordplay involving the brand mark ("HOT" + "MESS" is banned from System Language entirely).
4. **Emotionally precise.** Acknowledges the weight of the moment without performing it. "We were not able to charge your card." not "Oh no, your payment had a bad night!" The first respects the user, the second insults them.
5. **Minimal slang.** No persona vocabulary (Daddy / Brat / Pup do not appear in Layer A). No nightlife metaphor. No queer-cultural reference unless the surface is explicitly community-facing.
6. **Globally understandable.** Written for a user whose first language may not be English, whose context may be a crisis, and whose patience is zero. UK English spelling.
7. **Verifiable.** Every Layer A string maps to a system event. Strings do not over-promise system behaviour.

**Layer A example:**

> "We have not received your payment. We tried again on 28 May and again on 30 May. The next attempt is on 1 June. Your access continues until the end of this period. Update your card to keep going."

**Anti-example (Brand drift into System):**

> "Card said no, but the night is young — let's get you sorted ❤️"

If the surface is in Layer A, ban the second.

### Layer B — Brand Language

**Purpose:** to make the user feel HOTMESS.

**Used for:**

- Editorial (campaign copy, Drops landing pages, HNH MESS hero copy, Radio promo)
- Onboarding *mood* (the air around the gates — splash, bridge transitions, between-step messaging; not the gates themselves which are Layer A)
- Empty states (no boys nearby, no matches yet, no beacons in this district)
- Pulse globe ambient copy ("The city is breathing tonight")
- Ghosted grid framing
- Beacon drop intent copy
- Radio metadata, station identity, sponsor reads
- Care suite atmospheric copy (within D15's stricter constraints)
- HOTMESS product surface taglines on shopfronts

**Rules:**

1. **Seductive.** The user is being invited, not informed.
2. **Cinematic.** Reads like a single line out of a film, not a sentence out of a brochure.
3. **Playful.** Wordplay, persona reference, and queer-cultural specificity are permitted and encouraged within taste.
4. **Emotionally charged.** Carries a feeling, not a fact.
5. **Culturally specific.** Gay-men-coded, London-coded, nightlife-coded, recovery-aware. Layer B is where HOTMESS sounds like HOTMESS.
6. **Restrained.** Brand Language at full volume on every surface is exhausting. Use the Energy Rules in §3 to govern when to be loud and when to be still.

**Layer B example:**

> "Quiet right now. The city's between signals."

**Anti-example (System drift into Brand):**

> "Search returned 0 results. Please modify your query and try again."

If the surface is in Layer B, ban the second.

### The split is enforced, not negotiated

A single page may contain both layers. A payment screen renders System Language for the failure notice (Layer A) and Brand Language for the surrounding ambient prompt (Layer B) — but the boundary between them is explicit, and the user can tell which is speaking. The Layer A line is shorter, plainer, and visually weighted toward function. The Layer B line is set apart visually as atmosphere.

When in doubt, default to Layer A. System Language preserved is recoverable; System Language broken is broken.

---

## §1 — Canonical Vocabulary Registry

One canonical word per concept. All variants are anti-patterns unless explicitly permitted in §1.3 (contextual variants).

### §1.1 Surfaces (the nouns the product is made of)

| Canonical | Use for | Banned aliases |
|-----------|---------|----------------|
| **Pulse** | The live globe surface and its underlying signal layer. | Feed, timeline, stream, dashboard, home, activity feed |
| **Globe** | The cinematic name for the rendered macro-zoom Pulse view. | World map, map, world, planet |
| **Map** | The engine. Internal / developer-facing only. | (do not use in user-facing copy) |
| **Beacon** | A user-dropped or curated signal on Pulse. | Pin, event pin, drop pin, location, marker, broadcast, post |
| **Ghosted** | The grid surface (the discoverable cohort of men nearby). | Discover, browse, grid, members, users, people |
| **Care** | The wellness / safety / aftercare surface. | Support, help, support centre, assistance, resources |
| **Market** | The commerce surface (parent of Shop, Drops, Preloved). | Store, marketplace, shop (alone), commerce |
| **Shop** | The HOTMESS-published apparel and HNH MESS product line. | Store, retail, merch (alone) |
| **Drops** | Limited-release commerce moments per D19. | Sales, releases, launches, specials |
| **Preloved** | Peer-to-peer resale surface. | Resale, used, secondhand, P2P, marketplace |
| **HNH MESS** | The intimate wellness / lube / aftercare product line. Acronym is locked: H-N-H. | Hand N Hand (in user copy — used only inside the brand explainer) |
| **Radio** | HOTMESS Radio — always free, every tier. | Music streaming, audio, station (alone) |
| **Music** | The Smash Daddys catalogue page. | Audio, tracks, songs, library (alone) |
| **Inbox** | The unified message / boo / system surface per D266. | Messages, chats, conversations, notifications (alone) |
| **Trusted Contacts** | The named people who receive SOS / check-in escalation. | Emergency contacts, ICE, contacts, safety contacts |
| **Silent SOS** | The shield button. The verb is "trigger Silent SOS." | Panic button, SOS button, emergency button, alarm |
| **Off-grid** | D08 invisibility state. | Invisible, hidden, stealth, ghost mode, incognito (these are old-platform language) |
| **Persona** | A D31 §17 expression-mode within one identity (Daddy, Brat, Pup, Top, Bottom, Boy, Recovery, Civilian, etc.). | Profile, alt, mode (alone), character |
| **Tier** | A monetised access level. | Plan, subscription level, package |

### §1.2 Trust + social verbs (per D24 / D25 — corrected from the earlier overload)

| Canonical | Meaning | Severity | Surface |
|-----------|---------|----------|---------|
| **Boo** | Soft social signal — mutual-interest tap, romantic dismissal, low-friction "not for me," low-level social boundary. Recoverable. | Low | Ghosted grid, profile sheet |
| **Block** | Hard personal boundary. Bilateral invisibility (you don't see them, they don't see you). Recoverable only by user choice. Not moderation. | Medium | Profile sheet, chat, inbox |
| **Flag** | Moderation escalation — the user is telling HOTMESS this content or behaviour breaches Community Guidelines. Sends to mod queue. Not legal. | High | Any content, any profile, any message |
| **Report** | Legal / safety surface. The user is telling HOTMESS something potentially criminal, harmful, or requiring escalation to authorities. Distinct queue, distinct response time, distinct accountability. | Critical | Safety surface only |

The four verbs are distinct, do not overload them, and the UI affordance for each is visually distinct. **Boo is not moderation.** **Block is not Boo with more weight.** **Flag is not Report with less weight.** **Report is not Flag with more theatre.** Each has its own canonical word, its own RPC, its own queue, its own user expectation.

### §1.3 Verb registry with contextual variants

Some verbs are too important to leave to improvisation. For each, the canonical engineering / Settings / billing word is locked, and a small set of contextual variants is permitted for editorial surfaces (Layer B). Free-typing is not permitted.

#### Upgrade (move tiers up)

- **Canonical (System Language, Settings, billing portal, API):** Upgrade — *"Upgrade membership"*
- **Allowed Layer B variants (paywall hero / Drops / editorial only):**
  - "Move deeper" — for the Ghosted / Pulse / messaging unlock hero
  - "Step into [TIER]" — for tier-specific transitions ("Step into CONNECTED")
  - "Become [TIER]" — only as Drops campaign copy, never as a paywall sticky
  - "Access [feature]" — when the lift is one concrete feature ("Access venue tools")
- **Banned:** Unlock, Go Pro, Subscribe (as hero verb — fine as button label inside Stripe portal), Join the inner circle, Get HOTMESS+, Become a supporter

#### Downgrade (move tiers down — per D05)

- **Canonical:** Cancel — *"Cancel subscription"*
- **Allowed Layer B variants (post-cancellation confirmation only):** "Stepping back to MESS" — once, in the confirmation screen, then it stops
- **Banned:** Quit, Leave, Abandon, Give up, Downgrade (the word "downgrade" feels punitive — we don't use it user-facing per D05)

#### Connect (initiate social interaction)

- **Canonical:** Boo — *"Send a boo"*
- **No variants.** Boo is the word. It does not become "tap" or "wave" or "say hi" in different surfaces.

#### Begin (sign-up / arrival per D11)

- **Canonical:** Enter — *"Enter HOTMESS"* / *"Enter the night"* (the legacy AccountConsents phrase is preserved; per D11)
- **Allowed Layer B variants:** "Start", "Arrive"
- **Banned:** Sign up (as hero — fine as form button), Register, Create account (as hero), Get started

#### Leave (account deletion per D33)

- **Canonical:** Delete account — System Language only
- **No Layer B variants.** Deletion is Layer A, full stop. No emotionally manipulative language. No "we'll miss you." No "are you sure you want to leave us." See §8 Anti-Patterns.

#### Speak (messaging per D25)

- **Canonical:** Message — *"Message [name]"*
- **Allowed Layer B variants (in Ghosted pre-mutual gate):** "Boo first" — to indicate the gate
- **Banned:** Chat, DM, text, ping (as user-facing — internal-only ok), reach out

#### Drop (publish a Pulse signal per D12)

- **Canonical:** Drop a beacon — *"Drop"* (verb), *"Drop a beacon"* (action label)
- **No Layer B variants.** This verb is already cinematic; do not soften it.
- **Banned:** Post, share, broadcast, publish, create

#### See (find people / places — D12 / D13 / D24)

- **Canonical:** Find — *"Find a venue"*, *"Find boys nearby"*
- **Allowed Layer B variants:** "Spot", "Catch"
- **Banned:** Search (as hero — fine as input placeholder), browse, explore (overused in dating apps), discover

### §1.4 Audience nouns

| Canonical | Use for |
|-----------|---------|
| **Gay men** | The HOTMESS audience (positioning). Use sparingly; the platform speaks to its audience, it does not constantly describe its audience. |
| **The boys** / **boys** | Community-facing reference to other users, particularly in Layer B copy. Warm, queer-coded, gay-men-coded. Use in: empty states, ambient prompts, Care framing, Pulse atmospheric. Not in System Language. |
| **You / your** | Always second person. HOTMESS is talking *to* the user, not *at* them. |
| **The community** | Community-facing reference to the whole user base. Use sparingly in moderation / care contexts. |
| **Members** | Banned in user-facing copy. SaaS language. Use *"the boys"* or *"the community"* or skip entirely. |
| **Users** | Banned in user-facing copy. Use *"the boys"* / *"someone"* / drop the noun. Internal-only. |

### §1.5 Tier names — locked

The only canonical tier names are: **MESS**, **HOTMESS**, **CONNECTED**, **PROMOTER**, **VENUE**. They render in caps as a brand element. They do not abbreviate. They do not localise. They are not preceded by "Tier" except in disambiguating contexts ("you are on Tier MESS" is wrong; "you are on MESS" is right).

Banned legacy tier nouns: BASIC, PLUS, CHROME, PREMIUM, ELITE, PRO, FREE (as a noun — "MESS is free" is fine; *"the Free tier"* is wrong). XP, Challenges, Virtual Currency — banned everywhere; the systems do not exist.

---

## §2 — State-Based Tone Matrix

Tone is a property of the **system state**, not the page. Two screens that share a route can be in different states (a Pulse render with no beacons is in Empty state; the same Pulse with 200 beacons is in Discovery state) and must adopt different tones accordingly.

Seven states. Each has a tone rule, an example, and an anti-example.

### §2.1 Discovery

The user is browsing, looking, scrolling, scanning. Energy is open. They have not committed to anything.

- **Tone:** seductive
- **Layer:** B
- **Energy band:** 4–5 (Ghosted) / 5 (Pulse) / 6 (Drops)
- **Cadence:** short, atmospheric, slightly under-stated
- **Example:** *"Soho is moving. Beacons in your line of sight."*
- **Anti-example:** *"15 new users active near you. View results."*

### §2.2 Safety

The user is at risk, in distress, escalating, or being escalated to. This includes Silent SOS, check-in failure, moderation surfaces, abuse reports.

- **Tone:** calm, direct (inherits from D15 strict mode)
- **Layer:** A
- **Energy band:** 0–1
- **Cadence:** one sentence per fact. No metaphor. No persona. No brand mark wordplay.
- **Example:** *"Your trusted contacts have been notified. Your live location is shared with them for the next 30 minutes."*
- **Anti-example:** *"Help is on the way, boy 💛"*

### §2.3 Commerce

The user is on a paywall, a checkout, a tier page, a Stripe portal, a sell-flow, or a refund request.

- **Tone:** confident, editorial — never desperate, never gamified, never urgent unless urgency is structurally true (an actual time-limited Drop with a real countdown)
- **Layer:** B for hero copy / A for transaction confirmation
- **Energy band:** 1 (transaction confirmation) / 3–4 (paywall hero) / 6 (Drops campaign)
- **Cadence:** assertive but spare. The product does not beg.
- **Example (paywall hero, Layer B):** *"Move deeper. Full Ghosted, messaging, the whole music library, three beacons a month."*
- **Anti-example:** *"🔥 LIMITED TIME — Unlock PRO now and save 20%! 🔥"*

The commerce tone derives from one rule: **HOTMESS is offering access to deeper participation in the network, not selling a product.** Every monetisation surface should sound like an open door, not a closed gate.

### §2.4 Error

A system failure, a degraded state, a retry, a denial. The user is frustrated or confused.

- **Tone:** human, not corporate
- **Layer:** A
- **Energy band:** 1
- **Cadence:** acknowledge → state → offer recovery, in three short sentences max
- **Example:** *"That didn't go through. The card said no. Try again or use a different one."*
- **Anti-example:** *"An error occurred. Please contact support if this persists."*

### §2.5 Recovery / Aftercare

The user is in or near a difficult moment — post-hookup, post-night-out, in active recovery, processing. The Care surface lives here. D15 inherits.

- **Tone:** grounding, non-performative
- **Layer:** B (within D15's stricter envelope — no nightlife framing, no party language, no brand-mark wordplay)
- **Energy band:** 2
- **Cadence:** unhurried. Periods, not exclamation marks. The user does not need cheerleading.
- **Example:** *"Take your time. The boys are around if you need them."*
- **Anti-example:** *"You got this hun! 💪 Let's bounce back stronger! 🌟"*

### §2.6 Upgrade

The user is being shown a paywall, a feature gate, a tier benefit, or a Drops moment.

- **Tone:** aspirational, never desperate
- **Layer:** B
- **Energy band:** 3–4
- **Cadence:** the next thing, not the last chance
- **Example:** *"Step into HOTMESS. You get the full grid, the boos, the full library, three beacons every month."*
- **Anti-example:** *"Don't miss out! Upgrade to PLUS now before this offer expires!"*

The Upgrade state inherits from Commerce (§2.3) but is distinct: Commerce includes refunds, billing changes, sell flows; Upgrade is specifically the moment of moving up the tier ladder. Same tone rules apply; the offer-not-demand framing is non-negotiable.

### §2.7 Empty state

There is nothing on this screen. No matches, no beacons nearby, no messages, no events, no music currently playing.

- **Tone:** possibility, not failure (full doctrine in §4 below)
- **Layer:** B
- **Energy band:** 3
- **Cadence:** atmospheric, short, weather-coded
- **Example:** *"Quiet right now. The city's between signals."*
- **Anti-example:** *"No results found."*

---

## §3 — Energy Rules

Every surface operates at an energy level from 0 to 7. Energy is the loudness, the visual + linguistic + emotional intensity. Drift happens partly because every contributor writes at 7 — every screen feels like a launch campaign. The Energy Rules detect and prevent that.

### §3.1 The scale

| Energy | Surface examples | What "energy" means here |
|--------|------------------|--------------------------|
| **0** | Silent SOS, check-in escalation alert, moderation ban notice | Absolute zero. System speaks the minimum. Brand mark suppressed. No colour beyond hazard. No motion. |
| **1** | Payment failure, account deletion confirmation, password reset, GDPR export | Single voice. One fact per line. No theatre. Subdued chrome. |
| **2** | Care surface, Trusted Contacts management, off-grid toggle, recovery copy | Grounding. Soft motion permitted, never bright. D15 governs. |
| **3** | Settings, Account, notification preferences, empty states across the app | Functional with warmth. Atmospheric where copy permits, otherwise plain. |
| **4** | Ghosted grid, inbox, profile sheets, messaging composer | Discovery energy. Seductive but composed. Personas surface. |
| **5** | Pulse globe at zoom, beacon peek-sheets, route drawing | Cinematic. The product looks alive. Atmospheric copy land here. |
| **6** | Drops landing, HNH MESS hero, Market product detail, paywall hero | Editorial heat. Confident commerce. Restrained luxury. |
| **7** | HOTMESS Radio campaigns, Drops launch moments, scheduled live events | Full volume. Brand mark loud. Limited to bounded moments. |

### §3.2 Rules of energy

1. **The user does not encounter two surfaces at the same energy back-to-back unless the journey requires it.** A Ghosted card tap (4) opening a profile sheet (4) is fine. A Pulse render (5) followed immediately by a Drops campaign banner (6) followed by a paywall hero (6) is exhausting.
2. **Critical states drop energy.** A Silent SOS trigger overrides every surface to 0 until resolved. A payment failure on a Drops campaign page drops the failure surface to 1 even if its surrounding container is 6.
3. **Persistent surfaces sit at low energy.** Settings is always 3. The shield FAB is always 0–1. The right rail is always context-following at 2–4.
4. **Energy 7 is rationed.** No more than one energy-7 element on a screen at a time, ever. A loud Radio campaign banner does not stack with a Drops hero. The user's attention bandwidth is finite.
5. **Energy is detectable, not subjective.** Indicators: caps-locked words, exclamation marks, emoji, brand-mark wordplay ("HOT" + "MESS"), urgency language ("now," "today only," "limited"), pricing in hero, motion. Each contributes to the energy score; the score for the surface must match its band.

### §3.3 Audit method

When scrutinising a surface for D35 compliance, compute its energy score by tallying loud signals (each exclamation mark, each caps-locked phrase, each emoji, each brand-mark wordplay, each urgency word) and matching it to the surface's permitted band. If the score exceeds the band, the surface is in violation regardless of how good the individual lines sound.

### §3.4 Surface metadata declaration

Energy, Layer, and Tone State are not just doctrine prose. They are **declared metadata** every major surface emits at the top of its file. This converts D35 from human-readable rules into machine-readable constraints, enabling lint rules, review tooling, automated drift detection, and AI-assisted copy generation that inherits doctrine constraints by default rather than averaging toward generic platform-English.

The schema:

```ts
// src/lib/lang/surface-meta.ts
export type ToneLayer = 'A' | 'B';
export type EnergyLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type EmotionalIntent =
  | 'discovery'
  | 'safety'
  | 'commerce'
  | 'error'
  | 'recovery'
  | 'upgrade'
  | 'empty';

export interface SurfaceMeta {
  tone_layer: ToneLayer;
  energy_level: EnergyLevel;
  emotional_intent: EmotionalIntent;
  // Optional: the doctrines this surface inherits from beyond D35.
  inherits?: ReadonlyArray<string>;
}
```

Every major surface component exports a `SURFACE_META` constant near the top of its file:

```jsx
// src/pages/CareHome.jsx
import type { SurfaceMeta } from '@/lib/lang/surface-meta';

export const SURFACE_META: SurfaceMeta = {
  tone_layer: 'B',
  energy_level: 2,
  emotional_intent: 'recovery',
  inherits: ['D15', 'D08'],
};
```

Two follow-on rules:

1. **String lookups validate against metadata.** A surface declared as `tone_layer: 'A'` cannot import a string from `src/lib/lang/empty.ts` (Layer B) without an explicit override comment justifying the cross-layer use. The validation is mechanical; the override is reviewable.
2. **Energy band gates banned phrases.** A surface declared at `energy_level: 1` triggers Critical violations for any §7.2 luxury SaaS drift terms, every exclamation mark in the JSX, and every caps-locked word outside tier names. The same drift word on a `energy_level: 6` Drops landing only triggers a Medium warning — context-aware enforcement, not blanket banning.

This metadata is what makes §9 enforcement land structurally. Without it, every CI check is a global regex grep — noisy, context-blind, easily ignored. With it, each warning is anchored to a specific surface's declared intent and can be triaged precisely.

Initial rollout: P1 monetisation surfaces ship with declared metadata. P2 onboarding inherits the pattern. By P5 every major surface in the app has a `SURFACE_META` constant and the lint rules consume it.

---

## §4 — Absence & Silence

Empty states are one of HOTMESS's highest-leverage tonal moments. Most apps punish absence ("No results," "0 matches"). HOTMESS frames absence as atmosphere — a phase of the city's rhythm, not a personal failure of the user.

This matters disproportionately because **loneliness is the substrate** of the loneliness-vs-connection problem HOTMESS is solving. A platform that says "no boys near you" delivers a small but cumulative emotional wound every time. A platform that says "the city's between signals" returns agency to the user — the absence is the city's state, not theirs.

### §4.1 The canonical patterns

| Surface | Canonical empty-state pattern |
|---------|-------------------------------|
| Ghosted grid, no nearby | *"Quiet right now. The city's between signals."* |
| Ghosted grid, no recent | *"Nothing moving here yet."* |
| Pulse globe, no beacons in viewport | *"This part of the city is still."* |
| Inbox, no messages | *"The night is open. Nothing landed yet."* |
| Search, no results | *"Nothing matches that. Try wider."* |
| Music page, paused | *"Take a breath. Radio is still on."* |
| Care surface, no contacts yet | *"You haven't added anyone yet. The boys you trust go here."* |

### §4.2 Rules for empty states

1. **Frame absence as the city's state, not the user's.** "Quiet right now" not "No results."
2. **Suggest movement.** Empty states hint at where to go next without instructing. "Try wider" not "Please modify your search criteria."
3. **Stay in Layer B for atmospheric surfaces, in Layer A for diagnostic surfaces.** An empty inbox is atmospheric (Layer B). An empty payment-history page in Settings is diagnostic (Layer A: *"No charges yet."*).
4. **Never punish.** Banned tone: "Sorry, we couldn't find...", "Unfortunately,", "We were unable to..."
5. **Never blame the city for too long.** If a user repeatedly hits empty states, the surface escalates to a curated suggestion (closest movement, nearest signal) — this is a D12 / D14 concern but D35 enforces the language: *"Soho is quieter than Vauxhall right now."*

### §4.3 The silence-is-information principle

Some absences are answers. An off-grid mutual showing as away is not absence — it is a signal. The language should reflect that the user understands silence carries meaning here. *"They're not here right now"* (neutral) instead of *"User is offline"* (technical) or *"They're invisible"* (judging).

---

## §5 — Escalation Rules

How tone tightens or softens as the user moves through a flow. Inherits from D15's strict mode and extends to every surface.

### §5.1 Tightening (energy decreases)

The system tightens language — drops energy, drops theatre, drops brand voice — when the user is moving toward a load-bearing moment. The canonical tightening points:

| From | To | Why |
|------|-----|-----|
| Settings hover (E3) | Account deletion (E1) | Crossing into Layer A irreversible action |
| Pulse globe (E5) | Beacon long-press preview (E4) | User is committing to attention |
| Profile sheet (E4) | Block confirmation (E1) | Crossing into Layer A consequential action |
| Drops landing (E6) | Checkout (E1) | Crossing into Layer A financial action |
| Anywhere | Silent SOS trigger (E0) | Crossing into Layer A safety state |

The tightening is felt by the user: the chrome calms, the copy gets shorter, the brand mark recedes, the colour drops, the motion stops. Each step is consciously quieter than the last.

### §5.2 Softening (energy increases)

The system increases energy only after the user has cleared a load-bearing moment. The canonical softening points:

| From | To | Why |
|------|-----|-----|
| Payment confirmation (E1) | Welcome to HOTMESS (E5) | Crossing into Brand celebration after Layer A transaction |
| Onboarding gate (E2) | Pulse arrival (E5) | Crossing into Brand voice after Layer A consent |
| Silent SOS resolution (E0) | Care follow-up (E2) | Slow climb back, never jumping to atmospheric |

Softening is paced. The user does not jump from energy 0 to energy 5 in one screen. There is a transition surface at energy 2–3 between every load-bearing tightening and any subsequent brand moment.

### §5.3 The five untouchables

Five contexts are permanently locked at their energy. They never soften, even for celebration, even for campaigns, even for launches:

1. **Silent SOS triggers** — permanently E0.
2. **Care follow-up after a real safety event** — permanently E2, capped.
3. **Account deletion flow** — permanently E1, no Layer B.
4. **Moderation notices to the recipient** — permanently E1, no Layer B.
5. **Payment failure messaging** — permanently E1, no Layer B.

A campaign that overrides any of these is in critical violation, not a tonal preference.

---

## §6 — Temporal Language Rules

D22 (Temporal Doctrine) reframes retention as forward secrecy and signal-decay. D35 operationalises that as language. The system must feel **live**, not stored. Weather, not filing cabinets.

### §6.1 The live-language register

| Use | Avoid |
|-----|-------|
| Tonight | Today |
| Moving | Active |
| Live | Online |
| In motion | Available |
| Just dropped | Recently added |
| Expiring | Ending soon |
| Fading | Inactive |
| Quiet | Empty |
| Between signals | No results |
| Just landed | New |
| Soon | Upcoming |

### §6.2 Banned static-platform language

| Banned word | Why |
|-------------|-----|
| Database | Implies storage; HOTMESS does not "store" — it lives |
| Archive | Implies permanence; D33 forbids it for relational truth |
| Directory | Implies a list of things to scroll through |
| Catalog | Implies retail-software framing |
| Member list | Implies belonging-by-record; HOTMESS belonging is by participation |
| Inventory | Implies things you own statically |
| Registry | Implies bureaucracy (note: D35 itself uses "registry" internally because we are a doctrine document; user-facing copy does not) |
| Library (as audience-facing — fine for the Music library, which is a curated catalogue) | Implies bookishness; weak energy |
| Profile (as a noun in copy hero) | Use "your boy" / "the boy" / context-specific. "Profile" is fine as a Settings label. |

### §6.3 Time-of-day awareness

The system can be time-aware: the same surface speaks differently at 03:00 than at 11:00 because the city is different. This is a stretch goal — D35 codifies the rule, implementation is a follow-up. The rule: when the surface knows the local hour, prefer time-of-day metaphor that matches it. *"The night's running"* at 02:00 is correct; *"The night's running"* at 14:00 is broken.

---

## §7 — Anti-Pattern Registry

Banned phrases, banned tones, banned constructions. Every violation has a severity (§9) and a doctrine reference.

### §7.1 Banned phrases (drop on sight)

| Banned | Why | Severity | Surfaces |
|--------|-----|----------|----------|
| "Premium" / "PRO" / "Premium support" / "Premium features" | Gamification + SaaS drift; tiers have names | Critical | All |
| "Unlock" (as in unlock a feature behind paywall) | Implies content is being withheld | Critical | All paywall |
| "Go pro" / "Become a supporter" | SaaS conversion language | Critical | Paywall |
| "Free forever" / "Try premium free" | Conversion theatre | Critical | Paywall |
| "Limited time" / "Today only" / "Don't miss out" | Manufactured urgency | Critical | All commerce |
| "🔥" / "✨" / "💫" (as scarcity markers, decoration on payment surfaces) | Energy band violations | Critical | Layer A, paywall heroes |
| "Welcome all identities, orientations, and expressions" | Audience-blurring; HOTMESS is for gay men | High | All |
| "Inclusive community" (as generic positioning) | Same audience-blurring drift | High | All |
| "No catfishing / no fake profiles" | Conflicts with D31 §17 persona switching | High | Community Guidelines, Help, Profile guidance |
| "Panic button" | Old language; use Silent SOS | High | Care, safety, help, terms |
| "Handshake" (user-facing) | Internal-only; UX surface uses Boo | Medium | Inbox, Ghosted, Help |
| "Feed" / "Activity feed" | Pulse is Pulse | Medium | Anywhere referring to Pulse |
| "Map" (in user copy referring to the Globe) | Globe / Pulse, never Map | Medium | Anywhere referring to the Globe |
| "User" / "Users" (in user-facing copy) | SaaS distance; use "boys," "the community," or drop the noun | Medium | All Layer B |
| "BASIC" / "PLUS" / "CHROME" / "ELITE" / "PREMIUM" as tier names | Wrong tier ladder | Critical | All commerce |
| "XP" / "Experience Points" / "Challenges" (as XP-rewarding) | Systems do not exist | Critical | All |
| "Virtual currency" | Doesn't exist | Critical | All |
| "Members" (in audience-facing copy) | SaaS language | High | All Layer B |
| "Sorry," (as opening) | Apologetic stance — replace with direct statement of fact | Medium | Layer A |
| "We were unable to" | Corporate distance; use "we couldn't" or just "that didn't go" | Medium | Layer A |
| "We'll miss you" | Manipulative cancellation flow | Critical | Cancellation, deletion |
| "Are you sure you want to leave us?" | Same manipulation | Critical | Cancellation, deletion |
| "Your payment had a bad night" | Brand-drift into Layer A | Critical | Payment, billing |
| "Help is on the way, boy 💛" / similar persona-in-safety | Brand-drift into Safety | Critical | Care, SOS |

### §7.2 Luxury SaaS drift (the new long-term risk)

Banned because HOTMESS sounds like a founder LinkedIn post the moment any of these land:

| Banned | Severity |
|--------|----------|
| "Curated experiences" | Critical |
| "Seamless" | Critical |
| "Elevate your [anything]" | Critical |
| "Engagement" (as a noun in audience-facing copy) | Critical |
| "Creator economy" | Critical |
| "Optimize" (as a verb spoken to users) | Critical |
| "Monetize your audience" | Critical |
| "Frictionless" | Critical |
| "Best-in-class" | Critical |
| "Power users" | Critical |
| "Stakeholders" (in user-facing copy) | Critical |
| "Leverage" (as a verb spoken to users) | Critical |
| "Ecosystem" (in user-facing copy — fine in doctrine; banned at the surface) | High |
| "Holistic" | High |
| "Robust" | High |
| "Innovative" | High |

The second any of these land, the spell breaks.

### §7.3 Banned constructions

- **Three exclamation marks anywhere on a Layer A surface.** Layer A is calm by definition.
- **Brand-mark wordplay involving HOT + MESS on Layer A surfaces.** ("Bit of a hot mess on the payment side" → critical violation.)
- **Pricing in the page hero of a paywall.** Price lives below the hero copy, never as the hook. ("£7.99/mo — UPGRADE NOW!" → critical violation.)
- **Stacking energy-7 elements.** One per screen, ever.
- **Apostrophe-s without context.** "Phil's beacons" inside Pulse is fine; "User's profile" anywhere is wrong (use "your profile" or "their profile").
- **All-caps for emphasis inside body copy.** All-caps is reserved for tier names, brand mark, and section heads.

---

## §8 — Missing-Surface Inventory

Phil's enumeration plus mine. Every system-generated string lives here. Each entry is tagged with its governing tone state (§2), energy band (§3), and inheriting doctrines. Phase tags indicate which P-slice of the content audit covers it.

### §8.1 System-generated copy (P7 — owns Layer A)

- Toast notifications (success / error / info) — A · E1–E2 · D08 / D15
- Moderation notices to recipient — A · E1 · D24 / Community Guidelines
- GPS / location denied — A · E1 · D08 / Privacy
- Retry messages — A · E1 (recovery framing per §2.4)
- Loading states — B · E2–3 (Layer B because loading is atmospheric)
- Push permission prompt — A · E1 · D11
- Payment failure cascade (first attempt, second, dunning) — A · E1 · D21
- QR invalid / expired (beta redeem flow) — A · E1
- Offline mode — A · E1
- "New version available" SW toast — A · E2
- 404 page — B · E3 (atmospheric not punitive)
- Generic error boundary — A · E1
- Rate-limit hit — A · E1

### §8.2 Creator / Venue language (P1 partial, P5 full)

- Venue onboarding (KYC + Stripe Connect + door staff app) — A · E1 · D31
- Beacon analytics dashboard (PROMOTER / VENUE) — A/B mixed · E2–3
- Seller dashboard (CONNECTED) — A · E2 · D19 / D21
- Promoter flows (events / tickets / guestlists) — B · E5 · D19
- Payout messaging (when funds land, when they're delayed, when they bounce) — A · E1 · D21
- Verification status (pending / approved / rejected) — A · E1 · D20

### §8.3 Radio layer (P4 partial, P5 full)

- Player empty state ("between tracks") — B · E3
- Metadata fallback (when track metadata fails) — B · E3
- Sponsor reads — B · E5–7 (depends on sponsor)
- Offline stream handling — A · E2
- Radio slot booking (PROMOTER perk) — B · E4 · D19

### §8.4 Search / no-result behaviour (P5)

- Ghosted grid no-match — B · E3 · §4
- Pulse beacon search empty — B · E3 · §4
- Music library no-match — B · E3 · §4
- Inbox search no-match — B · E3 · §4
- Market search no-match — B · E3 · §4 + temporal language ("no boys selling that right now")

### §8.5 Onboarding (P2)

- Splash — B · E5–6 · D11
- Bridge transitions — B · E4 · D11
- Age gate — A · E1 · D20
- SignUp screen — A · E1–2 · D11
- Magic-link sent / not-received — A · E1
- Onboarding profile step — A · E2 · D10
- Vibe step — B · E4 · D11
- Safety step (Trusted Contacts intro) — B · E2 · D15
- Location step — A · E2 · D08
- Redeem (beta) — B · E4 · D11

### §8.6 Care surface (P3)

- Care home — B · E2 · D15 (strict mode)
- Trusted Contacts add / remove / edit — A · E1
- Trusted Contact verification (Telegram / SMS pairing) — A · E1
- Silent SOS trigger / hold / cancel — A · E0
- Silent SOS resolution / aftercare — B · E2 · D15
- Check-in setup — A · E2
- Check-in escalation alert (to contact) — A · E1 (very direct, very fast)
- Off-grid toggle — A · E2 · D08

### §8.7 Pulse + Beacons (P4)

- Globe loading — B · E5
- Globe empty (no beacons in viewport) — B · E3 · §4
- BeaconCreator / BeaconDropModal — B · E4 · D12
- Peek-sheet preview — B · E4 · D17
- Directions copy — A · E2 · D14
- No-route-available message — B · E3 · §4
- Beacon expiry warning — A · E2 · D22

### §8.8 Ghosted + Chat (P5)

- Grid empty (nearby / recent) — B · E3 · §4
- Boo button copy — B · E4 · D24
- Mutual boo confirmation — B · E4 · D24
- Chat composer hint — B · E4 · D25
- Pre-mutual blocked message — B · E3 · D25
- Inbox empty — B · E3 · §4
- Inbox filter chips — A · E3
- Block confirmation — A · E1
- Report submission — A · E1

### §8.9 Market (P6)

- Shop hero (per page) — B · E5–6 · D18 / D19
- Drops hero — B · E6–7 · D19
- HNH MESS hero — B · E6 · D19
- Preloved hero — B · E5 · D19
- Product detail copy — B · E4–5 · D18
- Variant selector — A · E2
- Checkout (Stripe Element) — A · E1 · D21
- Order confirmation — A · E1 · D21
- Refund prompt — A · E1 · D28
- Sell-on-Preloved threshold gate — B · E3 (per upgrade tone rules)

### §8.10 Notification templates (P7)

- Push: boo received, mutual boo, message, beacon expiring, check-in due, SOS triggered, payment failed
- Telegram: Trusted Contact verification, SOS alert, daily digest (Phil-only)
- SMS: SOS escalation (paid fallback), 2FA (if added later)
- Email: welcome, password reset, beta redeem, receipt, refund, account deleted confirmation

Each template gets a canonical string in `src/lib/lang/notifications.ts`. No template is free-typed.

### §8.11 Legacy dedup (P8)

- `src/pages/PrivacyPolicy.jsx` (long legacy) vs `src/pages/legal/PrivacyPolicy.jsx` (Phil's plain-text) — consolidate to one source rendered by both routes.
- `src/pages/TermsOfService.jsx` (legacy, now content-fixed) vs `src/pages/legal/TermsOfService.jsx` — same treatment.

---

## §9 — Enforcement

### §9.1 The token registry

A new module: `src/lib/lang/`. One TypeScript file per surface area. Each exports a typed map of named string tokens. New copy lands as a token, not as an inline string in JSX.

Initial files:

- `src/lib/lang/empty.ts` — every empty-state string
- `src/lib/lang/payments.ts` — every payment / billing string
- `src/lib/lang/safety.ts` — every Layer A safety string
- `src/lib/lang/upgrade.ts` — every paywall / upgrade string
- `src/lib/lang/onboarding.ts` — every onboarding-gate string
- `src/lib/lang/notifications.ts` — every push / SMS / Telegram / email payload
- `src/lib/lang/errors.ts` — every Layer A error message
- `src/lib/lang/care.ts` — every Care / SOS / Trusted Contacts string (D15 governed)
- `src/lib/lang/market.ts` — every Market / Shop / Drops / Preloved string

Strings are accessed via a single import: `import { upgrade } from '@/lib/lang/upgrade'; upgrade.heroMoveDeeper;` This makes drift detectable at PR-review time — a new inline string in JSX is the signal that D35 has been bypassed.

### §9.2 The CI anti-pattern lint

A custom rule (or simple regex CI check) scans every `.jsx` / `.tsx` / `.ts` file for the banned phrases registered in §7. Each match emits a severity-tagged warning. Critical violations fail CI. High violations warn loudly. Medium and Low surface in the PR diff as comments.

Initial implementation: a Node script at `scripts/lang-lint.mjs` that runs against the diff in pre-commit + GitHub Action. Phase-2: a proper ESLint custom rule.

### §9.3 Severity tiers

| Severity | Example | CI behaviour |
|----------|---------|--------------|
| **Critical** | Gamification language ("Unlock PRO"), wrong tier name, Layer A safety phrasing broken, brand-mark wordplay in Layer A | Block merge |
| **High** | Audience-blurring ("Welcome all identities"), banned SaaS-drift word, persona language in Layer A | Warn loudly; manual override required |
| **Medium** | "Feed" instead of "Pulse," "BASIC" instead of "MESS" in legacy copy | Comment on PR; reviewer decides |
| **Low** | Tone mismatch within the same tone band (e.g. Layer B but slightly off-register) | Surface in review notes |

### §9.4 The doctrine-of-record

This file (`docs/doctrine/35-language-operating-system.md`) is the doctrine-of-record. Every disagreement at PR review references this file by section. If a contributor wants to deviate, they propose an amendment to D35 — not a one-off in their PR.

### §9.5 Metadata as the enforcement vector

The §3.4 surface metadata declaration is what makes D35 mechanically enforceable rather than aspirational. The lint pipeline reads the `SURFACE_META` constant from each surface file and applies tier-tagged rules accordingly. Without metadata, enforcement is a global grep with the noise problem Phil flagged: critical violations get drowned in low-severity tone mismatches and the rule gets ignored. With metadata, every warning is anchored to a declared layer / energy / intent and the severity is computed in context.

The same metadata layer feeds three downstream tools as they come online:

1. **PR review tooling.** A reviewer bot reads metadata from changed surfaces and posts a checklist of D35 sections that apply ("This surface declares `energy_level: 1`; check §7.3 for caps-lock violations and §5.1 for tightening discipline").
2. **Automated drift detection.** A scheduled job scans all `SURFACE_META` declarations and flags inconsistencies (a surface declaring `tone_layer: 'A'` while importing seven Layer B tokens; a Care surface declared above `energy_level: 2`; a paywall declared with `emotional_intent: 'upgrade'` containing energy-7 markers).
3. **AI-assisted copy generation.** When the AI is asked to draft copy for a surface, it reads the surface's declared metadata first and constrains its generation accordingly. A surface declared as `{ tone_layer: 'A', energy_level: 1, emotional_intent: 'error' }` produces copy that inherits §0 + §2.4 + §3.1 constraints automatically. The AI stops averaging toward generic English because the constraints are explicit and machine-readable.

The implementation arc: P1 ships the schema and the first set of declarations. P2 expands declarations to onboarding surfaces. P3 adds the lint script. P5 lights up the reviewer bot. P7 wires the AI-assistance path. Each slice adds one tooling capability that depends on metadata being present; metadata coverage grows with each shipped slice.

---

## §10 — Doctrine Linkage

D35 is the universal language layer. Every other doctrine inherits from D35 for tonal expression while keeping its own structural authority.

| Doctrine | D35 inheritance |
|----------|-----------------|
| D08 Visibility | §0 Layer A for off-grid surfaces; §1.1 canonical Off-grid noun |
| D11 Arrival | §0 mixed (gates Layer A, atmosphere Layer B); §5.2 softening rules govern entry transitions |
| D12 Drop Beacon | §1.3 canonical "Drop a beacon" verb; §3 energy band 4–5 |
| D13 Spatial Continuity | §6 temporal language rules apply to location persistence |
| D14 Routing Continuity | §0 Layer A for routing failures; §1.1 canonical surfaces |
| D15 Care Language | D15 is D35 §2.5 + §3.1 (E2 band) + §7 banned phrases for Care, in stricter form |
| D16 Surface Layer | §3 energy bands codify the visual / tonal hierarchy D16 names |
| D17 Surface Layer follow-up | Same as D16 |
| D18 Product Sheet | §2.3 commerce tone + §3 energy 4–5 for product detail |
| D19 Marketplace | §1.1 Drops / Preloved / Shop nouns; §2.3 commerce tone; §3.1 E6 cap for Drops campaigns |
| D20 Identity / Age-Gating | §0 Layer A for age gate; §7 audience nouns |
| D21 Payment & Payout | §0 Layer A absolutely; §1.3 cancel verb; §2.4 error tone; §7 ban on "buy premium" / "unlock" |
| D22 Temporal | §6 live-language rules operationalise D22 in copy |
| D24 Trust | §1.2 canonical trust verbs (Boo / Block / Flag / Report); §2.1 discovery tone |
| D25 Messaging | §1.2 + §1.3 messaging verbs; §2.1 discovery tone; §3 energy 4 for inbox |
| D28 Refund & Cancellation | §0 Layer A; §1.3 Cancel verb; §7 ban on "we'll miss you" manipulation |
| D31 Venue & Partner Power | §1.5 VENUE tier name; §8.2 creator/venue surface inventory |
| D32 AI & Automation | D35 governs any AI-generated user-facing string; no AI-generated copy bypasses D35 |
| D33 Memory & Permanence | §6.2 ban on "archive" / "database" as user-facing nouns; §1.3 deletion as Layer A |
| D34 Trajectory | §6 temporal rules; §1.1 canonical surfaces; §5 escalation across surface transitions |

---

## §11 — Strategic positioning: the emotional operating system (INTERNAL DOCTRINE ONLY)

**Hard rule:** The phrase *"emotional operating system"* is internal doctrine framing and never appears in user-facing copy, marketing campaigns, press materials, investor decks, partner outreach, App Store listings, social-media announcements, or any other externally addressable surface. Used externally it reads as startup-theory jargon and damages the very tonal coherence it describes. Used internally — in this doctrine, in PR descriptions, in contributor onboarding — it is the most accurate frame for what D35 is. The frame is the property; the phrase is the trade secret. Externally, HOTMESS describes itself as what it already is publicly: a queer men's OS, a place to get off and connect and recover and build, a community.

Most platforms build component systems, design systems, and token systems. Very few build emotional operating systems. D35 is HOTMESS's. The strategic consequence is that HOTMESS's tonal coherence becomes a structural property of the codebase, not an artifact of one person's taste. Contributors lookup, they do not invent. Drift gets a name and a severity.

This matters strategically because:

1. **Trust is the substrate.** Every other invariant (consent, care, safety, persona honesty, gay-men's-space audience) depends on the user trusting HOTMESS at the surface they're currently looking at. Inconsistent tone breaks trust faster than any individual bad line.
2. **The audience is sensitive.** Gay men have been gaslit by inclusive-platform marketing for fifteen years. The moment HOTMESS sounds like the platforms that softened to be acquirable, the audience leaves. D35 keeps the voice locked.
3. **Recovery-awareness is non-negotiable.** The Care surface alone justifies D35 — but the inverse is also true. The party surface, the commerce surface, the empty-state surface all need to be the same product to the same user across the same evening, including the user whose evening is fragile.
4. **AI is now writing code.** Three of the last 15 PRs were AI-drafted. D35 means the AI has a lookup table, not a vibes-check. Without it, the AI averages toward generic platform-English on every PR. With it, the AI inherits the same authority a human contributor does.

D35 is not branding. D35 is **behavioural governance** expressed in language. Brand is a downstream artifact.

---

## §12 — Constitutional inheritance gate

(Per EXECUTION.md §9.)

D35 produces the standard X-Y pair:

- **X (preserved human reality):** The user's right to encounter one consistent personality across the HOTMESS OS, and the right to have absence framed as the city's state rather than their personal failure.
- **Y (forbidden extractive mutation):** Any future PR that lands user-facing copy without a D35 lookup. Any future doctrine that defines a surface without specifying its §0 layer, §2 tone state, §3 energy band. Any AI-generated copy that bypasses §9 enforcement.

Future doctrines that touch a new surface (e.g. when D23/D26/D27/D29/D30 land) inherit D35 implicitly and must declare their layer / tone / energy explicitly in their §10 slice section.

---

## Appendix A — Quick-reference card for contributors

Pick the layer first:

- Safety / payments / consent / legal / moderation / outages / account state → **Layer A**
- Everything else → **Layer B**

Pick the tone state:

- Discovery / Safety / Commerce / Error / Recovery / Upgrade / Empty (one of seven)

Pick the energy band:

- 0 (SOS) · 1 (Layer A admin) · 2 (Care) · 3 (Settings, empty) · 4 (Ghosted, inbox) · 5 (Pulse) · 6 (Drops, HNH MESS) · 7 (Radio campaign only)

Lookup the noun:

- §1.1 Surfaces · §1.2 Trust verbs · §1.3 Action verbs · §1.4 Audience · §1.5 Tiers

Avoid:

- §7.1 Banned phrases · §7.2 Luxury SaaS drift · §7.3 Banned constructions

Write the token:

- `src/lib/lang/[surface].ts`

Ship.

---

## Appendix B — Doctrine evolution

D35 is a living spine. Amendments land via PR titled `doctrine: D35 §N amendment — [reason]`. Sections that prove brittle in P1–P8 implementation get revised. The vocabulary registry grows as new surfaces are built. The anti-pattern registry grows as new drift gets observed in the wild.

Initial implementation slices that will feed D35 evolution:

- **P1** Monetisation surfaces — will test §2.3 commerce tone + §3 energy 4–6 + §7 banned-paywall language.
- **P2** Onboarding flow — will test §5.2 softening rules + §1.3 canonical Enter verb.
- **P3** Care surface — will test §15-inheritance + §2.5 + §3.1 (E0–2 band).
- **P4** Pulse + Beacons — will test §1.1 surface nouns + §6 temporal rules.
- **P5** Ghosted + Chat — will test §1.2 Boo/Block/Flag/Report split.
- **P6** Market — will test §2.3 + §3 + §7 against luxury SaaS drift.
- **P7** Ambient / templates — will test §0 Layer A discipline + §8.1 + §8.10.
- **P8** Legacy dedup — will test §9.1 token registry under real consolidation pressure.

D35 v2 lands when all eight slices have been observed for at least one cycle. Until then, this version (v1) is the doctrine-of-record.

---

## §13 — Tonal Register by Surface Class

**Status:** Constitutional amendment to D35, locked
**Ratified:** Phil 2026-06-02
**Surfaces from:** the bell/search distinction during D16 §10 ratification — system surfaces must remain operationally trustworthy while traversal surfaces become atmospheric. Without this lock, every system surface drifts toward atmosphere and ambiguity fatigue builds.

### §13.0 Why this amendment exists

D35 already governs tonal contracts via §0 layers and §2 state-based tone. But it does not yet declare which **classes of surface** inherit which register. Without that rule, implementations choose by feel. The result: notification surfaces become atmospheric (clarity dies, users stop trusting them), or traversal surfaces become utilitarian (atmosphere dies, the platform feels like an admin tool). Both failures destroy product credibility from opposite directions.

This amendment locks the surface-class → register mapping so the right register is inherited, not improvised.

### §13.1 The two registers (LOCK)

| Register | Applies to | Behaviour | Examples |
| --- | --- | --- | --- |
| **Clarity-first** | System, state, interruption, safety, payment, error, confirmation | Operationally trustworthy. Direct. Legible. No metaphor when the user needs information. Minimal language ornament. Energy 1–3. | Bell (state broadcast). Safety FAB. SOS. Payment confirm. Error toasts. Tier gates. Account settings. |
| **Ambient (atmospheric)** | Traversal, discovery, presence, atmosphere, exploration, identity expression | Cinematic. Suggestive. Metaphor-permitted. Texture and voice. Energy 4–6. | Pulse globe. Search overlay. Beacon ambient layer. Care suite ambient copy. Editorial layer. |

The registers are not aesthetic preferences. They are operational rules. A surface in the wrong register fails — clarity-first surfaces in ambient register lose trust; ambient surfaces in clarity-first register lose magic.

### §13.2 Tie-breaker when a surface spans both (LOCK)

When a surface contains both registers (e.g. a chat sheet has clarity-first action affordances AND atmospheric thread context), the register hierarchy is:

1. **Anything operational** (send, confirm, pay, dismiss, decline, opt out, report) → clarity-first
2. **Anything atmospheric** (idle state, content texture, ambient framing, transition copy) → ambient

The two registers may coexist within one surface, but each individual string belongs to exactly one. No string is "between." Strings without a declared register default to clarity-first (safer failure mode).

### §13.3 Surface declarations — initial registry (LOCK)

Per D35's §3.4 SurfaceMeta declaration pattern, the following surface classes are locked at this amendment:

| Surface | Intent | Layer | Energy | Register |
| --- | --- | --- | --- | --- |
| Bell rail icon | `system_state_broadcast` | A | 2 | clarity-first |
| Safety FAB / SOS | `emergency_action` | A | 1 | clarity-first |
| Notification inbox | `system_recall` | A | 2 | clarity-first |
| Tier gate / paywall | `operational_access` | A | 1–2 | clarity-first |
| Pulse search | `world_traversal` | B | 4 | ambient |
| Beacon drop | `invitation_to_signal` | B | 4 | ambient |
| Pulse globe | `live_city_layer` | B | 5 | ambient |
| Editorial card | `nightlife_curation` | B | 4–5 | ambient |
| Care suite (idle) | `care_atmosphere` | B | 3 | ambient |
| Care suite (active alert) | `safety_action` | A | 1 | clarity-first |

Any new surface ships with a declared row.

### §13.4 Search overlay — explicit lock (LOCK)

Search is **`world_traversal`**, not utility lookup. This determines everything downstream.

**Search overlay must open with living context, not a blank enterprise field.** Recent crossings, active neighbourhoods, tonight's hotspots, saved places, live pulses, "continue exploring." The first frame the user sees on opening the overlay is the city alive at this moment. The empty-input state is not a default; it is an explicit choice the user makes (clearing recent results) and rarely seen.

Forbidden in the search overlay:

- "Search HOTMESS…" placeholder
- "No results found" empty-state copy in the absence of any input (use ambient framing — "the night is quiet here yet" or city-aware silence)
- Enterprise list rendering (tabular results, sterile cards, generic icons)
- Database-style sort/filter chrome unless explicitly invoked by user
- Loading spinners as default state (use ambient pulse / shimmer / texture)

Permitted and encouraged:

- City silhouette / map fragment as ambient background
- Recent place chips, presented as memory not history
- Live presence cues ("happening now near here")
- Atmospheric framing of the input field itself ("tell me where you're heading")
- Search results rendered as discoveries, not query matches

### §13.5 What this amendment forbids

Until a slice spec inherits from §13:

- Any system / state / interruption surface implemented in ambient register
- Any traversal / discovery surface implemented in clarity-first register
- New surfaces shipped without a §13.3 row declaration
- Search overlay implementations that violate §13.4

### §13.6 Ratification trail

- 2026-06-02: §13 ratified. Triggered by Phil's bell-to-rail relocation and the search-overlay sequencing. Bell must remain operationally trustworthy (clarity-first) while search must become atmospheric (`world_traversal`). The clarity-first vs ambient distinction generalises to all surface classes, captured in §13.1 + §13.3.
- §13.4 locks the search overlay's first-frame requirement specifically — living context, not empty input — before the implementation slice begins.

---

*End of §13 amendment.*
