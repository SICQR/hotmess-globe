# Globe Ticketing And Guestlist System

Purpose: define the canonical ticketing, guestlist, entry coordination, anti-scalping, verification, and nightlife access systems for HOTMESS Globe.

This document governs:

- ticket-linked beacons;
- guestlist infrastructure;
- venue entry coordination;
- realtime attendance flows;
- ticket resale governance;
- anti-fraud systems;
- privacy and safety boundaries;
- district-level event orchestration.

The system should support:

- nightlife discovery;
- community events;
- popup activations;
- radio-linked events;
- venue coordination;
- accessibility-aware entry.

WITHOUT becoming:

- exploitative ticketing software;
- surveillance infrastructure;
- scalper tooling;
- fake scarcity mechanics.

---

# Core philosophy

Ticketing should feel like:

```txt
smooth cultural coordination
```

NOT:

```txt
predatory scarcity extraction
```

The system exists to:

- reduce operational chaos;
- reduce scams;
- support venues;
- support creators;
- improve realtime coordination;
- improve attendee safety.

---

# Canonical event access model

```txt
Discover
→ Save
→ Ticket / Guestlist Intent
→ Access Confirmation
→ Route & Arrival
→ Entry Validation
→ Live Event State
→ Exit / Aftercare
```

This flow must remain:

- calm;
- mobile-first;
- low-friction;
- accessibility-aware.

---

# Ticket-linked beacon system

Ticketed events may attach:

- ticket providers;
- guestlist systems;
- entry metadata;
- accessibility notes;
- realtime status;
- queue estimates.

Ticket-linked beacons should:

- surface availability clearly;
- avoid fake urgency;
- sync with event lifecycle.

---

# Ticket states

Canonical ticket states:

```txt
Available
Low Availability
Sold Out
Waitlist
Pending Transfer
Transferred
Checked In
Refunded
Cancelled
Fraud Review
```

Ticket states should update:

- realtime where possible;
- gracefully under degraded conditions.

---

# Guestlist system

Guestlists should support:

- manual additions;
- invite links;
- promoter allocations;
- creator allocations;
- partner access;
- accessibility requests;
- arrival pacing.

Guestlists must avoid:

- clout hierarchy;
- public popularity ranking;
- humiliating rejection flows.

---

# Guestlist lifecycle

```txt
Invited
→ Confirmed
→ Pending Arrival
→ Checked In
→ Expired
→ Archived
```

Optional:

```txt
Waitlist
→ Upgraded
```

Guestlist systems should:

- reduce queue friction;
- reduce venue overload;
- improve arrival pacing.

---

# Venue entry operations

Venues may manage:

- door status;
- entry pacing;
- queue length;
- capacity warnings;
- accessibility routing;
- ticket scans;
- re-entry permissions.

Realtime venue operations should:

- feel calm;
- support staff efficiency;
- avoid chaotic dashboards.

---

# Realtime event states

Live events may broadcast:

- queue estimate;
- venue capacity;
- ticket availability;
- district congestion;
- entry pacing;
- accessibility updates;
- transport conditions.

Must avoid:

- exposing attendee identities;
- realtime personal movement.

---

# Ticket resale governance

Resale systems must prioritise:

- scam prevention;
- identity safety;
- fair access;
- transfer legitimacy.

Allowed:

- verified transfers;
- capped resale;
- venue-approved exchange.

Forbidden:

- exploitative scalping;
- fake tickets;
- duplicate QR systems;
- anonymous bulk resale.

---

# Anti-scalping rules

The system may:

- limit transfer count;
- require verification;
- throttle resale;
- hold suspicious transfers;
- revoke fraudulent tickets.

Signals MAY include:

- rapid resale patterns;
- repeated transfer loops;
- duplicate scans;
- fraud reports.

---

# QR and entry validation

Ticket systems may support:

- rotating QR codes;
- encrypted validation;
- offline-safe validation;
- realtime scan sync;
- venue-side scan caching.

Validation systems must:

- degrade gracefully;
- avoid single-point failure;
- support unstable connectivity.

---

# Accessibility and entry support

Accessibility must remain first-class.

Supported features:

- accessibility notes;
- calm-entry routing;
- low stimulation access;
- wheelchair metadata;
- queue assistance;
- sober-safe event tagging.

Accessibility support must NEVER:

- require premium payment;
- expose medical information.

---

# Care and aftercare integrations

Events may include:

- hydration points;
- calm-space information;
- safer-route overlays;
- aftercare references;
- trusted-contact reminders.

Care systems must remain:

- subtle;
- useful;
- non-exploitative.

Forbidden:

- fear marketing;
- emotional manipulation;
- crisis monetisation.

---

# HOTMESS RADIO integrations

Events may connect to:

- live radio countdowns;
- lineup sync;
- artist mentions;
- takeover broadcasts;
- realtime event updates.

Cross-surface flow:

```txt
Event Beacon
→ Ticket Intent
→ Guestlist Sync
→ HOTMESS RADIO mention
→ Venue Arrival
→ Aftercare Layer
```

---

# Ticket discovery policy

Discovery systems may rank by:

- relevance;
- proximity;
- trust;
- saves;
- district activity;
- verified legitimacy.

Discovery systems must NEVER rank by:

- exploitative urgency;
- manipulative countdowns;
- artificial scarcity.

---

# Notification policy

Allowed notifications:

- ticket confirmation;
- guestlist approval;
- queue update;
- event cancellation;
- venue change;
- accessibility update;
- fraud warning.

Forbidden:

- panic countdown spam;
- manipulative FOMO pressure;
- excessive promotional push;
- lockscreen GPS exposure.

---

# Privacy policy

Ticket systems must NEVER expose:

- attendee GPS history;
- attendee movement replay;
- Ghosted chat contents;
- Help/SOS participation;
- recovery participation;
- attendee lists publicly.

Analytics must remain:

- aggregate;
- consent-aware;
- GDPR-compliant.

---

# Trust and moderation

Ticket systems should integrate:

- fraud review;
- venue verification;
- ticket legitimacy checks;
- abuse escalation;
- scam reporting;
- resale enforcement.

Repeated abuse may:

- restrict transfers;
- remove boost eligibility;
- suspend partner accounts;
- disable campaigns.

---

# Monetisation boundaries

Allowed monetisation:

- ticket integrations;
- guestlist tooling;
- premium operations tooling;
- venue analytics;
- district coordination.

Forbidden monetisation:

- paid moderation immunity;
- paid safety priority;
- manipulative urgency systems;
- premium emergency access.

---

# District-scale coordination

Dense nightlife districts may aggregate:

- queue conditions;
- venue saturation;
- transport load;
- district heat;
- entry pacing.

District systems should:

- reduce congestion;
- improve flow;
- improve safety.

NOT:

- expose attendee identities;
- create crowd panic.

---

# Suggested Supabase tables

```txt
event_tickets
ticket_orders
ticket_transfers
ticket_scan_events
ticket_fraud_reviews
guestlists
guestlist_entries
guestlist_allocations
venue_entry_states
venue_capacity_events
event_accessibility_notes
queue_estimates
```

Related existing tables:

```txt
events
event_beacons
venue_profiles
venue_verification
beacon_analytics
beacon_reports
```

---

# Suggested implementation targets

```txt
src/lib/tickets/TicketLifecycleEngine.ts
src/lib/tickets/TicketValidationService.ts
src/lib/tickets/TicketTransferPolicy.ts
src/lib/tickets/TicketFraudEngine.ts
src/lib/tickets/GuestlistService.ts
src/lib/tickets/VenueEntryCoordinator.ts
src/lib/tickets/QueueEstimationService.ts
src/lib/tickets/RealtimeVenueSync.ts
src/lib/tickets/AccessibilityEntryService.ts
src/components/tickets/TicketPanel.tsx
src/components/tickets/GuestlistManager.tsx
src/components/tickets/QueueStatusCard.tsx
src/components/tickets/VenueEntryDashboard.tsx
```

---

# Realtime architecture

Ticket systems should subscribe to:

```txt
ticket updates
guestlist updates
queue updates
venue capacity events
fraud review events
accessibility updates
```

Realtime updates should:

- throttle safely;
- degrade gracefully;
- avoid notification overload.

---

# Accessibility requirements

Ticket and guestlist systems must support:

- screen readers;
- reduced motion;
- keyboard navigation;
- calm visual hierarchy;
- low stimulation interfaces.

Critical actions must:

- remain readable under stress;
- avoid flashing countdowns.

---

# Acceptance criteria

The system succeeds when:

- ticket discovery feels trustworthy;
- guestlists reduce operational chaos;
- venues manage entry smoothly;
- scams become difficult to sustain;
- accessibility remains operationally visible;
- district congestion becomes manageable;
- notifications remain calm;
- realtime systems remain privacy-safe;
- nightlife coordination feels smooth rather than extractive;
- HOTMESS supports nightlife culture without becoming exploitative ticket-tech.
