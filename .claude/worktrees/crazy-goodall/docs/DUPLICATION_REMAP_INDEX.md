# HOTMESS Duplication Remap Index

**Version:** 1.0  
**Date:** 2026-02-20  
**Purpose:** Inventory every duplication cluster and map to ONE target OS contract

> **Note:** Line numbers and counts are derived from ripgrep at time of writing and may drift. Re-run the verification commands at the bottom of this document before any deletions.

---

## 1. Auth Listener Duplication

| Current Duplicate | File | Target Contract | Migration Plan | Delete After? |
|-------------------|------|-----------------|----------------|---------------|
| `onAuthStateChange` | `src/contexts/BootGuardContext.jsx` | **Primary candidate owner** | Verify current behavior; keep as primary | No |
| `onAuthStateChange` | `src/lib/AuthContext.jsx` | Subordinate to BootGuard | Use BootGuard session state (no direct listener) | Yes (listener only, after Stage 3) |
| `onAuthStateChange` | `src/contexts/NowSignalContext.jsx` | Subordinate | Listen to AuthContext.user changes via useEffect | Yes (after Stage 3) |
| `onAuthStateChange` | `src/core/viewerState.ts` | Subordinate | Export `onUserChange` hook; subscribe to user state | Yes (after Stage 3) |
| `onAuthStateChange` | `src/lib/bootGuard.ts` | Candidate to delete | Appears to duplicate context; verify before removal | Verify first |
| `onAuthStateChange` | `src/pages/Auth.jsx` | Keep (page-specific) | Auth page legitimately needs direct listener | No |

**Contract A: Auth Events**
```typescript
// Only BootGuardContext listens to supabase.auth.onAuthStateChange
// Everyone else subscribes to:
useEffect(() => {
  if (user) { /* auth side effect */ }
  return () => { /* cleanup */ }
}, [user]);
```

---

## 2. Sheet/Overlay Duplication

| Current Duplicate | File | Target Contract | Migration Plan | Delete After? |
|-------------------|------|-----------------|----------------|---------------|
| `OSProvider` (openSheet) | `src/os/store.tsx` | Delegate to SheetContext | Use for interrupts only | No (repurpose) |
| `SheetContext` | `src/contexts/SheetContext.jsx` | **CANONICAL** | Add stack API enhancements | No |
| Individual modal states | Various components | Use SheetContext | Replace useState with openSheet | Yes |
| Radix Dialog usage | Various components | Use SheetContext for sheets | Keep for true modals (alerts) | Partial |

**Contract B: Window Manager (SheetContext)**
```typescript
interface SheetContract {
  openSheet(type: SheetType, props?: object): void;
  closeSheet(): void;
  pushSheet(type: SheetType, props?: object): void; // Nested
  popSheet(): void;
  dismissAll(): void;
}
```

---

## 3. Navigation Duplication

| Current Duplicate | Location (Count) | Target Contract | Migration Plan |
|-------------------|------------------|-----------------|----------------|
| `window.location.href =` | 40+ occurrences | `nav.go()` wrapper | Replace with router navigate |
| Direct `useNavigate()` | Many components | `useNav()` hook | Wrap for overlay awareness |
| `createPageUrl()` | Many components | Keep | Used for route construction |

### Hard Reloads to Replace (Internal Navigation)
These cause unnecessary app reloads and state loss:
1. `src/Layout.jsx` (lines 183, 195, 208)
2. `src/pages/Auth.jsx` (lines 84, 92, 159, 358, 548)
3. `src/pages/AgeGate.jsx` (lines 130, 133, 138)
4. `src/pages/Profile.jsx` (lines 519, 548)
5. `src/pages/OnboardingGate.jsx` (lines 42, 45, 84)
6. `src/pages/Login.jsx` (line 61)
7. `src/pages/AccountConsents.jsx` (line 70)
8. `src/pages/Music.jsx` (line 317)
9. `src/pages/ProfileSetup.jsx` (line 7)
10. `src/pages/PromoteToAdmin.jsx` (lines 23, 43)
11. `src/components/sheets/L2ProfileSheet.jsx` (line 393)
12. `src/components/splash/HotmessSplash.jsx` (lines 126, 182)
13. `src/components/error/PageErrorBoundary.jsx` (line 80)
14. `src/components/error/ErrorBoundary.jsx` (line 43)
15. `src/components/directions/InAppDirections.jsx` (line 209)
16. `src/components/auth/AgeGate.jsx` (line 11)
17. `src/components/discovery/FiltersDrawer.jsx` (line 149)
18. `src/components/safety/LiveLocationShare.jsx` (line 503)
19. `src/components/safety/FakeCallGenerator.jsx` (line 137)
20. `src/components/utils/supabaseClient.jsx` (lines 498, 505)
21. `src/features/profilesGrid/ProfilesGrid.tsx` (occurrence found via rg)
22. `src/features/profilesGrid/ProfilesGridWithMatch.tsx` (occurrence found via rg)

