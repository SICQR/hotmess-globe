# 00 — Canonical Naming

**Status:** LOCKED — Phil 2026-05-27.
**Purpose:** one source of truth for the names HOTMESS uses for tiers, states, badges. Every future PR refers here. Renaming code to match is a separate cleanup PR (see §Implementation gap).

---

## Relationship states (relational gravity)

```
MESS  →  CONNECT  →  TRUSTED
```

| State | Meaning |
|---|---|
| **MESS** | strangers in the field. anyone you haven't mutually opted into. |
| **CONNECT** | mutual interest. **mutual boo only** (not "accepted boo + message"). both sides chose. |
| **TRUSTED** | chosen circle. explicit invite + accept + **24h cool-down** before SOS-enabled. reversible without punishment. |

Locked rules:
- Every escalation requires **mutuality**.
- Every escalation **changes capability** (see relationship-permissions-matrix).
- Every escalation **changes emotional stakes** (ceremonial transition copy, not gamified).
- TRUSTED is always **reversible** — downgrade / revoke / pause / remove — without third-party alerts or retaliatory UX.

---

## Membership tiers (cultural progression)

| Tier | Vibe | Price |
|---|---|---|
| **MESS** | the lurker. free. | £0 |
| **REGULAR** | every night out. a regular. | £9 / mo · £80 / yr |
| **CLOSE** | always on. people matter. | £19 / mo · £180 / yr |
| **CONVICT** | the family. patron. | **£39 / mo · £300 / yr** |

Plus one immutable cohort badge:

- **FOUNDING 250** — permanent. sacred. **never resold, reopened, duplicated, or cheapened.** Becomes HOTMESS folklore.

Locked rules:
- Names are identity-first, not SaaS ("MESS" not "Free", "CONVICT" not "Enterprise").
- REGULAR > "CONNECTED" — REGULAR carries nightlife belonging.
- CONVICT pricing is patron-tier, not luxury SaaS — £39/£300 is the ceiling.
- Upgrade prompts must be **invitational, not transactional** (see upgrade-surface-doctrine).

---

## Relational semantics table (the world HOTMESS describes)

| Action | Meaning |
|---|---|
| **Boo** | attraction |
| **Connect** | mutuality |
| **Trusted** | responsibility |
| **Regular** | belonging |
| **Convict** | commitment |

This is the cultural vocabulary. Use these words in copy. Don't dilute.

---

## Implementation gap (today vs locked doctrine)

| Surface | Today | Locked |
|---|---|---|
| `profiles.subscription_tier` | `FREE / PREMIUM / ELITE` (legacy) | `MESS / REGULAR / CLOSE / CONVICT` |
| `constants.jsx MEMBERSHIP_TIERS` | `BASIC / PLUS / PRO` + `FREE/CHROME` aliases | `MESS / REGULAR / CLOSE / CONVICT` |
| `L2MembershipSheet.jsx` | hardcoded English names | reads canonical from constants |
| `useUserContext.isPremium` | checks `PREMIUM \|\| ELITE` | checks `REGULAR \|\| CLOSE \|\| CONVICT \|\| isBetaActive` |
| `FoundingTierLayer.tsx` | "Founding Partner" globe layer | rename → "Founding 250" |
| `taps` table | `boo` taps recorded | + add `mutual_at` derived view = CONNECT state |
| `trusted_contacts` | exists with `notify_on_sos` | + add `accepted_at`, `cooldown_until`, `revoked_at` for TRUSTED state machine |

Rename PR is owed. Doctrine docs ship first so the rename PR has a clear target.

---



---

## Sacred Invariant: HOTMESS never sells symbolic capability

**Locked Phil 2026-05-27 after the power-up vapourware audit.**

If a user pays for a feature, the effect must be:

- **observable** — the user can see / feel / hear / count the difference
- **experiential** — it changes their actual moment, not just a database row
- **truthful** — the displayed state matches the real state
- **operational** — it does the thing it says it does, every time

This governs boosts, subscriptions, visibility, safety, identity, moderation, and commerce.

**Forbidden patterns** (each one a real instance caught in audit):

- Database row written but no renderer reads it (e.g. globe_glow vapourware)
- UI label flipped to "Active" without behavioural change (e.g. incognito-as-label-only)
- Feature gate accepts boost but engine never plumbed (e.g. profile_bump dead-wired)
- Single-use credit with no decrement (effectively infinite use for a token price)
- Tier upgrade that grants nothing the user couldn't already do

**Detection ritual:** every monetised feature gets a single end-to-end test answering:
*"If I pay for this, what does another user / my own future session OBSERVE differently?"*
If the answer is "nothing" or "a label changed," it does not ship.


## Cross-references

- `01-relationship-permissions-matrix.md` — what each state can DO
- `02-membership-entitlement-matrix.md` — what each tier UNLOCKS
- `03-identity-system-spec.md` — what each profile SHOWS (badges, rings, streaks, XP)
- `04-upgrade-surface-doctrine.md` — when / how to ask for the upgrade


---

## Tone doctrine — voice rules for every surface

**Locked Phil 2026-05-27.** Apply everywhere copy is written — app, invites, push notifications, emails, marketing.

HOTMESS voice should feel:

- confident
- slightly dangerous
- emotionally literate
- understated
- lived-in
- *not* trying to sound edgy

The product is already the atmosphere. **The copy doesn't need to cosplay it.**

### Avoid (tells someone we're outside the world looking in)

- "actually"
- "no bullshit"
- "hits different"
- "for the chase"
- "dirty" used performatively
- startup swagger
- over-explaining features emotionally
- oversexualised marketing copy
- fake underground energy

### Prefer (tells someone we're already inside the world)

- "You're in."
- "Stay close."
- "See who's still around."
- "The pulse is live."
- "Trusted circle."
- "Aftercare available."
- "Tonight's moving."
- "You made it home?"
- "Forever. Sacred."
- implication > exposition
- restraint > emphasis
- ritual language > feature lists
- nightlife realism > marketing tone

### Cultural truth

> You do not need to convince people HOTMESS is interesting. The product itself is strange enough, coherent enough, emotionally differentiated enough.

The marketing tone can relax. Confidence comes from not needing to perform.

### Application — beta invite v3 (canonical)

```
HOTMESS is open.

14 days free.
No card.
First 250 get the Founding 250 badge permanently.

Map. Ghosted. Radio. SOS. Aftercare.
The whole thing.

Built for the nights that blur a bit at the edges.

If you know, you know.

https://hotmessldn.com/redeem/BETA-HOTMESS

— Phil
```

This replaces all earlier invite drafts. Any future invite copy follows this register.
