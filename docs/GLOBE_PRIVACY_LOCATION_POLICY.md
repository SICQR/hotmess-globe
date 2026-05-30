# Globe Privacy Location Policy

Purpose: define the privacy architecture, location governance, visibility rules, consent systems, safety boundaries, retention policy, and access controls for the HOTMESS Globe.

This document is a core trust contract.

It governs:

- who can see what;
- when;
- how precisely;
- for how long;
- under what consent conditions.

This policy exists because nightlife products can easily become:

- surveillance systems;
- outing risks;
- harassment amplifiers;
- stalking tools;
- unsafe social graphs.

HOTMESS Globe must never become that.

---

# Core privacy philosophy

The system is designed around:

```txt
presence without exposure
```

The Globe should feel:

- socially alive;
- spatially useful;
- privacy-safe;
- consent-aware;
- reversible.

Users must always understand:

- who can see them;
- how accurately;
- for how long;
- how to stop sharing.

---

# Core privacy principles

## 1. Exact location is exceptional

Default assumption:

```txt
exact user location should NOT be public
```

Most experiences should use:

- approximate area;
- venue association;
- district presence;
- aggregate density.

---

## 2. Visibility is contextual

Visibility depends on:

- beacon type;
- user settings;
- relationship;
- trust level;
- venue type;
- safety mode;
- regional/legal policy.

---

## 3. Consent must be reversible

Users can:

- stop sharing;
- downgrade precision;
- expire visibility;
- revoke trusted access.

Changes should propagate immediately.

---

## 4. Care and safety override growth

The system prioritises:

- user safety;
- consent;
- crisis protection;
- sober/privacy needs.

Over:

- engagement;
- monetisation;
- social visibility.

---

## 5. Sensitive participation is protected

The Globe must never publicly expose:

- NA/AA attendance;
- recovery participation;
- crisis states;
- exact SOS presence;
- exact Help beacon location.

---

# Privacy classification model

Every location-bearing entity must have a privacy class.

## Privacy classes

```ts
export type PrivacyClass =
  | 'public'
  | 'approximate_public'
  | 'venue_public'
  | 'followers_only'
  | 'trusted_only'
  | 'private'
  | 'sensitive'
  | 'emergency_scoped';
```

---

# Location precision model

## Precision tiers

```ts
export type LocationPrecision =
  | 'none'
  | 'country'
  | 'city'
  | 'district'
  | 'venue'
  | 'approximate_radius'
  | 'exact_scoped';
```

---

# Default visibility rules

## User presence

Default:

- hidden;
- approximate;
- venue-associated only;
- or not visible at all.

Never:

```txt
public exact live GPS by default
```

---

## Event beacons

Allowed:

- public venue;
- district;
- exact venue coordinates.

Not allowed:

- exact private residence exposure.

---

## Chill / meetup beacons

Default:

- district-level;
- approximate radius;
- venue-associated if public.

Escalation to exact location requires:

- explicit consent;
- trusted scope;
- contextual confirmation.

---

## Ticket beacons

Allowed:

- venue association;
- district;
- approximate meetup.

Never:

- public home address.

---

## Preloved / market beacons

Default:

- pickup zone;
- district;
- safe public meeting area.

Forbidden:

- automatic exact home location.

---

## Care beacons

Allowed:

- public care routes;
- public support locations;
- venue-safe support.

Not allowed:

- exact attendee identity;
- exact user participation.

---

## Help / SOS beacons

Protected class.

Exact coordinates visible ONLY to:

- authorised trusted contacts;
- authorised moderators/safety staff;
- emergency surfaces.

Never public.

Never aggregated publicly.

Never searchable publicly.

---

# Visibility scopes

## Public

Visible to all users.

Examples:

- public venue events;
- public market drops;
- public nightlife density.

---

## Followers-only

Visible only to:

- accepted/followed relationship graph.

---

## Trusted-only

Visible only to:

- explicitly trusted users.

Used for:

- meetup precision;
- location escalation;
- crisis support.

---

## Private

Visible only to:

- creator;
- internal scoped systems.

---

## Emergency-scoped

Visible only to:

- authorised emergency contacts;
- safety systems.

Requires:

- elevated audit logging.

---

# Consent escalation system

The system must progressively request consent.

## Examples

### Initial public chill beacon

```txt
Someone nearby in Soho
```

### Escalation

```txt
Share more precise meetup location?
```

### Trusted escalation

```txt
Allow exact live location for 60 minutes?
```

---

# Time-bound visibility

All location sharing should expire.

## Default expiry guidance

| Type | Suggested default |
|---|---|
| chill | 1–4hr |
| meetup | 1–8hr |
| event | event duration |
| market | until sold/expired |
| trusted live share | 15–120min |
| SOS | until closed |

---

# Location downgrade rules

As beacons age:

- exact -> approximate;
- approximate -> district;
- district -> hidden.

The system should decay visibility automatically.

---

# Reverse privacy actions

Users must be able to:

- stop sharing instantly;
- revoke trust;
- delete beacon;
- downgrade precision;
- hide activity;
- leave venue.

Changes should:

- propagate immediately;
- invalidate stale route data;
- clear cached scoped access.

---

# Trusted contacts system

Trusted contacts are elevated privacy actors.

## Allowed capabilities

May access:

- exact scoped location;
- Help/SOS state;
- emergency route context.

---

## Forbidden capabilities

Trusted contacts may not:

- publicly redistribute location;
- bypass expiry rules;
- bypass moderation;
- access deleted historical trails.

---

# NA/AA and recovery protection

Recovery participation is highly sensitive.

The system must never publicly expose:

- attendance;
- exact participation;
- user counts at small scale;
- identity linkage.

Allowed public language:

```txt
Sober support nearby
```

