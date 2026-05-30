# HOTMESS London OS — System Runtime (Canonical)

HOTMESS is a state-driven spatial OS.
- Globe = desktop (never unmount)
- Radio = background process (never stops)
- Everything else = sheets / overlays (no page destinations)

This doc is the single source of truth for wiring, gates, and data contracts.

---

## 0) Non-Negotiable Invariants

### Identity
- Supabase Auth is the only identity system.
- Providers: Google + Telegram (as Supabase auth providers).
- `profiles.id === auth.users.id` ALWAYS (1:1).

### Mount Gating (hard)
OS runtime MUST NOT mount unless:
```
profiles.age_verified = true
profiles.username IS NOT NULL
profiles.onboarding_complete = true
```

### Presence
- "Right Now" is NOT a UI filter.
- It is a row in `presence` with TTL (`expires_at`).
- Presence writes happen via RPC only (`go_live`, `go_dark`), not direct inserts.

### Globe Rendering Contract
- Globe subscribes ONLY to `beacons` realtime.
- Globe renders what DB allows client to see (RLS controls visibility).
- Client never derives visibility rules in UI.

### Safety
- Panic is a system override (press & hold gesture).
- Writes `safety_incident` + `beacons(type='safety')`, visibility admin-only.
- UI locks until resolved.

---

## 1) Runtime Layers

```
L0: Globe Runtime (Three.js)      — NEVER UNMOUNT
L1: HUD (always visible)          — Player + Marquee + Dock + Safety
L2: Sheets                        — Profile / Beacon / Chat / Checkout / Admin
L3: Interrupts                    — Verification Required / Panic / Consent / Age fail
```

---

## 2) Boot Guard (Single Rule)

All routes call `bootGuard` before rendering:
- No session → Age Gate/Auth
- Session → fetch profile
- If any gate fails → show required sheet, DO NOT mount OS
- If passes → mount OS

```typescript
// src/lib/bootGuard.ts
export type BootRoute =
  | { state: "AGE_GATE" }
  | { state: "AUTH" }
  | { state: "USERNAME" }
  | { state: "ONBOARDING" }
  | { state: "OS" };
```

---

## 3) Data Model (Public Schema)

### profiles (authoritative gating flags)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid pk | = auth.users.id |
| username | text unique | required before onboarding_complete |
| age_verified | bool | hard gate |
| consent_accepted | bool | hard gate |
| onboarding_complete | bool | hard gate |
| consents_json | jsonb | granular consents |
| location_opt_in | bool | required for presence |
| persona | enum | listener/social/creator/organizer |
| is_verified | bool | required for Right Now |
| verification_level | enum | none/basic/full |
| role_flags | jsonb | admin, seller, creator, etc. |
| tg_id | bigint | Telegram provider |
| tg_username | text | Telegram username |
| google_sub | text | Google provider |
| can_go_live | bool | derived |
| can_sell | bool | derived |

### presence (TTL-based Right Now)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid pk | |
| user_id | uuid fk | → profiles |
| mode | text | right_now/at_event/broadcasting |
| lat, lng | double | server-only precise |
| geo | geography | PostGIS point |
| started_at | timestamptz | |
| expires_at | timestamptz | TTL |
| status | text | live/hidden/expired |

### beacons (Globe subscriber contract)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid pk | |
| type | text | social/event/drop/market/radio/safety |
| owner_id | uuid fk | → profiles |
| lat, lng | double | |
| starts_at | timestamptz | |
| ends_at | timestamptz | |
| intensity | int | 1-10 |
| visibility | text | public/nearby/verified_only/admin_only |
| metadata | jsonb | |

### safety_incidents
| Column | Type | Notes |
|--------|------|-------|
| id | uuid pk | |
| user_id | uuid fk | → profiles |
| lat, lng | double | |
| status | text | active/acknowledged/resolved |
| created_at | timestamptz | |
| resolved_at | timestamptz | |

---

## 4) Beacon Types (visual language)

| Type | Color | Source |
|------|-------|--------|
| social | LIME (#39FF14) | presence rows |
| event | CYAN (#00D9FF) | events table |
| radio | PURPLE (#B026FF) | radio metadata |
| market | GOLD (#FFD700) | P2P listings |
| safety | RED (#FF2A2A) | panic incidents |

---

## 5) Write Paths (what is allowed to mutate DB)

### Allowed
- RPC: `go_live` / `go_dark` (presence)
- RPC: `panic_start` / `panic_resolve` (safety)
- Admin writes beacons for drops/events (service role / admin UI)

### Not Allowed
- Client direct INSERT into beacons for presence
- Client direct INSERT into presence (must call RPC)
- UI-only flags for onboarding/verification (must update profiles)

---

## 6) RLS Principles

- Users can read/write their own profile.
- Presence insert requires: `onboarding_complete AND is_verified AND location_opt_in`.
- Beacons visibility enforced by RLS:
  - `public`: anyone authed
  - `nearby`: authed users
  - `verified_only`: verified users only
  - `admin_only`: admin role only

---

## 7) Modes (state switches, NOT pages)

| Mode | Globe Filter | Primary Action |
|------|-------------|----------------|
| NOW | All beacons | Go Live |
| SOCIAL | social + event | Handshake |
| EVENTS | event beacons | RSVP |
| RADIO | radio pulse | Listen |
| SHOP | market beacons | Buy |

---

## 8) Safety Override

```
[PRESS & HOLD 3s]
      ↓
RPC panic_start(lat, lng)
      ↓
INSERT safety_incident + safety beacon
      ↓
UI LOCKS (RED MODE)
      ↓
ADMIN ACK → USER RESOLVE
```

Safety ignores modes, filters, and UI state.

---

## 9) Dev Checklist (must pass)

- [ ] Boot Guard blocks OS mount correctly
- [ ] Presence creates/removes social beacons deterministically
- [ ] Globe subscription: beacons only
- [ ] Panic triggers DB + red override + admin visibility only
- [ ] No deep-link bypass possible
- [ ] Username required before onboarding_complete
- [ ] Verification required before go_live

---

## 10) The Only Loop

```
User logs in
→ OS mounts
→ Radio plays
→ Beacons appear
→ User acts
→ DB updates
→ Globe reacts
→ Notifications fire
→ User returns
```

Nothing breaks this loop.
