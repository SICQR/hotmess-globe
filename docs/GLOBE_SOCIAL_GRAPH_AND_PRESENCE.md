# Globe Social Graph & Presence

Purpose: define how people, profiles, mutual interest, proximity, presence, visibility, social permissions, blocks, trusted contacts, and aggregate activity feed the HOTMESS Globe.

This document governs people-as-signal.

The Globe should feel socially alive without becoming a public GPS wall.

People can be visible.

But visibility must be:

- intentional;
- approximate by default;
- relationship-aware;
- reversible;
- consent-led;
- density-managed;
- safety-protected.

---

# Core philosophy

The Globe should support:

```txt
presence without exposure
```

People should be able to say:

```txt
I am around
```

without accidentally saying:

```txt
here is my exact live coordinate
```

---

# Social graph goals

The system should enable:

- nearby social discovery;
- mutual interest;
- trusted visibility;
- city/district energy;
- venue context;
- care-aware support;
- safer meetups.

Without enabling:

- stalking;
- triangulation;
- unwanted surveillance;
- public identity exposure;
- social graph scraping.

---

# Social visibility model

## Visibility states

```ts
export type PresenceVisibility =
  | 'invisible'
  | 'city_visible'
  | 'district_visible'
  | 'venue_visible'
  | 'nearby_visible'
  | 'matched_visible'
  | 'trusted_visible'
  | 'safety_visible';
```

---

# Default recommendation

Default public presence should be:

```txt
invisible or approximate
```

Never:

```txt
public exact GPS
```

---

# Visibility levels

## Invisible

User contributes nothing to public people layers.

May still use app normally.

---

## City-visible

User contributes only to:

- city heat;
- broad presence energy;
- aggregate city counts if threshold-safe.

No profile dot.

---

## District-visible

User contributes to:

- district energy;
- area-level density;
- approximate social signal.

No exact location.

---

## Venue-visible

User has chosen a public venue association.

Can show:

- venue-level presence;
- profile-safe signal if permitted;
- aggregate venue vibe.

Rules:

- venue must be public;
- user consent required;
- identity exposure optional and scoped.

---

## Nearby-visible

User appears in proximity discovery.

Default:

- approximate area;
- not exact map dot;
- profile card only after allowed interaction.

---

## Matched-visible

User is visible to matched/mutual users.

Can show:

- richer profile card;
- approximate area;
- venue if shared.

Exact location still requires escalation.

---

## Trusted-visible

User shares more precise presence with trusted contacts.

Can include:

- venue;
- route context;
- exact scoped location if explicitly enabled.

---

## Safety-visible

Used for:

- Help Beacon;
- SOS;
- emergency scoped sharing.

Exact location only to authorised safety recipients.

Never public.

---

# Presence precision model

```ts
export type PresencePrecision =
  | 'none'
  | 'city'
  | 'district'
  | 'venue'
  | 'approximate_radius'
  | 'exact_scoped';
```

---

# Relationship scopes

```ts
export type SocialScope =
  | 'public'
  | 'followers'
  | 'mutuals'
  | 'matched'
  | 'trusted_contacts'
  | 'self_only';
```

---

# Public Globe people rendering

Public Globe should show:

- city/district presence heat;
- approximate density;
- venue vibe;
- category-safe aggregates.

Public Globe should NOT show:

- exact person dots;
- trails;
- names floating over map;
- recovery attendance;
- distress state;
- home location.

---

# Person signal rendering

A person signal may render as:

- city heat contribution;
- district haze;
- nearby stack item;
- profile card;
- trusted safety location.

It should NOT render as:

- public exact pin;
- giant avatar marker;
- movement trail.

---

# Profile reveal rules

Profile identity should reveal only when:

- visibility setting allows;
- viewer relationship allows;
- block status allows;
- safety policy allows;
- density policy allows;
- consent stage allows.

---

# Mutual interest model

Mutuality can increase:

- profile visibility;
- chat eligibility;
- meetup flow availability;
- local recommendation relevance.

