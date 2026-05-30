# Globe Beacon Taxonomy

Purpose: define the real HOTMESS beacon types users can create, discover, filter, and interact with on the Globe.

This sits under `GLOBE_SIGNAL_VISUAL_SYSTEM.md`. That file defines the broad visual system. This file defines the actual beacon categories: Event, Chill, Ticket, Preloved Drop, NA/AA, care, radio, market, and social signals.

## Core rules

- Every beacon needs a reason to exist.
- Every beacon needs a clear visual shape.
- Every beacon needs a tap result.
- Every beacon needs a privacy posture.
- Every beacon needs a default expiry.
- Every beacon needs moderation/reporting.
- No beacon creates a dead end.

## Beacon type model

```ts
export type GlobeBeaconType =
  | 'event'
  | 'ticket'
  | 'chill'
  | 'preloved_drop'
  | 'hnh_mess'
  | 'radio'
  | 'care'
  | 'na_aa'
  | 'sober_support'
  | 'venue_vibe'
  | 'meetup'
  | 'afterparty'
  | 'creator_drop'
  | 'record_release'
  | 'market'
  | 'urgent_safety';
```

Required shared fields:

```ts
export type GlobeBeacon = {
  id: string;
  type: GlobeBeaconType;
  title: string;
  description?: string;
  lat: number;
  lng: number;
  city?: string;
  venueId?: string;
  source: 'live' | 'recent' | 'curated' | 'user' | 'partner';
  startsAt?: string;
  endsAt?: string;
  expiresAt?: string;
  visibility: 'public' | 'city' | 'venue' | 'matched' | 'private';
  ageGated: boolean;
  consentRequired: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected' | 'reported';
  ctaPrimary: string;
  ctaSecondary?: string;
};
```

## Type overview

| Type | User meaning | Shape | Colour logic | Tap result | Default expiry |
|---|---|---|---|---|---|
| Event | something scheduled | diamond pin | gold + amber ring | Event/Beacon sheet | event end |
| Ticket | ticketed entry / QR | ticket stub | gold + notch | Ticket/Event sheet | event end |
| Chill | low-pressure hang | soft dot | blue-gold calm | Chill card / join intent | 2–4h |
| Preloved Drop | item drop nearby | tag/square | dim gold | Shop/Preloved panel | 24–72h |
| HNH MESS | product/kit signal | bottle/tag | gold + black | HNH MESS / Shop | campaign-based |
| Radio | broadcast pulse | waveform | gold ripple | Radio card | show end |
| Care | Hand N Hand/support | white-gold halo | calm white/gold | Care card | curated/live |
| NA/AA | sober fellowship route | white circle + quiet ring | white + soft blue | Sober support card | meeting end/curated |
| Sober Support | non-meeting sober support | white-blue care node | white/blue | Care/Sober card | curated/live |
| Venue Vibe | venue signal | venue pin | steel-blue + gold | Venue card | 30–90m |
| Meetup | consent-led social meet | small linked-dot | blue/gold | Meetup card/profile flow | 1–3h |
| Afterparty | late signal | amber low pulse | amber/gold | Event/venue card | 2–6h |
| Creator Drop | creator/content drop | star/tag | gold + tick | Creator card/drop | 24–72h |
| Record Release | RAW CONVICT release | waveform disc | gold waveform | Release/music card | campaign-based |
| Market | commerce signal | small tag | dim gold | Market panel | campaign/item |
| Urgent Safety | real urgent help | red ring | red only | Safety/urgent surface | manual/short |

## Beacon detail specs

### 1. Event Beacon

Use for:

- club night;
- live show;
- pop-up;
- community event;
- HOTMESS programmed moment.

Visual:

- diamond or notched pin;
- gold fill;
- amber event ring if live/upcoming;
- selected gets one strong halo.

Interaction:

- tap opens event/beacon sheet;
- CTAs: `View details`, `Get ticket`, `Listen live`, `Find care`;
- if no ticket required, CTA becomes `Save event` or `Open venue`.

Microcopy:

- `Event signal`
- `Live tonight`
- `Starts soon`
- `Open details`

