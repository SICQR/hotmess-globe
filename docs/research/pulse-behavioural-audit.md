# Pulse Globe — Behavioural Audit

**Status:** Pre-doctrine research artifact · **Author of record:** Phil Gizzie (commissioned) · **Author of draft:** Claude (HOTMESS Cowork) · **Date:** 31 May 2026 · **Method:** code-as-truth (the implementation describes behaviour; doctrine describes intent; where they disagree the code is the ground truth for this audit)

**Not a doctrine.** This document audits what currently exists. It names where doctrines should exist (§11) but does not write them.

**Not a redesign brief.** No visual proposals, no copy, no implementation sequence. The output of this artifact is *understanding* — what the system actually does today, and what behavioural questions need answering before any further code lands.

**Inputs read:**
- `src/components/globe/PulseMap.jsx` (777 lines — the live globe engine)
- `src/lib/globe/mapboxLayerStack.js` (456 lines — sources, layers, privacy contract, lifecycle sprite picker)
- `src/lib/sheetSystem.ts` (932 lines — sheet registry, height rules, peek floors)
- `src/contexts/SheetContext.jsx` (the LIFO stack + URL sync)
- `src/components/sheets/L2SheetContainer.jsx` (the container that runs every sheet)
- `src/components/globe/BeaconDropModal.jsx` (511 lines — drop intent picker + geocode autocomplete + quota + dual-path location)
- `src/components/globe/BeaconA11yList.jsx` (the screen-reader fallback)
- `src/modes/PulseMode.tsx` (12 lines — returns null)
- Doctrines: D12 Drop Beacon · D13 Spatial Continuity · D14 Routing Continuity · D16 Surface Layer · `beacon-doctrine.md` · `product-doctrine.md`
- Live Supabase: `pulse_signals`, `beacons`, `venues`, `pulse_places` counts + freshness

**Reality check (live DB, query timestamp matches this document):**

| Source | Count | Notes |
|---|---|---|
| `pulse_signals` total | 10 | What the globe-read view actually serves |
| `beacons` active (status active, ends_at > NOW or NULL) | 10 | All currently `cat=aftercare`, `type=safety` — operator-seeded |
| `beacons` expired but retained | 25 | Mix of legacy user/event/club/cafe/gym categories; dead data sitting in the table |
| `venues` total | 8 | Tiny catalog |
| `pulse_places` total | 81 | The larger curated catalog |

The system is engineered to render seven category families (editorial / events / venues / people / market / radio / care). It currently renders one (care). Every observation in this audit has to be honest about that asymmetry: the live globe today is "ten cream pins of aftercare on a dark earth," not "the city breathing." The diagnosis below distinguishes *engineered behaviour* from *current behaviour*.

---

## §1 — Behavioural diagnosis

**Engineered behaviour.** A single Mapbox v3 engine in globe projection, opened by default centred on London at zoom 2.2. The camera moves through four named tiers — GLOBE (z<4) / REGION (z<7) / CITY (z<12) / LOCAL (z≥12) — each with a fixed pitch (15° / 10° / 30° / 45°). The user can fly between tiers via a right-rail control surface that listens to `pulse:tier` events the map emits on every `moveend`. Mapbox's native clustering folds beacons into gold-stroked count circles below zoom 11; individual category-coloured fallback dots render at every zoom for visibility floor; sprite-based identity glyphs swap in at z≥11; sprite overlap is suppressed at z≥15 so each pin becomes a "decision-grade target." Time-of-day atmospheric fog rolls dawn → day → dusk → night across the limb. A pulsing gold self-marker tracks the user. Hover (desktop) or 350ms long-press (mobile) raises an anticipatory preview chip — title + subtitle + countdown for time-bounded beacons + a category dot. Click commits to a tap action: cluster tap opens a list-style peek-sheet with constituent signals and a Zoom-in CTA; individual beacon tap raises a popup label and dispatches the resolved full-beacon record to the parent, which routes to the canonical entity destination via the sheet system. District Editorial — Soho-style atmospheric reads — surface as ambient cards when the camera settles inside one of three hardcoded cities (London, Berlin, New York) at z≥10 within 150 km of centroid. A monetised atmospheric aura layer ("globe_glow") amplifies the bloom for boosted owners; the rest of the design is restrained: no pulse, no animation, opacity capped, the marker itself stays the decision target.

**Current behaviour.** Ten cream aftercare pins, mostly clustered in central London (per the seeded Vauxhall / Soho aftercare work). The system feels like *an empty stage with the lights up*. The cinematic chrome is doing all the rendering work; the signal layer is barely contributing. Every architectural pattern (lifecycle decay sprites, glow amplification, four-tier zoom, cluster fragments, atmospheric fog) is engineered against a busy steady state that does not currently exist. The result is a sense of intentful infrastructure that nobody is using yet. This is honest and probably correct given the beta cohort size, but it is the actual behavioural answer to "what does the globe do today."

**What kind of system is this acting as?** Audited against Phil's eight candidate frames at the end of the brief:

- **Realtime city intelligence**: closest fit *in engineering* (clustering, lifecycle, atmospheric fog, beacon density layer, time-of-day, anti-density-trap doctrine, momentum > density product rule). *In behaviour* the system does not have enough signal to demonstrate this yet — there is no realtime city to be intelligent about.
- **Nightlife infrastructure**: present at the seed layer (curated aftercare, district editorial for 3 cities) but not yet at the behavioural layer (no user beacons live).
- **Emotional geography**: the language doctrines (D15 Care Language, the cream accent for aftercare, the "atmospheric" framing in PulseMap comments) point at this aspiration. The behaviour partially honours it via the night-earth raster crush + neon coastline + indigo space — the chrome reads as orbital cinema, not as Google Maps.
- **Social media / feed**: explicitly rejected by the implementation. There is no scroll, no chronological list, no feed-shaped surface.
- **Map software**: rejected by the chrome (Mapbox attribution compacted, dark satellite raster, neon coastlines, atmospheric fog).
- **Game UI**: rejected by the restraint patterns (glow capped, sprite overlap suppressed at z≥15, anti-density-trap clause in D14).
- **Surveillance**: explicitly rejected by the privacy contract (PRIVATE set, APPROX snap to ~1.1km grid, no exact-coord exposure for person/preloved/social).
- **Chaos**: not yet — the current empty stage prevents chaos by accident.

