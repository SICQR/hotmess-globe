# Beacon Doctrine

**Status:** Canonical. Entity-aware. Supersedes the user-only Beacon Doctrine sketch and earlier "Beacon Reflection System" drafts where they conflict.
**Source:** Phil Gizzie, 2026-05-26 exec doctrine.

## Purpose

Define the canonical entity-aware beacon behavior for HOTMESS.

## Core principle

A beacon is a **temporary visibility state on a beaconable entity**, not a separate object the user browses to.

## Canonical rule

There is no standalone beacon page or beacon card as a destination. Every beacon interaction must resolve to the entity's canonical destination surface.

## Beaconable entities

Beacon behavior may apply to:

- users
- venues
- vendors
- shops
- care entities
- music entities
- other supported entity types

If an entity type does not have a canonical destination surface, it is not beaconable yet.

---

## 1. Source of truth

- Beacon state must come from one canonical active beacon set.
- Globe, carousel, and any other beacon surfaces must render from the same source of truth.
- These views may differ in presentation, but not in beacon state.

## 2. Destination rule

- Tap on a beacon opens the canonical entity destination for that beaconable entity.
- User beacon → user profile or canonical user surface
- Venue beacon → venue profile or venue page
- Vendor beacon → vendor profile or vendor page
- Shop beacon → shop profile or shop page
- Other entity types must route to their own canonical surface
- No tap may route to a standalone beacon detail view

## 3. Entity-aware routing

Beacon records must include:

- beacon id
- entity type
- entity id
- status
- created time
- expiry time

Routing must be explicit per entity type. If routing cannot be resolved, the beacon should be suppressed rather than guessed.

```ts
type BeaconEntityType =
  | "user"
  | "venue"
  | "vendor"
  | "shop"
  | "care"
  | "music"
  | "other";

type Beacon = {
  id: string;
  entityType: BeaconEntityType;
  entityId: string;
  type: "ghosted" | "pulse" | "music" | "shop" | "care";
  note?: string;
  lat: number;
  lng: number;
  locationLabel?: string;
  createdAt: string;
  expiresAt: string;
  status: "active" | "expired" | "cancelled" | "suppressed";
};

function openBeaconEntity(beacon: Beacon) {
  router.push(
    `/entity/${beacon.entityType}/${beacon.entityId}?beacon=${beacon.id}`
  );
}
```

If the app already has separate routes for users, venues, and vendors, the handler routes to each entity's canonical surface rather than forcing one profile shape.

## 4. Beacon state model

Allowed states:

- active
- expired
- cancelled
- suppressed

State behavior:

- active: visible if otherwise eligible
- expired: no longer visible as active, but may remain accessible in history if policy allows
- cancelled: removed from active visibility
- suppressed: hidden due to safety, moderation, trust, or policy breach

## 5. Expiry and decay

- Beacon visibility must decay automatically over time.
- Expired beacons must not retain active prominence.
- Newness is not truth.
- Quiet states are valid and must not be treated as failure.
- If a beacon has expired, it should lose visibility priority even if it remains stored for audit or history.

## 6. Safety first

- Safety overrides all other concerns.
- No beacon may increase abuse risk, stalking risk, harassment exposure, or moderation burden without explicit review.
- Location precision must default to approximate unless user policy or product policy explicitly allows precision.
- 18+ gate and consent confirmation are required where applicable before publishing a beacon.
- Report and block controls must remain visible on the relevant destination surface when the beacon is shown.

## 7. Consent rule

- Beacon publication requires consent confirmation where people are involved.
- Consent language must be explicit and not implied.
- "Consent always leads" is the functional rule.
- If consent is missing, uncertain, or revoked, the beacon should not be amplified.

## 8. Truth and trust

- Beacon visibility must not override verified reality.
- Stale, false, or contradictory beacon-related content must not appear authoritative.
- Trust and moderation signals may affect rank and visibility, but never override safety.
- A source below trust minimum must not be allowed to amplify beacon visibility beyond governed bounds.

## 9. Freshness and timing

- Beacon relevance is time-sensitive.
- Visibility should decay as the expiry window closes and end at expiration unless policy explicitly says otherwise.
- Freshness is not just recency; it is active validity.
- Expired beacons may remain retrievable for history, but not as active signals.

## 10. Readability and saturation

- Beacon surfaces must stay readable.
- Do not let active beacons create clutter, duplicate emphasis, or unreadable dense surfaces.
- Carousel, globe, grid, and profile surfaces must respect saturation limits.
- Dense districts require stronger readability controls.
- Quiet districts must not be artificially inflated.

## 11. Single-source rendering

