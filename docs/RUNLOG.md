# OS Stabilization Run Log
**Branch:** `copilot/draft-stabilization-execution-plan`  
**Started:** 2026-02-20  
**Mode:** Sequential execution, gated stages

---

## Stage 0 — System Modeling ✅ COMPLETE

**Date:** 2026-02-20  
**Commit:** initial

### Findings summary

**One-page system summary:**  
HOTMESS Globe is a React 18 + Vite SPA deployed on Vercel. It uses Supabase for auth, data, and realtime; Shopify Storefront API for official merchandise; and a Supabase-backed P2P layer for creator/preloved listings. The app is intended to behave as an OS-style webapp with a persistent globe (L0), system HUD (L1), slide-up sheets (L2), and blocking interrupts (L3). The OS FSM (`src/os/`) and sheet system (`src/contexts/SheetContext.jsx`) are partially implemented. Significant stabilization work is needed in navigation, realtime, cart merge, and profile authority.

**Authority map — single owner for each concern:**

| Concern | Canonical owner | Status |
|---------|----------------|--------|
| Navigation | `src/App.jsx` (route table) + React Router | ✅ Declared; 4 duplicates + 11 hard-nav violations |
| Overlay stack | `src/contexts/SheetContext.jsx` | ⚠️ Inside route tree — needs relocation |
| Auth | `src/lib/AuthContext.jsx` + `src/contexts/BootGuardContext.jsx` | ✅ Declared; 3 subordinate guard calls |
| Realtime | No single registry — 17 files, 40+ channels | ❌ Needs consolidation |
| Globe lifecycle | `src/App.jsx` (`UnifiedGlobe` at L0) | ✅ Mounts once; `Globe.jsx` channels need audit |
| Profile rendering | `src/pages/Profile.jsx` (route) + `L2ProfileSheet` (sheet) | ⚠️ Multiple openers; no single `openProfile()` fn |
| Cart | `AuthContext` (merge trigger) | ⚠️ 3 unguarded duplicate merge call sites |
| Commerce | `ShopCartContext` (Shopify) + `cartStorage.js` (P2P) | ⚠️ Two parallel systems; no unified type |

**Collision register:**

| Collision | Type | Count | Files |
|-----------|------|-------|-------|
| Duplicate route paths | Route | 4 | `App.jsx` |
| Multiple auth listeners | Auth | 5 | BootGuardCtx, Auth.jsx, bootGuard.ts, viewerState.ts, NowSignalCtx |
| Unguarded cart merge | Auth | 3 | Layout.jsx, Checkout.jsx, CartDrawer.jsx |
| `beacons` table channels | Realtime | 7 | Globe.jsx, useRealtimeBeacons.js, useGlobeBeacons.js, useRealtimeNearbyInvalidation.js, Home.jsx, core/beacons.ts, WorldPulseContext |
| `presence` table channels | Realtime | 2 | useRealtimeBeacons.js, core/presence.ts |
| `right_now_status` channels | Realtime | 2 | Globe.jsx, ActivityStream.jsx |
| Profile openers (no single fn) | Profile | 4+ | Many pages + sheet context |
| SheetProvider inside route tree | Overlay | 1 | Layout.jsx |
| window.location internal nav | Navigation | 11 | AgeGate, Auth, Profile, OnboardingGate, ProfileSetup, AccountConsents, Login, PromoteToAdmin (×2) |

### Documents produced

- [x] `STABILIZATION_EXECUTION_PLAN.md` — authority model (navigation, providers, overlays, Supabase topology)
- [x] `docs/OS_REMAP_BLUEPRINT.md` — ring model + OS contracts
- [x] `docs/DUPLICATION_REMAP_INDEX.md` — 8 duplication clusters with migration plans
- [x] `docs/ROUTING_COLLISION_REPORT.md` — all route defects + window.location inventory
- [x] `docs/PROFILE_MAP_AUTHORITY.md` — single profile authority contract
- [x] `docs/MARKET_ARCHITECTURE.md` — unified MESSMARKET contract
- [x] `docs/SUPABASE_REALTIME_OWNERSHIP.md` — all channels assigned to owners

---

## Stage 1 — Intelligence + OS Blueprint ✅ COMPLETE

**Date:** 2026-02-20  

All required documentation has been produced. OS truth summary complete. 

**Gate check:** OS truth summary completed ✅  
**Next:** Stage 2 — Router Collision Fix + Nav Contract

---

## Stage 2 — Router Collision Fix + Nav Contract 🔲 PENDING