Compliance:

- 18+ gate if nightlife/sexualised/adult context;
- no fake capacity or attendance claims;
- show source/provenance.

### 2. Ticket Beacon

Use for:

- ticketed events;
- RSVP-only moments;
- QR vault entries;
- guestlist drops.

Visual:

- ticket-stub silhouette;
- gold with small cutout/notch;
- tiny QR corner motif only in selected/card state.

Interaction:

- tap opens ticket/event sheet;
- CTAs: `Get ticket`, `Open ticket`, `Save to Vault`;
- if sold out: `Join waitlist` / `Listen live` / `Find care`.

Microcopy:

- `Ticket drop`
- `Guestlist open`
- `Saved to Vault`

Compliance:

- clear price/free label;
- age restrictions visible;
- no misleading scarcity.

### 3. Chill Beacon

Use for:

- low-pressure hang;
- coffee/walk/soft landing;
- “anyone around?” social signal;
- post-night decompression.

Visual:

- small rounded dot;
- blue-gold calm glow;
- no aggressive pulse;
- no sexualised iconography.

Interaction:

- tap opens Chill card;
- CTAs: `Say hey`, `Open nearby`, `Find care`;
- optional intent: `Quiet`, `Chat`, `Walk`, `Coffee`, `Landing`.

Microcopy:

- `Chill signal`
- `Low pressure`
- `Soft landing nearby`

Compliance:

- consent prompt before contact;
- approximate location only;
- expires quickly by default.

### 4. Preloved Drop Beacon

Use for:

- user resale/preloved listing nearby;
- clothes/accessories drop;
- pickup-friendly item;
- limited local market signal.

Visual:

- small tag/square;
- dim gold outline;
- secondary to care/social/event layers;
- selected card can show thumbnail.

Interaction:

- tap opens Preloved/Market panel;
- CTAs: `View item`, `Message seller`, `Open Market`;
- show location as area/venue, not exact private address.

Microcopy:

- `Preloved drop`
- `Local pickup`
- `Open Market`

Compliance:

- commerce disclosure;
- seller safety note;
- report listing;
- no exact home address.

### 5. HNH MESS Beacon

Use for:

- HNH MESS product route;
- lube/aftercare kit context;
- stockist/pop-up/sampling event;
- care-first product signal.

Visual:

- gold bottle/tag hybrid;
- black centre;
- no medical-cross styling;
- no explicit imagery.

Interaction:

- tap opens HNH MESS card;
- CTAs: `Shop HNH MESS`, `Read aftercare`, `Find care`.

Microcopy:

- `HNH MESS kit`
- `Real aftercare starts here`
- `Shop the kit`

Compliance:

- 18+ where sexual wellness/product context requires it;
- aftercare as information/services/support, not medical claim;
- sponsored/affiliate disclosure where relevant.

### 6. Radio Beacon

Use for:

- HOTMESS RADIO live show;
- city-linked broadcast;
- takeover;
- record/artist moment.

Visual:

- waveform ripple;
- gold transmission ring;
- no purple;
- can be global if no city location.

Interaction:

- tap opens RadioPulseCard;
- CTAs: `Listen live`, `View schedule`, `Sponsor this hour`.

Microcopy:

- `Now transmitting`
- `Radio pulse`
- `Listen live`

Compliance:

- no fake live host/DJ metadata;
- sponsor read/disclosure if commercial.

### 7. Care Beacon

Use for:

- Hand N Hand;
- aftercare resource;
- abuse reporting;
- accessibility;
- data/privacy;
- “place to land” support route.

Visual:

- white centre;
- gold care halo;
- calm pulse;
- red only for actual urgent/SOS.

Interaction:

- tap opens CareBeaconCard;
- CTAs: `Land with Hand N Hand`, `Report a problem`, `Privacy controls`.

Microcopy:

- `Place to land`
- `Care route`
- `Support, not judgement`

Compliance:

- support/info framing;
- no medical claims;
- no crisis-service impersonation.

### 8. NA/AA Beacon

Use for:

- NA meeting signpost;
- AA meeting signpost;
- sober fellowship route;
- recovery-friendly event/resource.