**The diagnosis line:** the Pulse globe currently behaves as *a cinematic operating-theatre that has had its protagonists withheld*. The infrastructure-grade restraint is correct. The lack of signal is the actual product state, not a render bug.

---

## §2 — Current interaction model

Mapped from the actual click handlers + sheet contracts in `PulseMap.jsx` and `sheetSystem.ts`. Read as: *what the user does on the left, what the system does on the right, in the order it currently fires*.

| User action | System response | Surface produced |
|---|---|---|
| Open `/pulse` | Map opens at London z=2.2, pitch 15°; status="loading" until `style.load`; "Loading the signal…" overlay during load | Globe full-screen |
| Pinch / drag camera | `moveend` fires → tier computed from zoom → `pulse:tier` event dispatched → right rail re-highlights the active tier; no copy update, no sheet change | None |
| Camera settles inside London/Berlin/NYC at z≥10, within 150km of centroid | `onLocalFocus(slug, lat, lng)` fires to parent (`Globe.jsx`) | DistrictEditorialCard surfaces (ambient, not modal); care cue may surface |
| Camera leaves the focus zone (or zooms out below 10) | `onLocalFocus(null)` fires | DistrictEditorialCard dismisses |
| Tap right-rail tier button | `setTier('globe' / 'region' / 'city' / 'local')` → `flyTo` with that tier's zoom + pitch | Camera animation only |
| Tap right-rail toggle (the dive button) | `toggleLocal()` → if z<8, fly to user GPS at LOCAL_ZOOM (14); else fly to current centre at GLOBE_ZOOM | Camera animation only |
| Tap the Drop FAB (parent UI, not in PulseMap) | `BeaconDropModal` opens via the modal stack | Modal (not sheet) |
| Tap a cluster bubble | `getClusterLeaves(clusterId, ≤30, 0)` → leaves sorted by priority then `ends_at_ms` → `onBeaconClick({isCluster:true, count, leaves, expansion_resolver})` → parent opens `beacon-cluster` sheet at height "large" with default peek floor | L2 sheet ("Signals here") |
| Tap a single beacon sprite (`beaconIcons` layer, z≥11) | `selectedHalo` source updated → small inline Mapbox popup with title (HTML) → `onBeaconClick(fullBeaconRecord)` → parent routes to canonical entity destination | Inline popup + L2 sheet (profile / event / venue / chat depending on entity) |
| Tap a fallback gold dot (`beaconMarkers` layer, all zooms) | Same as sprite tap | Same |
| Hover a beacon (desktop) | `showHoverPopup` builds a chip — category label · motion · countdown · title · subtitle | Inline preview chip |
| Long-press a beacon (mobile, 350ms) | Same chip; if the long-press lands on a cluster instead, the cluster-flavoured chip ("N signals here · strongest title") surfaces | Inline preview chip |
| Touchmove > 10px during long-press | Press cancelled, chip dismissed | None |
| Touch-release | Chip dismisses 600ms later | None |
| Tap empty map | Nothing (Mapbox default `closeOnClick` for popups, but no map-wide handler) | None |
| Pull down on any open sheet ≥100px or velocity ≥500px/s | Sheet closes; LIFO pop if stacked; URL `?sheet=` param clears | None |
| Browser back / Escape / backdrop tap | Same: sheet closes deterministically | None |
| User leaves `/pulse` route | Globe unmounts inside PulseMap (the React component unmounts) — sheets close — D33 atmosphere residue may emit downstream | None |

**The undocumented surfaces.** A handful of behaviours land outside this table because they live in `Globe.jsx` (the parent) rather than `PulseMap.jsx`: the District Editorial card, the safety shield FAB, the persistent inbox FAB, the Beacon FAB, and the "Me" button. These were not read in this audit but their position relative to the globe is what makes §3 (cognitive friction) sharp — the globe is the bottom canvas, and these are five competing chrome elements layered on top.

---

## §3 — Cognitive friction map

Where the user is being asked to do work the system should do. Identified from interaction-model trace + DB state.

**F1 — The "what tier am I in?" question is asked of the user, not answered by the surface.** The right rail shows four tier chips that re-highlight on `moveend`. The user has to read the chip to know whether they are at GLOBE / REGION / CITY / LOCAL. The chip is the answer to the wrong question. The right question — *"what should I be looking at here?"* — is not surfaced at all. Each tier has a different pitch and different cluster behaviour, but the user has no per-tier prompt that names the kind of decision the tier supports. This is the single biggest friction node and it is not visible in the code as a bug, only as an absence.

**F2 — London centring is editorial, not contextual.** PulseMap explicitly opens centred on London regardless of who the user is or where they are. The comment in the code defends this ("the signal starts here"). For a London user it is correct. For a returning nightlife user in Berlin or New York it is friction every session — the first action they take is to pan or to tap toggleLocal. The current resolve is the right-rail dive button at L0; the friction is that the user has to know to use it.

**F3 — The hover-then-tap pattern is correct on desktop, ambiguous on mobile.** Desktop hover is a clean two-stage commit: see the chip, decide, click. Mobile long-press is the closest analogue, but a 350ms hold without movement on a moving city map is awkward — users scroll, the timer cancels, the chip dismisses. The pattern is engineered well; it is also doing work users do not naturally do. The friction is asymmetric across platforms, and the most cognitively important surface — preview before commit — is the least native on the device most users carry.

