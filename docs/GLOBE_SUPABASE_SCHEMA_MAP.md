# Globe Supabase Schema Map

> **⚠️ RESTATE / CANONICAL SCHEMA:** This is a build contract, not a live dump. The live schema (Supabase `rfoftonnlwudilafhfkl`) is the source of truth — change it via migrations. Where this doc and the live schema disagree, the live schema wins.

Purpose: map every Supabase table, view, RPC, storage bucket, and edge-function concern that can affect the HOTMESS Globe.

This is a build contract, not a live database dump.

The map is grounded in repo documentation and code references from:

- `HANDOVER.md`
- `.claude/skills/supabase-ops/SKILL.md`
- `docs/DISCOVERY_INDEX.json`
- `src/pages/Globe.jsx`
- `src/components/globe/EnhancedGlobe3D.jsx`
- `src/contexts/GlobeContext.jsx`

Before applying migrations or writing production data, verify the live Supabase project and schema from the dashboard or Supabase CLI.

---

# Project IDs and environment warning

There is a documented project-ID contradiction.

| Source | Production | Dev/Staging | Edge/backend |
|---|---|---|---|
| `HANDOVER.md` | `rfoftonnlwudilafhfkl` | `klsywpvncqqglhnhrjbh` | `axxwdjmbwkvqhcpwters` |
| `.claude/skills/supabase-ops/SKILL.md` | `axxwdjmbwkvqhcpwters` | `klsywpvncqqglhnhrjbh` | not separated |
| `DISCOVERY_INDEX.json` | not explicit | `klsywpvncqqglhnhrjbh` frontend | `axxwdjmbwkvqhcpwters` backend |

## Rule

Do not run migrations or production writes until the active project is verified from env vars/dashboard.

Required verification:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- server-side `SUPABASE_SERVICE_ROLE_KEY`
- deployed Supabase project URL
- edge function host project

---

# Data classification

Every Globe-related data source must be assigned one of these classifications.

| Class | Meaning | Public Globe allowed? | Exact lat/lng allowed? |
|---|---|---|---|
| `public_signal` | public event/venue/radio/market/care signal | yes | only if venue/public-place safe |
| `aggregate_signal` | counts/heat/density | yes | no raw user GPS |
| `profile_safe` | profile surfaced through existing social rules | conditional | no public exact GPS |
| `private_user` | private profile/contact/user data | no | no |
| `private_safety` | Help Beacon/SOS/trusted-contact safety data | no public | self + chosen trusted contacts only |
| `admin_only` | moderation/audit/admin operations | no | only audited/admin where legally reviewed |
| `server_only` | service-role/secret operations | no client | server only |

---

# Public Globe sources

These can feed public Globe rendering if filtered by privacy/render policy.

## `cities`

Purpose:

- city labels;
- city heat anchors;
- space/region/city navigation.

Known fields:

- `name`
- `lat`
- `lng`
- `country`

Classification:

- `public_signal`

Read path:

- client read allowed if table policy permits;
- otherwise adapter/API should provide safe list.

Write path:

- admin/seed only.

Globe use:

- Z0 space labels;
- Z1 region grouping;
- Z2 city drawer;
- city heat aggregation.

Privacy risk:

- low.

Implementation note:

- do not hardcode `CITY_COORDS` long-term if `cities` table is authoritative.

---

## `venues`

Purpose:

- venue directory;
- venue signals;
- place pins;
- venue vibe/intensity grouping.

Known fields:

- `name`
- `lat`
- `lng`
- `type`

Classification:

- `public_signal`

Read path:

- public/authenticated read depending on existing RLS.

Write path:

- admin/verified venue/vendor only.

Globe use:

- Venue pins;
- VenueSignalCard;
- city/district grouping;
- local Mapbox detail.

Privacy risk:

- low if venue is public.

Rules:

- venue location can be exact if it is a public venue;
- do not attach private user identity to venue heat.

---

## `events`

Purpose:

- canonical write source for beacons/events;
- event/ticket/afterparty/creator signals;
- source behind `beacons` view.

Known fields:

- `owner_id`
- `title`
- `starts_at`
- `ends_at`
- `latitude`
- `longitude`
- `metadata`

Classification:

- `public_signal`, with user-owned/moderated write controls.

