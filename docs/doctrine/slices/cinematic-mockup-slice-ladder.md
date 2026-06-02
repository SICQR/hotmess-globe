# SCOPE — Cinematic Mockup Slice Ladder

**Status:** Implementation scope, awaiting Phil ratification
**Authored:** 2026-06-02
**Path:** `docs/doctrine/slices/cinematic-mockup-slice-ladder.md`
**Inherits from:** D50 (Globe Cinematic Rendering), D51 (Globe Zoom Semantic), D14 (Routing as Continuity), D15 (Care Language), D17 (Surface Layer), D25 (In-App Messaging), D43 (Cluster Preview), D48 (Spatial Identity Exposure), D49 (Entity Ontology)
**Not a new doctrine.** A slice ladder that cites existing doctrine, breaks the mockup vision into shippable PRs, names risks before they bite.

---

## §0 The inputs

Six images supplied by Phil:

1. Three-phone composite of the **Live Meet-Up** flow against a real night-earth backdrop — start (presence notification in chat), middle (shared map + ETA), arrival (merged avatars + cluster).
2. Single-phone **chat thread with embedded Map Card** — AlexTravels, Berlin, in-thread Mapbox card with gold route line, distance + ETA, Start / Uber / Share actions.
3–5. TV photos of NASA night-earth footage — the **D50 reference target**. Black space, gold/amber city light density, irregular organic distribution, subtle green aurora rim.
6. Close-up of the same earth footage — the **texture target** at granular scale.

---

## §1 What the mockups reveal

### 1.1 The reference target is unambiguous

The TV photos lock the D50 §1–§2 visual contract concretely:

- Black space dominates more than half the frame
- No full-surface earth texture; the only light is city light
- Gold / amber palette with some hot white pinpoints
- Organic irregular distribution (coastline gaps, river darkness, density gradients)
- Subtle green aurora rim — *visible but never the focal point*
- No blue earth glow, no atmospheric blue scatter at this scale, no satellite trail noise

D50 §2 said the lights must feel like heat. The reference says they must also feel like **density**. Heat alone reads as bloom; density reads as civilization. Both must be present.

### 1.2 Three new product surfaces

**Surface A — In-thread Map Card** (image 2 lower half)
A self-contained map fragment renders inside a chat thread when a location, route, or cluster is mentioned. It is interactive but not a full map view. Contains: title (cluster or place name), distance + ETA, three actions (Start = navigate, Uber = third-party handoff, Share). Visually inherits D50: dark base, gold route, single destination pin, light density texture in the background.

**Surface B — Live Meet-Up flow** (image 1, three phones)
Mutual live-location-sharing flow with three states:

- **B.1 Sharing-in-chat** — presence notification ("Alex started sharing live location"), distance ETA card ("Alex is 16 min away · Sharing until arrival"), View Live Map CTA.
- **B.2 Shared map view** — full map with both avatars rendered as cinematic markers (gold ring, presence dot), gold route line between them, ETA banner ("6 min away"), action triplet (Navigate / Message / Share ETA), search affordance at bottom.
- **B.3 Arrival state** — merged avatar bubble pair, cluster name ("You and Alex are at Soho cluster"), action triplet (I'm Here / Message / Stop Sharing).

**Surface C — Cinematic chrome continuity**
The mockups carry D50's atmospheric language *into the UI itself*, not only the globe:

- Gold rim glow on the user's most recent outbound bubble — atmospheric language as message-state broadcast
- Gold-flecked dark sheet background (faint particle haze on near-black) — the globe's "city light heat" continued under the chat
- Gold-ring avatar with presence dot — entity identity carries its own visual class (D49 §6 person-class)
- HOTMESS wordmark centered top in gold — chrome statement, not navigation

### 1.3 An implicit nav re-org

Image 2's bottom tab bar reads **Home / Map / Explore / Chats / Profile**. This is not the current tab structure (currently `pulse / ghosted / music / shop / more`). The mockup is either (a) Phil signalling an intended nav re-org or (b) reference-only and not load-bearing. Cannot infer from the image alone. **Open decision below.**

---

## §2 What exists today (the gap)

| Mockup element | Current state | Gap |
| --- | --- | --- |
| Black-base night earth at Z0 | Mapbox dark-v11 with neon-coastline overlay; coverage but not the *density texture* | Need NASA-grade night-earth raster tile or shader-composited density texture |
| Green aurora rim | Not present | Need atmosphere edge shader (D50 §4) |
| Gold city-light density at Z1–Z2 | Mapbox city-lights aren't differentiated by density | Need activity-heat layer over Mapbox lights (D50 §5) |
| Embedded Map Card in chat | L2ChatSheet renders text only; no in-thread map render | New component `<ChatMapCard>` + message-type extension |
| Live Meet-Up flow | Location sharing exists for SOS only; no peer-to-peer mutual share flow | New flow: state machine, two sheets, presence broadcast, route render |
| Atmospheric message-bubble glow | Bubbles are flat dark grey | New CSS treatment, opt-in per message state |
| Gold-flecked sheet background | Sheets render solid `#050507` or similar | New atmospheric backdrop layer (low-cost CSS or canvas) |
| Bottom nav structure | `pulse / ghosted / music / shop / more` | Possibly `home / map / explore / chats / profile` — open decision |

---

## §3 The slice ladder

Eight slices. Each is independently shippable with its own PR. Order matters because later slices visually depend on earlier rendering work.

### Slice 1 — D50 PR2: Cinematic base globe pass
**Inherits:** D50 §1, §2, §4, §11.A (visual acceptance)
**Cites:** D51 Z0 row
**Scope:**
- Replace globe basemap path with a darker composite (Mapbox `style=dark-v11` is already dark; add custom raster layer overlaying NASA-like night-light texture)
- Add atmosphere-rim shader (Three.js `BackSide` sphere with edge-fresnel + green/blue tint, breathing opacity 4–8s cycle, no flash)
- Drop blue-marble fallback path entirely
- Validate Z0 reads as "civilization at night" not "satellite map with pins"

**Out of scope:** marker work, cluster work, activity heat. Pure base + atmosphere.

**Risk:** raster tile cost. Mitigation: serve a single low-res NASA night-light raster as a static asset from Vercel CDN (one PNG, blended into the base layer), not a tiled service.

### Slice 2 — D50 PR3: Marker differentiation
**Inherits:** D50 Entity Rendering Rules (§ Venue, Beacon, Event Tonight, Care), D49 §13 cluster intent classes
**Cites:** D51 Z3, Z4 rows
**Scope:**
- Venue marker — grounded gold glyph, no pulse, no decay
- Beacon marker — pulsing ring, gold/amber for nightlife, soft white for care, freshness-driven rim intensity, decay-to-stale animation
- Event Tonight marker — warmer rim, TONIGHT chip, urgency-as-time-near
- Care marker — soft cream/white, calm glow, structural-not-promotional
- Fix the wrong-door collision identified in D49 §15 field test

**Critical lock:** at Z4 care and nightlife markers must be visually distinguishable under thumb pressure. Acceptance test = 8-persona walk repeat from #508.

### Slice 3 — D50 PR4: Activity heat layer
**Inherits:** D50 §5 (activity as weather), D43 cluster preview
**Scope:**
- New rendering layer between marker layer and atmosphere: density haze that responds to venue + beacon + event + care + active-signal counts within tile bounds
- Heat tinting by dominant intent (gold = nightlife, white = care, urgent gold = event tonight)
- "Soho warming" / "Vauxhall active" / "Peckham rising" Z2 ambient labels (D51 §4 cluster behaviour)

**Out of scope:** specific marker render (Slice 2 owns that). This layer is *atmospheric pressure*, not marker.

### Slice 4 — D50 PR5: Mobile polish + performance
**Inherits:** D50 Mobile Rules, D51 Z4 acceptance
**Scope:**
- FPS pass on low-end Android (Pixel 4a / iPhone XR baseline)
- Tap-target audit at Z4 (44pt minimum, no overlap with safety FAB or rail)
- Search-flyTo blanking regression test
- Slow-mobile render-crash hardening

### Slice 5 — ChatMapCard component (Surface A)
**Inherits:** D25 (In-App Messaging), D14 (Routing as Continuity), D50 rendering rules at small scale
**New file:** `src/components/chat/ChatMapCard.jsx`
**Scope:**
- New message type `map_card` with payload: `{ title, coords, route_polyline?, distance_m, eta_minutes, actions: [{label, action}] }`
- Renders inline inside L2ChatSheet between text bubbles
- Mapbox static image API for the static card render; tap-to-expand opens L2DirectionsSheet (D14 §0 origin-near-destination rule applies)
- "Start" action invokes existing `pulse:flyto` + InAppDirections
- "Uber" action constructed under D14 §4 (route handoff allowed only when route-near constraint satisfied)
- "Share" action invokes native Web Share API with deep link

**Data:** new column `messages.payload_kind` + `messages.payload_json` (or extend existing `meta` jsonb). Schema migration required.

**Out of scope:** auto-generation of map cards from text mention of a place. This slice ships the component + render path; auto-attach is a follow-up under D32 (AI & Automation Doctrine) gate.

### Slice 6 — Live Meet-Up flow (Surface B)
**Inherits:** D14 (Routing as Continuity), D17 (Surface Layer), D34 (Trajectory & Connection Flows), D48 (Spatial Identity Exposure — both parties exposed to each other only)
**Scope:**
- New table `live_meetups` with columns: `id, initiator_account_id, peer_account_id, status (proposed/accepted/active/arrived/ended), origin, destination, expires_at, mutual_exposure boolean`
- State machine — proposed → accepted → active → arrived → ended (with expiry path)
- Presence broadcast on accept — chat receives system message ("Alex started sharing live location") via existing notification dispatcher
- L2LiveMeetupSheet — full shared map view with both avatars rendered as cinematic markers, route polyline between them, ETA banner
- Arrival detection — geofence around destination (50m radius), triggers `arrived` state and the merged-avatar arrival card
- Rate limit + safety: meet-up cannot start without mutual boo (M8 gate from #260), cannot continue after either party hits `off_grid` (D48), cannot persist past `expires_at` (D22 temporal doctrine)

**Privacy under D48:** mutual exposure is exactly that — mutual. The system does not log the trajectory after `ended`. No third-party visibility. No moderation log of location history. Implements the D48 §3.1 "exposure register" pattern at the trajectory scope.

**Critical lock:** SOS interrupt still wins. If either party triggers SOS while a meet-up is active, meet-up auto-ends and SOS flow takes the surface.

### Slice 7 — Cinematic chrome continuity (Surface C)
**Inherits:** D50 (rendering language carries into UI), D17 (Surface Layer)
**Scope:**
- Outbound-bubble gold-rim treatment — CSS box-shadow + border with token from existing gold scale, applied to the *most recent* outbound bubble only (state-broadcast pattern from D16 §10.2)
- Sheet background atmospheric haze — extremely cheap CSS implementation (radial-gradient + subtle SVG noise filter) on L2 sheet root; mobile-perf safe
- Avatar gold-ring with presence dot — already partially shipped (L2ProfileSheet) but propagate to chat header + inbox cells
- HOTMESS wordmark top-centered — currently lives elsewhere; consolidate

**Out of scope:** per-message reactions, voice messages, attachment composer overhaul (separate slices under D25).

### Slice 8 — Bottom nav re-org (gated decision)
**Inherits:** D17 (Surface Layer)
**Status:** **awaiting Phil ratification before any code**
**Open question:** is the `Home / Map / Explore / Chats / Profile` tab structure in image 2 a real nav re-org, or reference-only?

If yes → significant routing work, redirect cascade, deep-link compatibility, sheet-context replay. Multi-week slice.
If no → no work; mockup uses placeholder tab labels.

---

## §4 Open decisions (need Phil ratification)

1. **Slice 8 nav re-org** — real or placeholder? If real, what's the mapping? Pulse → Map? Ghosted → Explore? More → Profile? Where do Music + Shop go?
2. **NASA night-light raster** — host one canonical PNG on Vercel CDN, or buy a Mapbox custom-style night-light tile set? Cost vs fidelity tradeoff.
3. **Live Meet-Up gate** — mutual boo (existing M8) or stricter (mutual boo + prior conversation + age verification per D20)? The trajectory exposure is higher-stakes than chat.
4. **ChatMapCard auto-generation** — out of scope for Slice 5 explicitly, but Phil should signal intent. Some products auto-attach a map card whenever a venue name appears; HOTMESS doctrine (D35) discourages enterprise auto-mode. Likely posture: ChatMapCard attaches only on explicit "Share location" / "Share place" action, never inferred.
5. **Arrival cluster naming** — "Soho cluster" in the mockup is a stand-in. Real implementation needs the cluster-naming source (D43 composer) to produce human-readable district names, not just "Cluster 0xa31".

---

## §5 Risks to name before they bite

- **Mapbox cost** — adding raster + atmosphere + activity-heat layers multiplies tile reads. Mitigation: aggressive client-side cache + single static raster for night-lights.
- **Privacy under D48** — Live Meet-Up is the platform's first sustained mutual-location-exposure feature. The exposure register must be precisely scoped — peer only, never spectators, never moderators, never analytics. Trajectory data must auto-delete on `ended`. The Privacy Invariant (D44 §2) applies even here: the system never operationalises noticing that two meetups had the same destination.
- **Performance regression** — adding rendering layers to a Mapbox globe is well-trodden but each layer adds GPU memory. Slice 4 (mobile polish) is gating, not an afterthought.
- **Wrong-door collision at Z4** — D49 §15 already flagged that care and nightlife markers look identical at street zoom. Slice 2 must fix this *before* Slice 6 ships, otherwise Live Meet-Up arrival markers will be ambiguous against care-marker backdrops.
- **Atmospheric chrome on low-end devices** — Slice 7's CSS atmospheric haze must degrade gracefully. Falling back to flat dark background under `prefers-reduced-motion` and on devices where SVG noise filter spikes paint cost.

---

## §6 Recommended ship sequence

Two phases. Phase 1 lands the cinematic visual contract; Phase 2 lands the social product on top of it.

### Phase 1 — Visual Substrate

- **Slice 1** (D50 PR2) — cinematic base + atmosphere rim
- **Slice 2** (D50 PR3) — marker differentiation
- **Slice 3** (D50 PR4) — activity heat layer
- **Slice 4** (D50 PR5) — mobile polish + perf pass

By end of Phase 1, the globe matches the NASA reference at Z0 and the D51 acceptance matrix passes from Z0 down to Z4.

### Phase 2 — Product on top

- **Slice 7** (cinematic chrome continuity) — UI carries the language into sheets and chat (low risk, high visible-impact)
- **Slice 5** (ChatMapCard) — gives chat a place-aware affordance, prerequisite for Live Meet-Up
- **Slice 6** (Live Meet-Up flow) — the headline feature, depends on Slices 2, 5, 7
- **Slice 8** (nav re-org) — only if ratified, after Phase 2 lands

### Per-slice constants

Every slice ships with:
- Scope doc citing §-anchored requirements from D50 / D51 / other relevant doctrine
- Acceptance test matrix (visual / UX / technical) per D50 build brief
- Manual self-verify on production via Chrome MCP before claiming done
- Doctrine breach surface explicitly named (what would make this slice violate a doctrine)

---

## §7 What this scope is not

Not a green-light to ship. Not a doctrine. Not a code change. A ratifiable plan that Phil reads, marks up, and signs off before any of the eight slices opens its first PR.

---

## §8 Ratification gates

Phil ratifies in three passes:

1. **Scope correctness** — does this scope match the mockup intent? Anything missing? Anything that shouldn't be here?
2. **Open decisions** — answers to §4.1 through §4.5
3. **Sequence** — Phase 1 / Phase 2 split as proposed, or a different order?

Once §1, §2, §3 ratified, Slice 1 begins implementation under the existing per-slice doctrine inheritance gate (D-EXECUTION).

---

*End of scope.*