**Goal:** React Router is the only navigation authority.

**Actions planned:**
- [ ] Remove 4 duplicate route declarations from `App.jsx`
- [ ] Fix dead `/social/u/:email` route (merge with `/social/u/:id`)
- [ ] Replace 11 internal `window.location.href` assignments with `navigate()`
- [ ] Fix legacy redirects that go to PascalCase URLs (2-hop redirects)
- [ ] Create `src/lib/nav.ts` with `nav.go()` wrapper

**Gate:** Tab switching does not reload app. Back button deterministic. No route bounce.

---

## Stage 3 — Overlay Root Unification 🔲 PENDING

**Goal:** Single `SheetProvider` outside route tree. All sheets via Contract B.

**Actions planned:**
- [ ] Move `SheetProvider` from `Layout.jsx` to `App.jsx` provider stack
- [ ] Confirm `SheetRouter` renders at root level (already in Layout — review after move)
- [ ] Implement back-button sheet pop integration

**Gate:** Open sheet → switch tab → sheet persists. Back pops sheet before route.

---

## Stage 4 — Auth + Realtime Hygiene 🔲 PENDING

**Goal:** No duplicate cart merges. No listener multiplication.

**Actions planned:**
- [ ] Remove `mergeGuestCartToUser` from `Layout.jsx`, `Checkout.jsx`, `CartDrawer.jsx`
- [ ] Consolidate `beacons` table from 7 channels to 2 (Globe beacon hook + WorldPulse)
- [ ] Consolidate `presence` table from 2 channels to 1
- [ ] Consolidate `right_now_status` from 2 channels to 1
- [ ] Audit and fix `ActivityStream.jsx` cleanup
- [ ] Gate admin notification channel behind role check
- [ ] Verify `Globe.jsx` channels close on logout

**Gate:** Login/logout stable. Multi-tab stable. Realtime channels do not multiply on nav loops.

---

## Stage 5 — Profile + Maps Authority 🔲 PENDING

**Goal:** Single `openProfile(userId, source)` entry point.

**Actions planned:**
- [ ] Create `nav.openProfile(userId, source)` in `src/lib/nav.ts`
- [ ] Replace all profile openers with `nav.openProfile`
- [ ] Globe map markers call `nav.openProfile` for people pins
- [ ] Retire `MiniProfileSheet` — pass `compact` prop to `L2ProfileSheet`
- [ ] Deep link `/social/u/:id` works and opens sheet

**Gate:** Map marker → profile sheet. Direct URL works. Back deterministic.

---

## Stage 6 — Market OS (Preloved + Shopify → MESSMARKET) 🔲 PENDING

**Goal:** Unified market surface.

**Actions planned:**
- [ ] Define `MarketItem` type in `src/features/market/types.ts`
- [ ] Create Shopify adapter + Preloved adapter
- [ ] Create `MarketGrid` component using unified `ProductCard`
- [ ] Mount `UnifiedCartDrawer` at root level
- [ ] Implement Preloved checkout end-to-end
- [ ] Add `/market/preloved` route

**Gate:** Browse → filter → view → add to cart → checkout works for both sources.

---

## Stage 7 — Mobile-First App Shell 🔲 PENDING

**Goal:** Feels like native app.

**Actions planned:**
- [ ] Stable bottom navigation (BottomDock)
- [ ] Remove nested scroll traps
- [ ] Fix viewport height (use `h-dvh`)
- [ ] Smooth overlay transitions

**Gate:** No layout jumps. Smooth transitions. Stable scroll.

---

## Stage 8 — E2E Testing 🔲 PENDING

**Goal:** Playwright tests covering all critical paths.

**Tests to add:**
- [ ] Boot stable
- [ ] Tab switch no reload
- [ ] Overlay LIFO + back rules
- [ ] Auth stable + no duplicate merges
- [ ] Realtime not multiplied after nav loops
- [ ] Profile + maps flows
- [ ] Preloved full flow
- [ ] MESSMARKET unified + Shopify checkout handoff

---

## Blockers / Risks

| Risk | Severity | Notes |
|------|----------|-------|
| `SheetProvider` relocation may break existing sheet consumers | Medium | Test each sheet type after Stage 3 |
| Merging `beacons` channels may affect Globe performance | Medium | Benchmark before/after |
| `bootGuard.ts` runtime usage unknown | Low | Audit imports before Stage 4 |
| Preloved checkout not implemented | High | Needs Stripe Connect setup |
| TypeScript not installed in CI | Medium | `npm run typecheck` fails — deps missing |