Forbidden:

```txt
3 NA users nearby
```

---

# Density privacy rules

Public density should use:

- aggregation;
- thresholds;
- anonymisation;
- area buckets.

Never:

- direct user dot replication.

---

# K-anonymity requirements

Sensitive public aggregates require:

```txt
k >= 5
```

Meaning:

small groups must not become inferable.

---

# Approximate radius policy

Approximate location should:

- jitter position;
- randomise slightly over time;
- avoid exact route reconstruction.

Suggested radius:

| Context | Radius |
|---|---|
| district nightlife | 100–500m |
| casual meetup | 50–250m |
| market pickup | configurable safe zone |
| sensitive support | district-only |

---

# Venue association policy

Preferred alternative to exact GPS.

Example:

Instead of:

```txt
exact user coordinate
```

Use:

```txt
At Dalston Superstore
```

when:

- venue is public;
- user consent exists.

---

# Public map restrictions

The public Globe must never reveal:

- raw GPS;
- exact user movement trails;
- exact Help/SOS locations;
- home addresses;
- precise sensitive participation;
- exact trusted-contact routes.

---

# Search restrictions

Users should NOT be searchable by:

- exact live coordinates;
- recovery participation;
- crisis state;
- sensitive beacon type.

---

# Screenshot and resharing friction

Sensitive surfaces should:

- reduce resharing incentives;
- optionally watermark trusted views;
- avoid exposing sensitive metadata.

---

# Blocking and safety separation

Blocked users must:

- lose location visibility;
- lose proximity surfacing;
- lose trust access;
- lose interaction routes.

Immediately.

---

# Moderation and admin access

Admin access must be:

- role-scoped;
- audited;
- minimal;
- time-limited where possible.

---

# Audit logging

Sensitive access should log:

- who accessed;
- when;
- why;
- scope;
- permission source.

Especially:

- Help/SOS;
- trusted access;
- moderation review.

---

# Data retention policy

## Realtime precise location

Retention should be minimal.

Suggested:

```txt
minutes to hours, not forever
```

---

## Historical analytics

Allowed only after:

- aggregation;
- anonymisation;
- privacy reduction.

---

## Sensitive safety data

Must use:

- shortest viable retention;
- elevated protection;
- restricted access.

---

# Supabase and RLS policy

Every location-bearing table must use RLS.

Required checks:

- auth ownership;
- trusted-contact scope;
- role-based access;
- beacon visibility;
- emergency scope.

---

# Suggested sensitive tables

```txt
location_shares
trusted_contacts
sos_sessions
help_requests
private_routes
live_presence
```

These should NEVER be fully public-readable.

---

# API policy

Sensitive endpoints must:

- scope by auth;
- enforce visibility policy server-side;
- avoid trusting client filters;
- avoid leaking hidden IDs.

---

# Client-side policy

The client must:

- never cache exact location indefinitely;
- clear stale scoped data;
- clear withdrawn visibility;
- avoid logging precise coordinates unnecessarily.

---

# Notification privacy

Notifications should avoid exposing:

- exact sensitive location;
- crisis details on lockscreen;
- outing-risk metadata.

Bad:

```txt
Phil is at NA right now
```

Better:

```txt
Support activity nearby
```

---

# Accessibility and privacy

Accessibility must not weaken privacy.

Example:

- screenreader labels should not expose hidden sensitive data.

---

# Regional compliance

System should support:

- GDPR;
- UK GDPR;
- regional consent requirements;
- deletion/export rights.

---

# User controls

Users must always be able to:

- see active sharing;
- stop active sharing;
- review trusted contacts;
- manage visibility defaults;
- manage beacon precision;
- delete data where appropriate.

---

# Failure policy

## Privacy uncertainty

If privacy state is uncertain:

```txt
fail closed
```

Meaning:

- hide exact location;
- reduce visibility;
- remove public surfacing.

---

# Threat models

The system should actively defend against:

- stalking;
- outing;
- harassment;
- movement reconstruction;
- social graph inference;
- screenshot abuse;
- fake emergency abuse;
- triangulation attacks.

---

# Implementation targets

Create/refactor toward:

```txt
src/lib/privacy/PrivacyPolicyEngine.ts
src/lib/privacy/LocationPrecisionEngine.ts
src/lib/privacy/VisibilityScopeEngine.ts
src/lib/privacy/TrustedContactsEngine.ts
src/lib/privacy/BeaconPrivacyAdapter.ts
src/lib/privacy/LocationExpiryService.ts
src/lib/privacy/LocationDowngradeService.ts
src/lib/privacy/KAnonymityGuard.ts
src/lib/privacy/SensitiveSurfaceGuard.ts
src/lib/privacy/AuditLogService.ts
```

---

# Testing requirements

## Unit tests

Test:

- visibility scopes;
- precision downgrade;
- trust revocation;
- expiry logic;
- K-anonymity thresholds;
- RLS visibility.

## Integration tests

Test:

- Help/SOS scoped visibility;
- trusted contact escalation;
- beacon cancellation;
- location withdrawal;
- blocked-user visibility removal.

## E2E tests

Test:

- exact location never public by default;
- Help/SOS never searchable publicly;
- stale exact routes removed;
- visibility downgrade after expiry;
- NA/AA participation never inferable;
- public density remains aggregate-only.

---

# Acceptance criteria

The privacy system succeeds when:

- the Globe feels alive without becoming surveillance;
- exact location is rare and intentional;
- users always understand visibility scope;
- consent is reversible;
- Help/SOS remains protected;
- recovery participation stays private;
- blocked users lose visibility immediately;
- public maps never expose raw sensitive location;
- density remains privacy-safe;
- trust escalation feels explicit and human;
- location sharing expires naturally;
- safety overrides monetisation everywhere.