### Allowed Hard Navigation (KEEP)
These are intentional external redirects that MUST use window.location:

| File | Reason |
|------|--------|
| `src/pages/MembershipUpgrade.jsx` | Stripe checkout redirect (external) |
| `src/pages/InviteFriends.jsx` | SMS intent (`sms:?body=`) |
| `src/components/social/ShareButton.jsx` | Mailto intent (`mailto:?`) |
| `src/components/admin/RecordManager.tsx` | OAuth redirect to external auth |
| Exit site redirects (google.com) | Age gate rejection |

**Contract C: Navigation**
```typescript
// src/lib/nav.ts
export function useNav() {
  return {
    go(path: string, opts?: NavigateOptions): void;
    goBack(): void; // Respects overlay-first rule
    setParam(key: string, value: string): void;
  };
}
```

---

## 4. Profile Component Duplication

| Current Duplicate | File | Target Contract | Migration Plan | Delete After? |
|-------------------|------|-----------------|----------------|---------------|
| `Profile.jsx` (page) | `src/pages/Profile.jsx` | Keep as route target | Add redirect from other opens | No |
| `ProfilesGrid.jsx` (page) | `src/pages/ProfilesGrid.jsx` | Keep | Grid view | No |
| `ProfilesGrid.tsx` (feature) | `src/features/profilesGrid/ProfilesGrid.tsx` | **CANONICAL** grid | Page imports this | No |
| `ProfilesGridWithMatch.tsx` | `src/features/profilesGrid/` | Merge into ProfilesGrid | Add match mode prop | Yes |
| `ProfileCard.tsx` | `src/features/profilesGrid/` | **CANONICAL** card | Use everywhere | No |
| `SmartProfileCard.tsx` | `src/features/profilesGrid/` | Merge into ProfileCard | Add smart features | Yes |
| `TacticalProfileCard.jsx` | `src/components/social/` | Replace with ProfileCard | Feature parity check | Yes |
| `ProfileCard/ProfileCard.jsx` | `src/components/react-bits/` | Remove (demo) | Not used | Yes |
| `L2ProfileSheet.jsx` | `src/components/sheets/` | Keep | Sheet rendering | No |
| `MiniProfileSheet.tsx` | `src/components/sheets/` | Merge into L2ProfileSheet | Mini mode prop | Yes |
| `StandardProfileView.jsx` | `src/components/profile/` | Keep | Default view | No |
| `CreatorProfileView.jsx` | `src/components/profile/` | Keep | Creator variant | No |
| `SellerProfileView.jsx` | `src/components/profile/` | Keep | Seller variant | No |
| `OrganizerProfileView.jsx` | `src/components/profile/` | Keep | Organizer variant | No |
| `PremiumProfileView.jsx` | `src/components/profile/` | Keep | Premium variant | No |

**Contract E: Profile**
```typescript
// src/lib/profile.ts
export function openProfile(userId: string, context: ProfileContext): void {
  // Single entry point for all profile opens
  // Determines: sheet vs route, which view variant
}

type ProfileContext = {
  source: 'grid' | 'globe' | 'map' | 'search' | 'deeplink' | 'chat';
  preferSheet?: boolean;
};
```

---

## 5. Market/Shop Duplication

| Current Duplicate | File | Target Contract | Migration Plan | Delete After? |
|-------------------|------|-----------------|----------------|---------------|
| `Shop.jsx` | `src/pages/Shop.jsx` | **CANONICAL** Shopify | Market entry | No |
| `ShopCart.jsx` | `src/pages/ShopCart.jsx` | Keep | Shopify cart | No |
| `ShopProduct.jsx` | `src/pages/ShopProduct.jsx` | Keep | Shopify detail | No |
| `ShopCollection.jsx` | `src/pages/ShopCollection.jsx` | Keep | Shopify collection | No |
| `Marketplace.jsx` | `src/pages/Marketplace.jsx` | **CANONICAL** Preloved | Creators/P2P | No |
| `TicketMarketplace.jsx` | `src/pages/TicketMarketplace.jsx` | Keep | Ticket resale | No |
| `ProductDetail.jsx` | `src/pages/ProductDetail.jsx` | Unify with ShopProduct | Add source param | Maybe |
| `L2MarketplaceSheet.jsx` | `src/components/sheets/` | Keep | Preloved sheet | No |
| `L2ShopSheet.jsx` | `src/components/sheets/` | Merge into L2MarketplaceSheet | Unified market sheet | Yes |
| `CreatorsCart.jsx` | `src/pages/CreatorsCart.jsx` | Keep | Creators cart | No |
| `CreatorsCheckout.jsx` | `src/pages/CreatorsCheckout.jsx` | Keep | Stripe checkout | No |
| `ShopCartContext.jsx` | `src/features/shop/cart/` | **CANONICAL** cart | Unified cart | No |

