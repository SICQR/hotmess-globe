# 02 — Membership Entitlement Matrix

**Status:** LIVE — Phil 2026-05-28. Re-aligned against live `membership_tiers` DB schema. Previous version used dead tier names (MESS/REGULAR/CLOSE/CONVICT). This is the real one.

**Purpose:** every tier's exact unlock list, expressed as the **boolean / numeric keys the code actually reads**. If a feature isn't a key in the `benefits` JSON, no code can gate on it.

---

## 1. Live tiers (canonical names — match Stripe + DB + code)

| Tier | Display | Monthly | Stripe product |
|---|---|---|---|
| `mess` | MESS — *the lurker* | £0 | n/a (default) |
| `hotmess` | HOTMESS — *full access* | £7.99 | live |
| `connected` | CONNECTED — *sell + create* | £19.99 | live |
| `promoter` | PROMOTER — *run nights* | £44.99 | live |
| `venue` | VENUE — *your space on the globe* | £99.99 | live |

Plus: **beta access** (`profiles.beta_access_until > now()`) — currently grants `hotmess`-equivalent benefits for 14 days.

---

## 2. The contract — every key in `membership_tiers.benefits`

These keys live in `public.membership_tiers.benefits` JSON. The `useUserBenefits()` hook reads them via the `get_user_benefits()` RPC. `TierGate` + `useTierBenefit` + `useTierLimit` consume them.

Legend: ✅ true · ❌ false · ⚠️ partial · `n` = limit (`-1` = unlimited)

### Discovery / presence
| Key | mess | hotmess | connected | promoter | venue |
|---|:-:|:-:|:-:|:-:|:-:|
| `has_rightnow` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `beacon_drops_monthly` | 0 | 3 | 10 | 20 | -1 |
| `has_permanent_globe_presence` | ❌ | ❌ | ❌ | ❌ | ✅ |

### Ghosted / connection
| Key | mess | hotmess | connected | promoter | venue |
|---|:-:|:-:|:-:|:-:|:-:|
| `has_full_ghosted` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `ghosted_preview_limit` | 3 | -1 | -1 | -1 | -1 |
| `has_taps` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `has_messaging` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `has_bookmarks` | ❌ | ✅ | ✅ | ✅ | ✅ |

### Music / radio
| Key | mess | hotmess | connected | promoter | venue |
|---|:-:|:-:|:-:|:-:|:-:|
| `has_radio` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `has_radio_slot` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `has_full_music` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `music_preview_seconds` | 90 | -1 | -1 | -1 | -1 |

### Care
| Key | mess | hotmess | connected | promoter | venue |
|---|:-:|:-:|:-:|:-:|:-:|
| `has_dial_a_daddy` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `has_hand_n_hand` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `has_challenges` | ❌ | ✅ | ✅ | ✅ | ✅ |

### Commerce
| Key | mess | hotmess | connected | promoter | venue |
|---|:-:|:-:|:-:|:-:|:-:|
| `can_buy_products` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `can_sell` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `max_listings` | 0 | 0 | 20 | -1 | -1 |
| `has_creator_dashboard` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `has_analytics` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `has_brand_page` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `has_referral` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `has_ticketing` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `has_events` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `has_door_app` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `has_stripe_connect` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `has_business_billing` | ❌ | ❌ | ❌ | ❌ | ✅ |

### Identity
| Key | mess | hotmess | connected | promoter | venue |
|---|:-:|:-:|:-:|:-:|:-:|
| `max_personas` | 1 | 2 | 5 | -1 | -1 |

---

## 3. Gating contract — how code reads these keys

```tsx
// Boolean gate — wrap a feature
<TierGate benefit="has_full_music" fallback={<UpgradePrompt />}>
  <FullTrackPlayer />
</TierGate>

// Inline check
const canMessage = useTierBenefit('has_messaging');

// Numeric quota
const cap = useTierLimit('beacon_drops_monthly'); // -1 means unlimited
if (cap !== -1 && monthlyUsed >= cap) showUpsell();
```

**Rule:** every code-level gate MUST reference a key in this table. If you need a gate for a new feature, add the key to `membership_tiers.benefits` for every tier FIRST, then ship the gate. No code-side enum lists, no hardcoded tier-name strings. The DB is source of truth.

---

## 4. What is NOT in scope (and why)

The previous doctrine listed features that don't exist in code and were unlikely to ship soon:
- voice notes / 30s video DM (parked — needs media moderation V2)
- weekly profile boost (covered by boost system, doctrine 07 + boost shop)
- royalty share / RAW CONVICT (separate product surface)
- read receipts (consent-native, future PR)
- offline music download (out of MVP)
- merch discount + monthly credit (not wired to Stripe yet)

These will return to this doc once they have a `has_*` key in the benefits JSON AND a code gate that reads it. Not before.

---

## 5. Migration order (5 gates, 5 PRs, each verifiable)

In execution order — each PR independently shippable + revertable:

| PR | Gate | Benefit key | Surface |
|---|---|---|---|
| 1 | foundation | (none) | `useUserBenefits` + `TierGate` + this doc — no gates flipped, zero risk |
| 2 | full music | `has_full_music` + `music_preview_seconds` | wrap player; enforce 90s cap on MESS |
| 3 | full ghosted grid | `has_full_ghosted` + `ghosted_preview_limit` | remove fog past N cards for MESS |
| 4 | messaging unlock | `has_messaging` | gate chat compose; MESS sees upsell |
| 5 | beacon drop quota | `beacon_drops_monthly` | enforce monthly count; show usage |
| 6 (cleanup) | delete `FeatureGate.jsx` | — | remove dead PREMIUM/ELITE enum |

After PR 6, every paid feature is observable, dollar-for-feature aligned, and the `isPremium` boolean stays as a coarse upsell gate only (not a feature gate).

---

## 6. The Sacred Invariant this serves

> HOTMESS never sells symbolic capability.

If a user pays £7.99 for HOTMESS, every `✅` in the hotmess column of section 2 MUST be observable in their session. If it isn't, the gate is missing — that's a bug, not a feature flag.

The audit log:
- PR #571 fixed the tier-name mismatch in `isPremium`
- PR #575 fixed single-use boost consumption
- PR #578 wired profile_bump observability
- PR #580 wired globe_glow observability
- This PR series wires the rest of the paid feature surface
