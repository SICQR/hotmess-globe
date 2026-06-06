# D63 — Nominator Sovereignty Doctrine

**Status:** Ratified 2026-06-05 (Phil verbal lock during #661-D PENDING copy amendment).
**Sibling:** D59 — Trusted Contact as Two-Party Agreement (covers the recipient side; this doctrine covers the nominator side).
**Cross-refs:** D33 (Memory & Permanence), D44 (Identity, Account & Persona), D48 (Spatial Identity Exposure), D49 (Entity Ontology), D59.

---

## §1 — Principle

> **A nominator does not surrender control of how their nominations appear by making them.**

The nominator is whoever extended a safety-network invitation, set up a trusted contact, configured an aftercare check-in target, or otherwise asked someone else to be part of their safety stack. Their relationship choices, their pending invites, their decision to ask, and the identities of the people they asked are sensitive in the same way the recipient's identity is sensitive.

D59 governs the recipient: they can accept, decline, or ask not to be contacted again. D63 governs the nominator: they can name people in private and in flows under their control, but the platform does not name those people back at them — or to anyone shoulder-surfing — on any surface they didn't explicitly navigate into.

---

## §2 — Surface classes

Every surface that touches a nominator's safety stack falls into one of three classes:

**Class A — Glanceable.** Visible without explicit user navigation. Home cards, lock-screen push previews, share/screenshot output, system notification trays, widgets, any place a shoulder-surfer or someone borrowing the device can see content the nominator never intentionally opened. Examples: SafetyNetworkCard on Home, CareSuiteCard on Home, push notification previews, OS notification stacks.

**Class B — Tapped.** One explicit user action away from Class A. Requires a deliberate navigation. Example: the `/safety` page proper, opened by tapping the SafetyNetworkCard.

**Class C — Private.** Inside a flow under the user's direct attention with no incidental viewers. Example: the invitation review screen ("What Glen will receive") inside the onboarding seed flow, the chat sheet, the trusted-contact detail sheet.

Doctrine applies asymmetrically by class.

---

## §3 — Class-A rules (NEVER on glanceable surfaces)

On any Class A surface, the platform **must not** display:

1. The **name** of a person the nominator invited (first name, last name, handle, or any direct identifier).
2. The **contact method** used to reach them (email address, phone number, Telegram handle — these are PII leaks even without the name).
3. **History against a specific named person** (e.g. "2 attempts to Glen", "Invited Marco 3 days ago").
4. Pending-state copy that **names the pending recipient** ("Waiting for Glen to accept" is a violation; "2 invitations waiting on a response" is fine).
5. Acceptance copy that **names the new accepter** as a notification preview ("Glen accepted" is a violation when pushed to the lock screen; the nominator must open the app to see who).

On Class A surfaces, the platform **may** display:

- The **count** of contacts in each state (0 pending / 2 pending / 1 accepted).
- The **state word** (`NOT_ACTIVE`, `PENDING`, `ACTIVE`) — these are derived from the canonical oracle (`get_my_safety_network_summary()`) per D33 substrate-honesty.
- **Generic prompts** ("Build network", "View", "Manage") that don't leak relationship content.
- **Functional state** ("SOS contact alerts are not active yet.") — describes the system, not the relationship.

---

## §4 — Class-B and Class-C rules

Class B (the `/safety` page): names, contact methods, statuses, and history may appear, because the user has explicitly navigated here. The page is no more sensitive than opening their email inbox.

Class C (review screens, chat, configuration flows): names appear freely. These are the surfaces where the nominator is doing the naming.

The doctrine line is between "the platform showed me this without my asking" (Class A) and "I went to look at this" (Class B/C).

---

## §5 — Threat model

The doctrine is conservative because the threats are real and common:

- **Controlling partner / abusive ex.** May have physical access to the device. A glanceable Home that names "Glen" tells them who their target trusts.
- **Shoulder-surfer.** Bar, club, transit, queue — anyone behind the user can see the Home screen.
- **Lost / stolen device.** Lock-screen previews are visible without unlock.
- **Screen-recorder / screenshot for support.** User screenshots Home to send to support or post on social — names of contacts should not be in that screenshot.
- **Cohabitant.** Roommate, family member, friend who picks up the phone.

The platform does not get to decide whether the user is in a high-risk situation. We assume they might be, and we never name third parties on Class A surfaces. The cost is small (an extra tap to see who); the protection is meaningful.

---

## §6 — The PENDING amendment (worked example)

The original Home SafetyNetworkCard PENDING copy:

> Waiting for **Glen** to accept

is a Class A violation: it names Glen on a glanceable surface. A shoulder-surfer, a partner, or anyone with incidental device access learns who the user asked to be in their safety stack.

The amended copy (PR #923 → #931 line):

> 2 invitations waiting on a response.
> SOS contact alerts are not active yet.

complies: count instead of name, state word instead of relationship history, functional sentence instead of personal one. The user still gets enough glanceable state to know whether to act. The third party stays unnamed.

This amendment is the founding precedent for D63.

---

## §7 — Anti-patterns to refuse

When a future surface, hook, push notification, or share flow is being designed, refuse any of the following without ratification:

- "Now showing: Glen accepted your invitation" as a push notification body (lock-screen visible → Class A).
- A widget that lists trusted contacts by name.
- A "share my safety setup" feature that exports names.
- A status badge that uses initials of the contact ("Waiting for **G.**" — initials are identifying if the device has been seen recently).
- An ActiveBeaconModule chip that names current responder mid-event (cross-cuts D60 Safety Event Orchestration; ratify there before any name-in-event surface).
- A debug/admin surface visible to support that names contacts without explicit per-incident authorisation.

When in doubt, the rule is: **if Class A, use count + state + generic prompt. If you need to name, the user must have tapped to get here.**

---

## §8 — Substrate alignment

D63 only works if the count and state are derived from a single canonical oracle. If one surface reads from `trusted_contacts` row count and another reads from `get_my_safety_network_summary().state`, the surfaces drift and a user with 2 pending invitations sees one surface saying "0 contacts" and another saying "2 invitations waiting". The state word becomes a lie.

This is why PR #931 (Care Suite + Safety Network unification) is the substrate work that makes D63 enforceable. Both Class A surfaces now read from the same RPC. There is one oracle for "what state is this user's network in" and every Class A surface defers to it.

D33 (substrate-honesty) is therefore a hard prerequisite for D63 compliance. They ship together.

---

## §9 — Implementation status

**Enforced:**
- `SafetyNetworkCard` Class A — count + state, no names (PR #923 amendment, locked 2026-06-05).
- `CareSuiteCard` Class A — count + state, no names; substrate aligned to `get_my_safety_network_summary()` (PR #931, locked 2026-06-05).

**Pending audit:**
- Push notification payloads (D58 dispatcher and D60 event orchestration must apply D63 to lock-screen-visible body text).
- Share / screenshot exports of Home — does any current flow render Home into an exportable image with names visible? Audit before next ratification.
- ActiveBeaconModule, beacon-related cards — if they ever surface a responder name during a live event, the surface class needs ratification.
- Admin / moderation surfaces — confirm they don't render contact names without explicit per-event authorisation.

**Not yet specified:**
- Whether a count of zero (`0 invitations`) constitutes leakage by absence (negative information about the user's social setup). Open question for amendment.
- Whether displaying the user's *own* first name on Class A counts as Class A leakage (their device, their name — probably out of scope, but flag).
- Voice assistant / Siri Intent surfaces — TBD.

---

## §10 — Doctrine relationship map

- **D59** — Two-Party Agreement. Recipient side. D63 is the nominator side of the same contract.
- **D33** — Memory & Permanence. The substrate-honesty requirement makes D63 enforceable.
- **D44** — Identity, Account & Persona. Names live in identity layer; D63 governs what leaks to surface layer.
- **D48** — Spatial Identity Exposure. Sibling concept for location data; D63 transposes the principle from "where" to "who I trust".
- **D49** — Entity Ontology. The Existence/Broadcast/Perception split: this doctrine governs the Perception layer for trusted-contact entities.
- **D60** — Safety Event Orchestration. Live SOS events must apply D63 to event-state notifications (don't push "Glen has acknowledged" to lock screen without ratification).
- **D17 / D16** — Surface Layer / Rail Hierarchy. The Class A/B/C taxonomy here extends Surface Layer Doctrine into the relationship domain.

---

## §11 — Amendment process

Future changes to this doctrine require a worked example: identify the Class A surface, identify the threat, propose the substitution. Phil-locked amendments go in this section.

(No amendments yet.)

---

**End D63.**
