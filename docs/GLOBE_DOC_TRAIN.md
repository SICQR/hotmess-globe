# Globe Documentation Train

> **⚠️ RESTATE:** Reading order is guidance only. Single-engine Mapbox is the shipped Globe (2026-05-25); the react-globe path is retired. For current behaviour, read the code (`src/pages/Globe.jsx`, `src/components/globe/PulseMap.jsx`) over any doc in this train.

Purpose: make the Globe work actionable. This is the reading order, ownership map, and build sequence for HOTMESS Globe refinement.

This doc exists because the Globe has moved beyond a single feature brief. It now has product, data, visual, density, privacy, safety, monetisation, and implementation concerns that must not be mixed together.

## Read order

### 0. Repo context

Read these first before touching Globe code:

1. `CLAUDE.md`
2. `.claude/skills/supabase-ops/SKILL.md`
3. `HANDOVER.md`
4. `docs/DISCOVERY_INDEX.json`

Reason: these define the repo rules, Supabase gotchas, current architecture, and known contradictions.

### 1. Globe product brief

Read:

1. `docs/AI_GLOBE_ENHANCEMENT_BRIEF.md`

Use this for:

- mission;
- non-negotiables;
- Supabase grounding;
- existing Globe architecture;
- broad enhancement direction.

Do not treat it as the final rendering spec.

### 2. View and interaction model

Read:

1. `docs/GLOBE_VIEW_INTERACTION_MATRIX.md`

Use this for:

- view modes;
- user interaction taxonomy;
- Mapbox-to-current-renderer translation;
- camera and zoom principles;
- component build list.

### 3. Signal visual design system

Read:

1. `docs/GLOBE_SIGNAL_VISUAL_SYSTEM.md`

Use this for:

- pins;
- nodes;
- beacons;
- arcs;
- rings;
- clusters;
- labels;
- scale;
- motion;
- marker hierarchy.

This is the primary design contract for how Globe signals look and behave.

### 4. Beacon taxonomy

Read:

1. `docs/GLOBE_BEACON_TAXONOMY.md`

Use this for:

- Event;
- Ticket;
- Chill;
- Preloved Drop;
- HNH MESS;
- Radio;
- Care;
- NA/AA;
- Sober Support;
- Venue Vibe;
- Meetup;
- Afterparty;
- Creator Drop;
- Record Release;
- Urgent Safety.

This is the primary type system contract for user-created and system-created beacons.

### 5. Density and proximity model

Read:

1. `docs/GLOBE_DENSITY_PROXIMITY_MODEL.md`

Use this for:

- many users visible in close proximity;
- many beacons in one area;
- space-to-local rendering;
- clusters/stacks;
- density states;
- local map handoff;
- boost behaviour in crowded areas.

This doc decides whether a signal appears as heat, cluster, stack, pin, card, list item, or local map feature.

### 6. Help Beacon and SOS privacy

Read:

1. `docs/GLOBE_HELP_SOS_PRIVACY_MODEL.md`

Use this for:

- Help Beacon;
- SOS;
- exact lat/lng handling;
- trusted contacts;
- safety visibility;
- cancellation;
- audit logs;
- notification privacy.

This is safety-critical. It overrides all public Globe display logic.

## Current doc status

| Doc | Status | Role |
|---|---|---|
| `AI_GLOBE_ENHANCEMENT_BRIEF.md` | active | product/Claude operating brief |
| `GLOBE_VIEW_INTERACTION_MATRIX.md` | active | view and interaction contract |
| `GLOBE_SIGNAL_VISUAL_SYSTEM.md` | active | visual grammar and marker system |
| `GLOBE_BEACON_TAXONOMY.md` | active | beacon type taxonomy |
| `GLOBE_DENSITY_PROXIMITY_MODEL.md` | active | density, proximity, clustering, local handoff |
| `GLOBE_HELP_SOS_PRIVACY_MODEL.md` | active | private safety location model |

## Known doc gaps still needed

### P0 docs

1. `GLOBE_IMPLEMENTATION_PLAN.md`
   - exact build phases;
   - file targets;
   - no-design-drift checklist.

2. `GLOBE_SUPABASE_SCHEMA_MAP.md`
   - table/view/RPC ownership;
   - privacy classification;
   - read/write path;
   - UI consumer;
   - RLS requirement.

3. `GLOBE_BEACON_LIFECYCLE_ECONOMY.md`
   - duration rules;
   - cancellation;
   - expiry;
   - boosts;
   - cooldowns;
   - monetisation boundaries.

### P1 docs