Read path:

- public/authenticated read for approved public events.

Write path:

- create/update by owner;
- admin/moderator controls;
- never write to `beacons` view.

Globe use:

- Event Beacon;
- Ticket Beacon;
- Afterparty Beacon;
- Creator Drop if stored as event-like public signal;
- beacon sheet.

Privacy risk:

- medium.

Rules:

- user-created events need moderation status/source/provenance;
- private address must not be public unless explicitly safe;
- adult/nightlife events require 18+ and consent cues.

---

## `shows`

Purpose:

- HOTMESS RADIO schedule;
- Now/Next if live metadata is unavailable.

Known fields:

- `title`
- `host`
- `day_of_week`
- `start_time`
- `end_time`

Classification:

- `public_signal`

Read path:

- public/authenticated read.

Write path:

- admin/radio team only.

Globe use:

- Radio Pulse;
- city/global radio card;
- sponsor/read flows.

Privacy risk:

- low.

Rules:

- do not invent fake live DJ metadata;
- sponsor disclosure where commercial.

---

## `products`

Purpose:

- Shopify-synced products;
- market/HNH MESS/product context.

Known fields:

- `handle`
- `title`
- `price`
- `images`

Classification:

- `public_signal` / commerce.

Read path:

- product public read where suitable.

Write path:

- server/admin sync only.

Globe use:

- HNH MESS Beacon;
- Market Tag;
- LocationShopPanel.

Privacy risk:

- low.

Rules:

- commerce is visually secondary;
- sponsored/affiliate disclosures required where relevant.

---

## `preloved_listings`

Purpose:

- user-to-user marketplace;
- Preloved Drop beacons.

Known fields:

- `seller_id`
- `title`
- `price`
- `images[]`
- `status`

Classification:

- `public_signal` for approved listing data;
- private user data for seller contact/location.

Read path:

- public/authenticated approved listings.

Write path:

- owner creates/updates own listings;
- moderation can hide/remove.

Globe use:

- Preloved Drop;
- Market cluster;
- Local stack/card.

Privacy risk:

- medium.

Rules:

- pickup area/venue only;
- never expose home address;
- message seller through product-safe flow.

---

## `label_artists`, `label_releases`, `tracks`

Purpose:

- RAW CONVICT / music layer;
- Record Release beacons;
- Radio crossover.

Known fields:

- artists: `name`, `bio`, `image_url`
- releases: `title`, `artist_id`, `cover_url`, `release_date`
- tracks: `title`, `artist_id`, `release_id`, `audio_url`, `duration`

Classification:

- `public_signal`

Read path:

- public/authenticated read.

Write path:

- admin/label only.

Globe use:

- Record Release Beacon;
- radio arcs;
- release card.

Privacy risk:

- low.

Rules:

- rights/source metadata required;
- no fake availability.

---

# Aggregate / live signal sources

These can feed the public Globe only through aggregation, fuzzing, or safe view outputs.

## `right_now_status`

Purpose:

- live user intent/status;
- venue/city heat;
- right-now signal.

Known fields:

- `user_id`
- `status_type`
- `venue_id`
- `expires_at`

Classification:

- `aggregate_signal`; may contain private user intent.

Read path:

- public Globe must use aggregate/venue/city-safe queries only.

Write path:

- user writes own status;
- never write to `profiles.right_now_status`.

Globe use:

- Venue intensity;
- city heat;
- signal freshness.

Privacy risk:

- high if linked directly to identity/location.

Rules:

- no direct public user-status list;
- filter by `expires_at`, not nonexistent `active` column;
- show aggregate wording such as `signals rising`, not exact personal state.

---

## `user_presence`

Purpose:

- heartbeat;
- online state;
- approximate presence;
- location input for proximity features.

Known fields:

- `user_id`
- `last_seen`
- `is_online`
- `last_lat`
- `last_lng`

Classification:

- `private_user` raw;
- `aggregate_signal` after policy processing.

Read path:

- never raw public client read for Globe;
- use secure API/view/adapter that fuzzes/aggregates.

Write path:

- user writes own heartbeat through app hooks.

Globe use:

- city heat;
- nearby density;
- proximity candidate flow;
- never exact public people dots.

Privacy risk:

