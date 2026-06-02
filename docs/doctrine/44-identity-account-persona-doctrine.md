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
- Any system surface that informs the user a second account might exist

If the user wants to link, they sign in with the second method while authenticated. That is the only protocol. The system never notices anything else. If the user accidentally creates a second account, the system permits it to exist; recovery is the user's own decision, made later from inside an authenticated session via the linking ceremony.

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

## §11 The Linking Ceremony

When a user authenticated as account A signs in via a second auth method, that is **identity linking**, not signup, not merging, not identity fusion. The system must treat it as such. The user must see it as such. Language matters because the psychological framing of this moment determines whether the user trusts the system with their identity context.

For queer users specifically, this is one of the highest-risk privacy moments in the platform. Telegram identity ≠ email identity ≠ phone identity ≠ public persona. Each carries a different exposure risk, a different social context, and a different safety meaning. The ceremony exists to preserve that separation while permitting the user to weave the methods together on their own terms.

### §11.1 Framing rule (LOCK)

Linking is **never** framed as:

- "Merge accounts"
- "Sync identities"
- "Combine profiles"
- "Fuse"

Linking is framed as:

- "Connect [provider]"
- "Add another way to sign in"

Linking is conceptually: adding a new key to a private space. Not rewriting the space.

### §11.2 The 4-step ceremony (LOCK)

**Step 1 — Explain.** Plain, non-technical language. Example: *"You're connecting Telegram to your existing HOTMESS account. Your profile, messages, boos, and history stay the same. Your Telegram account will never be shown to other users."*

**Step 2 — Explicit acknowledgement.** Required affirmative input from the user. Not an auto-checked box. Not a button press that implies consent. One explicit action confirming the user understands they are adding a sign-in method to an existing account.

**Step 3 — Provider auth.** Standard provider OAuth/auth flow. No special handling.

**Step 4 — Post-link confirmation.** Minimal. Example: *"Telegram connected. You can now use Telegram to sign in to this HOTMESS account."* A subtle secondary action — *"View connected logins →"* — surfaces the full inventory only if the user asks. The default confirmation does not enumerate the user's connected methods. Inventory is opt-in viewing, never default exposure. Linking is presented as additive — adding a key — not as fusion or aggregation.

### §11.3 The auth-state distinguisher (LOCK)

The user's session state at the moment of provider sign-in determines the intent. There is no other branch.

| User state | Provider sign-in action | What happens |
| --- | --- | --- |
| Authenticated as account A | Sign in with new provider B (not currently linked anywhere) | **§11.2 Linking Ceremony.** Add `auth_identities` row to account A. No new account, no new persona. |
| Authenticated as account A | Sign in with provider B that is already in `auth_identities` for any account | **Refuse.** Generic message: *"This login method can't be connected right now. Please sign out and try again."* No mention of another account. No "already linked." No "switch accounts." No acknowledgement that account existence is the reason. The user recovers naturally by signing out and signing back in with that provider, which lands them in the rightful account context. |
| Unauthenticated | Sign in with provider B (no prior `auth_identities` for that provider+id) | **New account creation.** New account, new `auth_identities` row, new default persona. No collision check. No "you may already have an account" surface. The system does not notice and does not look. |

Ambiguity protects privacy here. Refusal language that implies account existence — "another account," "already connected," "belongs to," "switch accounts" — is forbidden and leaks the topology this doctrine exists to protect.

### §11.4 Provider data import (LOCK)

The provider returns data. The system never automatically applies that data to the persona. The user explicitly chooses, field by field.

For Telegram specifically:

| Provider data | Default | User can import? |
| --- | --- | --- |
| Telegram avatar | Not imported | Optional, explicit one-tap import |
| Telegram display name | Not imported | Optional, explicit one-tap import |
| Telegram username (`@handle`) | Never auto-public | Never auto. User can copy into persona handle manually if they choose. |
| Telegram phone number | Never public, never stored beyond auth | Never |

For Apple / Google / email / phone providers, the equivalent matrix is declared per-provider in a slice spec inheriting from D44. Default for any field is *not imported, not auto-public*.

### §11.5 Unlink discipline (LOCK)

Users may unlink any auth method at any time, with one constraint: **at least one auth method must remain.** Unlinking the last auth method requires the user to first add a replacement. No account is permitted to become unreachable.

When an auth method is unlinked, the `auth_identities` row is hard-deleted. The provider-side relationship may persist (Telegram still has its own record of the OAuth grant), but the system retains nothing about the linkage after unlink. Re-linking the same provider is a fresh §11.2 ceremony.

### §11.6 Language rules (LOCK)

The following terms are **forbidden** in any user-facing surface describing auth linking:

- "Merge accounts"
- "Combine profiles"
- "Sync identities"
- "Fuse"
- "Account fusion"

The following terms are **permitted**:

- "Connect [provider]"
- "Add a way to sign in"
- "Link"
- "Disconnect" (for unlink)

---

## §12 Non-human actors

Bots, service integrations, automation actors, and operator agents are out of scope for this doctrine. They do not inherit Account or Persona status by default and they are not subject to the Privacy Invariant on their own behalf. Their access patterns, identity boundaries, and lifecycle are resolved separately when each is built.

---

## §10 Ratification trail

- Today's surfacing: Phil 2026-06-02, identity fragmentation analysis following Glen duplicate discovery during field test
- Privacy Invariant locked: 2026-06-02 — queer-safety primary justification
- §3 linking discipline locked: 2026-06-02 — system-initiated linking explicitly forbidden, no fuzzy match
- §4 scope matrix locked: initial defaults; ambiguous entries to be slice-resolved
- §5 multiplicity ships only after slice spec inherited from this doctrine
- §11 Linking Ceremony locked: 2026-06-02 — 4-step ceremony, auth-state distinguisher, provider data import discipline, unlink rule, language rules.
- §11 amendments locked: 2026-06-02 — §11.3 third-row "provider already linked" hardened to refuse-only (no account-existence semantics); §11.4 unauth-collision protocol **removed entirely** (the system never operationalises noticing); §3 cross-method exception removed; §11.2 Step 4 simplified to minimal confirmation with subtle "View connected logins →" secondary action (no default inventory exposure); §12 added as non-human-actor placeholder.

---

*End of D43.*
