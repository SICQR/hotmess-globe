# Doctrine 11 — Arrival State

**Locked 2026-05-28. Phil Gizzie + Claude.**
Authority: this doctrine sits above all code that runs when a user lands on
`/pulse` after clearing sign-up or signing back in. No PR that violates these
rules may merge. Sacred Invariants are immutable without a doctrine revision.

---

## Purpose

This doctrine defines what a user must feel, see, and understand in the
first 5 seconds after they clear sign-up and land on `/pulse`.

This moment must not feel like a tutorial, a growth funnel, a profile
completion task, or an empty map. It must feel like **arrival**.

---

## Core Principle

The user has not entered an app. They have entered the signal.

The first experience must communicate:

- you are here
- the system is alive
- nothing is being forced
- safety is always present
- the map will reveal itself through use

**Receive them like a signal, not a customer.**

---

## Sacred Invariants for Arrival

These are immutable. Any PR that breaks one fails the doctrine check.

1. **Care outranks novelty. Continuity outranks attraction.** This is the
   load-bearing line of the entire doctrine. Engagement, attraction,
   monetisation never sit ahead of care continuity or emotional state
   integrity.
2. **Arrival renders exactly one atmospheric signal.** No badge stacking,
   no notification sludge, no prompt pyramid. Everything else stays
   reachable but unsurfaced in the first 5 seconds.
3. **The system never sounds excited to see the user.** No "Welcome back!",
   no "We missed you!", no "Great to see you again!", no name-parroting.
   The system acknowledges state, signal, continuity, atmosphere —
   never simulates friendship.
4. **Truth outranks momentum.** A quiet Pulse is not failure. Synthetic
   density, fake heat, fake urgency, fake activity counts are forbidden.
5. **Arrival is mental, not physical.** No haptic, no vibration. Haptic
   belongs to gestures the user initiates.
6. **Failure stays in the doctrinal voice.** A broken Mapbox, a WebGL
   abort, a network drop — all surface as HOTMESS-voice copy, not
   generic error chrome.

---

## Emotional State

Assume the user is:

- slightly uncertain
- still orienting
- testing whether HOTMESS is real
- comparing it against Grindr, Sniffies, Instagram, and group chats
- not ready for a hard CTA
- not ready for a tutorial
- not ready to be monetised
- sensitive to being tracked
- looking for proof of atmosphere

**Do not treat arrival as excitement. Treat it as settling.**

---

## Signal Priority Ladder

A returning user can have multiple states active at once: aftercare due,
unread boos, an active beacon still on the floor, district hot,
time-of-day default. Without a ladder, dev will stack signals or pick
randomly. This ladder is canonical.

Arrival fires **exactly one** signal, the highest-priority active one.

| Priority | State                                         | Example arrival copy                              |
| -------- | --------------------------------------------- | ------------------------------------------------- |
| 1        | **Care state**  — aftercare window active     | "You're back. Care check-in is open."             |
| 2        | **Beacon continuity** — user's beacon active  | "You're still on the floor at [venue]."           |
| 3        | **Invite continuity** — beta/redeem entry     | "Founding access. [City] is yours to map."        |
| 4        | **Relational signal** — unread boos received  | "Signal restored. Someone boo'd you."             |
| 5        | **Atmospheric default** — time-of-day copy    | (see table below)                                 |

**Care outranks beacon. Beacon outranks invite. Invite outranks relation.
Relation outranks atmosphere.**

Lower-priority states remain reachable through the normal app surfaces.
They do not stack at arrival.

---

## First-Time Arrival Copy

(Used when no higher-priority signal is active.)

| State                            | Copy                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------- |
| Default                          | You're on. Look around.                                                       |
| Night / active hours             | You're on. The floor is starting to move.                                     |
| Quiet hours                      | You're on. The room is quiet right now.                                       |
| Afterhours                       | You're on. The signal is thinner, but not gone.                               |
| Location available               | You're near [District]. Move when you're ready.                               |
| Location not available           | You're on. Add location when you want the map to wake up around you.          |
| Invite continuity (replaces all) | Founding access. The signal is yours.  ·  Founding access. [City] is yours.   |

---

## Returning User Arrival Copy

