# Doctrine 12 — Drop Beacon (& the Four Signal Axes)

**Locked 2026-05-29 — Phil Gizzie.**
**Append 2026-05-29 — Phil Gizzie:** signal-axes section (person / place / event / route) added after the Go Live vs Drop Beacon semantic audit. The original Drop Beacon ruling is unchanged; the append makes explicit that Drop Beacon is one of four signal axes, not the only one.
Status: live as of Slice 1 (UI honesty); schema migration pending in Slice 2.

---

## The locked product rule

> Drop Beacon asks: **"What are you signalling right now?"**
> Drop Beacon does NOT ask: **"What type of place are you?"**

A beacon is a time-bounded human signal — a moment, not a venue.

## The four signal axes — what's anchored

All of HOTMESS's "I'm signalling now" surfaces answer the same emotional question. They differ on **what the signal is anchored to**:

| Axis | Surface | Anchor | The user is saying |
|---|---|---|---|
| **Person** | Go Live | the user themself | "*I am* signalling now, find me." |
| **Place** | Drop Beacon | a location (current GPS, ±200m fuzz, or linked venue) | "*This place* is signalling now." |
| **Event** | Event Creator (Slice 3) | a venue + a time window | "*This gathering* is signalling now." |
| **Route** | (D14, future) | a path between A and B | "*This movement* is signalling now." |

Two iron rules across all four axes:

1. **Person presence and Place beacon are never the same act.** A user choosing Go Live is broadcasting themselves to nearby peers, ephemerally. A user dropping a Beacon is anchoring a moment at a place — persistent for its declared duration, visible on the globe. The UI must signpost which one the user just did.
2. **A signal answers one question — "what now" — on one axis at a time.** Conflating axes is what produced "drop a Gym beacon at the cafe" semantic rot. Each surface is single-axis by design.

This is the ontology D14 (Routing as Continuity) builds on. Route signal is the fourth axis, not a feature bolted onto Beacon.

## Four entities, never conflated

| Entity | Time | Place | Owned by | Lives in |
|---|---|---|---|---|
| **Presence** (Go Live) | now → exitLive() or TTL | current GPS, ±200m fuzz, never persisted on globe | a user | `LiveModeContext` + `useLiveMoment` (peer discovery only — no globe row) |
| **Venue** | always (no expiry) | precise lat/lng, public | catalog/operator | `pulse_places` (or future `venues`) |
| **Beacon** | now → ends_at | current GPS ±200m fuzz, or linked to venue | a user | `beacons` |
| **Event** | event_start_at → event_end_at | venue_id required (or explicit pin) | operator or user-host | `beacons` with event fields (Slice 3: separate `events`) |

Each entity has its own creation surface. **Go Live creates Presence. Drop Beacon ONLY creates Beacons.** A user closing the app exits Presence. A user closing the app does not retract a Beacon — that's the structural difference.

## Why this matters

Venue categories (Gym / Sauna / Cafe / Clinic / Club / Leather / Market-as-place) inside the beacon picker created semantic nonsense — "drop a Gym beacon at the cafe" is not a sentence anyone should be able to construct. The picker was conflating three different entities into a single flow.

Worse, it leaked downstream:
- Curated district beacons (Soho · Warming) needed a `metadata.curated = true` hack because there was no schema seat for "operator-placed editorial."
- The Aftercare beacon got mis-routed through the venue read-pipeline because `aftercare` was both a venue-category and a signal-intent.
- The kind-router in #662 had to use structural heuristics instead of reading a first-class intent.
- The Pulse Doctrine (D11 — probability + momentum, not occupancy) couldn't be enforced at the data layer because beacons didn't carry intent semantics.

## The intent set (locked)

| Intent | UI label | Subtitle |
|---|---|---|
| `looking` | Looking | Open to connect |
| `hosting` | Hosting | Party or play at my place |
| `arriving` | Arriving | Just landed somewhere |
| `cruising` | Cruising | Active signal, eyes up |
| `aftercare` | Aftercare offered | Land here if you need it |
| `quiet_hold` | Quiet hold | Low-key, around if needed |
| `market` | Selling / swap | I have something to move |

`radio` / `music_moment` are reserved for operator/HOTMESS broadcast surfaces and may appear as user-facing options later; for now they are operator-only.

## Removed from user picker (forbidden)

The following are venues or scene-categories, not beacon intents. They will not appear in the Drop Beacon flow:

- Gym
- Club
- Sauna
- Leather
- Cafe
- Clinic
- Market as place type (a market stall as a venue — distinct from "Selling / swap" which is the user-intent equivalent)

These remain as data values on the `beacons.beacon_category` column for back-compat with seeded venue rows, but the user creation flow does not surface them.

## Schema (Slice 1, current — back-compat shim)

The UI is honest now. The schema is not yet split. Until Slice 2 lands:

- `metadata.intent` is the first-class semantic. Set on every new user drop.
- `beacons.type` is shimmed to a legacy CHECK-accepted value per intent.
- `beacons.beacon_category` is shimmed to a legacy CHECK-accepted value per intent.

Mapping table (Slice 1 shim):

| Intent | legacy `type` | legacy `beacon_category` |
|---|---|---|
| `looking` | `user` | `user` |
| `hosting` | `event` | `event` |
| `arriving` | `social` | `user` |
| `cruising` | `social` | `cruising` |
| `aftercare` | `safety` | `aftercare` |
| `quiet_hold` | `social` | `user` |
| `market` | `market` | `market` |