Mutuality should NOT automatically increase:

- exact location precision;
- route sharing;
- safety visibility.

---

# Proximity discovery

## Good proximity copy

```txt
Nearby signal
```

```txt
Around Soho
```

```txt
At this venue, if shared
```

## Bad proximity copy

```txt
34 metres away
```

```txt
Standing outside this doorway
```

```txt
Exact live location
```

---

# Distance display rules

For public/nearby discovery, prefer:

- `nearby`;
- `around here`;
- `same district`;
- `at venue`;
- `within walking distance`.

Avoid:

- exact metres;
- exact ETA from private location;
- repeated precision updates.

---

# Presence freshness

Presence must expire quickly.

Suggested states:

```ts
export type PresenceFreshness =
  | 'live'
  | 'recent'
  | 'stale'
  | 'expired'
  | 'unknown';
```

---

# Presence expiry guidance

| Presence type | Expiry |
|---|---:|
| city_visible | 30–60m |
| district_visible | 15–45m |
| venue_visible | 15–60m |
| nearby_visible | 5–20m |
| matched_visible | 5–30m |
| trusted_visible | user-controlled |
| safety_visible | until resolved/cancelled |

---

# Presence decay

As presence ages:

```txt
exact_scoped -> approximate_radius -> district -> city -> expired
```

---

# Blocks and social safety

Blocking must immediately remove:

- profile visibility;
- proximity visibility;
- chat eligibility;
- trust sharing;
- route sharing;
- local recommendations.

No exceptions.

---

# Trusted contacts

Trusted contacts are not normal followers.

They can receive:

- emergency scoped location;
- Help Beacon visibility;
- exact location only when explicitly enabled.

They should not receive:

- casual presence by default;
- recovery participation;
- private social graph data beyond scope.

---

# Followers / mutuals / matched users

## Followers

May see:

- profile-safe signals;
- city/district presence if enabled.

## Mutuals

May see:

- more social context;
- meetup eligibility.

## Matched users

May see:

- chat entry;
- profile context;
- approximate meet area.

None of these automatically grants exact location.

---

# Social graph privacy

The app must not expose:

- full friend graphs;
- trusted contact list;
- block list;
- tap history;
- private match graph;
- recovery support graph.

---

# Presence and density

Many visible people in one area should become:

- heat;
- social density;
- stack item;
- filtered list;
- local recommendation.

Never:

- individual exact dot swarm.

---

# Presence and Mapbox local mode

In local mode:

- people still remain approximate by default;
- venue-associated presence may appear if consented;
- exact dots are not public;
- list/profile surfaces handle identity.

---

# Presence and care

Care participation is sensitive.

Care signals should not expose:

- who needs help;
- who attends NA/AA;
- who used sober support;
- exact care-route behaviour.

---

# Presence and marketplace

Marketplace participants should show:

- seller profile only where listing allows;
- pickup zone;
- safe public exchange option.

Never:

- home location;
- seller's live movement.

---

# Presence and events

Event attendance should be:

- opt-in;
- aggregate by default;
- profile-visible only if user chooses.

Avoid:

- public attendee lists for sensitive events;
- exact arrival/departure exposure.

---

# Presence and radio

Radio presence may show:

- listeners active by city;
- show pulse;
- aggregate cultural energy.

Never:

- exact listener location.

---

# Presence source strategy

Potential sources:

- `user_presence`
- `right_now_status`
- `location_shares`
- `profiles`
- `taps`
- `blocks`
- `conversations`
- future `trusted_contacts`
- future safety tables

Rules:

- raw `user_presence` is private;
- `right_now_status` is aggregate-safe only after policy;
- `location_shares` is scoped/private;
- profile data is never location data by itself.

---

# Supabase guidance

Suggested/potential tables:

```txt
user_presence
presence_visibility
presence_sessions
presence_events
presence_aggregates
location_shares
trusted_contacts
blocks
matches
profile_visibility
```

---

# RLS expectations

## Public reads

Only:

- approved aggregates;
- public/venue signals;
- policy-safe profiles.

