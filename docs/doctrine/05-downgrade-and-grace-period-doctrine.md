# 05 — Downgrade & Grace Period Doctrine

**Status:** LOCKED — Phil 2026-05-27.

**Purpose:** when a user drops tier — by lapsed payment, beta expiry, or explicit downgrade — their data and identity degrade **gracefully, not punitively**. Never destroys what the user built. Never interrupts mid-session.

> "Money buys capability + status, not access to other humans." — also applies to losing the money.

---

## Core principle

> Downgrade is a posture, not a punishment.

If a user paid for CLOSE for six months and lapses, HOTMESS does not become hostile. Their data is theirs. Their relationships are theirs. They lose the *new things* they could do at CLOSE — they do not lose what they already are.

---

## Universal rules

1. **No mid-session interruption.** Whatever tier a user signed in as, they finish that session at that tier. Downgrade activates on next cold launch.
2. **7-day grace window.** Lapsed paid tiers get 7 days of full access while we soft-remind. Beta cohort gets 3 days (shorter because the deal is explicit — see beta rules below).
3. **Soft reminders only.** Push notification at T-24h before grace ends. In-app chip on day 1 of grace + day 5. No interstitials, no countdown timers.
4. **No data destruction.** Anything the user created stays in the DB exactly as it was. Visibility / mutability changes; existence does not.
5. **Restoration is one-tap.** If they re-subscribe within 30 days, every frozen item un-freezes instantly. After 30 days, frozen items archive (still recoverable on request, never deleted).

---

## Per-entitlement fallback rules

| Feature | On downgrade | Re-subscribe within 30d | Re-subscribe after 30d |
|---|---|---|---|
| **Trusted contacts over new cap** | Freeze extras (no SOS fanout to them, but they stay in the list, greyed) | Un-freeze, full restoration | Un-freeze, full restoration |
| **Active beacons over new duration** | Run until current expiry; new drops use new cap | n/a | n/a |
| **Marketplace listings over new cap** | Existing listings stay live; cannot create new until under cap | Full restoration | Full restoration |
| **Music downloads** | Existing downloads remain playable for 14 days (cached); after 14d, prompt to re-subscribe to keep offline | Re-subscribe → downloads stay | After 14d, files cleared from device cache (server data untouched) |
| **Equipped profile theme** | Preserve current equipped theme even if it was a CLOSE+ unlock | n/a — keep | n/a — keep |
| **Unequipped purchased themes** | Stay in user's library, locked from equipping | Un-lock instantly | Un-lock instantly |
| **Custom beacon glow color** | Reverts to default gold for new drops; existing drops keep their color until expiry | Un-lock instantly | Un-lock instantly |
| **Read receipts opt-in state** | Preserved (consent decisions are sticky) | n/a — preserved | n/a — preserved |
| **Voice notes / video DMs already sent** | Stay delivered, no clawback | n/a | n/a |
| **Voice notes / video DM new sends** | Disabled at MESS/REGULAR; recipient still sees prior sends in history | Re-enable instantly | Re-enable instantly |
| **Monthly merch credit** | Accrued credit stays in account, usable; no new accrual until re-subscribed | New accrual resumes | New accrual resumes |
| **Cycle streak** | NEVER resets on tier downgrade (it measures presence, not payment) | n/a | n/a |
| **Founding 250 badge** | NEVER lost. Permanent. | n/a | n/a |
| **Care badge** | Preserved while underlying TRUSTED relationships persist (orthogonal to tier) | n/a | n/a |
| **Verified ring** | Preserved permanently (ID check is a one-time event) | n/a | n/a |

---

## Beta cohort specifics

| Surface | Behaviour |
|---|---|
| Beta access ends (T-0) | All CLOSE-tier features fall back to MESS. Grace = **3 days** (not 7 — the deal was explicit 14 days). |
| Beta-claimed trusted contacts | Beyond MESS cap of 1 → freeze extras (don't delete). |
| Beta-claimed beacons live at expiry | Run until natural expiry, no shortening. |
| Founding 250 holders | Get **CLOSE entitlements forever** automatically — no payment ever needed for CLOSE. Pay for CONVICT if they want patron-tier. |

---

## Reminder cadence

For any paid tier lapse:

- **T−24h before grace ends:** push notification.
  *Copy:* "*Your CLOSE access ends tomorrow. Stay close — £19/mo.*"
- **T−0 (grace ends):** silent transition. No notification at the moment of downgrade itself — feels surveillance-y.
- **First app open after downgrade:** persistent dismissible chip at top of screen.
  *Copy:* "*Welcome back. CLOSE features paused — tap to come back.*" Once dismissed for the session, gone for the session.
- **Day 7 + 14 + 21 + 30 after downgrade:** single push.
  *Day 7:* "*Your music's still here. Pick it back up — £19/mo.*"
  *Day 14:* "*Your offline tracks just expired. Re-up to bring them back.*"
  *Day 21:* "*Half your trust circle is paused. Come close again.*"
  *Day 30:* archive event, last reminder.

After day 30, complete silence. The user is not stalked.

---

## Forbidden behaviours

| Pattern | Why it's banned |
|---|---|
| Deleting user content on downgrade | data is theirs. always. |
| Removing TRUSTED relationships from the other person's list | their relationship, not just yours. |
| Pop-up on tier-downgrade moment | feels like punishment |
| Email blast on downgrade | trust-destroying |
| Showing "DOWNGRADED" badge anywhere | shame-based, never |
| Reducing TRUSTED contact cap silently | freeze, don't lose |
| Force-unequipping a profile theme | aesthetic identity is sticky |
| Resetting cycle streak | presence ≠ payment |

---

## Implementation gap

| Surface | Today | Locked |
|---|---|---|
| Subscription lapse detection | Stripe webhook fires `subscription.deleted` | + add 7-day grace window before tier flip |
| `profiles.tier_status` | binary active/canceled | add `grace_until` timestamp |
| Trusted contact freeze | not implemented | add `frozen_at` column; SOS fanout filters it out |
| Marketplace listing cap enforcement | none on downgrade | add "cannot create new while over cap" guard |
| Music download grace | none | client-side 14-day cache TTL post-downgrade |
| Reminder cadence | none | pg_cron job — single push per milestone |
| Beta T-0 transition | tier flips immediately | + 3-day grace + soft chip |

---

## Cross-references

- `00-canonical-naming.md`
- `02-membership-entitlement-matrix.md` — what tiers grant
- `04-upgrade-surface-doctrine.md` — how to invite back
- `06-media-moderation-doctrine.md` — voice / video DM consent (sticky on downgrade)