- very high.

Rules:

- exact lat/lng not public;
- no trails;
- no home inference;
- person reveal only through existing secure social/proximity flow.

---

## `location_shares`

Purpose:

- live location sharing;
- safety/location flows.

Known fields:

- `user_id`
- `current_lat`
- `current_lng`
- `active`
- `end_time`

Classification:

- `private_user` or `private_safety` depending context.

Read path:

- recipient-scoped only;
- never public Globe raw read.

Write path:

- user-controlled;
- safety/contact sharing only.

Globe use:

- not public by default;
- possible aggregate care/safety signal only with threshold-safe policy.

Privacy risk:

- critical.

Rules:

- exact location only self/chosen recipients;
- cancellation revokes access;
- do not use as public beacon feed.

---

## `venue_vibe_mix`

Purpose:

- venue vibe aggregation.

Known fields from code query:

- `place_slug`
- `vibe`
- `count`

Classification:

- `aggregate_signal`

Read path:

- public/authenticated aggregate read if RLS permits.

Write path:

- source tables only; likely view/aggregate.

Globe use:

- VenueSignalCard;
- Venue Vibe Beacon;
- local stack.

Privacy risk:

- medium if counts are small.

Rules:

- avoid exposing very low counts if inference risk;
- use labels like `vibe rising` when count is below threshold.

---

# Views

## `beacons`

Purpose:

- read-only beacon view over `events` and `metadata`.

Classification:

- `public_signal` view.

Read path:

- public/authenticated read for approved public beacons.

Write path:

- NEVER write directly;
- write to `events` or underlying canonical table.

Globe use:

- event/beacon rendering;
- realtime public beacons where safe.

Privacy risk:

- medium.

Known gotcha:

- `beacons` is a PostgreSQL VIEW, not a table.
- `ALTER TABLE beacons` will fail.
- `INSERT INTO beacons` will fail.
- metadata fields may live in `events.metadata` / underlying `beacon_data` depending current schema.

Rules:

- do not add columns to view blindly;
- inspect view definition before migrations.

---

## `pulse_signals`

Purpose:

- aggregate Pulse signal layer.

Classification:

- `aggregate_signal`

Read path:

- preferred public Globe feed if verified.

Write path:

- likely view/derived; inspect before modifying.

Globe use:

- city heat;
- signal intensity;
- public rendering.

Privacy risk:

- depends on source aggregation.

Rules:

- verify aggregation threshold;
- ensure no raw user location leaks through view.

---

## `place_intensity`

Purpose:

- venue/check-in/place heat.

Classification:

- `aggregate_signal`

Read path:

- public/authenticated aggregate read where safe.

Write path:

- derived; inspect before modifying.

Globe use:

- venue heat;
- city/district density;
- local stacks.

Privacy risk:

- medium.

Rules:

- low-count suppression where needed;
- no identity exposure.

---

## `public_movement_presence`

Purpose:

- public movement data for Ghosted Live tab.

Classification:

- `aggregate_signal` or `profile_safe` depending view definition.

Read path:

- must be audited before Globe use.

Write path:

- derived from `movement_sessions`.

Globe use:

- only if aggregate/safe;
- never exact public trails.

Privacy risk:

- high.

Rules:

- inspect view definition;
- do not show exact paths on public Globe;
- use city/area-level movement heat.

---

# Profile / social tables

## `profiles`

Purpose:

- user profile identity;
- Ghosted/social discovery;
- profile sheets.

Known fields and gotchas:

- `id`
- `email`
- `display_name`
- `avatar_url`
- `age`
- `bio`
- `city`
- `is_verified`
- `looking_for`
- `is_online`
- no `photos` column;
- no `last_lat` / `last_lng` columns.

Classification:

- `profile_safe` when surfaced through secure profile/proximity rules;
- `private_user` for sensitive fields.

Read path:

- use secure profile/API/RLS paths;
- public Globe must not use profile as GPS source.

Write path:

- user owns own profile;
- admin moderation where needed.

Globe use:

- profile sheet after allowed person signal tap;
- not raw public map identity.

Privacy risk:

- high if combined with location.

Rules:

- no exact location;
- no public person names on Globe surface;
- open profile through existing `openProfile()`/secure rules.