(Returning user = has signed in before. Never restart onboarding for a
returning user unless a required compliance gate changed.)

| State                            | Copy                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------- |
| Default                          | Signal restored.                                                              |
| Night                            | You're back. The room has changed.                                            |
| Quiet                            | You're back. Quiet signal right now.                                          |
| Active district                  | You're back. [District] is moving.                                            |
| Care state (priority 1)          | You're back. Care check-in is open.                                           |
| Beacon continuity (priority 2)   | You're still on the floor at [venue].                                         |
| Relational signal (priority 4)   | Signal restored. Someone boo'd you.                                           |

The system never uses the user's name. Identity is what the user shows
others; it is not performance material for the system.

---

## Direction Given

The user receives a **felt nudge**, not an instruction.

**Allowed:**

- subtle camera drift toward fuzzy user area
- self-marker gently waking up
- one-line atmospheric copy
- shield visible but not shouting
- bottom nav available
- Pulse controls discoverable

**Forbidden:**

- "Complete your profile"
- "Tap here first"
- full-screen walkthrough
- sponsored welcome card
- fake activity
- fake heat
- fake urgency
- profile percentage
- gamified onboarding
- "people nearby" bait
- exact location reveal
- forced beacon creation
- name-parroting ("Welcome back, Phil")
- emoji-coded welcome ("👋 Hey there!")

---

## Multi-Signal Restraint

Even when Care wins the priority ladder, the arrival surface still must
not render: copy line + boo badge + beacon pill + radio cue + district
pin all at once. The rule is structural:

**Arrival renders one atmospheric signal. All other state stays
reachable but unsurfaced for the first 5 seconds.**

Boo badges, beacon countdowns, district pins, radio "live" labels —
none surface on arrival. They become available the moment the user
moves the camera or taps anywhere on the interface.

---

## The Shield

The safety shield must be visible on arrival.

It must not be introduced with alarmist copy or animated attention-grabs.

Correct tone:

> The shield is always there.

Avoid:

- "Need help?"
- "Are you safe?"
- "Emergency tools ready!"
- "Protect yourself now!"

The safety layer feels permanent, calm, and structurally present. It
does not pulse on arrival. It does not call attention to itself. It is
where it is, and it is reachable.

**Care invariant:** care is one tap from any arrival state, no scroll
required. This applies regardless of whether the Pulse rendered
successfully, partially, or failed.

---

## The First CTA

There is no hard CTA in the first 5 seconds.

After the arrival line fades, the available actions can sit quietly in
the interface:

- Drop signal
- Listen live
- Ghosted
- Find care
- Explore nearby

None of these hijacks the arrival moment.

---

## Camera Behaviour

Do not auto-zoom aggressively.

**Preferred:**

- slow atmospheric settle
- fuzzy-location camera pull if location consent exists
- district-level framing
- no exact pin lock
- no animated "you are here" surveillance feeling

The user must feel **located, not tracked**.

---

## Empty State Doctrine

A quiet Pulse is not failure. If density is low, say so plainly.

**Allowed:**

> Quiet signal here right now.
> Start with the radio, check care, or look again later.

**Forbidden:**

- "Be the first to start the party!"
- "People are waiting nearby!"
- "Activity is heating up!"
- "Don't miss out!"

Quiet is not absence. The globe itself is signal.

---

## Time-Aware Arrival States

HOTMESS feels different by time of day.

| Window         | Tone                                       | Copy                                          |
| -------------- | ------------------------------------------ | --------------------------------------------- |
| Daytime        | Quiet, observational, low pressure         | The room is quiet right now.                  |
| Evening        | Anticipatory                               | The night is loading.                         |
| Peak night     | Live, but controlled                       | The floor is moving.                          |
| Afterhours     | Sparse, intimate, careful                  | The signal is thinner, but not gone.          |
| Morning after  | Soft landing                               | Land first. Move later.                       |

---

## Permission States

Arrival accommodates partial permission, never nags toward full grant.

| Permission                        | Arrival behaviour                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------- |
| Location granted                  | Camera drifts toward fuzzy user area; self-marker wakes up                        |
| Location denied                   | No camera pull; copy variant: "Add location when you want the map to wake up"     |
| Notifications granted             | (no surface change at arrival)                                                    |
| Notifications denied              | **No nag.** Denied = chosen state. No "you're missing alerts" shadow copy.        |
| Camera/photo permissions          | (irrelevant to arrival; do not surface)                                           |

