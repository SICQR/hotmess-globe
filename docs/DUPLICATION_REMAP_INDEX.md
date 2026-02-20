# Duplication Remap Index
**Version:** 1.0  
**Date:** 2026-02-20  
**Status:** Stage 1 intelligence — audit only, no code changes

---

## Purpose

Every duplication cluster is listed here with its current duplicates, the single target OS contract it must be merged into, the migration plan, and whether the duplicates can eventually be deleted.

---

## Cluster 1 — `onAuthStateChange` Listeners

### Current duplicates

| File | Role | Cleanup guard? |
|------|------|---------------|
| `src/contexts/BootGuardContext.jsx:84` | Boot FSM — determines NEEDS_AGE / NEEDS_ONBOARDING / READY | ✅ `subscription.unsubscribe()` on unmount |
| `src/pages/Auth.jsx:98` | Refreshes UI after sign-in/sign-up | ✅ cleanup returned |
| `src/lib/bootGuard.ts:272` | Standalone boot guard utility (not the context) | ✅ cleanup returned |
| `src/core/viewerState.ts:160` | Updates core viewer state singleton | ✅ cleanup returned |
| `src/contexts/NowSignalContext.jsx:139` | Re-subscribes realtime when session changes | ✅ cleanup returned |

### Target contract

**Contract C — Auth / Session** (Ring 1, `AuthContext` as authority)

### Current collision

`BootGuardContext` AND `bootGuard.ts` both listen. The standalone `bootGuard.ts` is a legacy utility; the context should be the only runtime listener.

### Migration plan

1. Audit whether `bootGuard.ts` is still called at runtime (currently imported only by `src/lib/` — appears to be a pure utility, not mounted). If unused at runtime, no change needed.
2. Ensure each subordinate listener (Auth page, NowSignalContext) has strict cleanup and does not duplicate the boot-state logic.
3. Long-term: subordinate listeners should subscribe to `AuthContext` via `useAuth()` hook rather than raw `supabase.auth.onAuthStateChange`.

### Deletion allowed?

Later — after all consumers use `useAuth()` / `BootGuardContext` hooks, `bootGuard.ts` and `viewerState.ts` listeners can be removed.

---

## Cluster 2 — `mergeGuestCartToUser` Call Sites

### Current duplicates

| File | Trigger | Dedup guard? |
|------|---------|-------------|
| `src/lib/AuthContext.jsx:70` | Every login (once per session via `mergedGuestCartRef`) | ✅ `mergedGuestCartRef.current` flag |
| `src/Layout.jsx:167` | Every time `Layout` re-renders with an authenticated user | ❌ No guard — can fire on every render |
| `src/pages/Checkout.jsx:89` | On Checkout mount when user is present | ❌ No guard |
| `src/components/marketplace/CartDrawer.jsx:52` | On CartDrawer mount when user changes | ❌ No guard |

### Target contract

**Contract C — Auth / Session** (Ring 1)

`AuthContext` is the only permitted call site. All other sites must be removed.

### Migration plan

1. **Stage 4**: Remove merge call from `Layout.jsx` — `AuthContext` already does this with a guard.
2. **Stage 4**: Remove merge call from `Checkout.jsx` — guarded by `AuthContext`.
3. **Stage 4**: Remove merge call from `CartDrawer.jsx` — guarded by `AuthContext`.
4. Verify `mergedGuestCartRef` is reset on logout (`checkUserAuth` sets `mergedGuestCartRef.current = false` on unauthenticated — **already implemented**).

### Deletion allowed?

Yes for the 3 unguarded duplicates (Layout, Checkout, CartDrawer) after Stage 4.

---

## Cluster 3 — Cart Systems

### Current duplicates

| System | Files | Purpose |
|--------|-------|---------|
| **Creators/Preloved cart** | `src/components/marketplace/cartStorage.js`, `src/components/marketplace/CartDrawer.jsx`, `src/components/marketplace/UnifiedCartDrawer.jsx` | Supabase-backed cart for P2P products |
| **Shopify cart** | `src/features/shop/cart/ShopCartContext.jsx`, `src/features/shop/cart/ShopCartDrawer.jsx` | Shopify Storefront API cart (draft order or cart tokens) |
| **Cart events** | `src/utils/cartEvents.js` | Event bus to open cart drawer — used by both systems |

### Target contract

**Contract F — Market (MESSMARKET)**

