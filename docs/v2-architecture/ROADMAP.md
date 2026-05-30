# HOTMESS Globe — V2 Implementation Roadmap

> **Companion to:** [`MANIFESTO.md`](./MANIFESTO.md) (the architectural North Star)
> **Status:** living document, updated each sprint
> **Last revised:** 17 May 2026 · Koh Samui · pre-launch
> **Owner:** Phil Gizzie + Claude (cofounder proxy)

This roadmap maps the V2 manifesto onto concrete sprints and time horizons. The manifesto says what HOTMESS Globe is becoming. The roadmap says when.

When this roadmap and the manifesto disagree, the manifesto wins. This document adapts.

---

## Reading guide

Each section names:

- **Scope** — what from the manifesto this period delivers
- **Status** — locked / in flight / planning / spike-needed
- **Blocked by** — explicit dependencies
- **Out of scope** — what this period does NOT cover, for clarity

Estimates are honest. Risks are flagged.

---

## Sprint 0 — Founding Cohort Launch

**Window:** 16–18 May 2026 (Sat afternoon → Mon morning, Koh Samui time)
**Status:** in flight at time of writing (16 May 2026 night) — Phase 1/2/3a/4 work on `feat/founding-tier-sprites` branch, cohort math + Welcome Portal + provisioning bridge on main
**Owner:** Cowork (Claude Code) + Phil

### Scope from manifesto

Almost nothing from the V2 manifesto ships in Sprint 0. Sprint 0 is the launch of the **current** globe architecture with six Founding Partner tier visual differentiation grafted on. The V2 manifesto begins shipping in Sprint 1.

Two manifesto-aligned decisions land in Sprint 0 by accident of good fortune:

