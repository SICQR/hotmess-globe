# AI Globe Enhancement Brief

Purpose: give Claude one clean operating brief for improving the HOTMESS Globe without breaking Supabase truth, consent gates, or the men-only 18+ care-first posture.

## Mission

Make the Globe feel like a living queer signal layer: beautiful, fast, safe, useful, and unmistakably HOTMESS.

The Globe should connect four product loops:

1. **Locate** — show what is happening now: cities, venues, heat, radio, check-ins, care signals.
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

## Known stack

- Vite, React, TypeScript, Tailwind, Framer Motion.
- `react-globe.gl`, `three`, `mapbox-gl`, `react-leaflet`.
- Supabase client already exists through `@supabase/supabase-js`.
- Routing uses React Router.
- Tests include Vitest and Playwright.

## Visual direction

Dark-only. Black base. Gold signal. Cinematic but legible. Brutal elegance, not casino neon.

Use the Globe as the centrepiece, but keep UI readable on mobile:

- desktop: globe plus right-side insight rail;
- tablet: globe above stacked cards;
- mobile: globe hero, bottom sheet controls, quick actions.

## Primary globe layers

### 1. City heat

Display city-level activity using stored or computed heat data. Prefer existing Supabase/RPC data over hardcoded arrays.

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

Use real venue/check-in/community data where available. If a table is missing, create a typed adapter with empty-state behaviour rather than fake live claims.

Card fields:

- venue name;
- city;
- current vibe;
- last updated;
- consent/safety note;
- verified/unverified badge.

### 3. Radio pulse

The Globe should never be silent. If live radio metadata exists, surface Now/Next. If not, show brand-safe schedule copy.

CTA set:

- `Tune in` -> Radio;
- `Send a signal` -> Community or onboarding;
- `Sponsor this hour` -> Sponsorship disclosures / Affiliate.

### 4. Care beacons

Care is not a side page; it is a visible layer. Add non-alarmist beacons for Hand N Hand, aftercare, accessibility, abuse reporting, and data/privacy.

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

## Interaction rules

- Hover/tap reveals readable cards, not tiny mystery tooltips.
- Every data point has a provenance badge: `Live`, `Recent`, `Curated`, or `Coming soon`.
- Never claim live activity from static or mock data.
- Use reduced-motion fallbacks.
- Keyboard users must be able to reach every globe action through list/card alternatives.
- Mobile bottom sheet must be usable with one thumb.

## Output expectation for Claude

When enhancing the Globe, ship in this order:

1. Data audit: what tables/views/RPCs/components already exist.
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