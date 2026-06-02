# D44 — Identity, Account & Persona Doctrine

**Status:** Constitutional, locked
**Ratified:** Phil 2026-06-02
**Supersedes (implicitly):** the assumption that `auth.users.id` = `profiles.id` = social identity
**Affects:** D03 (identity-system-spec), D10 (profile-identity), D20 (identity) — those three predate this and need review for amendment or supersession in a follow-up.

---

## §0 Why this exists

The conflation of authentication method with social identity is HOTMESS's deepest architectural defect. Glen has two profile rows because he authenticated twice — once via Telegram, once via email. Every personal entity in the system (messages, boos, mutuals, push subscriptions, beta windows, safety contacts, cooldowns) keys off the assumption that the auth method *is* the identity. It is not.

Identity fragmentation is not a rendering bug. It is a privacy and safety primitive. Lock the model before shipping further code in this space.

---

## §1 The Three-Layer Model

| Layer | Table | Meaning | Exposed publicly? |
| --- | --- | --- | --- |
| Authentication Method | `auth_identities` | How a human proves they own an account | Never |
| Account | `accounts` | The human container | Never |
| Persona | `personas` | The social face | Yes (handle, avatar, bio) |

**Auth methods** are infrastructural. They authenticate. They are not identity.

**Accounts** are the human container. They own the trust graph, the beta window, the payment relationship, the safety contacts, the push subscriptions. The account ID is never rendered to other users. Administrative only.

**Personas** are the social layer. They carry handle, display name, avatar, bio, beacons, social presence. Multiple personas per account may exist when the feature ships; each persona is its own public identity.

---

## §2 The Privacy Invariant — HARD LOCK

> Nobody — not other users, not admin tooling, not staff, not logs, not analytics — knows that two auth methods belong to the same human unless the owner explicitly exposes that linkage.

This is queer-safety architecture, not convenience. Telegram handles, email addresses, phone numbers, legal names, and social personas may exist in fundamentally different contexts of the user's life. The system that bridges them silently is the system that doxxes them.

The Privacy Invariant takes precedence over deduplication efficiency, moderation convenience, analytics richness, and product simplicity. There is no "but the user might want…" carveout. The user opts in or the linkage does not exist in our knowledge.

---

## §3 Linking Discipline

Account linking is **user-initiated only**.

**Permitted:** a user authenticated as account A signs in via a second method while still authenticated → that method becomes a new row in `auth_identities` linked to account A. The system never speaks first.

**Prohibited:**

- Fuzzy matching across auth methods
- Probabilistic "same human" detection (active or passive)
- Email matching across providers
- Phone matching across providers
- IP / device / behaviour correlation for linkage purposes
- Admin reports that surface "potential duplicates"

If the user wants to link, they sign in with the second method while authenticated. That is the only protocol.

---

## §4 Account vs Persona Scope

Every personal entity in the system MUST declare its ownership layer. No entity is implementation-defined; the layer is doctrinal.

**Account-scoped (locked):**

- Beta entitlement and window
- Push subscriptions
- Safety contacts and emergency channels
- Payment methods and subscription state
- Trust graph (boos given/received)
- Cooldowns
- Blocks
- Account-level moderation actions

**Persona-scoped (locked):**

- Handle and display name
- Avatar and photos
- Bio
- Beacons
- Vibe tags, looking-for, scene tags
- Social presence (online, last seen)

**Ambiguous — to be resolved per-entity when persona multiplicity ships:**

- Messages (probable: persona-scoped on send, account-aggregated in inbox)
- Mutuals (probable: persona-pair scoped)
- Notifications (probable: persona-scoped, account-aggregated)
- Telegram link tokens
- Telegram bot identity

No persona-multiplicity feature ships until the per-entity scope is declared.

---

## §5 Multiplicity Discipline

**Phase 1: one persona per account.** Architecture supports multiplicity. UI does not expose it. Single-persona-per-account is the beta posture.

**When multiplicity ships:**

- Hard cap per account (not unbounded)
- Switching contract: what data is visible across personas, what is not
- No ban evasion: account-level moderation persists across all personas
- No cooldown evasion: persona switching does not reset trust-graph state
- No safety bypass: SOS, trusted contacts, age verification all account-scoped

Multiplicity is not a beta feature.

---

## §6 Constitutional Connection — State Ownership

This doctrine is the highest-stakes instance of a more general rule: **every datum has exactly one authoritative owner, named at the right layer.** Identity is where misnaming the owner is irrecoverable. The State Ownership Doctrine (when written) will generalise this principle across notifications, routing, sheets, gestures, and trust state.

---

## §7 What this doctrine does not do

This doctrine deliberately does not specify:

- Migration sequencing (separate slice docs)
- Schema details beyond table names
- UX of account linking
- UX of persona switching
- Detection heuristics (because there are none — see §3)
- Persona-feature timeline

Those belong in implementation slices that inherit from this doctrine.

---

## §8 What this doctrine forbids

Until a slice spec exists that inherits from this doctrine and is ratified, none of the following may be implemented:

- Auto-merge of duplicate accounts (data layer or UI layer)
- System-initiated "potential duplicate" surfacing in any surface, including admin
- Persona-multiplicity UI
- Cross-auth-method analytics that joins on probable identity
- Admin reports that surface "users with multiple accounts"
- Any feature that reads `auth.users` as the identity rather than the auth method

---

## §9 Glen and the known instance

The current known case (Glen — Telegram + email, two `profiles.id`s) is resolved **manually**, with the user's explicit consent.

Protocol:

1. Phil contacts Glen via Telegram (the auth method Glen is most active on) — out-of-band.
2. Phil asks Glen which auth method he wants to be primary and whether he wants to merge.
3. If Glen consents: one-time SQL migration with audit trail, moving messages / boos / push subs / beacons to the canonical row, retiring the other.
4. If Glen declines: both rows remain. The UI dedupe pass from PR #820 collapses his grid render. Communication continues fragmented until Glen changes his mind.

Future instances follow the same protocol until §3 evolves into an opt-in linking flow.

No automation. No batch script. No detection job.

---

## §10 Ratification trail

- Today's surfacing: Phil 2026-06-02, identity fragmentation analysis following Glen duplicate discovery during field test
- Privacy Invariant locked: 2026-06-02 — queer-safety primary justification
- §3 linking discipline locked: 2026-06-02 — system-initiated linking explicitly forbidden, no fuzzy match
- §4 scope matrix locked: initial defaults; ambiguous entries to be slice-resolved
- §5 multiplicity ships only after slice spec inherited from this doctrine

---

*End of D43.*