---

## `profile_photos`

Purpose:

- user photos separate from profiles.

Known fields:

- `user_id`
- `url`
- `position`
- `moderation_status`

Classification:

- `profile_safe` / `private_user` depending moderation and profile visibility.

Read path:

- profile display only through approved/profile-safe flow.

Write path:

- user upload;
- moderation status applies.

Globe use:

- profile card/sheet only;
- not public map marker by default.

Privacy risk:

- medium/high.

Rules:

- do not show photo on public Globe pin;
- respect moderation status.

---

## `taps`

Purpose:

- Boo interactions;
- mutual match loop.

Known fields:

- `tapper_email`
- `tapped_email`
- `from_user_id`
- `to_user_id`
- `tap_type`

Classification:

- `private_user`

Read path:

- own sent/received only.

Write path:

- authenticated user inserts own tap.

Globe use:

- no direct public Globe use;
- possible matched-visible flow only.

Privacy risk:

- high.

Rules:

- never use taps for public heat;
- do not expose who tapped whom.

---

## `conversations`, `conversation_members`, `messages`

Purpose:

- chat.

Known fields:

- `conversations.id`
- `conversation_members.conversation_id`
- `conversation_members.user_id`
- `messages.conversation_id`
- `messages.sender_id`
- `messages.content`
- `messages.message_type`
- `messages.metadata`

Classification:

- `private_user`

Read path:

- conversation members only.

Write path:

- participants only.

Globe use:

- no public rendering;
- used only after profile/meetup flow opens chat.

Privacy risk:

- critical.

Rules:

- no message content in Globe analytics;
- no chat-derived public heat.

---

## `blocks`

Purpose:

- user blocking.

Known fields:

- `blocker_id`
- `blocked_id`

Classification:

- `private_user`

Read/write path:

- own only.

Globe use:

- filter out blocked profiles/signals.

Privacy risk:

- high.

Rules:

- render policy must respect blocks;
- blocked user should not appear in nearby/profile flows.

---

## `personas`

Purpose:

- multi-persona profiles.

Known fields:

- `user_id`
- `type`
- profile data.

Classification:

- `profile_safe` or `private_user` depending active persona/profile rules.

Globe use:

- only through profile/social surfaces;
- not direct map identity without rules.

Rules:

- do not switch persona from Globe unless explicitly scoped;
- use `switch_persona()` RPC only through persona UI.

---

# Safety and trusted contact tables

## `trusted_contacts`

Purpose:

- emergency/safety contact recipients.

Known fields:

- `user_id`
- `contact_name`
- `contact_phone`
- `relationship`

Classification:

- `private_safety`

Read path:

- user reads own trusted contacts only.

Write path:

- user creates/updates/deletes own contacts.

Globe use:

- Help/SOS recipient selection only;
- never public rendering.

Privacy risk:

- critical.

Rules:

- no public access;
- no vendor/admin casual access;
- no lock-screen leakage of sensitive context.

---

## Proposed: `safety_activations`

Purpose:

- Help Beacon/SOS activation state.

Classification:

- `private_safety`

Required fields:

- `id`
- `user_id`
- `type`
- `status`
- `visibility`
- `precision`
- `created_at`
- `expires_at`
- `cancelled_at`

Read path:

- self;
- explicitly shared recipients only.

Write path:

- user creates/cancels own;
- server delivery updates.

Globe use:

- no public exact rendering;
- aggregate only if threshold-safe.

RLS requirement:

- public reads nothing;
- recipient access via `safety_recipients` only.

---

## Proposed: `safety_location_snapshots`

Purpose:

- exact live/snapshot locations for active Help/SOS shares.

Classification:

- `private_safety`

Required fields:

- `activation_id`
- `user_id`
- `lat`
- `lng`
- `accuracy`
- `created_at`

Read path:

- self;
- selected trusted contacts only;
- active share window only.

Write path:

- user/app inserts own during active activation.

Globe use:

- never public.

RLS requirement:

- strict recipient-scoped reads;
- no anon/authenticated public reads.

---

## Proposed: `safety_recipients`

Purpose:

- maps activations to selected trusted contacts/recipients.

Classification:

- `private_safety`

Required fields:

