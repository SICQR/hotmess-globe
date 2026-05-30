# 01 — Relationship Permissions Matrix

**Status:** LOCKED — Phil 2026-05-27. See `00-canonical-naming.md` for state names.

**Purpose:** every capability in HOTMESS belongs to a relationship state. This doc is the single truth for who can do what.

---

## Three states (re-stated for context)

```
MESS  →  CONNECT  →  TRUSTED
```

| | MESS | CONNECT | TRUSTED |
|---|---|---|---|
| Trigger to enter | (default) anyone you haven't mutualled | **mutual boo only** | explicit invite + accept + **24h cool-down** |
| Reversible | n/a | unilateral block | downgrade / pause / revoke (no third-party alert) |
| Emotional stakes | low | medium | high |

---

## Capability matrix

Legend: ✅ allowed · ⚠️ partial · ❌ blocked

### Discovery
| Capability | MESS | CONNECT | TRUSTED |
|---|---|---|---|
| See beacon on map | ✅ | ✅ | ✅ |
| See approximate distance bucket | ✅ ("<5 min", "far away") | ✅ | ✅ |
| See exact distance | ❌ | ⚠️ (in chat only) | ✅ |
| See last_active | ❌ | ✅ | ✅ |
| See verified status | ✅ | ✅ | ✅ |
| See profile photos | ✅ | ✅ | ✅ |
| See bio | ✅ | ✅ | ✅ |
| See active beacon details | ⚠️ (title only) | ✅ | ✅ |

### Communication
| Capability | MESS | CONNECT | TRUSTED |
|---|---|---|---|
| Send boo | ✅ | ✅ | ✅ |
| Receive boo | ✅ | ✅ | ✅ |
| Open chat | ❌ (boo-then-mutual required) | ✅ | ✅ |
| Send media in chat | ❌ | ✅ | ✅ |
| Share location in chat | ❌ | ✅ (consent each time) | ✅ |
| Get read receipts | ❌ | ⚠️ (mutual opt-in) | ✅ |
| Voice notes | ❌ | ⚠️ (CLOSE+ tier) | ✅ |
| 30s video DM | ❌ | ⚠️ (CLOSE+ tier) | ✅ |

### Safety
| Capability | MESS | CONNECT | TRUSTED |
|---|---|---|---|
| Be a notify-target for someone's SOS | ❌ | ❌ | ✅ |
| Receive their check-in expiry alerts | ❌ | ❌ | ✅ |
| See their real-time beacon coords | ❌ | ❌ | ✅ |
| Be their Aftercare partner | ❌ | ❌ | ✅ |
| Trigger silent SOS to them | ❌ | ❌ | ✅ |
| Block / report | ✅ | ✅ | ✅ (auto-downgrades to MESS) |

### Identity / signal
| Capability | MESS | CONNECT | TRUSTED |
|---|---|---|---|
| See their tier pill (MESS/REGULAR/CLOSE/CONVICT) | ✅ | ✅ | ✅ |
| See their cycle streak | ❌ | ✅ | ✅ |
| See their Trust badge (trusted-by-N count) | ✅ | ✅ | ✅ |
| See who's TRUSTED them | ❌ | ❌ | ❌ (private to owner) |

---

## Transitions

### MESS → CONNECT
- Trigger: **mutual boo** (both send within 7 days)
- Side effects:
  - 1-line transition copy: *"You and SMASH are now connected."* (subtle, no fireworks)
  - Chat thread becomes reachable
  - Locations become shareable in chat
  - Both sides see `last_active`
- Reversible by either side via unilateral block (returns to MESS)

### CONNECT → TRUSTED
- Trigger: Owner sends explicit `Add to Trusted Circle` invite from chat or profile → recipient accepts → **24-hour cool-down begins**
- 24h cool-down rationale: prevents impulse-trust on a Saturday night
- During cool-down: badge shows "Pending trust — locks in 23h 47m" — neither party can use TRUSTED-only safety features yet
- After cool-down: full TRUSTED capability unlocks
- Copy: *"SMASH joined your trusted circle. Safety features unlock in 24 hours."*
- Reversible by either side **at any time** via:
  - "Pause" — temporarily downgrades to CONNECT (e.g. they're abroad)
  - "Revoke" — downgrades + clears cool-down. No third-party alert. No retaliation UX.

### Either direction downgrade
- **Owner is never told another user removed them from their TRUSTED list.** Removed silently from notifications/permissions.
- **Block** auto-downgrades both directions to MESS and is one-way: blocked party can't see blocker's profile/beacon.

---

## Implementation gap

| Surface | Today | Locked |
|---|---|---|
| `taps` table | records boos | + materialised view `connections` keyed on mutual boo within 7 days |
| `trusted_contacts` | has `notify_on_sos` | + `accepted_at`, `cooldown_until`, `paused_at`, `revoked_at` |
| `messages` RLS | open between any two users | gated on `connections` view OR `trusted_contacts` (replace current logic) |
| Profile sheet | shows everything | gates content per current viewer state |
| SOS fanout | uses trusted_contacts as-is | filter where `cooldown_until <= now() AND paused_at IS NULL AND revoked_at IS NULL` |
| Chat sheet | open | gates on `connections` view OR existing thread |

---

## Anti-patterns (NEVER do)

- ❌ Public TRUSTED list — no one sees who someone trusts (only the owner)
- ❌ Trust streak / "longest trusted relationship" — gamifies an intimate decision
- ❌ Auto-suggest TRUSTED candidates — must be deliberate invite
- ❌ Notify a user when someone downgrades them out of TRUSTED — humiliating
- ❌ Trust-as-status flex — keep it functional, not a flex

---

## Cross-references

- `00-canonical-naming.md` — what the states are
- `02-membership-entitlement-matrix.md` — what tiers gate (orthogonal axis)
- `03-identity-system-spec.md` — what badges/streaks display
- `04-upgrade-surface-doctrine.md` — when to nudge upgrade