Denied permissions are doctrinal user choices. The system honours them
without reminding the user they chose them.

---

## Failure Mode

Mapbox can fail. WebGL can be unavailable. Network can drop. Arrival
must stay in voice even when broken.

**Approved failure copy:**

> Signal interrupted.
> Re-enter when ready.

**Forbidden failure surfaces:**

- "Oops! Something went wrong 😅"
- "Error 500 — please try again"
- generic browser error chrome
- console-flavored crash messages
- spinner that never resolves with no copy

Failure is part of HOTMESS. It still sounds like HOTMESS.

The shield must remain reachable even under arrival failure.

---

## Implementation Rules

The arrival layer must be:

- **Dismissible by time, not by required tap.** No "Got it" button.
- **Reduced-motion compatible.** Same total duration. No motion. Instant
  in/out. The doctrinal arrival promise holds identically.
- **Screen-reader readable.** Announcement order: arrival line first,
  then district context if applicable, then nothing else. Example:
  "You're on. London. Pulse." Not "Globe loading."
- **Non-blocking.** Nav, shield, and Pulse interactions remain
  available during arrival. User can dismiss by interacting.
- **Provenance-safe.** No third-party scripts, no remote welcome
  templates.
- **Time-aware.** Uses local device time, not server.
- **Location-consent-aware.** Branches per the permission table.
- **No modal.** Arrival lives in the atmosphere, not in a card.
- **No growth hook.** Zero referral prompts, zero share asks, zero
  feedback nudges in the first 5 seconds.
- **One-shot per session.** Arrival fires the first `/pulse` mount per
  session. `localStorage.hm_arrival_session_id` tracks. Subsequent
  navigations back to `/pulse` within the same session do not re-fire.

---

## Concrete Timing Spec

Dev must implement against this exact contract — not feel it out.

- Arrival line appears **600ms after `/pulse` paint complete** (globe
  visible first, language follows)
- Holds for **3500ms**
- Fades over **400ms**
- Total wall time: 4500ms
- **Reduced-motion users:** same total wall time. No animation. Line
  appears at 600ms, disappears at 4500ms, no fade.
- **Failure path:** line appears at 600ms after failure detected,
  holds 5000ms, no fade. Stays as the only on-screen content until
  user retries.

These numbers are doctrinal. PRs that change them require a doctrine
revision.

---

## Compliance

Arrival must preserve:

- 18+ gate already cleared
- no exact public GPS
- no fake live claims
- no synthetic density
- no shame-based safety copy
- no monetisation before orientation
- no dead ends
- no hidden safety access

---

## Product Meaning

Arrival must teach the product without explaining it.

The user should understand:

- Pulse is live
- the map is the product
- signals expire
- presence is optional
- safety is structural
- care exists without being clinical
- HOTMESS is not another grid

---

## Definition of Done

Arrival is correct when:

- a new user feels grounded within 5 seconds
- no one is forced into a tutorial
- quiet states feel intentional
- SOS is visible but calm
- the Pulse feels alive even when sparse
- the user understands they are entering a signal system
- no fake density or urgency is introduced
- the map remains the product
- failure still sounds like HOTMESS
- the system never sounded excited to see them

---

## Cross-references

- `docs/doctrine/01-sacred-invariants.md` — #4 (never sells symbolic
  capability), #6 (system never pretends activity), #7 (no exact
  tracking, fuzzy ≤200m)
- `docs/doctrine/07-visual-hierarchy.md` — monetisation may amplify
  atmosphere, must never override relational truth
- `docs/doctrine/08-visibility-state-architecture.md` — visibility-state
  spec covering user-online-state
- `docs/doctrine/09-onboarding-truth-architecture.md` — onboarding
  doctrine (skeleton, observation-gated)
- `docs/doctrine/10-profile-identity-doctrine.md` — profile identity
  visibility ladder + system orthogonality

---

## Final Principle

> Do not welcome the user like a customer.
> Receive them like a signal.

— end doctrine 11 —