Visual:

- quiet white circle;
- soft blue outer ring;
- no party pulse;
- no red;
- no bottle/drug iconography;
- label can say `Sober route` instead of loudly exposing NA/AA on the globe.

Interaction:

- tap opens Sober Support card;
- CTAs: `View meeting info`, `Open care route`, `Save privately`;
- optional: `Hide sober routes` privacy preference.

Microcopy:

- Public marker: `Sober route`
- Card title: `NA / AA support nearby`
- Body: `Meeting details are shown with care. Save privately or open support routes.`
- CTA: `View support`

Compliance:

- anonymity-first;
- do not show attendee counts;
- do not show user identity near NA/AA beacons;
- do not imply affiliation or endorsement unless verified;
- source/provenance required: curated, partner, public listing, or user-submitted pending approval;
- no medical/treatment claims;
- no push notifications that reveal NA/AA interest on lock screen without explicit opt-in.

### 9. Sober Support Beacon

Use for:

- sober-friendly venue/resource;
- non-alcoholic meetup;
- quiet care space;
- post-night grounding.

Visual:

- white/soft-blue care node;
- calm static halo;
- no nightlife heat animation.

Interaction:

- tap opens Sober Support card;
- CTAs: `Open support`, `Save privately`, `Find care`.

Microcopy:

- `Sober support`
- `Quiet route`
- `Save privately`

Compliance:

- same privacy protections as NA/AA;
- optional visibility filters.

### 10. Venue Vibe Beacon

Use for:

- live venue vibe;
- crowd style;
- queue/energy/intensity;
- place heat.

Visual:

- venue pin;
- steel-blue outer edge;
- gold centre intensity;
- no huge ring unless selected.

Interaction:

- tap opens VenueSignalCard;
- CTAs: `Open venue`, `Nearby`, `Find care`, `Listen live`.

Microcopy:

- `Venue vibe`
- `Recently active`
- `Live signal`

Compliance:

- aggregate data only;
- no exact user exposure;
- no unsafe crowd claims unless verified.

### 11. Meetup Beacon

Use for:

- consent-led social meetup;
- matched/mutual context;
- small group/public hang.

Visual:

- two linked small dots;
- blue/gold;
- softer than event.

Interaction:

- tap opens Meetup card;
- CTAs: `Open profile`, `Message`, `Set boundary`, `Find care`.

Microcopy:

- `Meetup signal`
- `Consent first`
- `Open chat`

Compliance:

- consent prompt;
- expiry required;
- approximate location;
- report/block visible.

### 12. Afterparty Beacon

Use for:

- late-night continuation;
- venue-backed afters;
- creator/host-led afterparty.

Visual:

- low amber pulse;
- event beacon with darker ring;
- not bigger than event.

Interaction:

- tap opens Afterparty/Event card;
- CTAs: `View details`, `Check consent cue`, `Find care`.

Microcopy:

- `Afterparty signal`
- `Late signal`
- `Consent keeps it clean`

Compliance:

- 18+ mandatory;
- consent cue mandatory;
- report/abuse route mandatory;
- no private address unless permission-gated.

### 13. Creator Drop Beacon

Use for:

- creator launch;
- drop window;
- collab moment;
- HOTMESS community release.

Visual:

- small star/tag;
- gold tick if verified creator;
- no urgent ring.

Interaction:

- tap opens Creator Drop card;
- CTAs: `View drop`, `Follow creator`, `Creator onboarding`.

Microcopy:

- `Creator drop`
- `Verified creator`
- `Open drop`

Compliance:

- sponsorship disclosure;
- UGC/moderation rules;
- creator verification badge only if real.

### 14. Record Release Beacon

Use for:

- RAW CONVICT RECORDS release;
- artist drop;
- listening event;
- track/premiere.

Visual:

- waveform disc;
- gold ring;
- subtle arc to Radio if tied to show.

Interaction:

- tap opens release/music card;
- CTAs: `Listen`, `Open artist`, `Radio`.

Microcopy:

- `Record release`
- `New on RAW CONVICT`
- `Listen now`

