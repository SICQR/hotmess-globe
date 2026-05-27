# 02 — Membership Entitlement Matrix

**Status:** LOCKED — Phil 2026-05-27. See `00-canonical-naming.md` for tier names + prices.

**Purpose:** every tier's exact unlock list. No ambiguity. If it isn't in this doc, it isn't gated.

---

## Tiers (re-stated)

| Tier | Vibe | Monthly | Annual | Discount |
|---|---|---|---|---|
| **MESS** | the lurker | £0 | £0 | — |
| **REGULAR** | every night out | £9 | £80 | 26% |
| **CLOSE** | always on | £19 | £180 | 21% |
| **CONVICT** | the family | £39 | £300 | 36% |

Plus one immutable badge cohort: **FOUNDING 250** — sacred, never resold/reopened/duplicated. Founding 250 holders get **CLOSE-tier entitlements free forever** as the deal.

---

## Entitlement matrix

Legend: ✅ included · ⚠️ limited · ❌ not included

### Discovery / Pulse
| Feature | MESS | REGULAR | CLOSE | CONVICT |
|---|:-:|:-:|:-:|:-:|
| Browse the global pulse | ✅ | ✅ | ✅ | ✅ |
| Drop beacons / day | 1 | 5 | unlimited | unlimited |
| Beacon duration max | 1h | 4h | 12h | 24h |
| Boos / day | 5 | 50 | unlimited | unlimited |
| Layers / filters card | ⚠️ (Venues + People only) | ✅ all 6 | ✅ all 6 | ✅ all 6 |
| Beacon cluster priority (top of city glow) | ❌ | ❌ | ✅ | ✅ |
| Custom beacon glow color | ❌ | ❌ | ✅ (3 colors) | ✅ (unlock palette) |

### Ghosted / connection
| Feature | MESS | REGULAR | CLOSE | CONVICT |
|---|:-:|:-:|:-:|:-:|
| View Ghosted grid | ✅ | ✅ | ✅ | ✅ |
| Open chats once mutual | ✅ | ✅ | ✅ | ✅ |
| See who booed you | ⚠️ (count only) | ✅ (full list) | ✅ | ✅ |
| Read receipts | ❌ | ❌ | ✅ | ✅ |
| Voice notes | ❌ | ❌ | ✅ | ✅ |
| 30s video DM | ❌ | ❌ | ✅ | ✅ |
| Profile boosts (1 per week) | ❌ | ❌ | ✅ | ✅ |

### Safety
| Feature | MESS | REGULAR | CLOSE | CONVICT |
|---|:-:|:-:|:-:|:-:|
| Drop SOS | ✅ | ✅ | ✅ | ✅ |
| Trusted contacts max | 1 | 3 | unlimited | unlimited |
| Telegram bridge SOS | ❌ | ⚠️ (1 contact) | ✅ | ✅ |
| Automated check-in expiry | ❌ | ❌ | ✅ | ✅ |
| Silent panic mode | ❌ | ❌ | ✅ | ✅ |
| Get Out + fake call | ✅ | ✅ | ✅ | ✅ |

### Music / Radio
| Feature | MESS | REGULAR | CLOSE | CONVICT |
|---|:-:|:-:|:-:|:-:|
| Listen to radio | ✅ | ✅ | ✅ | ✅ |
| Stream music library | ⚠️ (30-sec previews) | ✅ full | ✅ full | ✅ full |
| Download tracks offline | ❌ | ❌ | ✅ | ✅ |
| Early access to drops | ❌ | ❌ | ✅ (24h) | ✅ (48h) |
| RAW CONVICT royalty share (artists only) | ❌ | ❌ | ❌ | ✅ |

### Marketplace / Commerce
| Feature | MESS | REGULAR | CLOSE | CONVICT |
|---|:-:|:-:|:-:|:-:|
| Browse shop + preloved | ✅ | ✅ | ✅ | ✅ |
| Sell preloved | ❌ | ✅ (5 active listings) | ✅ unlimited | ✅ unlimited |
| Seller fee on preloved | n/a | 8% | 5% | 0% |
| Member discount on HOTMESS merch | ❌ | 10% | 15% | 25% |
| Monthly merch credit | ❌ | ❌ | ❌ | £15 / mo |

### Identity / status
| Feature | MESS | REGULAR | CLOSE | CONVICT |
|---|:-:|:-:|:-:|:-:|
| Avatar verified ring (if ID verified) | ✅ | ✅ | ✅ | ✅ |
| Tier pill on profile | MESS | REGULAR | CLOSE | CONVICT |
| Founding 250 badge (if applicable) | ✅ | ✅ | ✅ | ✅ |
| Cycle streak displayed | ❌ | ✅ | ✅ | ✅ |
| Custom profile theme | ❌ | ❌ | ✅ (3 themes) | ✅ (all themes) |
| Phil-direct DM channel | ❌ | ❌ | ❌ | ✅ |
| Vote on roadmap | ❌ | ❌ | ❌ | ✅ |

---

## Beta cohort entitlement (live now)

**BETA-HOTMESS** code grants 14 days of **CLOSE-tier entitlements** (not CONVICT — that's reserved). Auto-expires per `profiles.beta_access_until`. After expiry, user falls back to MESS unless they convert.

`profiles.beta_access_until > now()` is treated as `isPremium === true` AND `isClose === true` by the gate helper.

---

## Anti-patterns (NEVER do)

- ❌ Pay-to-skip-consent — e.g. higher tier doesn't get to bypass mutual-boo for CONNECT. The relationship state machine is **orthogonal** to the membership tier. Money buys capability + status, not access to other humans.
- ❌ Pay-to-rank — CONVICT users don't appear ranked higher in Ghosted grid by tier.
- ❌ Pay-to-bypass-SOS — TRUSTED-only safety features are state-bound, not tier-bound. CONVICT user with 0 TRUSTED contacts still has 0 SOS fanout targets.
- ❌ Dark patterns at expiry — beta expiry must show a graceful "your free access ended" + clear cost. Never silently downgrade features mid-session.
- ❌ Selling Founding 250 — sacred. If somebody offers money, the answer is no.

---

## Implementation gap

| Surface | Today | Locked |
|---|---|---|
| `profiles.subscription_tier` | `FREE/PREMIUM/ELITE` (legacy) + `BASIC/PLUS/PRO` constants | `MESS/REGULAR/CLOSE/CONVICT` |
| `TIER_LIMITS` constants | exists with old names | rename + populate from this matrix |
| Beacon drop rate-limit | hard-coded 4hr expiry | tier-aware (1h/4h/12h/24h) |
| Boo daily limit | none enforced | enforce per matrix |
| Marketplace seller fee | 0% everywhere | tier-aware (8/5/0%) |
| Cluster priority | flat | weighted by tier |
| Custom glow color | not implemented | new feature for CLOSE+ |
| Monthly merch credit | not implemented | new feature for CONVICT (cron grants credit_cents/month) |

Rename PR + entitlement-enforcement PR owed. This doc is the target.

---

## Cross-references

- `00-canonical-naming.md` — names + prices source of truth
- `01-relationship-permissions-matrix.md` — state-bound capabilities (orthogonal axis)
- `03-identity-system-spec.md` — badge / streak / theme visuals
- `04-upgrade-surface-doctrine.md` — how to ask for the upgrade