Two carts can coexist but they must be exposed via ONE unified drawer/CTA that shows both. `UnifiedCartDrawer` is the intended merge point but is not complete.

### Migration plan

1. **Stage 6**: `UnifiedCartDrawer` becomes the single drawer rendered at root level.
2. It consumes both `cartStorage` (Preloved items) and `ShopCartContext` (Shopify items).
3. Checkout action: Shopify items → `checkout/start` (hard redirect OK); Preloved items → `/market/creators/checkout`.
4. `CartDrawer.jsx` (old) is aliased to `UnifiedCartDrawer` or removed.

### Deletion allowed?

`CartDrawer.jsx` — yes after Stage 6. `UnifiedCartDrawer` becomes canonical.

---

## Cluster 4 — Profile Openers / Sheet Variants

### Current duplicates

| Pattern | File | Opens |
|---------|------|-------|
| Direct route navigation to `/Profile?email=…` | Many pages (window.location, Link) | Profile page full render |
| `openSheet(SHEET_TYPES.PROFILE, { email })` | Some social components | `L2ProfileSheet` |
| `openSheet(SHEET_TYPES.PROFILE, { uid })` | Some globe components | `L2ProfileSheet` |
| `<MiniProfileSheet>` | `src/components/sheets/MiniProfileSheet.tsx` | Inline mini sheet, not using SheetContext |
| Inline profile cards | `src/components/social/TacticalProfileCard.jsx` | No navigation |
| `<RightNowOverlay>` profile link | `src/components/home/RightNowOverlay.jsx` | Route navigation |

### Target contract

**Contract E — Profile + Maps**

```ts
nav.openProfile(userId: string, source: 'grid' | 'globe' | 'map' | 'search' | 'deeplink'): void
```

On mobile (default): opens `L2ProfileSheet` via `openSheet(SHEET_TYPES.PROFILE, { uid: userId, source })`.
On direct URL access (`/social/u/:id`): renders `Profile` page via route.

### Profile sheet variants to merge

| Component | Status |
|-----------|--------|
| `L2ProfileSheet.jsx` | **Canonical** — keep |
| `MiniProfileSheet.tsx` | **Duplicate** — replace with `L2ProfileSheet` in compact mode |
| `StandardProfileView.jsx` | **Internal to Profile page** — keep |
| `SellerProfileView.jsx`, `CreatorProfileView.jsx`, etc. | **Sub-views inside Profile page** — keep as internal variants |

### Migration plan

1. **Stage 5**: Create `nav.openProfile(userId, source)` in `src/lib/nav.ts`.
2. Replace all direct profile navigation calls with `nav.openProfile`.
3. Retire `MiniProfileSheet` — pass a `compact` prop to `L2ProfileSheet` instead.
4. Map marker selection in Globe must call `nav.openProfile`.

### Deletion allowed?

`MiniProfileSheet.tsx` — yes after Stage 5.

---

## Cluster 5 — Realtime Channel Proliferation

### Current duplicates

All 40+ channel subscriptions (full audit in `SUPABASE_REALTIME_OWNERSHIP.md`).

Key collision clusters:

| Channel name | Subscribers | Risk |
|--------------|-------------|------|
| `beacons-realtime` | `Globe.jsx` + `useRealtimeBeacons.js` | **Same table, two channels** |
| `world-pulse-beacons` | `WorldPulseContext` | OK — different purpose (anonymised pulse) |
| `globe-beacons` | `hooks/useGlobeBeacons.js` | Possible overlap with `useRealtimeBeacons.js` |
| `presence-beacons` | `useRealtimeBeacons.js` | Overlap with `core/presence.ts` `presence-changes` |
| `notifications-realtime` + `notifications-admin-realtime` | `NotificationCenter.jsx` | Two channels from same component — needs audit |

### Target contract

**Contract D — Realtime** (see `SUPABASE_REALTIME_OWNERSHIP.md`)

### Migration plan

1. **Stage 4**: Assign each channel an owner module.
2. Channels on the same table in the same scope must be merged (one channel per table per scope).
3. All channel hooks must return a cleanup function and call `supabase.removeChannel(channel)`.
4. On logout: each owning hook must unsubscribe.
5. On login: channel re-opens once via stable `useEffect` dependency.

---

## Cluster 6 — Navigation (window.location for internal routes)

### Current duplicates