Compliance:

- rights/source metadata;
- no fake availability.

### 15. Urgent Safety Beacon

Use for:

- real SOS/safety interrupt;
- verified urgent support alert;
- abuse/reporting escalation.

Visual:

- red ring;
- high contrast;
- never decorative;
- must be rare.

Interaction:

- opens safety/urgent surface;
- CTAs depend on context;
- never routes into commerce.

Microcopy:

- `Safety alert`
- `Get help`
- `Report problem`

Compliance:

- safety-critical review;
- no gamification;
- no false urgency;
- exact location only where intentionally shared for emergency support.

## Layer mapping

| Beacon type | Globe layer | Priority | Cluster behaviour |
|---|---|---:|---|
| event | Events | 5 | cluster by venue/city |
| ticket | Events | 5 | cluster with event |
| chill | Nearby/Care | 4 | cluster softly, expires fast |
| preloved_drop | Market | 8 | cluster under market |
| hnh_mess | Market/Care | 6 | keep visible but secondary |
| radio | Radio | 6 | can stay global |
| care | Care | 3 | split from commercial clusters |
| na_aa | Care | 3 | anonymity-safe, do not show counts |
| sober_support | Care | 3 | anonymity-safe |
| venue_vibe | Venues | 5 | cluster by neighbourhood |
| meetup | Nearby | 7 | permission/consent-gated |
| afterparty | Events | 5 | 18+ mandatory |
| creator_drop | Market/Community | 8 | cluster under market/community |
| record_release | Radio/Records | 6 | can link to radio arc |
| urgent_safety | Safety | 1 | never hide inside normal cluster |

## Creation flow requirements

BeaconDropModal must not be one generic form forever. It needs type-aware fields.

### Step 1: Choose beacon type

Options:

- Event
- Ticket
- Chill
- Preloved Drop
- HNH MESS / Kit
- Radio
- Care
- NA/AA or Sober Support
- Venue Vibe
- Meetup
- Afterparty
- Creator Drop
- Record Release

### Step 2: Type-specific fields

| Type | Required fields |
|---|---|
| Event | title, venue/city, start, end, age gate, description |
| Ticket | event link, price/free, allocation, QR/vault setting |
| Chill | intent, expiry, approximate area, consent note |
| Preloved Drop | item title, price, condition, pickup area, image |
| HNH MESS | product/campaign, shop link, disclosure |
| Radio | show, start/end, listen link |
| Care | care route, source, privacy setting |
| NA/AA | meeting/source, time, area, anonymity label |
| Venue Vibe | venue, vibe, freshness window |
| Meetup | intent, expiry, visibility, consent boundaries |
| Afterparty | host/venue, age gate, privacy level, consent cue |
| Creator Drop | creator, drop URL, disclosure, expiry |
| Record Release | artist, release, audio/link, rights/source |

### Step 3: Review + safety copy

Every user-created beacon needs:

- expiry;
- visibility;
- reportability;
- source/provenance;
- consent cue where social/nightlife;
- 18+ where adult/nightlife/sexual wellness.

## Filters and labels

User-facing filter names:

- Events
- Tickets
- Chill
- Venues
- Nearby
- Radio
- Care
- Sober Support
- Market
- Records

Avoid exposing sensitive labels loudly on the Globe surface. For example:

- marker label: `Sober route`
- card detail: `NA / AA support nearby`

## Acceptance criteria

- Event, Ticket, Chill, Preloved Drop, HNH MESS, Radio, Care, NA/AA, Venue Vibe, Meetup, Afterparty, Creator Drop, Record Release, and Urgent Safety all have defined visuals.
- NA/AA and sober support are anonymity-safe.
- Chill is social but not hookup-coded by default.
- Preloved Drop is commerce but visually secondary.
- Ticket is distinct from generic Event.
- Urgent Safety cannot be hidden inside normal clusters.
- Every beacon type has a tap result and route onward.
- Every user-created beacon has expiry, visibility, source, and reporting.
- 18+ and consent cues appear where required.
- Aftercare/care language remains information/services/support, not medical treatment.