**F4 — Cluster taps require the user to know what a cluster is.** Tapping a cluster opens a list sheet titled "Signals here." That sheet is a great peek-preview pattern (Phil locked it 2026-05-29) but it depends on the user understanding why a cluster collapsed in the first place. Below z=11 the system aggressively clusters; the user sees a count circle and is meant to either tap it (preview the constituents) or zoom in. The decision-grade question — *"is anything here worth my attention?"* — is being answered by a numeric count, which is the wrong primitive. Density is not relevance (per product-doctrine.md). The count circle is a load-bearing element of the current behaviour and it is doing density-as-relevance work the product doctrine explicitly forbids.

**F5 — Five competing chrome elements above the globe.** Drop FAB, Shield FAB, Inbox FAB, Me-button, right-rail tier control. Plus the District Editorial card when it surfaces. Each was added correctly (each has its own ship PR + scoping note), and each was scoped against the others (D16 Surface Layer Doctrine governs the FAB stack). But cumulatively the chrome competes with the globe itself for the user's attention bandwidth. The product-doctrine rule is "the product should become clearer under pressure, not noisier." The current chrome density is from an empty-globe steady state. Under real signal density, the chrome will compete with the signal for cognitive load.

**F6 — There is no map-tap behaviour.** Tapping empty water or empty street does nothing. The system has no notion of *"the user is asking about this area, just not pointing at a beacon."* This is a quiet form of dead-end interaction — the user can tap the city without anything happening — but it leaves a behavioural question unanswered: when the user touches the globe at a place that is not a beacon, what are they asking? Currently the answer is "nothing." That is friction because the user often *is* asking something.

**F7 — Lifecycle decay states are engineered but invisible.** Sprites get `--decaying` (≤30 min) and `--stale` (≤5 min) suffix sprites; the hover popup shows the countdown. Currently zero active beacons are in either state. The system has rich expiry semantics that have never rendered in production. This is not a bug — it is a *cognitive readiness gap*: the user has no learned vocabulary for what a decaying pin looks like, because they have never seen one. When the first surge of user beacons arrives, the lifecycle pattern will be discovered as a UX surprise rather than as an inherited convention.

**F8 — Approximate location is implemented as truth, not as anticipated truth.** APPROX snaps person/social/preloved coordinates to ~1.1 km grid points. The user dropping such a beacon doesn't know their pin will not render where they actually are — they see no privacy hint at drop time, only at render time. The cognitive friction is: the dropper expects precision; the viewer sees fuzz; neither is told which is which.

**F9 — The "what is this?" question has no consistent answer across entity types.** A tap on a `cat=people` beacon routes to a user profile sheet (boo-gated chat). A tap on a `cat=venues` beacon should route to a venue surface (which doesn't have a canonical sheet shape in this audit's read-set — venue tap completeness was a separate ship). A tap on a `cat=editorial` (curated district read) is supposed to be ambient, not tappable as a beacon. A tap on a `cat=care` aftercare beacon routes to… the audit didn't fully resolve this surface, which is itself a finding: the destination contract for care beacons is implicit, not explicit. The beacon-doctrine canonical rule is *"every beacon must resolve to the entity's canonical destination surface"* and the code mostly honours this, but the entity-type → destination-surface map is not enumerated anywhere readable.

**F10 — The tier rail teaches camera mechanics, not behaviour.** The four tier buttons answer "where is the camera" rather than "what kind of question am I asking right now." A user does not arrive at /pulse thinking "I want to be at REGION pitch 10° zoom 5.5"; they arrive thinking "what's around me" or "what's in Soho tonight." The current rail does not bridge that semantic gap.

---

## §4 — Entity hierarchy audit

The implementation recognises seven category families plus the catch-all `other`. Each is independently audited against (a) live presence in the DB, (b) the doctrines that govern it, (c) interaction depth supported, (d) ideal behaviour the audit could not confirm.