30+ `window.location.href = ...` calls in page components for internal routing.

### Priority fixes (most harmful)

| File | Usage | Fix |
|------|-------|-----|
| `src/pages/AgeGate.jsx` | `window.location.href = nextUrl` / `window.location.href = '/auth'` | `navigate(nextUrl)` |
| `src/pages/Profile.jsx` | `window.location.href = safeNext` | `navigate(safeNext)` |
| `src/pages/OnboardingGate.jsx` | `window.location.href = createPageUrl('Home')` | `navigate('/')` |
| `src/pages/Auth.jsx` | `window.location.href = createPageUrl('Profile')` | `navigate(createPageUrl('Profile'))` |
| `src/pages/ProfileSetup.jsx` | `window.location.href = createPageUrl('Profile')` | `navigate(createPageUrl('Profile'))` |
| `src/pages/AccountConsents.jsx` | `window.location.href = createPageUrl('Profile')` | `navigate(createPageUrl('Profile'))` |

### Legitimate hard navigations (keep as-is)

| File | Usage | Reason |
|------|-------|--------|
| `src/pages/CheckoutStart.jsx` | `window.location.assign(checkoutUrl)` | Shopify checkout — external domain, hard nav required |
| `src/pages/MembershipUpgrade.jsx` | `window.location.href = result.url` | Stripe checkout — external domain |
| `src/pages/InviteFriends.jsx` | `window.location.href = 'sms:?body=...'` | SMS deep link — not a route |
| `src/pages/Music.jsx` | `window.location.href = url` | SoundCloud external URL |
| `src/pages/AgeGate.jsx` | `window.location.href = 'https://www.google.com'` | Under-18 redirect off-site |

### Target contract

**Contract A — Navigation** (`nav.go()` wrapper)

### Migration plan

Stage 2: Create `src/lib/nav.ts` with `nav.go()` wrapper. Stage 2 replaces all internal `window.location.href` assignments.

---

## Cluster 7 — Product Card / Market Grid

### Current duplicates

| Component | Purpose |
|-----------|---------|
| `src/components/marketplace/ProductCard.jsx` | P2P/Supabase product card |
| `src/features/profilesGrid/ProfileCard.tsx` | Profile card (not product) |
| `src/features/shop/cart/ShopCartDrawer.jsx` | Shopify cart UI |
| `src/components/marketplace/CartDrawer.jsx` | P2P cart UI |
| `src/pages/Shop.jsx` | Shopify grid |
| `src/pages/Marketplace.jsx` | P2P + Shopify tabs combined |
| `src/pages/TicketMarketplace.jsx` | Ticket P2P |

### Target contract

**Contract F — Market** — `MarketItem` unified type + one grid + one detail surface.

### Migration plan

Stage 6: Define `MarketItem` interface. Adapt `ProductCard` to render both Shopify and Preloved items. `Marketplace.jsx` becomes the single market entry point with source adapters.

---

## Cluster 8 — Layout / SheetProvider Placement

### Current duplicate

`SheetProvider` is inside `Layout.jsx` which is inside the route tree. This means `SheetProvider` re-mounts whenever a route that uses `Layout` mounts, potentially closing open sheets on navigation.

### Target contract

**Contract B — Window Manager** — `SheetProvider` must be at root level, outside `BrowserRouter` routes.

### Migration plan

Stage 3: Move `SheetProvider` from `Layout.jsx` to `App.jsx` provider stack (between `WorldPulseProvider` and `ShopCartProvider`).

---

## Summary table

| Cluster | Stage | Contracts | Deletions allowed? |
|---------|-------|-----------|-------------------|
| 1 — Auth listeners | Stage 4 | C | Later (bootGuard.ts standalone) |
| 2 — Cart merge calls | Stage 4 | C | Yes (Layout, Checkout, CartDrawer) |
| 3 — Cart systems | Stage 6 | F | Yes (CartDrawer.jsx after unification) |
| 4 — Profile openers | Stage 5 | E | Yes (MiniProfileSheet.tsx) |
| 5 — Realtime channels | Stage 4 | D | No — just consolidate per table/scope |
| 6 — window.location nav | Stage 2 | A | Yes (per call site) |
| 7 — Product cards / grids | Stage 6 | F | Yes (after MarketItem adapter) |
| 8 — SheetProvider placement | Stage 3 | B | N/A — move, not delete |
