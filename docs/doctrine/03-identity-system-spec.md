# 03 — Identity System Spec

**Status:** LOCKED — Phil 2026-05-27.

**Purpose:** what each profile shows. Ambient status, not competitive ranking. Identity texture, not leaderboard.

---

## Core principle

> XP = ambient status. Not competitive. Atmospheric. Memory-based. Participation-oriented.

HOTMESS measures **presence**, not conquest. Cycle streaks count nights you showed up, not boos you sent.

---

## Profile surfaces (priority order)

What every viewer sees on a profile, top to bottom, in order:

1. **Avatar** (with verified ring if ID-verified)
2. **Display name + @username**
3. **Tier pill** — `MESS / REGULAR / CLOSE / CONVICT` (lowercase, subtle, not flexy)
4. **Founding 250 badge** (if applicable — gold pip, permanent)
5. **Online state** — `online · away · offline` (granular to viewer's relationship state, see §Visibility rules)
6. **Approximate area** — fuzzed location (Sacred Invariant #7)
7. **Bio**
8. **Cycle streak** — *"6 weeks running"* (visible to CONNECT + TRUSTED only)
9. **Active beacon** (if any)
10. **Trust badge** — *"trusted by 12"* — abstract count, never names

---

## Badges (visual identity tokens)

| Badge | Earned via | Display | Decays? |
|---|---|---|---|
| **Verified ring** (gold circle around avatar) | Stripe Identity or Veriff ID check | always visible | no |
| **Founding 250** (gold pip top-right of avatar) | Among first 250 beta claimers | always visible | NEVER |
| **Care badge** (cream heart) | Verified Trust relationship history (≥3 active TRUSTED for ≥30 days) | always visible | yes, drops if Trust count < 3 |
| **Convict badge** (subtle V chip) | CONVICT tier active | always visible | yes, on tier downgrade |
| **First-month** badge | Profile less than 30 days old | visible during window | yes, after 30 days |

### Anti-flex constraints
- No "Top Booer" / "Most Connected" / "Biggest Network" leaderboards
- No "celebrity" verification (the gold ring = identity verified only, not influencer status)
- No public XP number — XP is internal, not displayed
- No streak above 99 weeks displays — "99+" is the cap to avoid year-counting flex

---

## Streaks (presence-based)

| Streak | Definition | Visibility |
|---|---|---|
| **Cycle streak** | consecutive weeks where the user opened HOTMESS and was "online" at least once between 22:00–04:00 local | self + CONNECT + TRUSTED |
| **Trust streak** | consecutive months a TRUSTED relationship has been active (per relationship, not per user) | self only |
| **Care streak** | consecutive months as someone's Aftercare partner | self only |

Streak rules:
- Reset on a calendar week with zero qualifying activity (no exceptions)
- "Quiet pause" feature: any user can pause streaks for 4 weeks once per quarter (medical / mental health / travel) without losing them
- Streaks count up but display caps at 99 to avoid flex

---

## XP economy

Earn:
- Profile signup + age + ToS attestation → +20
- First beacon drop → +5
- Boo received → +1
- Boo sent → +0.5 (low — discourages spam-booing)
- Mutual boo (= CONNECT) → +5
- First chat message in a new CONNECT → +2
- Verified profile (ID check) → +20
- TRUSTED accepted by someone → +10
- 7-day check-in streak completed safely → +5
- Music play (capped at 5/day) → +0.5
- Marketplace listing sold → +3
- Feedback submitted (capped at 3/day) → +1

Spend (cosmetic / status, NEVER pay-to-win):
- Custom beacon glow color (CLOSE+ unlock palette; MESS/REGULAR can buy individual colors at 50 XP each)
- Avatar ring color variants (50 XP)
- Profile theme themes (200 XP each)
- "Drop a memory" — pin a beacon for 24h with no proximity check, archive-only (300 XP, REGULAR+)

XP does NOT unlock:
- Higher beacon limits (that's the tier)
- More TRUSTED slots (that's the tier)
- Visibility / ranking (deliberately never)
- Discounts (only the tier matters)

---

## Visibility rules

| Surface | MESS viewer | CONNECT viewer | TRUSTED viewer | Self |
|---|---|---|---|---|
| Online state | ❌ | ✅ "online / away / offline" | ✅ + last_active timestamp | ✅ + last_active |
| Cycle streak | ❌ | ✅ | ✅ | ✅ |
| Trust badge count | ✅ | ✅ | ✅ | ✅ |
| Tier pill | ✅ | ✅ | ✅ | ✅ |
| Founding 250 | ✅ | ✅ | ✅ | ✅ |
| Verified ring | ✅ | ✅ | ✅ | ✅ |
| Approximate area | ✅ ("near Soho") | ✅ | ✅ + bucket distance | ✅ + exact |
| Active beacon details | ⚠️ title | ✅ | ✅ + coords | ✅ |
| Bio | ✅ | ✅ | ✅ | ✅ |

Sacred Invariant #7 holds at every layer: **no exact coords ever rendered** to anyone but self.

---

## Implementation gap

| Surface | Today | Locked |
|---|---|---|
| `profiles.xp_balance` | exists | adopt scoring rules above |
| `profiles.current_streak` | exists, semantics unclear | rename → `cycle_streak_weeks` |
| `profiles.level` | exists, unused publicly | hide entirely; XP is ambient, not levelled |
| Verified ring | renders if `is_verified=true` | rename concept to "ID Verified" so it can't be conflated with influencer verification |
| Founding 250 badge | not built | new badge — populate from first 250 `beta_invites.claimed_by` users |
| Cycle streak compute | not built | nightly cron + materialized view |
| Tier pill on profile | not built | render from `subscription_tier` (post-rename) |
| Trust badge | not built | view + cron over `trusted_contacts` |
| XP earn hooks | partial | wire all event sources above |
| Anti-flex constraints | none | enforce: no leaderboards, no public XP display |

---

## Cross-references

- `00-canonical-naming.md` — tier + state names
- `01-relationship-permissions-matrix.md` — what each state can see
- `02-membership-entitlement-matrix.md` — what each tier unlocks
- `04-upgrade-surface-doctrine.md` — when / how to ask for the upgrade
