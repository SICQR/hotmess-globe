# Globe Event And Venue Partner System

## Core philosophy

- support local culture
- support independent operators
- support safe discovery
- support community infrastructure

## Vendor categories

- venues
- collectives
- care vendors
- radio partners
- ticket partners
- creators
- preloved vendors
- wellness vendors

## Event beacon categories

- Event
- Afters
- Chill
- Ticket
- Guestlist
- Radio Live
- Care Space

Each beacon type requires:
- distinct visuals
- distinct density rules
- distinct visibility behaviour

## Event lifecycle

Recommended lifecycle:

```txt
Draft
Scheduled
District-visible
Live
Cooldown
Archive
```

Lifecycle transitions should:
- decay smoothly
- avoid visual chaos
- preserve district readability
- support realtime freshness

Live events should:
- pulse softly
- aggregate under density
- downgrade gracefully after ending

Archived events should:
- retain cultural history
- lose realtime prominence
- remain searchable if permitted

## District aggregation

Dense nightlife districts should:
- aggregate softly
- preserve readability
- surface atmosphere instead of raw density

Preferred:

```txt
Heavy district energy tonight
```

NOT:

```txt
700 overlapping event nodes
```

Aggregation should:
- reduce visual clutter
- reduce GPU strain
- preserve calm navigation
- support reduced stimulation mode

District systems may aggregate:
- event beacons
- venue glow
- radio activity
- Chill density
- transport activity

District systems must NEVER expose:
- exact attendee counts
- hidden attendance
- precise movement trails

## Venue verification

Venue verification MAY include:
- ownership validation
- moderation review
- trust history
- event consistency
- ticket legitimacy

Verification should:
- improve trust
- reduce scams
- reduce fake events
- improve visibility confidence

Verification must NEVER:
- guarantee algorithmic dominance
- suppress independent operators
- create pay-to-win visibility

Suggested venue states:

```txt
Unverified
Pending
Verified
Trusted
Restricted
Moderated
```

Verification states should remain:
- calm
- non-theatrical
- operational rather than social

## Vendor offerings

- boosted event beacons
- district sponsorship
- radio integration
- guestlist sync
- ticket integrations
- venue profiles
- aftercare integration
- accessibility tagging

## Monetisation boundaries

Monetisation should:
- support sustainability
- support local culture
- support independent operators

Monetisation must NEVER:
- overpower trust systems
- dominate visibility
- bypass moderation
- override safety

## Suggested Supabase tables

```txt
venues
venue_profiles
venue_verification
events
event_beacons
event_ticket_integrations
venue_accessibility
venue_care_features
preloved_drops
radio_event_integrations
district_aggregates
event_lifecycle_states
```

## Suggested services

```txt
src/lib/events/EventLifecycleEngine.ts
src/lib/events/VenueVerificationService.ts
src/lib/events/EventDensityAggregation.ts
src/lib/events/EventBeaconRenderer.ts
src/lib/events/TicketValidationService.ts
src/lib/events/GuestlistSyncEngine.ts
src/lib/events/PrelovedDropService.ts
src/lib/events/RadioIntegrationService.ts
```

## Acceptance criteria

- independent operators remain visible
- district density remains readable
- sponsored visibility stays restrained
- accessibility remains first-class
- monetisation does not dominate culture
- fake events become difficult to sustain
- dense nightlife remains visually calm
- venue trust improves without creating hierarchy