The `detectBeaconKind()` function in `L2BeaconSheet.jsx` reads `metadata.intent` first and only falls back to the legacy columns when intent is absent.

## Schema (Slice 2, mandatory follow-up — schema migration)

Add first-class columns:
- `entity_kind text NOT NULL` — CHECK in (`venue`, `beacon`, `event`). Default `beacon`.
- `intent text` — CHECK in the locked intent set above. NULL for venues and events.

Migrate:
- Backfill `entity_kind = 'beacon'` for existing rows where `metadata.curated IS NOT TRUE`.
- Backfill `entity_kind = 'venue'` for rows in `pulse_places` (or matching legacy seed pattern).
- Backfill `entity_kind = 'event'` for rows with `event_start_at IS NOT NULL`.
- Backfill `intent` from `metadata.intent` where present, otherwise infer from the legacy shim mapping above.
- Tighten CHECK constraints on `type` and `beacon_category` to deprecate the venue-category sprawl.

Update `detectBeaconKind()` to read first-class columns; deprecate the metadata-only path.

## Schema (Slice 3 — Event Creator, gated on Slice 2)

A separate `L2EventCreatorSheet` with required fields:
- `entity_kind = 'event'` (auto-set)
- `event_start_at` (required)
- `event_end_at` (required)
- `venue_id` (required, foreign key — drops via "I host at home" link to user's saved private venue, scoped behind a privacy flag)
- `title`, `description`
- Visibility (public / connections / private)

Do not touch Event Creator until the Beacon Picker stops lying. (Slice 1 must ship and settle before Slice 3 begins.)

## Schema (Slice 4 — Venue Catalog, gated on Slice 2)

Move venue-category rows into a managed catalog with admin moderation. Users can suggest venues but do not "drop" them. The Beacon Drop flow may then offer `intent_arriving` with an optional `at: venue_id` field, snapping the beacon's lat/lng to the venue pin (still with ≤200m privacy fuzz on the rendered position).

## Acceptance test (hard)

A user should no longer be able to create:
- "Gym beacon at cafe"
- "Sauna beacon at the club"
- "Cafe beacon in Soho" (where "Cafe" is the user's beacon type, not a venue tag)

They should create:
- "I'm arriving" — at current GPS or attached to a venue
- "I'm looking" — at current GPS
- "I'm hosting" — at current GPS or a venue
- "Aftercare offered" — at current GPS
- "Quiet hold" — at current GPS
- "Selling / swap" — at current GPS or attached to a venue

## What Slice 1 does NOT do

- Does not migrate the schema. Slice 2 will.
- Does not touch the Event Creator. Slice 3 will, only after Slice 2 lands.
- Does not move venues into a managed catalog. Slice 4 will, after Slice 2.
- Does not retire any DB CHECK values. Existing seeded venue beacons keep working.

## Surface signposting (Person vs Place — required copy)

The Go Live and Drop Beacon flows must surface their distinction in copy. Without this, the user cannot tell which act they performed and the empty-state cold-start kills both features.

**Go Live confirmation (replaces today's silent "You're live · No one in your moment right now"):**
- If there are nearby live users: keep current LIVE NOW overlay; no copy change.
- **If the user is the first live in their district tonight** (the cold-start state):
  > "You're the first live in [district name] tonight. We'll ping you when someone else goes live near you."
  - Cold-start is no longer "feature is broken." It's "you arrived early."
- **Footer on the Go Live sheet (always present):**
  > "Want to mark the *place* instead? Drop a beacon."
  - Cross-link to Drop Beacon. Makes the person/place distinction explicit at the moment of choice.

**Drop Beacon sheet (mirror):**
- **Footer on the Drop Beacon sheet (always present):**
  > "Want people to find *you* instead? Go Live."
  - Cross-link to Go Live.

**Profile / Visibility widget (single source of truth — Slice 2 follow-up):**
- A single component shows: Beacons dropped (count + list) / Live now (yes/no + TTL) / Both / Neither.
- Replaces today's scattered visibility surfaces. Implements the visibility-state architecture (task #222).

The user must always be able to answer two questions at a glance:
1. *Am I broadcasting myself right now?* (Presence axis — Go Live)
2. *Have I anchored any signals at places?* (Place axis — Beacons)

If either answer is ambiguous, the UX has failed Doctrine 12.

## Cross-references

- `docs/doctrine/11-arrival-state-doctrine.md` — Pulse Doctrine (probability + momentum, not occupancy); the intent system gives the data layer the semantics needed to enforce anticipatory language and operator vs user differentiation honestly.
- `docs/doctrine/13-spatial-continuity-doctrine.md` — Spatial Continuity / four primitives; D12's signal axes plug into the preview→commit→route→movement primitives.
- `docs/doctrine/14-routing-continuity-doctrine.md` — Routing as Continuity (forthcoming); the fourth signal axis (Route). D14 must not be written until D12's four-axis ontology is locked.
- `docs/doctrine/07-visual-hierarchy.md` — monetisation never overrides relational truth; intent-based beacons keep the user-vs-curated distinction structurally enforceable.
- Sacred Invariant #6 — system never pretends activity. An intent picker that lets a user "drop a Gym" is structural pretence. The Go Live cold-start empty state was a softer version of the same sin (silent "no-one in your moment" reads as "feature is dead"); the "You're the first live tonight" copy converts it into honest anticipation.
- Sacred Invariant #7 — no exact tracking, ≤200m fuzz. Presence and Beacon both observe this; Route signal (D14) inherits it.

— end doctrine —