- **Engine-agnostic data layer.** The `useLiveTierData` hook + `partner_beacons_geojson` / `chain_aggregates_geojson` RPCs are deliberately written to be portable from `react-globe.gl` (current) to Mapbox (Sprint 1's DISTRICT mode). This is the manifesto's "single authoritative Three runtime" rule starting to land — the data layer is already runtime-independent.
- **`is_persistent` beacon flag.** Partner beacons skip the existing time-limited expiry sweep, which means the manifesto's "care infrastructure is first-class · stable · persistent" requirement is now schema-level supported. Care and partner pins inherit the same persistence semantics. Time-limited event beacons remain unchanged.

### Out of scope for Sprint 0

- Mode system (`GlobeMode` enum)
- Mapbox introduction
- SignalType taxonomy
- Camera rails
- GPU particles
- Service worker cache layers
- Three.js runtime audit
- Anything from manifesto Phases 2–4

### What Sprint 0 ships

- Six tier sprite groups (Anchor / Signal / Venue / Promoter / Chain / Wellness) extending `react-globe.gl` declarative props (`pointsData`, `ringsData`, `arcsData`, `htmlElementsData`)
- Anchor named-label DOM overlays (first use of `htmlElementsData` in codebase — see §debt below)
- Promoter migration arcs (home → event venue when `event_active = true`)
- SOS expanding-ring sprite via `safety_events` realtime channel
- Cross-repo provisioning bridge (Stripe webhook → `beacons` row with tier-appropriate visual fields)
- Welcome Portal stub at `/portal?token=...` on hotmess-globe
- AgeGate backfill SQL (recovers ~73 of 111 pre-fix stuck profiles)
- Cohort math reconciliation (175 → 115 paid + 25 Recovery)

### Architectural debt acknowledged for Sprint 0

- DOM overlay labels at orbit zoom violates manifesto rule "❌ Use DOM labels globally." Defensible exception: 10 named Anchor partners total, label visibility gated to zoom ≥ 3. Resolved cleanly in Sprint 1 when DISTRICT mode takes over close-zoom rendering.
- Globe still treats all signal types under one render path. Manifesto's typed SignalType system arrives in Sprint 2.
- No mode system. Manifesto's `ORBIT / SIGNAL / DISTRICT / VENUE` enum arrives in Sprint 2.
- Realtime subscriptions are still global, not viewport-scoped. Sprint 1 begins this refactor; Sprint 2 completes it.

---

## Sprint 1 — DISTRICT Mode (Mapbox tactical layer)

**Window:** 19 May → 31 May 2026 (two weeks post-launch)
**Status:** planning, brief drafted (see [Mapbox architecture analysis](https://claude.ai/) prepared 17 May)
**Blocked by:** Sprint 0 ship clean + Mapbox account + URL-restricted public token

### Scope from manifesto

Sprint 1 is the manifesto's **Phase 3 — Tactical Districts** in its entirety, plus three "cheap wins" that improve the existing globe without waiting for the full mode system.

### What ships

- **`/globe-v2` route** behind a feature flag. New route using `react-map-gl@^8.1 + mapbox-gl@^3.9`. Mapbox Standard style with `lightPreset: 'night'` + `theme: 'monochrome'`. Globe projection.
- **Six tier treatments ported** from Sprint 0's `react-globe.gl` implementation onto Mapbox `Source` + `Layer` (for crowds: Venue, Wellness, User beacons) and `Marker` (for named tiers: Anchor, Signal, Chain).
- **Per-postcode district overlay** — tap to enter DISTRICT mode at city zoom. Mapbox `fill` layer with `feature-state` styling for hover. Maps to manifesto's "district overlays · hover systems."
- **Venue precision at close zoom.** Pin positions use exact venue coordinates, not approximate beacon positions. Tap venue → DISTRICT-mode popup with venue card.
- **Heatmap layer** for user presence density at city zoom. Manifesto's "CRUISE — diffuse heatmap behavior" prototype lives here.

### Three cheap wins shipping alongside

1. **Service worker cache refactor** into `hotmess-static / hotmess-map / hotmess-media / hotmess-api` layers — manifesto-aligned, ~2h, ships first as it has no upstream dependencies.
2. **Three.js runtime audit** — surface duplicate imports across `react-globe.gl`, `globe.gl`, `@react-three/fiber`, `drei`. Pick one authoritative runtime. ~half day. Bundle-size win likely 400–600kb gzipped.
3. **Scoped realtime subscriptions begin.** Convert `useLiveTierData` from global subscription to bbox-aware. Natural extension of Sprint 0's hook. ~3h.

### Out of scope for Sprint 1

- Full `GlobeMode` enum implementation (Sprint 2)
- ORBIT-mode GPU particles (Sprint 4+)
- Camera rail cinematic transitions (Sprint 3 spike)
- SignalType taxonomy (Sprint 2)
- Audio-linked spatial behavior (Sprint 4+)
- Three.js removal (Sprint 2 — depends on `/globe-v2` reaching parity)

### Risks

- Mapbox spending cap is none-existent — must URL-restrict the public token to `hotmessldn.com` + Vercel preview domains before any traffic.
- iOS Safari WebGL2 context loss on PWA standalone mode — must real-device QA before cutting `/` over to `/globe-v2`.
- Standard-style `lightPreset` flash-on-load — must use inline style definition with `imports[].config`, not `setConfigProperty` after load.

### Cutover criteria

`/globe-v2` replaces `/` only when all four are true:

- All six tier treatments render at parity or better than Sprint 0's `react-globe.gl` version
- iOS Safari PWA standalone mode tested on real device, no context loss across 5-min session
- Mapbox monthly map load projection at current MAU is under 50,000 (free tier)
- Cofounder taste check: it looks more "HOTMESS" than the existing three.js globe

If any criterion fails: defer cutover to Sprint 2. Both routes coexist; users can opt in to v2 via settings flag.

---

## Sprint 2 — World Model + Mode System

**Window:** 1 June → 21 June 2026 (three weeks)
**Status:** planning
**Blocked by:** Sprint 1 cutover + `/globe-v2` carrying production traffic

### Scope from manifesto

Sprint 2 is the manifesto's **Phase 2 — World Model** in its entirety.

### What ships

- **`GlobeMode` enum** as a real render state, not a cosmetic zoom value. Each mode has its own render path, data density, subscription scope, interaction system, UI hierarchy.
- **SignalType taxonomy** — typed entities for `radio | party | care | cruise | host | shop | live | district`. Schema migration adds `signal_type` to `beacons` (or supersedes `beacon_category` if alignment is close). Each type defines: emissive behavior, pulse timing, hover interaction, visibility priority, zoom thresholds, cluster rules.
- **Scoped realtime subscriptions completed.** `subscribeToViewportSignals(bounds, mode)` replaces all `subscribeToAll*` calls. Manifesto-mandated.
- **Three.js removal.** Once `/globe-v2` carries 100% of traffic, the legacy `react-globe.gl` code path is deleted. Bundle size win ~600kb gzipped. Closes the "single authoritative Three runtime" manifesto requirement.
- **ORBIT mode locked down.** No DOM labels at orbit zoom, including the Sprint 0 Anchor labels. Anchor labels move to SIGNAL mode entry, where they belong per manifesto rule.

### Spike preceding the sprint

- **SignalType schema spike** — 1 day, before Sprint 2 plan locks. Write the SignalType enum as TypeScript schema with concrete examples for each type, map onto current `beacon_category` values. Decide: extend, supersede, or replace?

### Out of scope for Sprint 2

- Cinematic camera transitions (Sprint 3)
- GPU particle systems (Sprint 4+)
- Audio-linked behavior (Sprint 4+)
- Adaptive atmosphere (Sprint 4+)

### Risks

- Schema migration may require migrating 12+ active beacons + 64+ pulse_places to new taxonomy. Plan a backfill before the cutover.
- Some existing globe interactions may not have a clean mode mapping. Edge cases get documented as "mode-undefined" and resolved on a per-case basis rather than blocking the sprint.

---

## Sprint 3 — Cinematic Camera + Signal Choreography

**Window:** 22 June → 12 July 2026 (three weeks)
**Status:** spike-needed before planning
**Blocked by:** Sprint 2 mode system in production

### Scope from manifesto

Sprint 3 begins the manifesto's **Phase 4 — Immersion** with the highest-risk, highest-reward piece: cinematic camera transitions between modes.

### What ships

- **Eased camera rails** for ORBIT → SIGNAL → DISTRICT → VENUE transitions. Mapbox `flyTo` + custom easing functions per transition pair.
- **Atmospheric fades** during mode transitions. Opacity interpolation on the basemap + signal layers.
- **Signal amplification on focus** — entering SIGNAL mode increases pulse intensity on signals near viewport center, fades signals at edges. Manifesto's "progressive reveal" pattern.

### Spike before sprint planning

- **Camera rail spike (week of 22 June, 3 days):** build one transition (ORBIT → SIGNAL on London) end-to-end in a feature branch. Show to 5 beta users. Decide if it survives.
- **Acceptance criterion:** beta users describe the transition with words like "cinematic" or "alive." If they say "smooth" or "nice" the spike is failing — the manifesto's bar is higher than "nice."

### Risks

- Cinematic transitions on mobile Safari can chug. Frame-rate budget must be set before the spike (target: 60fps on mid-tier Android, 90fps on iPhone 14+).
- Over-animating mode transitions adds latency to mode switches. Snappy interaction > impressive motion. The manifesto wants both; reality requires a trade-off. Sprint 3 finds the right point.

---

## Sprint 4+ — Atmosphere, Particles, Audio

**Window:** July onward
**Status:** vision only, no sprint commitment
**Blocked by:** Sprint 3 cinematic transitions clearing the spike gate

### Scope from manifesto

The remaining ~50% of the manifesto: GPU particle systems, audio-linked spatial behavior, signal choreography, adaptive atmosphere, environmental motion.

Each of these is a research-prototype-iterate workstream, not a sprint plan. Each item gets a spike week before it earns a sprint commitment.

### Spike order (proposed)

1. GPU particles for ORBIT mode city pulses (manifesto: "Prefer GPU particles · instanced rendering · emissive signal shaders")
2. Audio-linked spatial behavior — radio activity arcs synced to live HOTMESS Radio audio peaks
3. Adaptive atmosphere — basemap colors shift with London time-of-day + weather API integration
4. Care infrastructure breathing pattern — distinct from nightlife pulse, manifesto-mandated visual differentiation

---

## Cross-cutting concerns

### Care infrastructure

The manifesto names care as first-class. Every sprint must explicitly track how care entities render in each mode.

- **Sprint 0:** Recovery + Wellness tiers render with muted blue-grey palette (`#7a8b9a` glow, `#9aaab8` dot). Distinct from gold club tiers.
- **Sprint 1:** DISTRICT mode care nodes get a separate Mapbox Layer with `circle-emissive-strength: 0.7` (vs 1.0 for club tiers) — softer luminance, no pulse.
- **Sprint 2:** SignalType `care` defined with its own pulse timing (slow, warm breathing) distinct from `party` (aggressive flare).
- **Sprint 3+:** Care nodes are excluded from cinematic camera amplification. They stay calm even when the rest of the globe is performing.

### Performance budget

Every sprint must measure against these targets per the manifesto:

- **ORBIT mode:** <16ms frame time on iPhone 14, <33ms on Pixel 6a
- **SIGNAL mode:** controlled signal count (target: ≤300 visible signals at any zoom)
- **DISTRICT mode:** Mapbox handles tactical geometry — measure tile load latency, not frame time
- **VENUE mode:** detail systems lazy-loaded — measure time-to-interactive after venue tap (<400ms)

### Manifesto rule enforcement

Every PR touching `src/components/globe/*`, `src/hooks/use*Globe*`, or the realtime subscription layer is reviewed against the manifesto's rendering rules:

- ❌ No large React trees in globe loops
- ❌ No DOM labels globally
- ❌ No venue detail at orbital zoom
- ❌ No treating the globe as a database dump
- ❌ No realtime listeners without spatial scope

A PR that violates any rule needs an explicit "exception documented in roadmap" before merge.

---

## Success criteria — mapping to manifesto

| Manifesto criterion | Sprint it ships in | How we measure |
|---|---|---|
| Feel alive | 3 | Beta user qualitative ("cinematic" / "alive") |
| Scale naturally | 1, 2 | Mapbox map loads at projected MAU stay <free-tier limit until 50k MAU |
| Readable at all zoom levels | 1, 2 | Real-device QA at 4 zoom levels per mode |
| Cinematic atmosphere | 3 | Beta user qualitative + frame-rate budget met |
| Tactical venue interaction | 1 | Venue card opens with all required state ≤400ms after tap |
| Performance under density | 2 | 300 signals @ 60fps mid-tier Android |
| Support future growth without collapsing UX | 2, 3 | New SignalType can be added without touching mode system; new mode can be added without touching SignalType system |

---

## Open questions for cofounder + Phil review

These are decisions deferred until needed, listed here so they don't get lost:

1. **Mapbox vs MapLibre as DISTRICT mode renderer.** Mapbox is the Sprint 1 default. MapLibre is the licensing escape hatch if Mapbox pricing becomes untenable past ~100k MAU. Decision deferred until Sprint 1 cutover + 30 days of real load data.
2. **VENUE mode rendering — Mapbox or custom?** Manifesto says VENUE mode should feel like "nightlife operating system," which may exceed what Mapbox's standard popup architecture supports. Spike in Sprint 1 to determine: keep Mapbox or peel off into a custom React render path with the Mapbox layer hidden.
3. **Audio integration scope.** Manifesto names "audio-linked spatial behavior." Open question: does HOTMESS Radio audio drive globe visuals, or do globe events drive radio prompts? Likely both, but the spike in Sprint 4+ decides the dominant direction.
4. **Persistent vs ephemeral signals.** Sprint 0 introduced `is_persistent` for partner beacons. Manifesto implies all signal types may need a persistence dimension (CARE = persistent, PARTY = ephemeral). Sprint 2 SignalType spike should resolve this at schema level.

---

## How to update this roadmap

Edit it. Commit. Rebase on main weekly.

Specifically:

- After each sprint: update the sprint's section with "what actually shipped" vs "what was planned"
- When a manifesto criterion is met: tick it in the success-criteria table
- When a manifesto rule is violated: log the violation in the architectural debt subsection of the active sprint, with a target sprint for resolution
- When an open question is answered: move it from "Open questions" to the sprint where the decision shipped

The manifesto is canonical. This roadmap is operational. Both live in the repo. Both are read before any globe PR.