4. `GLOBE_MAPBOX_LOCAL_MODE.md`
   - how/when Globe hands off to Mapbox/local map;
   - layers;
   - clusters;
   - city/district detail;
   - privacy-safe map rendering.

5. `GLOBE_COMPONENT_CONTRACTS.md`
   - exact props/types for components;
   - cards/drawers/panels;
   - click results.

6. `GLOBE_ACCESSIBILITY_REDUCED_MOTION.md`
   - keyboard/list fallback;
   - reduced motion;
   - screen reader copy;
   - touch target strategy.

## Decision hierarchy

When docs conflict, use this order:

1. `GLOBE_HELP_SOS_PRIVACY_MODEL.md` for safety and exact location.
2. `.claude/skills/supabase-ops/SKILL.md` for Supabase/RLS rules.
3. `HANDOVER.md` for current architecture and data model.
4. `GLOBE_DENSITY_PROXIMITY_MODEL.md` for crowded/public rendering.
5. `GLOBE_BEACON_TAXONOMY.md` for beacon types.
6. `GLOBE_SIGNAL_VISUAL_SYSTEM.md` for marker appearance.
7. `GLOBE_VIEW_INTERACTION_MATRIX.md` for interaction modes.
8. `AI_GLOBE_ENHANCEMENT_BRIEF.md` for product direction.

## Build sequence

### Phase 1 — normalise data and rules

Deliver:

- `GlobeSignalTypes.ts`
- `GlobeBeaconType.ts`
- `GlobeSignalAdapter.ts`
- `BeaconVisualRegistry.ts`
- `GlobeCameraPolicy.ts`
- `GlobeMarkerScale.ts`

Goal:

- stop ad-hoc beacon objects;
- stop giant markers;
- stop unsafe/public exact location assumptions.

### Phase 2 — fix rendering clarity

Deliver:

- smaller signal-aware pins;
- category-aware rings;
- safe camera altitudes;
- no zoom below blur threshold;
- selected-state amplification only.

Goal:

- the Globe looks refined from space;
- no giant node towers;
- no blurry close zoom.

### Phase 3 — solve density

Deliver:

- cluster/stack logic;
- density states;
- city/district grouping;
- category stack ordering;
- local mode trigger.

Goal:

- 60 people or 30 beacons in Soho renders as signal intelligence, not chaos.

### Phase 4 — local map/detail mode

Deliver:

- Mapbox local mode or map inset;
- city/district/venue detail;
- stacked drawers;
- list fallback.

Goal:

- close interaction gives real map detail instead of over-zooming the sphere.

### Phase 5 — beacon creation and lifecycle

Deliver:

- type-aware `BeaconDropModal`;
- duration/expiry rules;
- cancellation;
- moderation/reporting;
- boost rules;
- vendor/creator plans.

Goal:

- users and vendors create meaningful, temporary, monetisable signals without spamming the Globe.

### Phase 6 — Help/SOS private safety layer

Deliver:

- safety visibility policy;
- precision policy;
- trusted contact scope;
- private safety tables/RLS if missing;
- cancellation and audit flows.

Goal:

- users can become Help Beacons or trigger SOS without public GPS leakage.

## Non-negotiable constraints

- Public Globe must never show raw Help/SOS lat/lng.
- Public people signals are aggregate/approximate by default.
- `beacons` is a view; do not write to it.
- `right_now_status` is a table; do not write to `profiles.right_now_status`.
- Boosts must not make markers huge.
- Red is for real urgent/SOS states only.
- Care and sober support must remain visible and anonymity-safe.
- Local detail must use map/drawer/list patterns, not fake street zoom on the sphere.
- No new auth listener unless an audit justifies it.
- No service-role secrets in client code.

## Next docs to create

Start here:

1. `GLOBE_IMPLEMENTATION_PLAN.md`
2. `GLOBE_SUPABASE_SCHEMA_MAP.md`
3. `GLOBE_BEACON_LIFECYCLE_ECONOMY.md`

Then:

4. `GLOBE_MAPBOX_LOCAL_MODE.md`
5. `GLOBE_COMPONENT_CONTRACTS.md`
6. `GLOBE_ACCESSIBILITY_REDUCED_MOTION.md`

## Definition of done for the doc train

- Every doc has a clear purpose.
- Every doc points to the next relevant doc.
- Safety/privacy docs override monetisation and visual docs.
- Implementation docs reference real files in the repo.
- No doc asks Claude to invent data sources before auditing Supabase.
- No doc encourages fake live claims.
- No doc allows public exact Help/SOS location.
- Claude can pick up the doc train and start build work without asking Phil to restate the product.