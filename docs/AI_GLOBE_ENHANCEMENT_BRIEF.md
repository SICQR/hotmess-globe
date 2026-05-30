# AI Globe Enhancement Brief

Purpose: give Claude one clean operating brief for improving the HOTMESS Globe without breaking Supabase truth, consent gates, or the men-only 18+ care-first posture.

Read this only after reading:

1. `CLAUDE.md`
2. `.claude/skills/supabase-ops/SKILL.md`
3. `HANDOVER.md` section 9, Data Architecture
4. `src/components/globe/UnifiedGlobe.tsx`
5. the actual data adapters/components touched by the task

## Current Supabase understanding

This brief is grounded in the repo handover and Supabase ops skill, not a live dashboard query.

### Project IDs currently documented

There is a project-ID contradiction in the repo that Claude must not ignore:

- `HANDOVER.md` says production is `rfoftonnlwudilafhfkl`, dev/staging is `klsywpvncqqglhnhrjbh`, and edge functions are hosted on `axxwdjmbwkvqhcpwters`.
- `.claude/skills/supabase-ops/SKILL.md` says production is `axxwdjmbwkvqhcpwters` and dev/staging is `klsywpvncqqglhnhrjbh`.
- `docs/DISCOVERY_INDEX.json` says frontend project is `klsywpvncqqglhnhrjbh` and backend project is `axxwdjmbwkvqhcpwters`.

Rule: before applying migrations or writing production data, verify the active Supabase project from env vars or dashboard. Do not guess.

### Globe-relevant tables

Use these before inventing anything:

- `cities` — city list: name, lat, lng, country.
- `venues` — venue directory: name, lat, lng, type.
- `events` — beacon source: owner_id, title, starts_at, ends_at, latitude, longitude, metadata.
- `right_now_status` — live user intent/status: user_id, status_type, venue_id, expires_at.
- `user_presence` — heartbeat and location: user_id, last_seen, is_online, last_lat, last_lng.
- `location_shares` — active location sharing.
- `shows` — radio schedule.
- `tracks`, `label_artists`, `label_releases` — music layer.
- `trusted_contacts` — safety layer, but do not expose private contact data on the Globe.
- `profiles` and `profile_photos` — user identity, but do not expose exact/private location or photos without the existing product rules.

### Globe-relevant views

- `beacons` — read-only view over `events` + metadata JSONB. Do not insert into it. Do not alter it as a table.
- `pulse_signals` — aggregate Pulse signal layer.
- `place_intensity` — venue heat/intensity layer.
- `public_movement_presence` — public movement data from movement sessions.

### Globe-relevant RPCs

- `list_profiles_secure()` — ghost-filtered profile list.
- `get_server_time()` — server timestamp.
- `switch_persona(persona_id)` — persona context; do not call from Globe unless persona switching is explicitly in scope.
- `mark_messages_read(thread_id)` — messaging only; not Globe scope.

## Mission

Make the Globe feel like a living queer signal layer: beautiful, fast, safe, useful, and unmistakably HOTMESS.

The Globe should connect four product loops:

1. **Locate** — show cities, venues, heat, events, radio, care signals, and safe public activity.
2. **Listen** — cross-link every ambient or city moment into HOTMESS RADIO.
3. **Land** — point users toward Hand N Hand, aftercare, abuse reporting, accessibility, and safer participation.
4. **Convert** — route intent into Shop, Affiliate, Creator onboarding, Sponsorship disclosures, and Records.

## Non-negotiables

- Men-only queer ecosystem positioning.
- 18+ gating before sexualised, nightlife, intimate, or community participation surfaces.
- Consent-first copy on interaction points.
- Aftercare must be framed as information, resources, services, or support signposting — never medical treatment.
- No dead ends. Every modal, drawer, card, state, and empty state links onward.
- Supabase is source of truth where data already exists.
- Do not invent tables if a real table, view, RPC, or existing mock-to-real pathway exists.
- Do not ship secret values, service-role keys, tokens, or Postgres credentials into client code.
- Do not expose exact user GPS on public Globe surfaces.
- Do not add another Supabase auth listener.

## Known stack

- Vite, React, TypeScript, Tailwind, Framer Motion.
- `react-globe.gl`, `three`, `mapbox-gl`, `react-leaflet`.
- Supabase client exists through the singleton at `src/components/utils/supabaseClient.jsx`.
- Routing uses React Router.
- Tests include Vitest and Playwright.

## Existing Globe architecture

`UnifiedGlobe` is the L0 background layer and intentionally renders only on `/pulse` or `/globe`. It returns `null` everywhere else to prevent canvas bleed, nav tap theft, and memory issues.

Do not make the Globe global again.

Claude must preserve:

- route guard: `/pulse` and `/globe` only;
- bottom offset: nav-safe `83px`;
- touch handling that prevents pull-to-refresh hijack;
- lazy loading of the Globe page;
- fallback spinner.

## Visual direction

Dark-only. Black base. Gold signal. Cinematic but legible. Brutal elegance, not casino neon.

Use the Globe as the centrepiece, but keep UI readable on mobile:

- desktop: globe plus right-side insight rail;
- tablet: globe above stacked cards;
- mobile: globe hero, bottom sheet controls, quick actions.

## Primary globe layers

### 1. City heat

Primary data: `cities`, `pulse_signals`, `place_intensity`, aggregated `events`, and non-sensitive presence counts.

Card fields:

- city name;
- country/region;
- heat level;
- active signal count;
- now/next radio or event cue;
- care link.

CTA set:

- `Listen live` -> Radio;
- `Open city signal` -> city drawer;
- `Find care` -> Care;
- `Shop the kit` -> HNH MESS / Shop.

### 2. Venue signals

Primary data: `venues`, `place_intensity`, `events`, and `right_now_status` via venue_id where safe.

Card fields:

- venue name;
- city;
- current vibe;
- last updated;
- consent/safety note;
- verified/unverified badge.

Never show private user identity from a venue signal unless the existing Ghosted/profile rules explicitly allow it.

### 3. Event / beacon layer

Primary data: write to `events`; read public beacon cards through `beacons` if suitable.

Important: `beacons` is a VIEW. Do not `INSERT INTO beacons`. Do not `ALTER TABLE beacons`. Event metadata fields such as title/description/address/image_url may live in `events.metadata` JSONB.

### 4. Radio pulse

Primary data: `shows`, plus existing Radio context/components.

The Globe should never be silent. If live metadata exists, surface Now/Next. If not, show brand-safe schedule copy from `shows`.

CTA set:

- `Tune in` -> Radio;
- `Send a signal` -> Community or onboarding;
- `Sponsor this hour` -> Sponsorship disclosures / Affiliate.

### 5. Care beacons

Care is not a side page; it is a visible layer. Add non-alarmist beacons for Hand N Hand, aftercare, accessibility, abuse reporting, and data/privacy.

Care beacons can be curated config if no table exists, but must be clearly labelled `Curated`, not `Live`.

CTA set:

- `Land with Hand N Hand` -> Care;
- `Report a problem` -> Abuse Reporting;
- `Privacy controls` -> Data & Privacy Hub.

## Page copy

Hero: `The world is not quiet. It is pulsing.`

Subhead: `HOTMESS Globe maps the live queer signal — cities, sound, care, heat, and the places worth landing.`

Primary CTA: `Enter the Globe`

Secondary CTA: `Listen live`

Consent cue: `Only step in where consent is clear, mutual, and sober enough to mean it.`

Aftercare read: `Hand N Hand is the place to land: information, support routes, and services after the night gets loud.`

Empty state: `No live signal here yet. Start with the radio, land in care, or check the city again soon.`

Alt text: `Interactive dark globe showing gold HOTMESS signal points across active cities.`

## Component targets

Create or improve these units where missing:

- `GlobeHero`
- `GlobeLayerToggle`
- `CitySignalDrawer`
- `VenueSignalCard`
- `RadioPulseCard`
- `CareBeaconCard`
- `GlobeEmptyState`
- `GlobeConsentGate`
- `GlobeDataSourceBadge`
- `GlobeSignalAdapter`

## Interaction rules

- Hover/tap reveals readable cards, not tiny mystery tooltips.
- Every data point has a provenance badge: `Live`, `Recent`, `Curated`, or `Coming soon`.
- Never claim live activity from static, mock, seed, or stale data.
- Use reduced-motion fallbacks.
- Keyboard users must be able to reach every globe action through list/card alternatives.
- Mobile bottom sheet must be usable with one thumb.
- Public Globe locations must be city/venue/aggregate level unless a user has explicitly opted into sharing.

## Data adapter rules

Before touching UI, build or audit typed adapters.

Required adapter outputs:

```ts
type GlobeSignalSource = 'live' | 'recent' | 'curated' | 'coming_soon';

type GlobeSignal = {
  id: string;
  kind: 'city' | 'venue' | 'event' | 'radio' | 'care';
  label: string;
  lat: number;
  lng: number;
  source: GlobeSignalSource;
  updatedAt?: string;
  href?: string;
  safetyNote?: string;
};
```

Adapter must:

- prefer Supabase views/tables over hardcoded arrays;
- gracefully handle empty results;
- never throw the whole Globe blank because one table fails;
- mark mock/static data as `curated` or `coming_soon`;
- log only safe operational errors, not user data.

## Output expectation for Claude

When enhancing the Globe, ship in this order:

1. Supabase audit: tables/views/RPCs/components already used by Pulse/Globe.
2. Typed data adapters with safe empty states.
3. Globe layer UI.
4. Copy and routing links.
5. Compliance and accessibility pass.
6. Tests: data adapter unit tests, render smoke tests, one Playwright happy path.

## Definition of done

- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test:run` passes, or failures are documented as unrelated existing failures.
- `npm run build` passes.
- No new secrets.
- No fake live claims.
- No dead-end modals.
- 18+, consent, aftercare, privacy, and reporting paths are visible.
- No writes to `beacons`.
- No writes to `profiles.right_now_status`.
- No exact public GPS leakage.
- No extra auth listener.