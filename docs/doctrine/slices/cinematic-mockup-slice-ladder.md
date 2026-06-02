# SCOPE — Cinematic Mockup Slice Ladder

**Status:** RATIFIED Phil 2026-06-02 (directional amendments §4, §3.0, §5.1 cost framing)
**Authored:** 2026-06-02
**Path:** `docs/doctrine/slices/cinematic-mockup-slice-ladder.md`
**Inherits from:** D14 (Routing as Continuity), D15 (Care Language), D17 (Surface Layer), D25 (In-App Messaging), D43 (Cluster Preview), D48 (Spatial Identity Exposure), D49 (Entity Ontology), D50 (Globe Cinematic Rendering), D51 (Globe Zoom Semantic), **D52 (Trajectory Interruption — new, prerequisite for Slice 6)**
**Not a new doctrine.** A slice ladder that cites existing doctrine, breaks the mockup vision into shippable PRs, names risks before they bite.

---

## §0 Ratification block

Phil ratified this scope 2026-06-02 with the following directional amendments:

1. **Substrate before product** — Phase 1 (visual substrate) before Phase 2 (product on top). Sequencing locked.
2. **Phase 0 added before Phase 1** — communication stack stabilization is the gate before any cinematic substrate work begins. See §3.0.
3. **Open decisions resolved** — see §4 — each marked RATIFIED with Phil's call.
4. **D52 Trajectory Interruption required** — must be ratified before Slice 6 (Live Meet-Up) opens. See §3.6.
5. **Framing rule locked** — trajectory features are never "live tracking." Always "meeting convergence" / "shared arrival" / "live meet-up." Belongs in D52.
6. **Architectural lock** — "the city light keeps glowing under your fingers, not just on the planet" elevated from observation to design direction. Substrate language carries into interaction surfaces (Slice 7 owns this).
7. **Cost framing locked** — Mapbox cost risk is compound tile multiplication, not single-feature. The hidden cost vector is **ChatMapCard + Live Meet-Up, NOT the globe** — because cards and trajectories scale with social usage, while globe renders scale with entries. Phase 1 design rule: **cheap illusion / high atmosphere / low live computation.** Anti-pattern forbidden: **"always-on cinematic realtime everything."** See §5.1 and the cost constraints baked into Slice 5 and Slice 6.

---

## §1 The inputs

Six images supplied by Phil:

1. Three-phone composite of the **Live Meet-Up** flow against a real night-earth backdrop — start (presence notification in chat), middle (shared map + ETA), arrival (merged avatars + cluster).
2. Single-phone **chat thread with embedded Map Card** — AlexTravels, Berlin, in-thread Mapbox card with gold route line, distance + ETA, Start / Uber / Share actions.
3–5. TV photos of NASA night-earth footage — the **D50 reference target**. Black space, gold/amber city light density, irregular organic distribution, subtle green aurora rim.
6. Close-up of the same earth footage — the **texture target** at granular scale.

---

## §2 What the mockups reveal

### 2.1 The reference target is unambiguous

The TV photos lock the D50 §1–§2 visual contract concretely:

- Black space dominates more than half the frame
- No full-surface earth texture; the only light is city light
- Gold / amber palette with some hot white pinpoints
- Organic irregular distribution (coastline gaps, river darkness, density gradients)
- Subtle green aurora rim — *visible but never the focal point*
- No blue earth glow, no atmospheric blue scatter at this scale, no satellite trail noise

D50 §2 said the lights must feel like heat. The reference says they must also feel like **density**. Heat alone reads as bloom; density reads as civilization. Both must be present.

### 2.2 Three new product surfaces

**Surface A — In-thread Map Card** (image 2 lower half) — self-contained interactive map fragment inside chat. Title, distance, ETA, three actions (Start / Uber / Share). Inherits D50 at small-card scale.

**Surface B — Live Meet-Up flow** (image 1, three phones) — three-state mutual convergence: sharing-in-chat → shared map view → arrival.

**Surface C — Cinematic chrome continuity** — D50's atmospheric language carries into UI itself (gold-rim outbound bubbles, gold-flecked sheet haze, gold-ring avatars). This is the "city light under your fingers" lock from §0.5.