- Globe layer and carousel may both render active beacons.
- They must both derive from the same canonical filtered set.
- If the same beacon appears in multiple places, its state, expiry, and destination must remain consistent.
- Views may vary in density and styling, but not in meaning.

## 12. Profile or detail surface module

When a beacon is opened from the globe or carousel, the destination surface should render an active beacon module if the beacon is still active.

The module should show:

- entity identity
- beacon type
- optional note
- location label or allowed location context
- time remaining
- appropriate actions

The module must never replace the canonical destination surface. It is an overlay or section within the entity destination, not a separate page.

Microcopy: *"Beacon active now. Respect the signal. Consent still comes first."*

## 13. Entity-specific display rules

- Different entity types may have different rendering, trust, and moderation behavior.
- User beacons, venue beacons, vendor beacons, and shop beacons should not be treated as identical if their safety or trust needs differ.
- Rules for each entity type must be explicit and documented.
- Do not collapse distinct entity behavior into one vague beacon policy.

## 14. Signal taxonomy

- Signal labels may be used for ambient presentation, but they are UI copy, not governance.
- Taxonomy must not imply false certainty.
- Raw meters may be hidden in collapsed views.
- Expanded views may reveal more detail if allowed.
- Signal language must remain consistent across the product and should not imply surveillance.

Default Ghosted grid label mapping (UI copy — not governance):

| Distance band | Label |
|---|---|
| 0–100m (mutual only) | `LOCKED` |
| 100–300m | `STRONG SIGNAL` |
| 300–800m | `PINGING` |
| 800m–3km | `FAINT SIGNAL` |
| >3km / unknown | `LAST SEEN IN THE FOG` |

Strangers (non-mutual) never get `LOCKED` — consent invariant.

## 15. No standalone beacon object as destination

- The beacon is an invitation state.
- The entity is the destination.
- Any design that turns the beacon into its own browsable endpoint violates this doctrine.

## 16. Governance alignment

This doctrine must obey the canonical governance stack:

- safety first
- truth before trust
- readability as a product requirement
- bounded amplification
- freshness and decay
- no hidden policy
- enforcement alignment
- change discipline
- conflict handling
- implementation review

If this doctrine conflicts with stronger governance, governance wins.

## 17. Required checks for implementation

Every implementation must answer:

- Is it safe?
- Is it true?
- Is it readable?
- Is it bounded?
- Is it measurable?
- Is it enforceable?
- Is it duplicative?
- Does it preserve quiet-state validity?
- Does it route to the correct entity destination?
- Does it preserve one source of truth?

## 18. Prohibited patterns

- Beacon page as a separate destination
- Beacon card as a browsable endpoint
- Divergent globe and carousel state
- Implicit routing based on guesswork
- Stale beacon visibility past expiry
- Hidden exception logic
- Untested entity-specific routing
- Copy that suggests certainty where only signal exists
- Cluttered ambient surfaces that make beacon meaning unreadable

## 19. Rendering guidance

- Globe is the **discovery surface**.
- Beacon is the **temporary invitation state**.
- Entity destination is the **intimacy layer**.
- Ambient grids or nearby surfaces should remain visually quieter than active beacon surfaces.
- Active beacon surfaces should not visually collapse into the ambient grid.

## 20. Out of scope

- Decorative motion systems that do not change meaning
- Multiple competing beacon destinations
- Hidden ranking hacks
- UI experiments that create a separate beacon universe
- Copy refinements that override routing, safety, or truth

## 21. Implementation checklist

1. Define canonical beacon entity types and route targets.
2. Add explicit entity-aware beacon routing.
3. Use one shared active beacon source for globe and carousel.
4. Suppress invalid, expired, or unroutable beacons.
5. Render beacon module only inside the entity's canonical destination surface.
6. Keep safety, consent, report, and block controls visible where required.
7. Add state decay and expiry behavior.
8. Verify no standalone beacon page or card exists.
9. Test user, venue, vendor, shop, and other supported entity flows separately.
10. Confirm globe tap and carousel tap land on the same canonical destination for the same beacon.

## 22. Final rule

If a beacon cannot resolve to a safe, truthful, readable, and entity-canonical destination, it should not be public.

---

## Architectural note

The beacon is now three things simultaneously:

- **Navigation metaphor** — the way users find each other (and venues, vendors, shops)
- **Emotional metaphor** — visibility, vulnerability, intent
- **State engine** — active / expired / cancelled / suppressed

Everything radiates from this primitive across Globe / Pulse / Ghosted. The entity destination is the destination, the beacon is the invitation, the grid is the ambient field.

**Behavior is entity-aware.** Rendering, trust, moderation, and destination routing may vary by entity type, but the beacon remains a temporary visibility state with one canonical destination per entity.
