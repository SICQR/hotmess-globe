# HOTMESS Platform Expansion — Strategic Vision

**Date:** 2026-05-31
**Author:** Phil Gizzie (captured by AI session)
**Purpose:** Capture Phil's strategic direction for HOTMESS expanding into a multi-property platform — many sub-sites under one OS — so that any future Claude design session, ChatGPT session, or new repo can pick this thread up without restarting strategy.

---

## §0 The Vision in One Sentence

**HOTMESS is not one app. HOTMESS is the operating system that runs many queer-nightlife properties — community sites, founder sites, scene sites, city sites — each with its own surface, all sharing the same constitutional doctrine.**

Grindr has many country properties. HOTMESS should have many *kind-of-place* properties. Not geographic — cultural. Not duplicates — variants of the same OS.

---

## §1 The Pattern

Think Grindr → think country-by-country sites + shared infra.
Think HOTMESS → think:

- `hotmessldn.com` — the founding HOTMESS, the London flagship, the canonical reference implementation
- `founder-x.hotmess.com` — individual founders get their own properties (creative directors, DJs, community organisers, venue owners)
- `scene.hotmess.com` — scene-specific properties (Vauxhall, Berlin, Berghain weekend, Pride circuits)
- `care.hotmess.com` — care-specific surfaces (aftercare networks, recovery communities)
- `events.hotmess.com` — event-organiser tooling
- `archive.hotmess.com` — historical record of nights, scenes, beacons

Each site is its own surface, its own audience, its own editorial voice — but all inherit from the same doctrine stack (D08, D14, D15, D17, D18, D19, D20, D22, D34, EXECUTION).

The shared substrate is the OS. The variation is the property.

---

## §2 What Stays Shared (Sacred Across All Properties)

These are non-negotiable. Every property inherits them. No founder, no operator, no investor can override them. They are the things that make all `.hotmess` properties **the same family** instead of a federation of disconnected sites.

| Layer | Why shared |
|---|---|
| **D20 Identity** | A user is the same user across every property. Four-layer model (Presence/Safety/Legal/Recovery) is one architecture, not many. Pseudonymity at parity across properties. |
| **D22 Temporal** | The HOTMESS philosophy of memory. *"Remember enough to preserve continuity, never enough to reconstruct a life."* Every property obeys the three-tier memory architecture. |
| **D34 Trajectory** | Shared trajectory is the system primitive. A user's trajectory crosses properties — Soho on Friday, Vauxhall on Sunday, aftercare Monday — and the OS continues across the boundary. |
| **D08 Visibility** | Off-grid means off-grid everywhere. A property cannot reconstruct presence the OS has hidden. |
| **D15 Care Language** | Care tone is universal. Every property speaks human. |
| **D19 §6.10 Commerce Beacon Doctrine** | Commerce surfaces never violate the dignity floor regardless of which property they live on. |
| **D31 Venue & Partner Power** (when written) | Venue and partner properties cannot bend the OS. |
| **EXECUTION rule + Slice format** | Every property's contributors use the same operational discipline. |

These are doctrine, not policy. Quoting Phil from D20 §16: *"Business pressure is not architectural authority."*

---

## §3 What Each Property Customises

Each property has its own:

- Editorial voice (the campaign images, the copy, the music, the events surfaced)
- Atmosphere palette (D22 atmospheric layer can read differently per property's mood/aesthetic)
- Surface layout (which sheets, which modes, which beacons matter)
- Community moderation policies (within the global moderation floor)
- Routing topology (Soho-centric routes vs Berlin-centric)
- Care geography (which venues are trusted handoff points)
- Provenance language (D19 §5.3 — "Worn at Fold" reads differently in London vs Berlin)
- Onboarding texture (D09 voice varies by audience)

But the **doctrine** is the same. The **OS** is the same. The **identity** is the same.

A user crossing from `hotmessldn.com` to `berghain.hotmess.com` should experience the same identity, the same memory rules, the same trajectory grammar — but in a different texture.

---

## §4 The Architectural Implications

### §4.1 Repo strategy

Options for future Phil and future Claude/ChatGPT design sessions:

**Option A — Monorepo with property modules.** One repo, many surface configs. Each property selects which modes, sheets, and editorial assets to render. Shared core. Easier to keep doctrine in sync; harder to evolve properties independently.

**Option B — Core + child repos.** A `hotmess-core` repo (this one) becomes the substrate. Each property is its own repo that depends on core. Independent deploys; doctrine drift is the risk.

**Option C — Hybrid.** Core repo + a `properties/` directory at the top level. Each property is a config + override directory. Shared deployment pipeline. Most pragmatic for v1.

Phil's instinct (captured 2026-05-31): start with C, evolve to B if properties need genuinely independent velocity. Do not start with A — it locks property variation into the wrong abstraction layer.

### §4.2 Domain strategy

- `.hotmess` as the umbrella TLD or subdomain root (e.g. `*.hotmess.com` or `*.hotmess.app`)
- Properties addressable as `<property>.hotmess.<tld>`
- The founding HOTMESS keeps `hotmessldn.com` as legacy URL + a `london.hotmess.com` synonym
- Founder properties: `<founder-handle>.hotmess.com`
- Scene properties: `<scene>.hotmess.com`

Identity sessions persist across subdomains (D20 §2 Recovery layer carries the cross-subdomain auth).

### §4.3 Tenant isolation contracts

Data isolation is by **property** but identity is by **user**. The four-layer model from D20 implies:

- Presence is per-property (a user can be loud in Vauxhall and quiet in Berlin — their Presence Identity carries per-property atmosphere)
- Safety is global (SOS routes work the same regardless of which property triggered it)
- Legal is global (compliance, payouts, age — bound to the user, not the property)
- Recovery is global (one account recovery covers all properties)

This is structurally enabled by the D20 four-layer split. Multi-tenant did not require a redesign — D20 anticipated it.

### §4.4 Doctrine inheritance per property

Every property's `docs/doctrine/` directory contains:

- **Doctrine inheritance receipt** — explicit list of which shared doctrines the property inherits (always the §2 list above)
- **Property doctrine** — the property's own customisations within the inheritance boundaries
- **Property slices** — feature slices specific to the property, using the standard EXECUTION format

A founder spinning up a property cannot edit the shared doctrines. They can author their property doctrine on top.

---

## §5 Why This Matters Strategically

### §5.1 What HOTMESS becomes if this lands

A coherent **queer cultural OS** with many properties. Each property feels native to its audience. The user moves between properties carrying their identity, their care, their memory, their trajectory.

Grindr is one app, one feel, one tone, one design language across countries. That's a surface choice. It works for them.

HOTMESS makes a different choice: many surfaces, one substrate. Each scene gets the property that fits it. The substrate ensures continuity, dignity, and safety across all of them.

This is rare. Most platforms collapse into one homogenised surface as they scale. HOTMESS, if this vision holds, is the opposite: it scales by adding properties, not by adding users to one property.

### §5.2 What this protects against

- **Cultural flattening.** Every queer scene becoming the same app. The thing that kills queer products at scale.
- **Single-property dependency.** If `hotmessldn.com` ever becomes inappropriate for a community, that community has other properties to inhabit without leaving HOTMESS.
- **Founder bottleneck.** Other queer founders, DJs, organisers can run HOTMESS-native properties without forking the brand. They contribute upstream to the shared doctrine.
- **Geographic limitation.** HOTMESS doesn't have to be just London. But it also doesn't have to be just nightlife. Properties can specialise (care, archive, events).
- **Brand drift.** The doctrine stays sacred. Every property inherits it. There is no "HOTMESS lite" property where the sacred rules don't apply.

### §5.3 What this enables economically

- **Founder properties as economic surfaces.** Other founders run their property; HOTMESS substrate takes a substrate-rate. The economics are platform-substrate, not app-revenue.
- **Scene partnerships.** Venues, festivals, recovery networks can run properties under the HOTMESS substrate.
- **D31 Venue & Partner Power Doctrine becomes the contract.** The unwritten doctrine that will govern this layer is already on the Phase 3 list.

---

## §6 What To Do Next (For Future Phil + Future Agent)

If Phil returns and wants to design this expansion, the right sequence is:

1. **Stay on convergence slice first.** Do not start platform expansion design until D19 × D20 × D22 × D34 is feel-tested in production via the convergence slice. The OS needs to feel right at one property before it expands to many.
2. **Write D31 (Venue & Partner Power) before any external party gets a property.** The architecture for who controls a property is currently undefined.
3. **Write D24 (Contextual Trust Weighting) before trust crosses property boundaries.** Otherwise the trust gradient becomes per-property and the user's continuity breaks.
4. **Sketch the property config schema as a Claude design session.** Use Figma + Claude design to lay out what a property's editorial customisation surface looks like. Phil's instinct: every property has the same components, customised through theme + content slots.
5. **Pick one second-property pilot.** Most defensible: `archive.hotmess.com` — pure read-only memorial layer reading from D22's atmospheric memory. No user-facing safety surface, no commerce. Tests the substrate without risking the doctrine.

---

## §7 What Future Claude/ChatGPT Should Carry

If you are a future agent reading this document and Phil asks about platform expansion, multi-tenancy, founder properties, or `.hotmess` subdomain strategy — this doc is your context. Hold these points:

- The vision is **many properties, one substrate, one doctrine stack, one identity.**
- The shared layer is **doctrine**, not template or theme.
- Each property customises **atmosphere, editorial, surface mix** — never doctrine.
- D20's four-layer identity is what makes this multi-tenant possible.
- D22's three-tier memory is what makes continuity across properties possible.
- D34's shared trajectory is what makes the user feel like one person across properties.
- D31 (when written) will govern who can operate a property.
- The Grindr analogy is **structural**, not aesthetic. Grindr has many country sites with one design; HOTMESS has many property sites with one doctrine.

---

## §8 Phil's Closing Sentence

> Founders should be able to run their own .hotmess. Users should feel they're in their own world. Doctrine keeps them all family.

That sentence is the strategic vision compressed. Hold it.

— end —