### 2.3 Implicit nav re-org — ratified placeholder

Image 2's bottom tab bar reads Home / Map / Explore / Chats / Profile. **Phil ratified this as mockup placeholder, not a load-bearing intent signal.** Slice 8 deferred — no nav restructuring from mockup interpretation.

---

## §3 The slice ladder

Ten slices across three phases. Phase 0 is new (Phil's ratification amendment), gating Phase 1.

### §3.0 Phase 0 — Communication Stack Stabilization (GATE)

**Status:** RATIFIED Phil 2026-06-02 — must complete before Phase 1 begins.

**Why this exists:** building cinematic substrate on top of an unstable communication stack risks visual sophistication over interaction reliability. Phil's exact framing: *"finish the communication stack cleanup first. Then: Phase 1 cinematic substrate. That sequencing matters."*

**Phase 0 closeout list** (each ticket has an existing task # to track against):

| P0 ticket | Subject | Existing tracker |
| --- | --- | --- |
| P0.1 | Verify PR #832 sheet retract on production under real iPhone touch | task #556 (this loop) |
| P0.2 | Bell visibility on Pulse — z-index 70 sits below existing rail at 150; bump to ≥160 | task #553 |
| P0.3 | Search relocation TopHUD → rail icon + D35 §13.4 ambient overlay | (new — Phil quote: "the search is still in nav and not the side rail") |
| P0.4 | Radio rail icon on Pulse / Ghosted / Music / Shop | (new — Phil quote: "the side rail should also have the radio added to it") |
| P0.5 | Notification routing audit — close out parked items | tasks #537, #542 |
| P0.6 | Boo logic + thread continuity field test — verify D44/D49 reconciliation holds end-to-end under multi-persona walk | task #514 (Boo gate softens for known contacts) + Slice 4.x verification |
| P0.7 | Onboarding push opt-in end-to-end verification | PR #821 verified |

**Acceptance:** all P0.x items closed and verified live before any Slice 1 PR opens.

### §3.1 Slice 1 — D50 PR2: Cinematic base globe pass
**Inherits:** D50 §1, §2, §4, §11.A · **Cites:** D51 Z0 row
- Replace globe basemap path with a darker composite. Add custom raster layer overlaying single canonical NASA-like night-light PNG (per §4.2 ratification — cheap/static first).
- Add atmosphere-rim shader (Three.js `BackSide` sphere with edge-fresnel + green/blue tint, breathing opacity 4–8s cycle, no flash).
- Drop blue-marble fallback path entirely.
- Validate Z0 reads as "civilization at night" not "satellite map with pins."

**Out of scope:** marker work, cluster work, activity heat.

### §3.2 Slice 2 — D50 PR3: Marker differentiation
**Inherits:** D50 Entity Rendering Rules, D49 §13 cluster intent classes · **Cites:** D51 Z3, Z4 rows
- Venue / Beacon / Event Tonight / Care marker classes per D50 rules.
- **CRITICAL LOCK** — fix the wrong-door care/nightlife collision identified in D49 §15. Phil ratified this as operationally critical, not aesthetic: *"trajectory + ambiguous care/nightlife markers creates real-world safety risk."*
- **Slice 6 (Live Meet-Up) cannot ship until Slice 2 passes the Z4 marker-distinction acceptance test.**

### §3.3 Slice 3 — D50 PR4: Activity heat layer
**Inherits:** D50 §5, D43
- Density haze responding to venue + beacon + event + care + active-signal counts within tile bounds.
- Heat tinting by dominant intent.
- Z2 ambient labels ("Soho warming" / "Vauxhall active") per D51 §4.

### §3.4 Slice 4 — D50 PR5: Mobile polish + performance
**Inherits:** D50 Mobile Rules, D51 Z4 acceptance
- FPS pass on low-end Android + iPhone XR baseline.
- Tap-target audit at Z4.
- Search-flyTo blanking regression test.
- Slow-mobile render-crash hardening.

### §3.5 Slice 5 — ChatMapCard component (Surface A)
**Inherits:** D25, D14, D50 at small-card scale
- New message type `map_card` with payload schema.
- New component `<ChatMapCard>` rendering inline in L2ChatSheet.
- Mapbox static image API for the card render.
- **Auto-attach forbidden** per §4.4 ratification. Explicit "Share location" / "Share place" action only.
- Schema migration: extend `messages.meta` or add `payload_kind` + `payload_json`.

**Cost constraints — RATIFIED Phil 2026-06-02:**
- **Aggressive caching, three layers.** Static map image cached server-side (Supabase storage or Vercel edge), CDN cache (max-age=30d, immutable), client cache (image URL is a deterministic hash of place+zoom+style — same key returns from cache forever).
- **One render per unique (place, zoom, style) tuple.** Same coordinates at same zoom never re-render. Cache key is content-addressed.
- **No live re-render on chat scroll.** Map cards already in thread render their cached image only; no refetch on viewport entry.
- **No live updates on cards already sent.** A map card is an artefact of the moment it was sent. Receiver sees the snapshot, not a live tile.
- **No re-render on text input focus, sheet open, theme switch, or window resize.** Stable across interaction.
- **Single canonical static image format** — PNG @2x for retina, served as `<img>` not a Mapbox GL instance. No interactive map inside the card.

### §3.6 D52 Trajectory Interruption (DOCTRINE — Slice 6 prerequisite)

**Status:** Drafted in companion PR. Must be ratified before Slice 6 opens.

Live Meet-Up is the platform's first feature where continuity failure has emotional consequences. Without D52, every implementation decision about "what happens when X disconnects" becomes ad-hoc.

D52 codifies:
- The continuity contract (silence is the worst possible UX in trajectory features)
- The 9 failure modes the system must explicitly answer (backgrounded, battery, connection, force-quit, GPS collapse, mid-flow block, SOS mid-route, battery dies, force-quit + relaunch)
- Truth-over-hope rule (no stale location displayed as live)
- Framing rule (locked in §3.7 below)
- SOS + block sovereignty over trajectory
- Auto-end conditions
- Recovery discipline (no silent resume)
- Data discipline (no trajectory persistence beyond session)

### §3.7 Slice 6 — Live Meet-Up flow (Surface B)
**Inherits:** D14, D17, D34, D48, **D52** · **Blocked by:** Slice 2 marker-distinction Z4 acceptance + D52 ratification
- New table `live_meetups` with state machine (proposed → accepted → active → arrived → ended).
- L2LiveMeetupSheet with shared map view.
- Geofence arrival detection (50m radius around destination).
- **Gate strictness — RATIFIED Phil**: mutual boo + existing conversation + age verified + explicit opt-in at start. Per §4.3 ratification.
- **Framing — RATIFIED Phil**: "meeting convergence" / "shared arrival" / "live meet-up." Never "live tracking" / "find friends" / "location sharing" / "trace" / "follow." Per §4.6 ratification and D52 framing rule.
- Privacy under D48: mutual exposure scope. No trajectory log. No moderation log of history. No third-party visibility.
- SOS sovereignty: SOS interrupt always wins, meet-up auto-ends, SOS takes surface.

**Cost governance — RATIFIED Phil 2026-06-02:**

Live Meet-Up is the platform's real cost surface (per §0.7 framing). Every constraint below is operational policy, not optional.

- **Hard session expiry** — default 2h, max 4h. Past `expires_at`, session auto-ends per D52 §7. No extension UI.
- **Low-frequency updates when stationary** — velocity threshold detection. If `delta_position < 10m` over a 30s window, drop heartbeat to one sample per 60s. Resume base interval on motion detection.
- **Aggressive throttling baseline** — 10s base heartbeat interval (not 1s). Dynamic scaling: faster only when both parties are actively moving toward each other.
- **Route recalculation limits** — max 6 route recalculations per hour per session. Beyond that, last route is used until end of session OR hard reset by user. Prevents per-step recalculation loops.
- **Movement thresholds** — recalculate route only if either party's position has drifted >50m from the route polyline. Drift detection runs on the heartbeat tick, not on every position update.
- **GPS polling discipline** — never poll GPS more than once per heartbeat tick. App background = pause polling entirely (D52 §2 backgrounded row), resume on foreground.
- **No always-live route render** — route polyline rendered ONCE per recalculation event, cached on both clients, animated locally via interpolation. The server does not push route-tile updates continuously.
- **Static map fallback at low-end** — if device hits CPU/battery threshold, downgrade live map to static map snapshot updated every 30s instead of a live Mapbox GL render.

**Anti-pattern explicitly forbidden:** *always-on cinematic realtime everything.* Render only what the user is looking at; cache everything else. Live-update only what is in motion; everything stationary is throttled.

### §3.8 Slice 7 — Cinematic chrome continuity (Surface C)
**Inherits:** D50, D17 · **Architectural lock:** "the city light keeps glowing under your fingers, not just on the planet" (per §0.6)
- Outbound-bubble gold-rim treatment — CSS box-shadow + border, applied to most recent outbound bubble only (state-broadcast pattern from D16 §10.2).
- Sheet background atmospheric haze — radial-gradient + subtle SVG noise filter on L2 sheet root; mobile-perf safe with `prefers-reduced-motion` fallback.
- Avatar gold-ring + presence dot propagated to chat header + inbox cells.
- HOTMESS wordmark consolidation.

**Recommended order: Slice 7 before Slice 6** (per Phil's ordering ratification) — the chrome carries the substrate language into the chat surface, providing the visual foundation Slice 6's flow renders on top of.

### §3.9 Slice 8 — Bottom nav re-org
**Status:** **DEFERRED PERMANENTLY (unless explicitly re-opened by Phil)**. Per §4.1 ratification, the mockup nav structure is placeholder, not load-bearing. No nav restructuring work begins from mockup interpretation.

---

## §4 Decisions — RATIFIED Phil 2026-06-02

### §4.1 Nav re-org — **PLACEHOLDER (not load-bearing)**
> *"Treat as placeholder / non-ratified. Do NOT start nav restructuring from mockup interpretation. Too expensive. Too foundational."*

Slice 8 deferred permanently unless explicitly re-opened.

### §4.2 NASA night-light raster — **CHEAP / STATIC FIRST**
> *"Start cheap/static first. Exactly as written: single canonical PNG, CDN-hosted, composited, prove the visual language first. You can always upscale infrastructure later. Do NOT start with expensive tile infrastructure."*

Slice 1 ships with a single canonical PNG hosted on Vercel CDN. Mapbox custom-style tile path explicitly out of scope until visual language proven.

### §4.3 Live Meet-Up gate — **STRICTER**
> *"I would make this stricter than mutual boo. Recommended: mutual boo AND existing conversation AND age verified AND explicit opt-in at start. Because this is sustained trajectory exposure. Much higher risk surface than chat."*

Slice 6 gate predicate (LOCK):
- `is_mutual_boo(A, B)` AND
- `has_existing_conversation(A, B)` (at least 1 message exchanged, both directions) AND
- `is_age_verified(A)` AND `is_age_verified(B)` per D20 AND
- explicit opt-in confirmation at flow start (both parties)

### §4.4 ChatMapCard auto-generation — **EXPLICIT SHARE ONLY**
> *"No. Explicit share only. Strongly."*

> *"Auto-attaching maps from text: feels invasive, feels enterprise, weakens intentionality, creates privacy ambiguity. Explicit share keeps human agency."*

Slice 5 ships explicit "Share location" / "Share place" action only. No NLP inference, no venue-mention detection, no auto-attach under any condition.

### §4.5 Cluster naming source — **HUMAN-READABLE REQUIRED**
> *"Very important. Because: 'Cluster 0xa31' instantly destroys atmosphere, legibility, emotional orientation. Human-readable geography matters enormously here."*

D43 cluster preview composer must produce district-level human-readable names (Soho, Vauxhall, Schöneberg, Silom). Slice 2 marker-differentiation work touches the same composer — the human-readable naming requirement piggy-backs.

### §4.6 Trajectory framing — **LOCKED LANGUAGE**
> *"Do NOT market it initially as live tracking. Bad emotional frame. Frame it as: meeting convergence, or shared arrival, or live meetup."*

Framing rule belongs in D52 §4. Slice 6 inherits.

---

## §5 Risks — RATIFIED Phil 2026-06-02

### §5.1 Mapbox cost — compound, not single-feature

Phil's exact framing 2026-06-02:

> *"The dangerous part is not one feature. It's compounded tile multiplication."*
> *"Mapbox only becomes financially scary when you combine high DAU + persistent live maps + frequent route updates + lots of static-image generation + aggressive zoom interactions + background activity. HOTMESS is not there yet. So don't prematurely optimize for hyperscale. But DO architect carefully now so you don't accidentally build infinite refresh loops, uncached map cards, constant route recalculations, always-live GPS polling. Those are the killers."*

**The hidden cost vector is ChatMapCard + Live Meet-Up, NOT the globe.** Card requests and route recalcs scale with social usage; globe renders scale with entries. Per-DAU economics of the social surfaces are an order of magnitude more sensitive than the globe.

**Phase 1 design rule — cheap illusion / high atmosphere / low live computation:**
- Static raster (per §4.2)
- Atmospheric shaders (locally rendered, not tile-fetched)
- Smart compositing (one base layer, additive overlays)
- Sparse updates (no per-frame Mapbox queries)
- Cached static cards (per Slice 5 cost constraints)

> *"80% of the emotional impact for 20% of the infra cost."* — Phil 2026-06-02

**Anti-pattern explicitly forbidden:** *"always-on cinematic realtime everything."* If a slice proposes any of {per-scroll re-render, per-focus re-render, per-frame route recalc, continuous GPS polling at base interval, uncached repeated static-image requests}, that slice is in doctrine breach against §5.1 and cannot ship.

**Mitigation surfaces by slice:**
- Slice 1: single PNG raster, no tile multiplication
- Slice 2: marker rendering is local SVG/canvas, not tile-fetched
- Slice 3: activity heat layer computed client-side from cluster data, not Mapbox-tile-driven
- Slice 5: triple-cache discipline (see §3.5 cost constraints)
- Slice 6: hard governance (see §3.7 cost governance)

### §5.2 Other risks

- **D48 privacy under sustained mutual location exposure** — Live Meet-Up is the platform's first sustained-trajectory feature. D48 + D52 jointly govern. Slice 6 cannot ship until both ratified.
- **Performance regression** — Slice 4 mobile-perf is gating, not afterthought.
- **Wrong-door collision at Z4** — Phil elevated this from aesthetic to operational risk. *"Trajectory + ambiguous care/nightlife markers creates real-world safety risk. That is not aesthetic. That is operational."* Slice 2 must hard-resolve before Slice 6 exists.
- **Atmospheric chrome on low-end devices** — Slice 7 degrades gracefully under `prefers-reduced-motion`.
- **Communication stack instability competing with substrate work** — Phil's strategic read: *"if boo logic, notification routing, card states, thread continuity, onboarding are still unstable, then cinematic substrate work risks becoming visual sophistication over interaction reliability."* Mitigation: Phase 0 gate. No Slice 1 work until P0.1–P0.7 closed.

---

## §6 Ship sequence — RATIFIED

**Phase 0 — Communication Stack Stabilization** (gate)
P0.1 → P0.7 closed and verified live.

**Phase 1 — Visual Substrate**
Slice 1 → Slice 2 → Slice 3 → Slice 4
By end of Phase 1, the globe matches the NASA reference at Z0 and the D51 acceptance matrix passes from Z0 down to Z4.

**Phase 2 — Product on top**
Slice 7 (cinematic chrome — provides visual foundation) → Slice 5 (ChatMapCard) → D52 ratification → Slice 6 (Live Meet-Up).

Slice 8 deferred permanently.

---

## §7 What this scope is not

Not code. Not a new doctrine. Companion to D52 (which IS a new doctrine, drafted in parallel as Slice 6 prerequisite).

---

*End of scope.*
