# D43 Slice A — In-World Cluster Preview

**Status:** Scope draft for Phil ratification.
**Unblocked by:** D48 amendment ([PR #777](https://github.com/SICQR/hotmess-globe/pull/777)) embedding §5.1 canonical evaluation question.
**Doctrine refs:** D43 (In-World vs Sheet-World Boundary) · D48 §3.1/§3.3/§5.1 (Spatial Identity Exposure + canonical question) · D08 (Visibility-State Architecture) · D35 (Language OS) · sacred-invariants Constitutional Substrate.

---

## §0 — The Ontology Fix (load-bearing)

> **A cluster is not N grouped markers. A cluster is N negotiated social exposure states composed into a single surface render.**

This is the line everything else in the slice inherits from. Before D48 §5.1, "cluster preview" could be designed as a visualization problem — how do you compactly show 8 markers? After D48, cluster preview is a composition problem — how do you compose 8 different consent contracts into one render that honours every contract?

The visualization question still matters but is subordinate. Get the composition right and the visuals follow. Get the visuals first and the composition contradicts itself.

---

## §1 — What This Slice Ships

A new surface: the **cluster preview**. Lives in-world (on the Pulse globe / local map), not in sheet-world (D43 §1). Renders when a cluster of ≥2 beacons exists at the user's current zoom and is brought into the viewer's attention via hover (desktop) or long-press (mobile).

The preview is *atmospheric*: it shows that the cluster contains presence, what kinds of presence (per-intent breakdown), and how much (count). It does **not** name individuals, does **not** show face avatars, does **not** open sheet-world. Commitment to sheet-world (tap → cluster sheet, zoom → individual beacons) is a deliberate next act by the viewer.

Concretely the slice ships:
- A new render module: cluster hover-chip / long-press peek (one surface, two trigger modes per D17 §4)
- A composition function: takes N beacon records → returns one preview state
- The §5.1 canonical evaluation question wired as a build constraint at the composition layer
- BeaconA11yList parity row for cluster previews (D08 + a11y mandate)
- Zero new sheets, zero new routes

## §2 — What This Slice Does NOT Ship

- Photo markers / face avatars at any zoom in any cluster preview (D48 §3.2 forbiddance + §5.1 default-down)
- Tap-to-open cluster sheet (that's a separate L2 surface — out of scope here; the preview must work as a preview, not a sheet preamble)
- Schema changes (uses existing beacons + visibility_snapshot from D48 Slice 1)
- Person photo markers (separate Slice G, gated behind BEACON_PHOTO_MARKERS flag)
- Routes / directions UI on the preview (D14 territory)
- Hover behaviour on the lone-beacon (non-clustered) case — that's already handled by the existing kind-router preview

The slice is narrow on purpose. The composition contract is the load-bearing thing; visual polish iterates from there.

---

## §3 — The Composition Contract

For a cluster containing N beacons, the preview state is computed as follows:

### §3.1 Inputs (per beacon)

From the existing `get_renderable_beacons_for_viewer` RPC (D48 Slice 1) each beacon arrives with:
- `intent` — one of: looking, hosting, cruising, aftercare, quiet_hold, arriving, market (D12 + Drop Beacon Doctrine)
- `exposure_register` — one of: anonymous, persona_shape, face_avatar (D48 §2 spectrum; full_reveal is sheet-world only)
- `viewer_trust_state` — one of: stranger, viewer_opted_in, mutual (D08 + D48 §3.3 gate 1)
- `proximity_band` — one of: far, near, close (D48 §3.3 gate 2)
- `owner_id` — needed for mutual-set computation; NEVER rendered in preview

### §3.2 Per-beacon evaluation against §5.1

For each beacon, evaluate D48's canonical question for the **cluster-preview surface specifically**:

> *Did the user opt into face exposure for this surface (cluster-preview), at this intent, under these conditions (gates 1–4)?*

For cluster-preview the four gates are:
1. Viewer trust — mutual-only → may permit face; stranger / non-mutual → step down
2. Proximity — close + mutual → may permit face; far → step down to count
3. Zoom — cluster preview by definition occurs at a zoom where the cluster has not yet split into individual markers, so the *zoom* gate is already a downward force here (the surface itself is a low-zoom artifact)
4. Per-surface consent — user has explicitly opted in to face exposure on cluster-preview at this intent

**For cluster-preview, gate 3 (zoom) is structurally restrictive: clusters only render when individuals are not yet resolvable on the map.** This means face avatars in cluster preview require BOTH viewer-mutual AND close-proximity AND explicit per-surface opt-in — three gates against the spatial layer's own downward force. This is the correct register for a low-zoom collective render. Faces in clusters become rare on purpose.

Aftercare is structurally forbidden (D48 §3.2) regardless of any gate combination.

### §3.3 Composition rule

After per-beacon evaluation, the cluster preview shows:

- **Intent mix**: a count breakdown by intent. *e.g. "3 looking · 2 hosting · 1 aftercare · 2 quiet hold"*.
  - This is the substrate showing structurally that recovery / care is present in the room without naming whose. Aftercare is **always counted in the breakdown** because its presence is what makes the mix honest — but the contributing user is anonymous regardless of any other state.
- **Highest-register avatar (if any)**: a single representative avatar **only** if at least one beacon in the cluster passed all four §3.2 gates for face_avatar. If multiple did, the system picks one (deterministic: lowest beacon id) and shows just that one. **Never a face stack.**
- **Cluster count**: total N, prominent. The count is the honest signal at distance.
- **Cluster intent leader chip** *(optional, Phil's call)*: a single intent badge for the cluster's dominant intent — *e.g.* the chip reads "MOSTLY CRUISING" if cruising is the plurality. Only shows if plurality is ≥50% and the cluster has ≥4 beacons (small clusters don't have plurality semantics). Aftercare never wins the leader chip even if it's a plurality — substrate protection, see §3.4.

### §3.4 Substrate protections (sacred invariants)

- **Aftercare never headlines.** The leader-chip rule (§3.3) excludes aftercare from being the named dominant intent because making care infrastructure into a performative cluster headline would replicate the very pattern D15 + D48 §3.2 protect against. Aftercare is counted, never advertised.
- **Default-down under uncertainty.** If any signal returns null or undefined (e.g. RPC returns missing exposure register), the preview steps the beacon down to anonymous + counted. Better to under-show than to mis-show.
- **No face stacks at distance.** A "wall of faces" cluster render is forbidden even if every beacon in it has full opt-in. The single-representative rule is the protection — face stacks at low zoom are visually intense in a way that reads as performative recognition rather than atmospheric signal.
- **Cluster preview never names individuals.** Names belong in sheet-world. The preview surfaces aggregate state.

---

## §4 — Trigger + Interaction

Per D17 §4 unified preview pattern:
- **Desktop:** hover over the cluster marker → preview chip materialises beside the cursor
- **Mobile:** long-press (≥350ms) on the cluster marker → preview chip materialises above the press point

Single tap on a cluster marker is **not** what triggers the preview. Single tap commits — opens the cluster's L2 sheet (out of slice scope, but the contract must respect that single-tap is reserved for that future commitment).

Preview dismisses on:
- Pointer-leave (desktop)
- Press-release (mobile)
- 2.5s timeout (atmospheric, not sticky)

The preview does not have a tap-target itself. To go further, the user re-engages with the cluster marker directly. This is intentional: the preview is *information given*, not a *thing to interact with*. Per D43 §3, in-world surfaces do not lead to other in-world surfaces via taps on the surface itself.

---

## §5 — Edge Cases

| Case | Behaviour |
|---|---|
| Cluster of all-anonymous beacons | Show count + intent mix. No avatar slot rendered (don't show an empty avatar placeholder — that reads as "data missing", which it isn't). |
| Cluster contains only one face-eligible beacon | Show count + intent mix + that single avatar (the highest-register rule resolves trivially). |
| Cluster contains ≥2 face-eligible beacons | Pick one deterministically (lowest beacon id). The unpicked face-eligible beacons render as anonymous in the count. |
| Cluster contains only aftercare beacons | Show count + a single aftercare line that says "Care offered here" (Phil to ratify exact copy — D15 territory). No avatar even if a viewer→owner mutual gate would permit it; aftercare's structural forbiddance still applies. |
| Cluster contains a mix where aftercare is the plurality | Leader chip suppressed (§3.4). Count + intent mix shows aftercare counted normally. |
| Cluster contains a viewer's own beacon | Viewer's own beacon contributes to the count but is not represented in the avatar slot (you don't show someone their own face as part of someone else's atmospheric reading). |
| Cluster is on a beacon owned by an off-grid user (D08) | D08 already removes off-grid beacons from `get_renderable_beacons_for_viewer` for non-mutuals — the cluster simply has one fewer member from the viewer's perspective. No special preview handling needed. |
| Cluster is within a venue's curated event area | Cluster preview is unchanged; the venue layer is independent. Phil's call later whether venue branding ever overlays cluster previews (out of slice scope). |

---

## §6 — A11y Surface

The BeaconA11yList (D17 §6 mandate) gets a new row type for clusters. Same composition contract: count, intent mix, optional single representative. Screen-reader output is the literal preview content with no visual special-casing. *e.g.*:

> *"Cluster of 8 at Soho. 3 looking, 2 hosting, 1 aftercare, 2 quiet hold. Anonymous."*

The a11y row does not lead anywhere either — same in-world / sheet-world boundary as the visual preview.

---

## §7 — Implementation Surface (where the code goes)

- **Composition layer:** new file `src/lib/clusters/composeClusterPreview.ts` — pure function `composeClusterPreview(beacons: ViewerVisibleBeacon[], viewer: ViewerContext): ClusterPreviewState`. Unit-testable, deterministic.
- **Render layer:** new component `src/components/globe/ClusterPreviewChip.tsx` — receives a `ClusterPreviewState`, renders the chip. Pure presentational.
- **Hover wiring:** existing kind-router in `mapboxLayerStack.js` (already differentiates beacon vs venue vs cluster on hover/long-press per D17). Cluster branch → call composer → render ClusterPreviewChip.
- **A11y wiring:** `BeaconA11yList.jsx` consumes the same `composeClusterPreview` output for cluster rows.

No schema changes. No new RPCs. The composer reads from `get_renderable_beacons_for_viewer` (D48 Slice 1 pipeline) which already provides everything required.

Acceptance test seeds:
1. 6 beacons at a Soho cluster, mix of intents, none with face opt-in → composer returns count=6, intent_mix={looking:2, cruising:2, aftercare:1, quiet_hold:1}, avatar=null, leader_chip="MOSTLY LOOKING+CRUISING tied → null per ≥50% rule"
2. Same cluster but viewer is mutual with 1 cruising beacon owner AND that owner has cluster-preview face opt-in AND proximity is close → composer returns same count + intent_mix, avatar=that one beacon's avatar
3. Cluster of 3 aftercare beacons only → composer returns count=3, single line "Care offered here", avatar=null regardless of any gates
4. Cluster of 4 with 2 aftercare + 1 hosting + 1 looking → count=4, intent_mix shown, leader_chip suppressed (aftercare is plurality but structurally forbidden from headlining)
5. Cluster containing viewer's own beacon → viewer's beacon counted, never appears as the avatar

---

## §8 — Out of Scope (deferred)

These come up while scoping; they belong in later slices.

- **Cluster L2 sheet** (Slice B): what opens on tap-commit. Different surface, different consent contract (sheet-world allows higher register per D48 §3.1 footnote — a face that's anonymous in cluster preview may be face_avatar in the L2 sheet if the user has profile-sheet face opt-in).
- **Photo markers** (Slice G — #388): person photo markers at high zoom. Different consent contract again (individual marker, single beacon, no composition).
- **Selected halo** for clusters (Slice C): visual treatment when a cluster is the focused element after a tap that's en route to opening its sheet.
- **Cluster on-route inclusion** (D14 territory): whether a cluster can appear as a route waypoint. Probably no.

---

## §9 — Open Questions for Phil Ratification

1. **Leader chip on/off?** §3.3 makes it optional. Argument for: atmospheric reading at a glance. Argument against: chip language drifts toward "what's the vibe" SaaS framing if not carefully held. Default if Phil doesn't pick: **off** — let the intent mix speak directly without a label-on-top.

2. **Aftercare line copy.** §5 row says "Care offered here" as a placeholder. D15 territory. Possible alternatives: "Aftercare available", "Care held here", "Someone's holding space" (substrate-aligned but verbose). Phil call.

3. **Single-representative selection rule.** §3.3 picks lowest beacon id deterministically. Alternative: random per render (changes preview each hover). Argument for random: less predictable, less prone to "always shows the same person" UX accident. Argument against: state stability matters during the 2.5s preview window. Default if Phil doesn't pick: **lowest id, deterministic**.

4. **Hover/long-press preview duration.** §4 sets 2.5s timeout. Could go shorter (1.5s — more atmospheric) or longer (4s — more readable). Default: **2.5s**.

5. **Mobile press-and-hold threshold.** §4 sets 350ms. Same as D17. Confirm no change.

---

## §10 — Done Criteria

This slice is done when:
- [ ] `composeClusterPreview` is implemented + unit-tested against the 5 acceptance seeds in §7
- [ ] `ClusterPreviewChip` renders the composed state visually per the design
- [ ] Hover (desktop) + long-press (mobile) wire correctly via the kind-router
- [ ] BeaconA11yList renders cluster rows with the same composition
- [ ] §5.1 canonical question is callable as a comment-tagged build check in the composer (each gate decision is named in code; if a future PR removes a gate, the change is conspicuous)
- [ ] Phil-feel check on production: a real cluster on /pulse shows the preview correctly on hover + long-press
- [ ] The five edge cases in §5 are visually verifiable on staging seeds

---

## Doctrine Self-Test (do NOT skip)

Before merge of any code from this slice, the implementer answers, in code comments at the composer:

> *Did the user opt into face exposure for this surface, at this intent, under these conditions?*

For every face_avatar render path. If any path can't answer "yes — gates X, Y, Z all passed", the path is wrong.

This is the test the doctrine writes for itself. Slice A is the first slice that uses §5.1 as a binding contract rather than as guidance.