- `activation_id`
- `recipient_id`
- `recipient_type`
- `precision_granted`
- `access_expires_at`

Globe use:

- none public.

Rules:

- cancellation revokes access;
- precision can differ per recipient.

---

## Proposed: `safety_delivery_logs`

Purpose:

- alert delivery audit.

Classification:

- `private_safety` / `admin_only`

Required fields:

- `activation_id`
- `recipient_id`
- `channel`
- `status`
- `created_at`
- `delivered_at`

Rules:

- do not store raw message content unnecessarily;
- do not expose internal logs to public/client except safe delivery status.

---

# Commerce / creator / vendor tables to verify

These are relevant to monetised Globe but need live schema verification before build.

## Existing or documented DB-only/no-UI tables

From discovery docs:

- `creator_subscriptions`
- `community_posts`
- `achievements`
- `user_checkins`
- `venue_kings`
- `squads`
- `squad_members`
- `sweat_coins`
- `collaboration_requests`
- `user_highlights`

Potential Globe relevance:

| Table | Potential Globe use | Risk |
|---|---|---|
| `creator_subscriptions` | creator drops / monetised visibility | payment/privacy |
| `community_posts` | community beacon source | moderation |
| `user_checkins` | venue heat | privacy |
| `venue_kings` | venue status/gamification | brand rule: no XP UI |
| `squads`, `squad_members` | group visibility | privacy/consent |
| `collaboration_requests` | creator/vendor flows | private workflow |
| `user_highlights` | profile/social signal | privacy/moderation |

Rule:

- do not wire these into public Globe until schema, RLS, and privacy posture are audited.

---

# RPCs

## `list_profiles_secure()`

Purpose:

- ghost-filtered profile list.

Classification:

- `profile_safe`

Globe use:

- nearby/profile discovery only through secure rules.

Rules:

- preferred over raw profile queries where relevant;
- never return raw GPS for public Globe.

---

## `get_server_time()`

Purpose:

- server timestamp.

Classification:

- safe utility.

Globe use:

- expiry/cooling/trending calculations;
- beacon lifecycle.

Rules:

- use for authoritative expiry windows if needed.

---

## `switch_persona(persona_id)`

Purpose:

- persona switching.

Classification:

- private user/profile.

Globe use:

- not in Globe unless persona switching is explicitly added.

Rules:

- do not call from marker rendering.

---

## `mark_messages_read(thread_id)`

Purpose:

- chat read status.

Classification:

- private user.

Globe use:

- none.

---

## Known no-UI RPCs from discovery

- `get_amplification_price`
- `calculate_business_heat`

Potential Globe relevance:

| RPC | Possible use | Build rule |
|---|---|---|
| `get_amplification_price` | beacon boost pricing | verify signature before using |
| `calculate_business_heat` | venue/vendor heat | verify output privacy before public rendering |

---

# Storage buckets

Storage bucket names are governed by `src/lib/uploadToStorage.ts` `BUCKET_MAP`.

| Code name | Actual bucket | Globe relevance | Risk |
|---|---|---|---|
| `avatar` | `avatars` | profile cards only | do not show unmoderated photos on public Globe |
| `audio` | `records-audio` | radio/records/release cards | rights/source metadata |
| `event-images` | `records-covers` | event/beacon cards | may be odd mapping; verify |
| `chat-attachments` | `chat-uploads` | private chat only | never public Globe |
| `uploads` | `uploads` / fallback noted elsewhere | unknown/general | bucket may not exist |

Rules:

- public Globe markers should not depend on heavy images;
- images appear in cards/sheets after selection;
- respect moderation status;
- do not expose private chat attachments.

---

# Edge functions

Known functions:

- `cancel-subscription`
- `create-checkout-session`
- `notify-push`
- `push-processor`
- `send-email`
- `send-push`
- `stripe-webhook`

Globe relevance:

| Function | Relevance | Rule |
|---|---|---|
| `notify-push` | SOS/help/trusted contact delivery | privacy-safe message content |
| `send-push` | push alerts | no sensitive lock-screen leakage |
| `push-processor` | batch delivery | no public safety leakage |
| `send-email` | transactional email | needs brand/care copy review |
| `create-checkout-session` | boosts/vendor/market | no emergency monetisation |
| `cancel-subscription` | vendor/creator plans | no Globe safety impact |
| `stripe-webhook` | boost/subscription fulfilment | server-only validation |