## Authenticated reads

Scoped by:

- relationship;
- visibility;
- blocks;
- trust;
- active consent.

## Trusted-contact reads

Scoped by:

- explicit share;
- time window;
- precision granted.

---

# Presence event model

```ts
export type PresenceEvent =
  | { type: 'PRESENCE_STARTED'; userId: string; precision: PresencePrecision }
  | { type: 'PRESENCE_UPDATED'; userId: string; precision: PresencePrecision }
  | { type: 'PRESENCE_EXPIRED'; userId: string }
  | { type: 'PRESENCE_WITHDRAWN'; userId: string }
  | { type: 'PRESENCE_ESCALATED'; userId: string; scope: SocialScope }
  | { type: 'PRESENCE_DOWNGRADED'; userId: string; precision: PresencePrecision };
```

Public renderers must never receive raw events containing exact coordinates.

---

# Consent escalation

Presence can escalate only through explicit flow.

Examples:

```txt
Show me around this district for 1 hour
```

```txt
Share venue with mutuals tonight
```

```txt
Share exact location with trusted contact for 30 minutes
```

---

# Reverse flows

Users must be able to:

- go invisible;
- leave venue;
- stop nearby mode;
- downgrade precision;
- revoke trusted sharing;
- block viewer;
- delete presence history where appropriate.

---

# Notification rules

Presence notifications should be restrained.

Allowed:

- trusted contact safety updates;
- mutual nearby opt-in;
- saved event friend activity if consented.

Forbidden:

- outing-risk notifications;
- exact location lockscreen leaks;
- repeated proximity spam.

---

# Accessibility

Presence controls must be:

- clear;
- readable;
- keyboard accessible;
- screenreader compatible;
- low stimulation.

Users must be able to understand active sharing without interacting with the 3D Globe.

---

# Telemetry

Allowed:

- aggregate presence mode usage;
- opt-in rate;
- withdrawal rate;
- safety share completion;
- approximate density engagement.

Forbidden:

- raw movement trails;
- exact sensitive route logs in analytics;
- recovery participation analytics;
- public Help/SOS analytics.

---

# Implementation targets

Create/refactor toward:

```txt
src/lib/social/PresenceVisibilityEngine.ts
src/lib/social/PresencePrecisionPolicy.ts
src/lib/social/SocialScopeEngine.ts
src/lib/social/ProfileRevealPolicy.ts
src/lib/social/ProximityDiscoveryEngine.ts
src/lib/social/PresenceDecayService.ts
src/lib/social/PresenceAggregationService.ts
src/lib/social/BlockPropagationService.ts
src/lib/social/TrustedPresenceService.ts
src/components/social/PresenceControls.tsx
src/components/social/VisibilityPicker.tsx
src/components/social/NearbyModeToggle.tsx
src/components/social/ActiveSharingBanner.tsx
src/components/social/ProfileRevealCard.tsx
```

---

# Testing requirements

## Unit tests

Test:

- visibility modes;
- precision downgrade;
- block propagation;
- profile reveal rules;
- presence expiry;
- proximity copy.

## Integration tests

Test:

- nearby visible but not exact;
- matched user sees richer card but not exact;
- trusted contact exact scope;
- block removes visibility immediately;
- presence expires and downgrades;
- Mapbox receives only approximate presence.

## E2E tests

Test:

- user toggles invisible;
- user enters venue-visible mode;
- user withdraws nearby mode;
- matched user opens profile card;
- trusted contact receives scoped location;
- public Globe never shows exact person dots.

---

# Acceptance criteria

The social graph and presence system succeeds when:

- the Globe feels socially alive without exposing exact GPS;
- users understand and control visibility;
- presence naturally expires;
- blocks propagate instantly;
- mutuality improves social flow without granting exact location;
- trusted contacts remain separate from followers;
- recovery and care participation stay private;
- Mapbox local mode remains privacy-safe;
- public people signals render as aggregate/context, not dot swarms;
- users can always become invisible immediately.