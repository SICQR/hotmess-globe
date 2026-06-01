# D43 Slice A — In-World Cluster Preview

**Status:** Scope ratified by Phil 2026-06-01. Locked for implementation.
**Unblocked by:** D48 amendment ([PR #777](https://github.com/SICQR/hotmess-globe/pull/777)) embedding §5.1 canonical evaluation question.
**Doctrine refs:** D43 (In-World vs Sheet-World Boundary) · D48 §3.1/§3.3/§5.1 (Spatial Identity Exposure + canonical question) · D08 (Visibility-State Architecture) · D17 (Surface Layer / preview pattern) · D35 (Language OS) · sacred-invariants Constitutional Substrate.

---

## §0 — The Ontology Fix (load-bearing)

> **A cluster is not N grouped markers. A cluster is N negotiated social exposure states composed into a single surface render.**

This is the line everything else in the slice inherits from. Before D48 §5.1, "cluster preview" could be designed as a visualization problem — how do you compactly show 8 markers? After D48, cluster preview is a composition problem — how do you compose 8 different consent contracts into one render that honours every contract?

> **The visuals follow the composition; the composition does not follow the visuals.**

That distinction is the difference between a nightlife map and a governed social operating system. Most apps cluster geometry. HOTMESS clusters negotiated exposure states. The distinction matters strategically, emotionally, legally, and architecturally.

---

## §1 — What This Slice Ships

A new surface: the **cluster preview**. Lives in-world (on the Pulse globe / local map), not in sheet-world (D43 §1). Renders when a cluster of ≥2 beacons exists at the user's current zoom and is brought into the viewer's attention via hover (desktop) or long-press (mobile).

The preview is *atmospheric*: it shows that the cluster contains presence, what kinds of presence (per-intent breakdown), and how much (count). It does **not** name individuals, does **not** show face avatars by default, does **not** open sheet-world. Commitment to sheet-world (tap → cluster sheet, zoom → individual beacons) is a deliberate next act by the viewer.

The preview should behave like passing headlights, overheard energy, peripheral awareness. Glance first; depth second.

Concretely the slice ships:
- A new render module: cluster hover-chip / long-press peek (one surface, two trigger modes per D17 §4)
- A composition function: takes N beacon records → returns one preview state
- The §5.1 canonical evaluation question wired as a binding contract at the composition layer
- The Cluster Continuity Invariant (§3.5) as a recomposition guardrail
- BeaconA11yList parity row for cluster previews (D08 + a11y mandate)
- Zero new sheets, zero new routes, zero schema/RPC drift

## §2 — What This Slice Does NOT Ship

- Photo markers / face avatars at any zoom in any cluster preview by default (D48 §3.2 forbiddance + §5.1 default-down)
- Tap-to-open cluster sheet (separate L2 surface — out of scope; the preview must work as a preview, not a sheet preamble)
- Schema changes (uses existing beacons + visibility_snapshot from D48 Slice 1)
- Person photo markers (separate Slice G, gated behind BEACON_PHOTO_MARKERS flag)
- Routes / directions UI on the preview (D14 territory)
- Hover behaviour on the lone-beacon (non-clustered) case — already handled by the existing kind-router preview
- Intent leader chip (ratified §9.1 — clusters must feel unresolved, alive, ambiguous; not taxonomized)

The slice is narrow on purpose. The composition contract is the load-bearing thing; visual polish iterates from there.

---

## §3 — The Composition Contract

For a cluster containing N beacons, the preview state is computed as follows.

### §3.1 Inputs (per beacon)

From the existing `get_renderable_beacons_for_viewer` RPC (D48 Slice 1) each beacon arrives with:
- `intent` — one of: looking, hosting, cruising, aftercare, quiet_hold, arriving, market (D12 + Drop Beacon Doctrine)
- `exposure_register` — one of: anonymous, persona_shape, face_avatar (D48 §2 spectrum; full_reveal is sheet-world only)
- `viewer_trust_state` — one of: stranger, viewer_opted_in, mutual (D08 + D48 §3.3 gate 1)
- `proximity_band` — one of: far, near, close (D48 §3.3 gate 2)
- `priority_class` — explicit operator/curated priority flag (per D31 venue/partner power)
- `safety_eligibility` — boolean from the safety/visibility gate composite
- `freshness_score` — beacon recency / activity weighting
- `owner_id` — needed for mutual-set computation; NEVER rendered in preview

### §3.2 Per-beacon evaluation against §5.1

For each beacon, evaluate D48's canonical question for the **cluster-preview surface specifically**:

> *Did the user opt into face exposure for this surface (cluster-preview), at this intent, under these conditions (gates 1–4)?*

For cluster-preview the four gates are:
1. Viewer trust — mutual-only → may permit face; stranger / non-mutual → step down
2. Proximity — close + mutual → may permit face; far → step down to count
3. Zoom — cluster preview by definition occurs at a zoom where the cluster has not yet split into individual markers, so the *zoom* gate is already a downward force
4. Per-surface consent — user has explicitly opted in to face exposure on cluster-preview at this intent

**For cluster-preview, gate 3 (zoom) is structurally restrictive.** Face avatars in cluster preview require viewer-mutual AND close-proximity AND explicit per-surface opt-in — three gates against the spatial layer's own downward force. Faces in clusters become rare on purpose.

Aftercare is structurally forbidden (D48 §3.2) regardless of any gate combination.

### §3.3 Composition rule

After per-beacon evaluation, the cluster preview shows:

- **Intent mix**: a count breakdown by intent. *e.g. "3 looking · 2 hosting · 1 aftercare · 2 quiet hold"*.
  - The substrate showing structurally that recovery / care is present in the room without naming whose. Aftercare is **always counted in the breakdown** because its presence is what makes the mix honest — but the contributing user is anonymous regardless of any other state.

- **Single representative avatar (when ANY beacon passes the §3.2 gates)**: a single representative avatar — never a face stack. Selection order is **deterministic**, applied in priority cascade:
  1. **Explicit priority class** — operator / curated / venue-authored beacons rank first if face-eligible
  2. **Safety eligibility** — beacons that pass the composite safety/visibility gate
  3. **Activity / freshness weighting** — newer / more-active beacons rank above stale
  4. **Stable deterministic tie-break** — hash-of-owner-id sorted lexicographically
  5. **Lowest beacon id fallback** — last resort

  This ordering is the doctrine. Random-per-render is **forbidden** — see §3.5 for why.

- **Cluster count**: total N, prominent. The count is the honest signal at distance.

- **No leader chip** (ratified §9.1). Future work may explore **atmospheric mood chips** (Busy / Open / Moving / Late / Loud / Holding) that describe atmosphere rather than people. That's a future doctrine territory, not this slice.

### §3.4 Substrate protections (sacred invariants)

- **Aftercare never headlines.** Aftercare is counted in the breakdown, never advertised as a label-on-top. Making care infrastructure into a performative cluster headline replicates the very pattern D15 + D48 §3.2 protect against.
- **Default-down under uncertainty.** If any signal returns null or undefined (e.g. RPC returns missing exposure register), the preview steps the beacon down to anonymous + counted. Better to under-show than to mis-show.
- **No face stacks at distance.** A "wall of faces" cluster render is forbidden even if every beacon in it has full opt-in. The single-representative rule is the protection — face stacks at low zoom read as performative recognition rather than atmospheric signal.
- **Cluster preview never names individuals.** Names belong in sheet-world. The preview surfaces aggregate state only.

### §3.5 Cluster Continuity Invariant (Phil 2026-06-01)

A cluster should **resist recomposition** unless materially changed by:
- beacon count delta
- centroid movement (geographic shift past a meaningful threshold)
- moderation state change on any contributing beacon
- safety/privacy gate change on any contributing beacon
- intent topology shift (a new intent appears, or one drops to zero)

Otherwise the composer **preserves**:
- the single representative selection (same avatar, frame to frame)
- the visual identity (same chip layout, same render shape)
- the emotional continuity (no flicker, no shuffle, no resorting on idle re-render)

Recomposition only fires on **meaningful topology change**, never on pure re-render.

Without this invariant, the globe risks feeling synthetic and unstable. The city should breathe. Not reshuffle.

**Future cadence-window rotation** (not this slice, recorded for the doctrine record): if rotation among face-eligible candidates becomes desirable later (so the "same person always represents this cluster" isn't permanent), the rotation must happen on a **cadence-window** basis with a **minimum stability duration**, and only on meaningful topology change. Never per render.

### §3.6 Visibility negotiation engine — constitutional framing

`composeClusterPreview` is **not** a UI helper. It is:
- a visibility negotiation engine
- a doctrine enforcement layer
- a social exposure arbitration system

Treat it as constitutional infrastructure. That means:
- unit-tested first, before any render code lands
- deterministic outputs (given the same inputs + viewer context, the same output)
- explicit gate traceability (every decision named in code, every gate result observable)
- audit-visible failures (uncertainty fallbacks are logged, not silent)

---

## §4 — Trigger + Interaction

Per D17 §4 unified preview pattern:
- **Desktop:** hover over the cluster marker → preview chip materialises beside the cursor
- **Mobile:** long-press (≥350ms, ratified §9.5 — unchanged from D17) on the cluster marker → preview chip materialises above the press point

Single tap on a cluster marker is **not** what triggers the preview. Single tap commits — opens the cluster's L2 sheet (out of slice scope, but the contract must respect that single-tap is reserved for that future commitment).

Preview dismisses on:
- Pointer-leave (desktop)
- Press-release (mobile)
- **1.5s timeout** (ratified §9.4) — atmospheric, not sticky. The cadence of passing headlights, not the cadence of operational software.

The preview does not have a tap-target itself. To go further, the user re-engages with the cluster marker directly. This is intentional: the preview is *information given*, not a *thing to interact with*. Per D43 §3, in-world surfaces do not lead to other in-world surfaces via taps on the surface itself.

---

## §5 — Edge Cases

| Case | Behaviour |
|---|---|
| Cluster of all-anonymous beacons | Show count + intent mix. No avatar slot rendered (don't show an empty avatar placeholder — that reads as "data missing", which it isn't). |
| Cluster contains only one face-eligible beacon | Show count + intent mix + that single avatar (the priority cascade resolves trivially). |
| Cluster contains ≥2 face-eligible beacons | Pick one via §3.3 priority cascade. The unpicked face-eligible beacons render as anonymous in the count. |
| Cluster contains only aftercare beacons | Show count + the line **"Care held here"** (ratified §9.2). No avatar even if a viewer→owner mutual gate would permit it; aftercare's structural forbiddance still applies. |
| Cluster contains a mix where aftercare is the plurality | Intent mix shows aftercare counted normally. No leader chip exists in this slice (§3.3) so plurality has no visible consequence at the chip layer. |
| Cluster contains a viewer's own beacon | Viewer's own beacon contributes to the count but is not eligible to be the representative (you don't show someone their own face as part of someone else's atmospheric reading). |
| Cluster is on a beacon owned by an off-grid user (D08) | D08 already removes off-grid beacons from `get_renderable_beacons_for_viewer` for non-mutuals — the cluster simply has one fewer member from the viewer's perspective. No special preview handling needed. |
| Cluster topology is unchanged but RPC re-fires (cache invalidation, focus change) | Composer returns the SAME state per §3.5. No recomposition, no representative shuffle, no flicker. |
| Cluster is within a venue's curated event area | Cluster preview is unchanged; the venue layer is independent. Venue branding overlays on cluster previews is out of slice scope. |

---

## §6 — A11y Surface

The BeaconA11yList (D17 §6 mandate) gets a new row type for clusters. Same composition contract: count, intent mix, optional single representative. Screen-reader output is the literal preview content with no visual special-casing. *e.g.*:

> *"Cluster of 8 at Soho. 3 looking, 2 hosting, 1 aftercare, 2 quiet hold. Anonymous."*

> *"Cluster of 3, care held here. Anonymous."*

The a11y row does not lead anywhere either — same in-world / sheet-world boundary as the visual preview.

---

## §7 — Implementation Surface (where the code goes)

- **Composer layer:** new file `src/lib/clusters/composeClusterPreview.ts` — pure function `composeClusterPreview(beacons: ViewerVisibleBeacon[], viewer: ViewerContext, prior?: ClusterPreviewState): ClusterPreviewState`. The optional `prior` arg carries the previous preview state for the same cluster, enabling §3.5 continuity (if topology unchanged vs prior, return prior).
- **Continuity cache layer:** lightweight in-memory map keyed by cluster topology hash, holding the most-recent composed state per cluster. Composer consults the cache; cache invalidates only on topology change (per §3.5 triggers). This is the recomposition guardrail.
- **Render layer:** new component `src/components/globe/ClusterPreviewChip.tsx` — receives a `ClusterPreviewState`, renders the chip. Pure presentational.
- **Hover wiring:** existing kind-router in `mapboxLayerStack.js` (already differentiates beacon vs venue vs cluster on hover/long-press per D17). Cluster branch → call composer → render ClusterPreviewChip.
- **A11y wiring:** `BeaconA11yList.jsx` consumes the same `composeClusterPreview` output for cluster rows.

No schema changes. No new RPCs. The composer reads from `get_renderable_beacons_for_viewer` (D48 Slice 1 pipeline).

### §7.1 Implementation PR requirements (locked)

The implementation PR(s) for this slice must include:
- **Deterministic snapshot tests** — same inputs + viewer context = same output, every test run
- **Gate-trace comments inline** — every face_avatar render path answers §5.1's canonical question in code comments, naming the gate decisions (gate 1: trust = mutual ✓; gate 2: proximity = close ✓; gate 3: zoom = cluster-low ⤓; gate 4: per-surface consent = opted_in ✓)
- **Recomposition guardrails** — the continuity cache must be observable; a debug assertion fires if a composer output differs from prior with no topology trigger
- **Continuity cache layer** — as §7 describes
- **Explicit uncertainty fallback telemetry** — every default-down step logs an event (intent, gate that failed, why), aggregated to a Supabase telemetry table for §11 KPI tracking

### §7.2 Acceptance seeds (composer unit tests)

These are written before any render code lands.

| # | Seed | Expected output |
|---|---|---|
| 1 | 6 beacons at a Soho cluster, mix of intents, none with face opt-in | `count=6, intent_mix={looking:2, cruising:2, aftercare:1, quiet_hold:1}, representative=null` |
| 2 | Same cluster but viewer is mutual with 1 cruising beacon owner AND that owner has cluster-preview face opt-in AND proximity is close | Same count + intent_mix; `representative=that_beacon` via §3.3 priority cascade |
| 3 | Cluster of 3 aftercare beacons only | `count=3, special_copy="Care held here", representative=null` regardless of any gates |
| 4 | Cluster of 4 with 2 aftercare + 1 hosting + 1 looking | `count=4, intent_mix shown, representative=null` (no aftercare can headline; the hosting/looking aren't face-eligible) |
| 5 | Cluster containing viewer's own beacon | Viewer's beacon counted, NOT eligible as representative |
| 6 | **All beacons face-eligible by trust+proximity, but exposure register signal returns undefined for all** | Default-down render. `representative=null`. Atmosphere (count + intent mix) survives. Every default-down logs a fallback telemetry event. |
| 7 | **Cluster churn without topology change** — RPC re-fires twice with identical inputs after a focus event | Second composer call returns the EXACT same state object as first (representative stable, visual identity preserved). Continuity cache assertion fires if it would have differed. |

---

## §8 — Out of Scope (deferred)

These come up while scoping; they belong in later slices.

- **Cluster L2 sheet** (Slice B): what opens on tap-commit. Different surface, different consent contract (sheet-world allows higher register per D48 §3.1 footnote — a face that's anonymous in cluster preview may be face_avatar in the L2 sheet if the user has profile-sheet face opt-in).
- **Photo markers** (Slice G — #388): person photo markers at high zoom. Different consent contract again (individual marker, single beacon, no composition).
- **Selected halo** for clusters (Slice C): visual treatment when a cluster is the focused element after a tap that's en route to opening its sheet.
- **Atmospheric mood chips** (future doctrine): Busy / Open / Moving / Late / Loud / Holding — environmental, not behavioural. Earned only after the cluster-preview foundation is stable.
- **Cluster on-route inclusion** (D14 territory): whether a cluster can appear as a route waypoint. Probably no.

---

## §9 — Ratified Decisions (locked 2026-06-01)

### §9.1 Leader chip
**OFF.**

Do not reduce clusters to dominant behavioural labels. A cluster should feel **unresolved · alive · socially ambiguous · atmospheric** — not taxonomized.

Future doctrine territory may explore *atmospheric mood chips* — Busy / Open / Moving / Late / Loud / Holding — which describe atmosphere, not people. Earned later, not now.

### §9.2 Aftercare copy
**"Care held here."**

- Human without being soft
- Non-transactional
- Temporally local
- Avoids healthcare/service language
- Survives future doctrine expansion

Rejected: "Care offered here" (service economy tone) · "Aftercare available" (clinical/supportdesk) · "Someone's holding space" (too editorial).

### §9.3 Single representative selection
**Deterministic. Never random per render.**

Stable ordering (§3.3):
1. Explicit priority class
2. Safety eligibility
3. Activity / freshness weighting
4. Stable deterministic tie-break
5. Lowest beacon id fallback

Random-per-render creates visibility distrust, moderation ambiguity, screenshot inconsistency, flicker identity, emotional instability. The city must feel composed, not shuffled.

### §9.4 Preview duration
**1.5s.**

2.5s feels like operational software. 4s kills kinetic rhythm. 1.5s is passing headlights, overheard energy, peripheral awareness. Glance first; depth second.

### §9.5 Long-press threshold
**350ms — unchanged.**

D17 muscle memory continuity matters more than theoretical tuning gains.

---

## §10 — Done Criteria

This slice is done when:
- [ ] `composeClusterPreview` is implemented + deterministic-snapshot-tested against the 7 acceptance seeds in §7.2
- [ ] Continuity cache layer is in place and the continuity assertion fires on any compositional drift without a topology trigger
- [ ] Gate-trace comments are present on every face_avatar render path
- [ ] Uncertainty fallback telemetry is wired and lands in the Supabase telemetry table
- [ ] `ClusterPreviewChip` renders the composed state visually per the design
- [ ] Hover (desktop, immediate) + long-press (mobile, 350ms) wire correctly via the kind-router
- [ ] Preview dismiss timeout is 1.5s
- [ ] BeaconA11yList renders cluster rows with the same composition output
- [ ] Phil-feel check on production: a real cluster on /pulse shows the preview correctly on hover + long-press
- [ ] The seven acceptance cases in §7.2 are visually verifiable on staging seeds
- [ ] §11 KPI dashboard exists and shows initial readings within 48h of ship

---

## §11 — KPI + Telemetry Expectations

### Expected positive outcomes
- Lower cognitive overload on Pulse at high beacon density
- Stronger "living city" perception (continuity invariant doing emotional work)
- Increased beacon curiosity opens (preview → tap-commit conversion)
- Better fairness trust (deterministic representative)
- Reduced visual chaos in dense zones

### Critical telemetry (Supabase + observation views)
| Metric | What it tells us |
|---|---|
| Preview open conversion | hover/long-press → tap-commit rate. Healthy if preview is doing the curiosity work it should. |
| Repeat-open rate | Same user re-opens same cluster within a session. Indicates atmospheric pull is working. |
| Cluster dwell abandonment | Preview opened → no commit, no engagement. Watch for visual chaos signal. |
| Cluster churn frequency | How often topology actually changes vs how often the composer is asked. Tests §3.5 stability hypothesis. |
| Representative stability duration | How long a face-eligible representative remains the representative. Should be high. |
| FPS impact in high-density scenes | Render perf on dense Soho-equivalent clusters. Composer + cache must not regress framerate. |
| Uncertainty fallback rate | How often the composer steps down due to missing signal. Health of the D48 pipeline upstream. |

These metrics earn their own daily digest line in the morning observation Telegram digest (#226 territory) once the slice ships.

---

## Doctrine Self-Test (do NOT skip)

Before merge of any code from this slice, the implementer answers, in code comments at the composer:

> *Did the user opt into face exposure for this surface, at this intent, under these conditions?*

For every face_avatar render path. If any path can't answer "yes — gates X, Y, Z all passed", the path is wrong.

This is the test the doctrine writes for itself. Slice A is the first slice that uses §5.1 as a binding contract rather than as guidance.