| Category | Currently live? | Doctrine | Tap depth supported | Audit note |
|---|---|---|---|---|
| `aftercare` (rendered as `cat=care`) | **Yes — 10 active, the entire current globe** | D15 Care Language (strict mode); beacon-doctrine §entity-aware routing | Tap → care surface (the destination contract for care taps was not read in this audit; see §11) | Should not aspire to compete with hot signal. Should remain the *quiet*, *always-there*, *low-energy* category. Currently doing exactly this — but it is doing it *alone*. |
| `editorial` (curated district reads — Soho · Warming · etc.) | Seeded but not in the active set above | Pulse Doctrine § anticipatory copy; beacon-doctrine § operator-placed editorial; D31 Venue & Partner Power | Hover preview reads its own metadata; tap routes through the same beacon-tap handler as user beacons — which may or may not be correct for ambient editorial reads | Editorial is **not a beacon in the user-signal sense.** It is operator atmosphere. The current code conflates them at the data layer (`beacons` table with `metadata.curated=true`). The interaction model treats them identically (same hover, same tap, same sheet). This is the largest unspoken collision in the entity hierarchy. |
| `events` | Zero active (3 expired) | D12 § event as fourth signal anchor; future schema split | Tap → event sheet (`event` in the sheet registry, height `large`) | Events are time-windowed (`event_start_at`/`event_end_at`) and venue-anchored. The current absence is real — there are no live operator events. The render contract is sound. The relevance question is unanswered: what makes one event prominent over another at the same zoom? Currently: `priority` numeric + `ends_at` recency. That is not enough. |
| `venues` | Zero in beacons; 8 in `venues` table; 81 in `pulse_places` | beacon-doctrine § venues as beaconable entity; D31 § venue presence | Tap routes to venue surface (out of audit scope but referenced) | Venues are not beacons; they are always-present infrastructure. The globe's read-side composition of `pulse_places + beacons + venues` was not unified in this audit's read-set — there appears to be more than one entity-shaped data source feeding the globe and they may not be reconciled at the render layer. |
| `people` (rendered as `cat=people`) | Zero active | D24 Trust + D25 Messaging gate; D08 visibility-state | Tap → profile sheet (`profile`); chat gated behind mutual boo (D25) | Person beacons are the most behaviourally complex (visibility state interacts with viewer trust). Current code shows them snapped to ~1.1km. The audit could not confirm whether off-grid mutual-only filtering applies at the globe level (it does at Ghosted per the PR-3B/3C work). If person beacons go live and the off-grid filter does not apply, that is a privacy regression. |
| `market` | Zero active | D19 Marketplace; D18 product sheet | Tap → market / shop surface | Market beacons are the "selling/swap" intent. Currently absent. Render contract sound. Relevance question unanswered (a market beacon's relevance is *geographic + temporal + persona*, not numeric priority). |
| `radio` | Zero active (1 expired) | Pulse Doctrine § radio as broadcast | Tap → radio / show surface | Radio beacons are operator-only currently. Doctrine says they may surface to users later. Behavioural ontology is unclear: is a radio beacon at *one place* (the broadcast venue) or *everywhere* (the listening audience)? The render snapshots it to a single coordinate which is one of two valid answers. |
| `other` | Catch-all | None explicit | Same as `people` tap | Catch-all rendering — a known smell. Should aspire to zero entries by enforcing categorisation at write time. |

**Three entity categories Phil's brief asks about that the globe does not currently surface at all:**

- **Gyms** — referenced in seeded `pulse_places` (the London gyms + saunas seeding work) but not in the beacon `cat` taxonomy. They live as venues, not as beacons. The audit confirms: the globe today does not render gyms as a distinct visual class. This is correct under D12 (gym is a venue type, not a beacon intent), but the user-facing read of "is there a gym near me" cannot be answered from the globe alone — it requires the venue surface.
- **Saunas** — same as gyms.
- **Shops / Preloved / Tickets / Music** — these are marketplace surfaces, not spatial entities. The globe is not the right surface for them. Currently the system honours this: market beacons exist (someone signalling *"I'm selling something nearby"*) but the marketplace catalogue does not render on the globe. This is correct.

**The hierarchy collision the audit names explicitly:** `editorial` and user `beacons` flow through the same render pipeline, the same hover chip, the same tap handler, and the same sheet. The doctrines say they are different (operator-placed atmospheric reads ≠ user time-bounded signals). The code treats them the same. This is the single most important behavioural collision in the current globe. It is not a render bug; it is an unresolved ontology.

---

## §5 — Zoom / reveal audit

The four tiers (GLOBE / REGION / CITY / LOCAL) are camera positions. They are not yet *behavioural positions*. This is the single biggest behavioural absence in the current zoom model — each tier should answer a different question, currently they answer the same question at different fidelities.

**What each tier should be asking** (the audit poses this as a question, not as a prescription):

| Tier | Camera | What the tier should answer | What it answers today |
|---|---|---|---|
| GLOBE (z<4) | Whole-planet curvature, atmospheric limb, star field | "Where in the world is the signal alive?" | "Where in the world are there clusters of beacons right now" — almost the same question, but density-as-prominence is the wrong primitive per product-doctrine.md |
| REGION (z 4–7) | Continental / national | "Which cities are awake right now?" — momentum and atmosphere at the city level, not at the pin level | "Smaller clusters of the same beacon set" — no per-city aggregation, no per-city momentum read |
| CITY (z 7–12) | District-grain — Soho / Vauxhall scale | "Which neighbourhoods are running hot? Which are quiet?" — and the District Editorial card *does* attempt this at z≥10, but only for 3 hardcoded cities | "Cluster fragments + the first sprite icons appearing at z=11" — the editorial card is the closest thing to a per-tier answer, but it is binary (present or absent) rather than gradient |
| LOCAL (z≥12) | Street + venue + person scale | "What is here, right now, that matters to me?" — boom: pin-level decision-grade | This is the only tier where the system answers a clear question. Sprite icons + lifecycle decay + selectedHalo + hover-preview all converge to support per-pin decisions. |

**Where the zoom model is currently strongest:** LOCAL. The sprite icons, lifecycle states, hover preview, and tap → entity-destination contract all line up to support per-pin decisions at street scale. This tier is doing the most behavioural work and it shows.

**Where it is weakest:** GLOBE and REGION. The cinematic chrome (atmospheric fog, neon coastlines, indigo space, dark satellite raster) does the entire job of these two tiers. The signal layer adds count circles. The product-doctrine rule "momentum over dead volume" is not yet expressible at GLOBE/REGION scale because there is no aggregation pipeline above the cluster — the system clusters and the cluster IS the aggregation. There is no per-city or per-country "is this place running hot tonight" read.

**Reveal timing — what appears when:**

- z<11: clusters dominate; fallback gold dots at low opacity below; no sprites
- z=11: sprite icons begin rendering; clusters still active because clusterMaxZoom=13
- z=11–13: dual-render — clusters AND sprites both visible; high cognitive cost in a dense area (though we currently never see this)
- z≥13: sprite-only; clusters dissolve; the selectedHalo + tap surface is fully active
- z≥15: `icon-allow-overlap` switches from `true` to `false` — at street scale, overlapping pins are suppressed so each becomes a "decision-grade target"

The z=11–13 dual-render window is a latent cognitive risk. With ten beacons it is invisible; with two thousand it is a noise floor. The clusterMaxZoom=13 + ICON_MIN_ZOOM=11 overlap was tuned for single-engine-globe behaviour (was 16/14 in the legacy local-only map). The window is correct on paper but unobservable in current behaviour.

**What does not currently change between tiers** (beyond camera and clustering):

- Hover/tap contract is identical at all tiers.
- Privacy contract (APPROX snap to 1.1km) is identical at all tiers — including LOCAL, which means a person beacon is fuzzed to 1.1km even at street zoom. This is correct privacy behaviour and the audit names it positively, but it does mean a person beacon at LOCAL never lands "exactly here."
- Sheet contracts are identical at all tiers — tapping a beacon at GLOBE opens the same profile sheet as tapping the same beacon at LOCAL.

**The behavioural question the zoom model has not yet been asked:** should the *kind of pin* that surfaces change per tier? Today every category renders at every tier (subject to cluster aggregation). The product-doctrine rule "showing everything is failure" implies a per-tier filter: at GLOBE you see editorial + city-aggregate, at REGION you see editorial + event clusters, at CITY you see editorial + venues + open beacons, at LOCAL you see everything. The current model is "everything at every tier with cluster fold." The audit identifies this as a doctrine-shaped question, not a code-shaped one.

---

## §6 — Relevance model recommendations

Currently relevance is determined by three signals, in this order:

1. **Category class** — `care` gets +100 in symbol sort key (always wins z-order); `events` gets +10; everything else 0.
2. **Priority field** — numeric on the beacon row, copied to feature property, used as a tiebreaker.
3. **Expiry recency** — `ends_at_ms` is the second tiebreaker.

That is it. There is no read of:

- **Geographic proximity** to the user
- **Temporal freshness** (created-at as an aggregate momentum signal)
- **Viewer trust** vis-à-vis the beacon owner (mutual boo, prior interaction, trust events per D24)
- **Time-of-day relevance** (an aftercare beacon at 02:00 vs 14:00; a club beacon at 22:00 vs 09:00)
- **Velocity** of beacon drops in the area (momentum aggregation per product-doctrine.md)
- **Co-presence** of multiple categories at the same place (e.g. a venue *with* a hosting beacon overlaid)
- **Off-grid mutual-only filter** (D08 — confirmed at Ghosted, not confirmed at globe)

The audit makes no implementation recommendation here. It names the question: *should relevance be a single composite score, or should it be per-category routing?* The product-doctrine answer would be the latter — different categories carry different relevance signatures. A care beacon's relevance is reach + freshness + harm-reduction posture. A hosting beacon's relevance is proximity + time-of-day + trust to the host. An editorial read's relevance is district + time-of-day.

**The relevance smell currently in the code:** `priority` is a single integer field set at write time. It is not derived from anything observable about the beacon (the writer chose it, the system did not). This is a SaaS-shaped surface — it implies a single dial, and dials produce gaming. The product-doctrine "trust over virality" rule would forbid this if it were stress-tested.

---

## §7 — Card behaviour recommendations

The sheet system is unusually well-developed. ~40 sheet types in `SHEET_REGISTRY`, LIFO stack, URL-synced, deep-linkable, per-type peek-floor (0.50 default, 0.85 for inbox-like, 0.92 for editor/photo-led), deterministic close (swipe / tap / Escape / back). Sheet "laws" are documented. This is mature infrastructure.

**Where cards behave correctly today:**

- **Beacon → profile sheet via canonical entity destination** (beacon-doctrine §2). The router resolves the entity type and routes accordingly. A tap on a person beacon does not open a generic beacon detail card; it opens the user's profile. This is the most important card-behaviour invariant and it is honoured.
- **Cluster preview peek-sheet** (the 2026-05-29 Phil lock) — the "N signals here · strongest title" surface with a Zoom-in CTA is exactly the right pattern for the cluster→commit gap. It is a peek-sheet by design, not a destination.
- **Hover/long-press preview chips** are the correct "before-tap" surface — they show the title + subtitle + countdown without committing to a sheet. This is the single most behaviourally important interaction pattern in the current globe.
- **Per-type peek floors** (0.50 / 0.85 / 0.92) are calibrated to surface type: a profile photo wants 0.92 (the hero needs to be above the fold immediately), an inbox wants 0.85 (the list needs to be readable), a quick picker wants 0.50.

**Where cards may be doing too much or too little:**

- **The Beacon sheet (`beacon` in the registry) is `height: 'large'` with default peek floor 0.50.** This is a tension. If a beacon tap routes to the entity destination per beacon-doctrine, *when is the `beacon` sheet actually opened?* If the answer is "for the rare case where the beacon has no canonical entity destination," then the `beacon` sheet is a fallback orphan — exactly the case the beacon-doctrine canonical rule forbids ("If routing cannot be resolved, the beacon should be suppressed rather than guessed"). The audit cannot resolve this from the read-set alone, but flags it as a question.
- **The `beacon-cluster` sheet is the correct level of card** — list of signals, Zoom-in CTA, no destination claim. The peek floor is 0.50 (default) which is too low for a list that needs to be scannable. The audit recommends nothing — but flags this for the inbox-pattern peek floor consideration (0.85) the inbox sheet recently received.
- **The District Editorial card** is described as ambient, not modal. It surfaces when the camera settles in a focus city. The audit could not confirm whether it sits *above* or *beside* the globe (i.e. is it a card or a sheet). If it is sheet-shaped, it competes with beacon taps for sheet-stack slots. If it is card-shaped, it competes with the FAB chrome for screen real estate. Either way it is an attention element at z≥10 in three cities.
- **The popup inline label on tap** ("a small popup label with the beacon title") sits in addition to the sheet that the parent opens. This is a *double-stage tap commit*: the inline popup and the sheet appear simultaneously. The audit names this as potentially redundant — the user has already seen the title in the hover chip and is now seeing it again in the popup while the sheet is also opening. Three surfaces of the same title at the same time.

**The card-behaviour theme the audit names:** the system has rich card vocabulary (peek, list-peek, ambient editorial, modal drop, full-sheet entity destination). It does *not* have a written contract for *which card answers which question*. The pattern is implicit. With ten beacons it is fine; with two thousand it is the source of every "wrong sheet opened" hotfix.

---

## §8 — Tap-reduction opportunities

Where the current flow is asking N taps when the user's actual question is answerable in fewer. Diagnosed from interaction-model trace.

**T1 — Cluster tap → list sheet → tap a leaf → entity destination = three taps to reach a single beacon.** This is by design (preview before commit) and is correct under the product-doctrine rule "showing everything is failure." But it is an opportunity-cost surface: a user who *knows what they want* at low zoom currently cannot fast-path to a specific beacon — they have to zoom in (or take the three-tap path). If editorial / known-care / curated beacons could be tap-routed directly from the cluster preview, this saves a tap for high-intent users without changing the behaviour for low-intent ones.

**T2 — Drop FAB → modal → intent picker → title field → location resolve → submit = five interactions to drop one beacon.** This is the lightest viable shape under D12 (intent-first) but it remains a substantial commitment. The audit does not propose reducing it (the intent picker is doctrinally load-bearing) but names the friction. The geocode-autocomplete fallback to GPS shortcut to caller-provided point reduces *location* friction; nothing reduces *commitment* friction. This is correct — a beacon should not be casual.

**T3 — Hover/long-press → tap = two-stage commit on every individual beacon.** This is the correct emotional pacing (preview before commit) and it should NOT be reduced. The audit names this positively — it is one of the few behaviour patterns in the globe that explicitly resists tap-reduction in favour of cognitive readiness. Two-stage commits are good when the second stage is consequential.

**T4 — The tier rail's four buttons = a four-tap-to-find-the-right-zoom surface for users who do not have a mental model of camera zoom levels.** A first-time user does not know that "REGION" is z=5.5 / pitch 10. They click each button until the camera does the right thing. The friction is the *label*, not the count of taps. Naming the button by *behavioural question* rather than camera position — "Where in the world / Which cities tonight / Which streets / Where I am" — would reduce the cognitive cost without removing the buttons. The audit notes this as a §11 doctrine-shaped question, not a copy fix.

**T5 — Re-orient → re-find = the implicit tax of every panning interaction.** When the user pans away from their current centre, the right rail's tier highlight follows (because tier is computed from zoom only), but no other affordance updates. If the user wanted to return to where they were ("undo my pan") there is no surface for that. This is dead-end friction, not extra taps — the user simply gives up and uses toggleLocal, which jumps to GPS rather than restoring prior centre.

**T6 — Sheet-stack pop is implicit, not visible.** A profile sheet opens; the user taps a venue link inside it; a venue sheet opens (LIFO push). Closing the venue returns to the profile (LIFO pop). The user can see neither the stack nor know the back button will pop rather than dismiss. This is correct sheet-system behaviour but it has zero affordance for the user to read.

---

## §9 — Emotional pacing audit

When the system reveals things, how fast, and whether the pacing matches the emotional weight of the act.

**Pacing that is correct:**

- **Hover/long-press preview before tap.** The single best pacing element in the current globe. The user is asked to commit to an interaction (tap) only after the system has anticipated their question (preview chip). This is anticipatory copy at the interaction layer, exactly what the Pulse Doctrine appended in 2026-05-29.
- **Cluster preview sheet before zoom-or-tap.** Same pattern at the cluster scale. The peek-sheet is the equivalent of the hover chip.
- **Atmospheric fog dawn → day → dusk → night.** The globe shifts colour palette across the day. The pacing is environmental, not interruptive. This is the kind of pacing the system gets right without the user noticing — and that is the correct success criterion.
- **Camera animations.** `flyTo` uses 1600ms duration with `essential: true`; reduced-motion mode collapses to 0ms. The pacing is cinematic, not snappy. For tier transitions and toggle-local, this is correct.
- **Self-marker pulse.** 2.2s ease-out CSS animation, infinite. Slow enough to read as "you are alive on this map" without being a heartbeat that demands attention. Correct pacing.

**Pacing that is questionable:**

- **The 350ms mobile long-press threshold.** Too short for a user reading the map; too long for a user trying to commit fast. The interaction sits in the threshold-of-discoverability zone where users will trigger it accidentally (the chip appears while they were trying to pan) or fail to trigger it (they tap, no chip, immediate commit). Desktop hover has no such window because the cursor naturally separates from the click. Mobile does not.
- **The District Editorial card surfacing at the moveend boundary.** The card appears after the camera settles, not while it moves. This is technically correct (the editorial slug is only known after the centre is known) but it produces a *delayed reveal* — the user pans into Soho, the camera stops, then a moment later the editorial card appears. The pacing is one beat slower than the user's attention.
- **The inline popup label on beacon tap appearing simultaneously with the sheet.** Already named in §7. The pacing collision (two surfaces appearing in the same frame) reads as duplicate confirmation, not as layered information.
- **The "Loading the signal…" overlay during initial map style load.** This is the only place the system says the word "signal" to the user during ambient state, and it ties the word to *waiting*. The pacing is correct (a brief overlay) but the framing makes "signal" feel like a buffering state, not a live state.

**Pacing that the system has not yet had to test:**

- **What happens when 500 beacons drop in one minute** (a real Saturday night surge). The cluster aggregation will absorb most of this. The lifecycle decay will gracefully fade older beacons. The atmospheric fog and self-marker will not be affected. But the *emotional* pacing — what the user *feels* as the city wakes up — has no engineered response. The system does not yet "breathe with the city." This is the largest piece of pacing infrastructure that does not yet exist.
- **What happens when an active beacon decays through `--decaying` and `--stale` in front of the viewer.** The sprite swap is a Mapbox `step` expression on `now()` — it happens at the next render frame after the threshold. The user sees a sprite pop. This will read as a render bug the first time it happens because there is no transition between sprite versions.

---

## §10 — Signal decay / live-state recommendations

The lifecycle states (`active` / `--decaying` ≤30 min / `--stale` ≤5 min / expired-drop) are implemented at the symbol layer via a `now()`-based Mapbox expression. The DB has no equivalent — `beacons.status` and `beacons.ends_at` are the only persisted fields; "decaying" and "stale" exist only as render states derived at draw time.

**The current DB state contradicts the live-state intent:** 25 expired beacons are sitting in the `beacons` table with `ends_at < NOW()`. They are not rendered (the layer filter and `pulse_signals` view filter both exclude them) but they persist as data. D33 (Memory & Permanence) and D22 (Temporal, forward-secrecy framing) both forbid this kind of static debt. The audit names this:

- **Expired beacons are being retained.** The current system silently filters them at the read layer. The forward-secrecy commitment (D22) implies they should be irreversibly dissolved at expiry — not just filtered, but reduced to atmospheric residue.
- **No render of state transitions.** The decay sprites swap instantaneously at zoom-rendered draw time. Users will never see a beacon "fade" in animation — they will see it pop from active to decaying to stale to gone. This is a pacing absence, not a decay-rule absence.
- **There is no "just expired" tail.** A beacon that expired 30 seconds ago is identical to a beacon that expired three days ago — both filtered, neither rendered, both retained as DB rows. The emotional weight of "you just missed it" has no surface.

**What the live-state model does well:**

- **The lifecycle is render-derived, not write-derived.** This means a beacon does not need to be re-written as it decays. The state transitions are zero-cost at the data layer.
- **The `--decaying` and `--stale` suffixes give the symbol layer per-state visual control** without changing the source data. This is the right architectural shape.
- **The hover chip surfaces the countdown** ("3h 12m" / "47m" / "4m"). This is one of the few places live-state is named to the user explicitly. It is correct.

**Live-state questions the audit names but does not answer:**

- Should beacon visibility on the globe attenuate (lower opacity, smaller size) over the decay window, not just sprite-swap?
- Should a beacon that has been "stale" for >2× its stale window auto-archive to atmospheric residue (per D33)?
- Should the *cluster count* of a near-expired beacon contribute fractionally to cluster aggregation, so a cluster's count gracefully drops as it ages?
- Should "co-presence at the same place" produce a single composite render (e.g. a hosting beacon + an aftercare beacon at the same address render as a layered glyph), or always render separately?
- Is there a "signal-thinning" cluster state (per the D14 anticipatory-copy work) where a cluster that has lost half its constituents in the last 10 minutes carries a different visual register?

**The retained-expired smell.** 25 dead rows in `beacons` is small but it is data debt that grows with usage. The doctrine that should govern this exists (D22 + D33) but the code path that enforces it does not. This is the most concrete debt the audit names.

---

## §11 — Recommended doctrine structure BEFORE implementation

The audit names what doctrines *should exist* before any further globe code is shipped. Each is sized to address a specific gap in the current behavioural model. This section does NOT write the doctrines.

**D36 — Pulse Behavioural Hierarchy (zoom = question, not camera).** Names the four behavioural questions per tier (where in the world / which cities tonight / which neighbourhoods running / what is here right now) and binds each tier's surface affordances to one question. Replaces the current "tier = zoom + pitch" mental model with "tier = the kind of decision the user can make at this scale." Inherits from product-doctrine § "Readability over completeness" and § "Momentum over dead volume." Should also name *what does not surface* at each tier — the per-tier filter.

**D37 — Editorial vs Beacon Ontology Lock.** Resolves the §4 collision: operator-placed editorial reads (Soho · Warming, district atmosphere) are NOT user beacons. They share a render pipeline today (`beacons` table with `metadata.curated=true`) but the doctrine must declare them ontologically distinct, name how they differ at the interaction layer (different tap target, different hover chip, different sheet), and either split them into two data sources or codify the curated-flag pattern with explicit interaction differentiation. Inherits from D12 (Drop Beacon — what a beacon is *not*) and beacon-doctrine § entity-aware routing. This is the highest-priority doctrine of the set.

**D38 — Globe Relevance Model.** Replaces the single-integer `priority` field with a per-category relevance signature. Names what relevance means for each category family (care = reach + freshness + harm-reduction; hosting = proximity + time-of-day + trust; editorial = district-fit + time-of-day; etc.). Forbids cross-category relevance comparison (a care beacon's relevance is not on the same axis as a hosting beacon's). Inherits from product-doctrine §"Trust over virality" and D24 trust events.

**D39 — Live-State + Decay Contract.** Names what the lifecycle states mean to the user, what visual + interaction differentiation each carries, and what happens to a beacon at and after expiry. Closes the F7 cognitive-readiness gap (users have never seen decay because no beacon has ever decayed in front of them) and the retained-expired data debt. Inherits from D22 Temporal + D33 Memory & Permanence.

**D40 — Signal Aggregation Above Cluster (city + region momentum).** Names how the GLOBE and REGION tiers aggregate signal without using count circles. Today there is no answer to "is this city running hot tonight" because the only aggregation primitive is Mapbox clusters. A city-level read needs a different shape — possibly atmospheric (the city centre brightens), possibly summary (a count above the city name), possibly editorial (a per-city read). Inherits from product-doctrine § "Momentum over dead volume" and Pulse Doctrine § anticipatory copy.

**D41 — Empty-State Doctrine for Pulse.** Names what the globe should say and look like when there are no signals — which is current reality. The product-doctrine "Quiet states are healthy" rule is the inheritance point. The current behaviour ("empty stage with the lights up") is honest but not anticipatory. D41 names the quiet-state behavioural model — venues + upcoming events + curated reads visible, no fabricated heat, atmospheric language ("the city's between signals" per D35 §4 Absence & Silence). Inherits from D35 §4 + product-doctrine.

**Sequencing recommendation (Phil's pattern — doctrine first, then implementation):**

1. **D37 (Editorial vs Beacon)** ships first because the ontology collision blocks every other clean change.
2. **D41 (Empty-State)** ships second because it governs current reality and unblocks the seeding question.
3. **D36 (Behavioural Hierarchy)** ships third because it changes how every tier reads.
4. **D39 (Live-State + Decay)** ships fourth because it closes the data debt and the cognitive-readiness gap.
5. **D38 (Relevance Model)** ships fifth because it depends on the prior four to define what relevance means per surface.
6. **D40 (Signal Aggregation Above Cluster)** ships last because it is the most cinematic and the least urgent given current signal density.

The audit explicitly recommends *not* writing all six at once. Doctrine inflation is the failure mode Phil flagged after D35. Each doctrine should be written, ratified, observed in a slice, then the next.

---

## §12 — Biggest strategic mistakes to avoid

Pre-emptive ban list. Each item is named because the audit identified its early shape already present in the current system, or because the brief's frame ("no Dribbble/Figma fluff · no gamification") flagged it as a known risk.

**M1 — Treating density as relevance.** The cluster count circle is already a density-as-relevance surface. Any reflex to make "busy clusters glow brighter" is forbidden by product-doctrine and by the anti-density-trap clause in D14. The system should become *clearer under pressure*, not louder.

**M2 — Adding more chrome elements above the globe.** The current FAB+rail count is at the upper limit. Each addition (e.g. "filter chips at the top of /pulse," "weather strip across the bottom") fragments attention further. New affordances should *replace*, not stack.

**M3 — Solving the empty-state by faking activity.** The seeded-signal-strategy doc (Phil 2026-05-25) already names this. Seeding *real, curated, attributed* care + editorial + venue presence is allowed and is the right move. Seeding *invented user beacons* to make the city look alive is the canonical failure mode and would violate trust-doctrine permanently.

**M4 — Making the tier rail into a feature panel.** The temptation will be to add "filters" or "categories" or "what's showing" to the rail. The rail is a camera control. If filtering matters, it is a separate surface — and the audit suggests it probably *should not exist* as a separate surface (users do not arrive thinking "filter to events only," they arrive thinking "what's happening").

**M5 — Treating the globe as a map.** Any move that surfaces Google-Maps-shaped affordances ("directions to here," "save this place," "rate this venue," "share this location") is a category drift. The globe is not a map; D14 InAppDirections already exists for routing as continuity, and venue saves belong in profile-layer, not in globe-layer.

**M6 — Adding a feed.** The system has explicitly refused this from the start (PulseMode.tsx returns null). Any pressure to add a chronological list of "recent signals" or "feed of activity" should be referred back to product-doctrine § "Utility over engagement."

**M7 — Letting the boost layer (globe_glow) drift toward visibility-purchase.** The current glow is restrained correctly (opacity 0.22–0.38, no pulse, no animation, marker stays the decision target). Any drift toward "boost makes the pin bigger / louder / on top" violates D31 § operator-incapability and the monetisation-visual-hierarchy doctrine append (2026-05-26).

**M8 — Treating signal aggregation as a single feature.** D40 above (signal aggregation above cluster) is six different problems — city momentum, district read, country read, region cluster, time-of-day breathing, co-presence layering. Treating it as one ship will produce one weak surface that does six jobs poorly. Sub-slice it.

**M9 — Making the lifecycle decay user-visible as a number.** "Expires in 47m" is correct; "Decaying" / "Stale" labels would be wrong. The decay is felt through the sprite tone, not announced as a SaaS status. Status badges are not a HOTMESS pattern.

**M10 — Building a "what's near me" filter as a list.** The user's question "what's near me" is answered by the LOCAL tier of the globe. It is not answered by a sheet of nearby beacons. Any temptation to build a nearby-beacons sheet should be referred to the LOCAL tier and the under-served behaviour question there.

**M11 — Building the globe in service of the chrome.** The chrome (FABs, rail, editorial cards, drop modal) is currently doing more behavioural work than the globe canvas itself, because the canvas has no signal. The risk is that the chrome calcifies as the answer, and when signal arrives the chrome becomes an obstacle to actually using it. The system needs to be designed for the steady state where the canvas leads, not the empty state where the chrome compensates.

**M12 — Letting "interesting" interaction patterns ship without doctrine.** The hover-then-tap pattern was right; the cluster preview sheet was right; the lifecycle decay sprite swap is correct architecture but needs the doctrine (D39) before it surfaces to users. Future patterns ("co-presence layered glyph," "city momentum aura," "signal-thinning cluster shimmer") should ship behind doctrine, not as taste exercises.

---

## Closing note (not part of the brief, brief-author convention)

This artifact is **research only**. It names what is, what the system implies it wants to be, and where the doctrines that would govern the answer should live. It does not propose copy, visuals, route maps, or implementation. The next move per Phil's pattern is to read this, decide which of the six recommended doctrines (D36–D41) is shipped first, write that doctrine alone, then observe one slice before writing the next.

The single highest-leverage finding the audit can name in one sentence:

> The globe is engineered as realtime city intelligence; it currently behaves as an empty cinematic stage; the most important next move is **not** to add signal, but to write **D37 (Editorial vs Beacon Ontology Lock)** so the signal that arrives can be rendered against a clean ontology rather than against the current operator-vs-user collision.
