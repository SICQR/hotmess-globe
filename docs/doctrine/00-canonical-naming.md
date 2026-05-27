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

## Cross-references

- `01-relationship-permissions-matrix.md` — what each state can DO
- `02-membership-entitlement-matrix.md` — what each tier UNLOCKS
- `03-identity-system-spec.md` — what each profile SHOWS (badges, rings, streaks, XP)
- `04-upgrade-surface-doctrine.md` — when / how to ask for the upgrade