**Contract F: Market**
```typescript
// src/lib/market.ts
interface MarketItem {
  id: string;
  source: 'shopify' | 'preloved' | 'tickets';
  title: string;
  price: number;
  currency: string;
  media: string[];
  detailAction: () => void; // Opens detail view
}

export function useMarketItems(filters: MarketFilters): MarketItem[];
export function openMarketDetail(item: MarketItem): void;
```

---

## 6. Realtime Channel Duplication

| Channel Pattern | Current Locations | Target Owner | Cleanup Strategy |
|-----------------|-------------------|--------------|------------------|
| `beacons-realtime` | Globe.jsx | GlobeModule | On unmount |
| `user-activities-realtime` | Globe.jsx | GlobeModule | On unmount |
| `presence-beacons` | useRealtimeBeacons.js | GlobeModule | On unmount |
| `events-beacons` | useRealtimeBeacons.js | GlobeModule | On unmount |
| `globe-*` | ActivityStream.jsx | GlobeModule | On unmount |
| `world-pulse-*` | WorldPulseContext.jsx | WorldPulseContext | On logout |
| `home-release-beacons` | Home.jsx | Remove (duplicate) | N/A |
| `now-signal-*` | NowSignalContext.jsx | NowSignalContext | On logout |
| `notifications-*` | NotificationCenter.jsx | NotificationCenter | On logout |
| `safety-*` | safety.ts | SafetyModule | On logout |
| `realtime-nearby-*` | useRealtimeNearbyInvalidation.js | GlobeModule | On unmount |
| `ticket-chat-*` | TicketChat.jsx | ChatModule | On unmount |
| `presence-{businessId}` | useBusiness.js | BusinessModule | On unmount |
| `typing:*` | TypingIndicator.jsx | ChatModule | On unmount |
| `location-share-*` | LiveLocationShare.jsx | SafetyModule | On stop share |
| `call-*` | VideoCallRoom.jsx | CallModule | On call end |

**Contract D: Realtime**
```typescript
// src/lib/realtime.ts
class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  
  subscribe(key: string, config: ChannelConfig, owner: string): () => void;
  unsubscribeAll(owner: string): void; // Called on logout
  getActiveChannels(): string[];
}

export const realtimeManager = new RealtimeManager();
```

---

## 7. Deletion Schedule

### Phase 1 (Candidate for deletion after Stage 1 — verify first)
- `src/lib/bootGuard.ts` — Appears to duplicate context; confirm via import graph

### Phase 2 (Candidate for deletion after Stage 4 — verify first)
- `src/features/profilesGrid/ProfilesGridWithMatch.tsx` — Candidate to merge; confirm no unique features
- `src/features/profilesGrid/SmartProfileCard.tsx` — Candidate to merge; confirm no unique features
- `src/components/social/TacticalProfileCard.jsx` — Candidate to replace; confirm usages via import graph
- `src/components/react-bits/ProfileCard/` — Appears unused (demo); confirm via ripgrep
- `src/components/sheets/MiniProfileSheet.tsx` — Candidate to merge; confirm usages

### Phase 3 (Candidate for deletion after Stage 5 — verify first)
- `src/components/sheets/L2ShopSheet.jsx` — Candidate to merge; confirm usages

### Phase 4 (Review for deletion — requires investigation)
- `src/pages/ProductDetail.jsx` — May unify with ShopProduct; investigate feature parity
- Various unused components — Confirm via import graph after Playwright coverage

---

## Summary

| Category | Duplicates Found | Target Single Source | Priority |
|----------|------------------|---------------------|----------|
| Auth Listeners | 6 | BootGuardContext (candidate primary) | HIGH |
| Sheet Systems | 2 | SheetContext | HIGH |
| Navigation | 40+ window.location | nav.go() wrapper | HIGH |
| Profile Components | 15+ | ProfileCard + openProfile() | MEDIUM |
| Market Components | 10+ | Market adapters | MEDIUM |
| Realtime Channels | 20+ | RealtimeManager | MEDIUM |

---

## Verification Commands

Run these commands to verify claims before making deletions:

```bash
# Auth listeners (count and locations)
rg "onAuthStateChange" -n src

# Hard reload navigation (all window.location assignments)
rg "window\.location\.(href|assign|replace)\s*=" -n src

# Realtime channels/subscriptions
rg "\.channel\(|\.subscribe\(" -n src

# Profile variants (imports and usages)
rg "openProfile|ProfileSheet|L2ProfileSheet|MiniProfileSheet" -n src

# Market variants
rg "Marketplace|Preloved|Shop|Shopify|MESSMARKET|CreatorsCart" -n src

# Import graph for deletion candidates
rg "from.*bootGuard" -n src
rg "from.*ProfilesGridWithMatch" -n src
rg "from.*SmartProfileCard" -n src
rg "from.*TacticalProfileCard" -n src
rg "from.*MiniProfileSheet" -n src
```