Rules:

- service-role key only server-side;
- verify JWT for user-scoped actions;
- no secrets in client.

---

# Realtime subscriptions

Known caution:

- there are already multiple `onAuthStateChange` listeners;
- avoid adding more without audit.

Current Globe-relevant realtime:

- `useRealtimeBeacons()`
- `useRightNowCount()`
- `useRealtimeLocations()`
- `useRealtimeRoutes()`
- `GlobeContext` subscribes to beacon inserts.

Risks:

- duplicate subscriptions;
- dev hot-reload multiplication;
- public location leakage;
- subscribing to a view/table with unsafe payload.

Rules:

- every subscription must clean up;
- every payload must pass privacy/render policy before display;
- no public subscription to safety exact locations;
- no additional auth listener for Globe.

---

# Public render permission matrix

| Data source | Public space view | City view | Local view | Detail card | Exact lat/lng public? |
|---|---|---|---|---|---|
| `cities` | yes | yes | yes | yes | n/a |
| `venues` | aggregate | yes | yes | yes | venue/public only |
| `events` | aggregate/major | yes | yes | yes | public event venue only |
| `beacons` view | aggregate/major | yes | yes | yes | only if source safe |
| `pulse_signals` | yes | yes | yes | summary | no raw user GPS |
| `place_intensity` | heat | heat | stack | card | no |
| `right_now_status` | aggregate | aggregate | aggregate | limited | no |
| `user_presence` | aggregate only | aggregate only | approximate only | profile flow only | no |
| `location_shares` | no | no | no public | trusted recipients only | no public |
| `trusted_contacts` | no | no | no | self only | no |
| `safety_*` | no | threshold aggregate only | no public exact | trusted recipients | no public |
| `profiles` | no names | limited profile flow | profile flow | yes if allowed | no |
| `preloved_listings` | aggregate | cluster | area/venue | listing | no home address |
| `shows` | yes | yes | yes | yes | n/a |
| `tracks/releases` | yes | yes | yes | yes | n/a |

---

# RLS checklist for Globe work

Every new or touched table must answer:

1. Who can SELECT?
2. Who can INSERT?
3. Who can UPDATE?
4. Who can DELETE?
5. Is the row user-owned?
6. Does it reference `profiles(id)`, not `auth.users(id)`?
7. Does INSERT use `WITH CHECK (auth.uid() = user_id)` where owner-owned?
8. Does UPDATE include both `USING` and `WITH CHECK`?
9. Does any write policy incorrectly use `USING (true)`?
10. Does public read expose raw lat/lng or sensitive profile state?
11. Does any policy expose trusted contacts or safety activations?
12. Does anon access need to exist? If yes, why?

---

# Migration rules

Use Supabase ops conventions:

- place files in `supabase/migrations/`;
- name with `YYYYMMDD00000N_descriptive_name.sql`;
- include a comment block explaining why;
- user FKs reference `public.profiles(id)`;
- always enable RLS;
- always index FKs;
- never use service-role logic in client.

---

# Open verification tasks

Before implementation Phase 1, verify live schema for:

- `beacons` view definition;
- `pulse_signals` view definition;
- `place_intensity` view definition;
- `public_movement_presence` view definition;
- `right_now_status` columns and policies;
- `user_presence` policies and coordinate precision;
- `location_shares` policies;
- `trusted_contacts` policies;
- whether `safety_*` tables already exist;
- `venue_vibe_mix` view/source;
- `get_amplification_price` signature;
- `calculate_business_heat` signature;
- storage bucket existence;
- production project ID.

---

# Acceptance criteria

- Every Globe data source has a privacy classification.
- Every public render source has safe read rules.
- Every exact-location source is private or aggregate-only.
- Help/SOS exact lat/lng is excluded from public Globe rendering.
- `beacons` remains read-only.
- `right_now_status` remains table-backed.
- Raw `user_presence` is not exposed as public pins.
- Preloved and market flows never expose home addresses.
- NA/AA and sober support remain anonymity-safe.
- Boost/economy work uses server-verified RPCs or audited tables.
- Claude/devs know what must be verified live before migrations.