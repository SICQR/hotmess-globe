# Globe Help Beacon & SOS Privacy Model

Purpose: define how user Help Beacons, SOS, trusted contacts, and exact location sharing work without exposing private latitude/longitude on the public Globe.

This document is safety-critical. Any Help/SOS work must read this before implementation.

## Core rule

Exact latitude/longitude is private.

Exact lat/lng may be visible only to:

1. the user who activated the Help Beacon or SOS;
2. the user's chosen trusted contacts;
3. authorised server-side safety delivery code required to send the alert;
4. admins only through audited emergency/support tooling, if explicitly built and legally reviewed.

Exact lat/lng must never be visible to:

- public Globe users;
- nearby users by default;
- vendors;
- event hosts;
- sponsors;
- market buyers/sellers;
- anonymous viewers;
- analytics dashboards in raw form;
- boosted/sponsored placements.

## Definitions

### Help Beacon

A user-controlled non-emergency request for support, accompaniment, check-in, or soft landing.

Examples:

- `Walk with me`
- `Check on me`
- `I need a quiet exit`
- `Can someone trusted call me?`
- `Help me get home`
- `Stay on the line`

Help Beacon is consent-led and privacy-first. It can be visible to trusted contacts or selected/matched users only if the user chooses that scope.

### SOS

A safety-critical emergency state.

SOS can send exact location to chosen trusted contacts and trigger app safety flows.

SOS is not a public performance signal. It should not appear as a public red marker on the Globe unless a future legally reviewed, explicit emergency-sharing mode is created.

### Trusted Contact

A contact chosen by the user to receive safety alerts. The product must make clear which contacts will receive exact location before activation.

## Visibility levels

```ts
export type SafetyVisibility =
  | 'self_only'
  | 'trusted_contacts'
  | 'selected_contact'
  | 'matched_user'
  | 'venue_staff_verified'
  | 'public_aggregate';
```

Default:

- Help Beacon: `self_only` until user chooses otherwise.
- SOS: `trusted_contacts` after explicit activation/confirmation, with emergency fast path where designed.

## Location precision levels

```ts
export type LocationPrecision =
  | 'exact'        // raw lat/lng, safety-critical only
  | 'building'     // public venue only, if user chooses venue context
  | 'venue'        // venue-level, no raw user coordinate
  | 'area'         // neighbourhood or approximate radius
  | 'city'         // city only
  | 'none';
```

Rules:

| Context | Precision allowed | Viewer |
|---|---|---|
| User's own safety screen | exact | self |
| SOS alert link | exact | chosen trusted contacts |
| Help Beacon to trusted contacts | exact or area, chosen by user | trusted contacts |
| Help Beacon to matched user | area/venue by default | matched user |
| Public Globe | area/city/aggregate only | public |
| City heat | aggregate only | public |
| Analytics | fuzzed/aggregated | admin/product |
| NA/AA/sober support | area/venue/public listing only | public/private card |

## Public Globe behaviour

Help/SOS must not render as exact public dots.

### From space

Show nothing user-specific.

Allowed:

- aggregate care availability;
- general `Care routes open`;
- no personal help count if it risks outing distress.

### City view

Allowed:

- anonymised care demand signal only if threshold-safe;
- e.g. `Care routes active`.

Do not show:

- `1 person needs help here`;
- exact red marker;
- user profile;
- direction to user.

### Local view

Allowed only if user has explicitly chosen public/venue-visible help mode, and even then:

- use area/venue precision;
- do not expose raw lat/lng;
- hide identity unless chosen;
- show report/block controls.

Default: no public local Help/SOS pin.

## Trusted contact flow

### SOS activation

Flow:

1. User activates SOS.
2. App confirms or follows existing emergency fast path.
3. App captures exact lat/lng.
4. App writes safety event with strict RLS.
5. App sends alert to chosen trusted contacts.
6. Trusted contacts open secure link or notification.
7. Trusted contacts can see exact lat/lng/map link.
8. Public Globe receives no exact marker.

### Help Beacon activation

Flow:

1. User chooses Help Beacon type.
2. User chooses recipients:
   - self only;
   - all trusted contacts;
   - selected trusted contacts;
   - matched user, if allowed;
   - verified venue staff, if future feature exists.
3. User chooses precision:
   - exact;
   - venue;
   - area;
   - city.
4. App shows clear copy: `Exact location will be shared with [names].`
5. User confirms.
6. Recipients receive alert according to scope.
7. Public Globe shows nothing exact.

## Required user copy

### Before sharing exact location

`Your exact location will only be shared with the trusted contacts you choose.`

### SOS confirmation

`SOS shares your live location with your trusted contacts so they can find you or check in.`

### Help Beacon confirmation

`Choose who can see this. You can share exact location, venue, or approximate area.`

### Public safety copy

`Public Globe views never show exact Help or SOS locations.`

### Trusted contact received alert

`[Name] shared their safety location with you. Use it only to help them.`

## Database requirements

Do not store Help/SOS exact location in general beacon tables that feed public Globe rendering.

Recommended separation:

### Public beacon data

- event;
- venue;
- market;
- radio;
- public care route;
- public city/area aggregate.

### Private safety data

- SOS activations;
- help beacon activations;
- trusted contact deliveries;
- safety location snapshots;
- audit logs.

Suggested tables:

```sql
safety_activations
safety_location_snapshots
safety_recipients
safety_delivery_logs
trusted_contacts
```

If existing tables are already used, adapt names but preserve the separation.

## RLS requirements

### safety_activations

User can:

- create own activation;
- read own activation;
- cancel own activation.

Trusted contact can:

- read only activations explicitly shared with them;
- read only the location precision granted.

Public can:

- read nothing.

### safety_location_snapshots

User can:

- insert/read own snapshots.

Trusted contact can:

- read snapshots only when linked through `safety_recipients` and active share window.

Public can:

- read nothing.

### safety_delivery_logs

User can:

- read delivery status for own activation.

Trusted contact can:

- not read internal delivery logs unless exposed as simple received status.

Public can:

- read nothing.

## Expiry and cancellation

### SOS expiry

SOS remains active until:

- user cancels;
- trusted contact confirms resolved, if feature exists;
- maximum emergency window expires;
- admin/support resolves through audited tooling, if built.

Recommended default max window:

- 4h live location sharing;
- extendable by user.

### Help Beacon expiry

Recommended options:

- 15m;
- 30m;
- 1h;
- 2h;
- 4h max default.

Help Beacon should auto-expire. User can cancel anytime.

### Cancellation flow

When cancelled:

- stop live location updates;
- notify recipients: `Safety share ended`;
- remove recipient access to exact live location;
- retain minimal audit record according to privacy policy;
- public Globe remains unaffected.

## Logs and audit

Log:

- activation time;
- cancellation time;
- recipients selected;
- precision level selected;
- delivery success/failure;
- location snapshot timestamps;
- access events by trusted contacts.

Do not log into general analytics:

- raw lat/lng;
- distress reason text;
- trusted contact phone/email in product analytics;
- lock-screen unsafe message content.

## Notifications

### Lock screen safety

Do not reveal sensitive context unnecessarily.

Bad:

`Phil triggered SOS at Heaven, exact location: ...`

Better:

`Phil shared a safety location with you. Open securely.`

### NA/AA and sober support

Never send lock-screen notifications that reveal NA/AA interest without explicit opt-in.

## Help Beacon types

```ts
export type HelpBeaconType =
  | 'check_on_me'
  | 'walk_with_me'
  | 'call_me'
  | 'help_me_leave'
  | 'help_get_home'
  | 'stay_on_line'
  | 'sober_support'
  | 'medical_attention'
  | 'urgent_sos';
```

### Visual language

| Type | Public Globe | Trusted contact view | Colour |
|---|---|---|---|
| check_on_me | not public | exact/area chosen | white-gold |
| walk_with_me | not public by default | exact/venue/area chosen | white-gold |
| call_me | not public | no location required unless chosen | white-gold |
| help_me_leave | not public | exact/venue chosen | amber-white |
| help_get_home | not public | exact/route if chosen | amber-white |
| stay_on_line | not public | contact action | white |
| sober_support | area/private | area/venue chosen | white-blue |
| medical_attention | not public | exact if chosen | red/white, reviewed |
| urgent_sos | not public exact | exact to trusted contacts | red only here |

## Integration with Globe density model

Help/SOS contributes to public density only if threshold-safe and anonymised.

Example:

- 1 Help Beacon in an area: public shows nothing.
- Many care requests in a city: public may show `Care routes active` if privacy threshold is met.
- SOS: no public density by default.

Threshold recommendation:

- public aggregate only at k-anonymity threshold of 5+ unrelated users/signals per area/time bucket;
- never aggregate sensitive categories if it creates inference risk.

## Abuse prevention

- rate-limit Help Beacon spam;
- allow trusted contacts to mute non-urgent repeated alerts;
- never rate-limit SOS in a way that blocks emergency use;
- escalate repeated false public safety beacons through trust/moderation;
- prevent screenshots? Not reliably possible, so design copy assumes recipients can see sensitive info.

## Monetisation boundary

Help/SOS cannot be boosted.

Banned:

- paid SOS priority;
- paid trusted contact delivery;
- ads inside SOS flow;
- sponsored placement over urgent/care;
- vendors seeing help locations.

Allowed:

- paid vendor/venue safety tooling only if it never exposes user exact location without explicit opt-in;
- premium safety features only if core SOS remains free and functional;
- HNH MESS sponsorship around care content, not inside emergency flow.

## Acceptance criteria

- Exact Help/SOS lat/lng is visible only to self and chosen trusted contacts.
- Public Globe never shows raw Help/SOS coordinates.
- Trusted contacts see only what the user chose to share.
- User can cancel Help/SOS and stop sharing.
- Cancellation revokes recipient live-location access.
- Safety data is separated from public beacon rendering.
- RLS prevents public access to safety tables.
- Notifications do not leak sensitive details on lock screen.
- Help/SOS is never monetised through boosts.
- Care/sober aggregate display is threshold-safe and anonymity-preserving.