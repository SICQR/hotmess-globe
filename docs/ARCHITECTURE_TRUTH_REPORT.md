# 🔎 HOTMESS GLOBE — ARCHITECTURAL TRUTH REPORT

**Date:** 2026-02-19  
**Status:** Observation-only. No fixes proposed.  
**Scope:** Full structural and behavioral audit of the live codebase.

---

## 1. RUNTIME HIERARCHY TREE

```
index.html → src/main.jsx
│
├─ clearBadSupabaseSessions()       ← runs BEFORE any React mounts
├─ Sentry.init()                    ← error monitoring
├─ setupGlobalErrorHandlers()
├─ initAnalytics()
│
└─ ReactDOM.createRoot()
   └─ <Sentry.ErrorBoundary>
      └─ <ErrorBoundary>
         └─ <OSProvider>             ← OS FSM store (src/os/store.tsx)
            └─ <App>
               └─ <I18nProvider>    ← src/contexts/I18nContext.jsx
                  └─ <AuthProvider> ← src/lib/AuthContext.jsx
                     └─ <BootGuardProvider> ← src/contexts/BootGuardContext.jsx
                        └─ <QueryClientProvider client={queryClientInstance}>
                           └─ <WorldPulseProvider> ← src/contexts/WorldPulseContext.jsx
                              └─ <ShopCartProvider> ← src/features/shop/cart/ShopCartContext
                                 └─ <Router> (BrowserRouter)
                                    └─ <NavigationTracker>
                                    └─ <BootRouter>
                                       │
                                       ├─ LOADING → <LoadingSpinner>
                                       ├─ UNAUTHENTICATED (no localStorage age) → <PublicShell>
                                       │    └─ Routes: /age /auth /legal/*  → * → /age
                                       ├─ UNAUTHENTICATED (localStorage age=true) → children (FULL APP)
                                       ├─ NEEDS_AGE (no localStorage age) → <AgeGate> (lazy)
                                       ├─ NEEDS_AGE (localStorage age=true) → children (FULL APP)
                                       ├─ NEEDS_ONBOARDING (no localStorage age) → <OnboardingGate> (lazy)
                                       ├─ NEEDS_ONBOARDING (localStorage age=true) → children (FULL APP)
                                       └─ READY → <OSArchitecture>
                                                  └─ <div.hotmess-os>
                                                     ├─ <UnifiedGlobe>   ← L0: Z-0 persistent
                                                     │    └─ <GlobePage> (full page, never unmounts)
                                                     └─ <AuthenticatedApp>
                                                          └─ <PageTransition>
                                                             └─ <Routes>  (React Router)
                                                                ├─ "/" → <LayoutWrapper> → <Home>
                                                                ├─ "/pulse" → <LayoutWrapper> → <Pulse>
                                                                ├─ "/events" → <LayoutWrapper> → <Events>
                                                                └─ ... (100+ routes)

   <LayoutWrapper currentPageName={X}>
      └─ <Layout>  (src/Layout.jsx)
         └─ <RadioProvider>
            └─ <TonightModeProvider>
               └─ <SheetProvider>   ← src/contexts/SheetContext.jsx
                  └─ <LayoutInner>
                     ├─ useOSURLSync()
                     ├─ useKeyboardNav()
                     ├─ useEffect → base44.auth.isAuthenticated() + base44.auth.me()
                     ├─ useEffect → navigator.geolocation.getCurrentPosition() (60s poll)
                     ├─ Desktop Sidebar Nav (md:flex, hidden mobile)
                     ├─ Mobile Header + Mobile Menu
                     ├─ <main>
                     │    └─ <PageErrorBoundary>
                     │         └─ {children}   ← the actual page
                     ├─ <SafetyFAB>
                     ├─ <GlobalAssistant>
                     ├─ <GlobalSearch>
                     ├─ <EventReminders>
                     ├─ <RightNowNotifications>
                     ├─ <PersistentRadioPlayer>
                     ├─ <BottomNav>            ← second navigation system
                     ├─ <CookieConsent>
                     └─ <SheetRouter>          ← L2 Sheet renderer
```

**Provider initialization order (top → bottom):**
1. `clearBadSupabaseSessions()` — synchronous, clears stale Supabase tokens
2. `Sentry.init()` — before React renders
3. `OSProvider` — OS FSM store + event bus
4. `I18nProvider` — i18n/locale
5. `AuthProvider` — base44 wrapper auth (polls `base44.auth.isAuthenticated()` once)
6. `BootGuardProvider` — direct Supabase auth check + `onAuthStateChange` listener
7. `QueryClientProvider` — React Query (singleton `queryClientInstance`)
8. `WorldPulseProvider` — global ambient signals, Supabase realtime
9. `ShopCartProvider` — Shopify/creators cart state
10. `Router` (BrowserRouter)
11. `Layout` providers: `RadioProvider` → `TonightModeProvider` → `SheetProvider`

**Persistence vs. unmounting during navigation:**
- `OSProvider`, `I18nProvider`, `AuthProvider`, `BootGuardProvider`, `QueryClientProvider`, `WorldPulseProvider`, `ShopCartProvider` — **persistent** (root-level, never unmount)
- `UnifiedGlobe` → `GlobePage` — **persistent** (explicit architectural decision, sits outside Routes)
- `LayoutWrapper` and everything inside it — **remounts on route change** (each route creates a new Layout instance)
- `RadioProvider`, `TonightModeProvider`, `SheetProvider` — **remounts with Layout** on every route change
- Individual page components — **unmount and remount on every tab/route switch**

---

## 2. NAVIGATION AUTHORITY MAP

### Route Definitions

Routes are declared in two places:

**File 1: `src/App.jsx` — `AuthenticatedApp` component**
~100+ explicit named routes including:
- `/`, `/auth`, `/auth/*`, `/onboarding`, `/onboarding/*`
- `/pulse`, `/events`, `/events/:id`
- `/market`, `/market/:collection`, `/market/p/:handle`
- `/social`, `/social/inbox`, `/social/u/:id`, `/social/t/:threadId`
- `/music`, `/music/live`, `/music/shows`, `/music/shows/:slug`
- `/hnhmess`, `/more`, `/directions`
- `/features/*`, `/legal/*`, `/settings/*`, `/safety/*`
- `/calendar/*`, `/scan/*`, `/community/*`, `/leaderboard/*`
- `/admin`, `/admin/*`, `/biz`, `/biz/*`
- `/shop`, `/cart`, `/checkout/*`, `/p/:handle`
- And 60+ dynamic auto-generated `/${PageName}` routes from `Pages` object

**File 2: `src/components/shell/PublicShell.jsx`**  
A separate `<Routes>` tree for unauthenticated users:
- `/age`, `/AgeGate`, `/auth`, `/auth/*`, `/Auth`, `/legal/*`, `*` → `/age`

**Duplicate route declarations confirmed:**
- `/age` declared in both `AuthenticatedApp` (as `PageRoute pageKey="AgeGate"`) and `PublicShell`
- `/auth` and `/auth/*` declared in both `AuthenticatedApp` and `PublicShell`
- `/more/beacons` and `/more/beacons/new` and `/more/beacons/:id` declared **twice** in `AuthenticatedApp` (lines 410-413 and 479-481)
- `/onboarding` declared twice with different `pageKey` values: `"OnboardingGate"` and `"Onboarding"`
- `/safety` declared twice with different match specificity (wildcard and exact)

### Navigation Authorities

There are **three** competing navigation authorities:

**Authority 1: React Router (`react-router-dom`)**
- Controls URL and page component mounting
- Used by sidebar Links and BottomNav Links
- Source: `App.jsx` `<Routes>` tree

**Authority 2: SheetContext (`src/contexts/SheetContext.jsx`)**  
- Controls which "app" is shown to the user on mobile via sheets
- Does NOT change the URL path (adds `?sheet=X` query param only)
- Used by `BottomDock.tsx`, `BottomNav.jsx` (for Social tab), `SheetLink.jsx`
- Routes navigation completely independently of React Router for: Social, Events, Ghosted, Chat, Vault, Shop, Marketplace

**Authority 3: `window.location.href` in `Layout.jsx`**  
- 3 instances of hard redirect bypassing React Router:
  - Line 183: `window.location.href = createPageUrl('AccountConsents')` (consent gate)
  - Line 195: `window.location.href = createPageUrl('OnboardingGate')` (onboarding gate)
  - Line 208: `window.location.href = createPageUrl('Profile')` (profile setup)
- These cause **full page reloads**, destroying all React state including React Query cache

### Tab Navigation Control

| Component | File | Method |
|---|---|---|
| Desktop Sidebar | `src/Layout.jsx` (LayoutInner) | `<Link to={...}>` (Router) |
| Mobile Header + Menu | `src/Layout.jsx` (LayoutInner) | `<Link to={...}>` (Router) |
| `BottomNav` | `src/components/navigation/BottomNav.jsx` | Mixed: Router Links + `openSheet()` |
| `BottomDock` | `src/components/shell/BottomDock.tsx` | Purely `openSheet()` (Sheet-based) |

**Both `BottomNav` and `BottomDock` exist.** It is unclear which is authoritative at runtime. `BottomNav` is rendered inside `Layout.jsx`; `BottomDock` appears to be an alternative component not mounted in the main Layout.

### Screens that unmount on tab switch

All page components rendered via React Router's `<Routes>` unmount and remount on every route change, including:
- `Home`, `Pulse`, `Events`, `Social`, `Messages`, `Music`, `More`, `Profile`, etc.
- All local state (form state, scroll position, fetched-but-not-cached data) is destroyed on tab switch
- React Query's cache is preserved (global `queryClientInstance`), but component state is not

### Contradictions

1. App.jsx comments state "Router only handles URL sync, not page mounts" — but `AuthenticatedApp` wraps pages in full `<Routes>`, meaning every route change still unmounts/remounts page components
2. `BootRouter` allows unauthenticated users with `localStorage age=true` to access the full authenticated app — bypassing `PublicShell` and all auth gates entirely
3. Layout.jsx runs its own auth check (`base44.auth.isAuthenticated()` + `base44.auth.me()`) independently of both `AuthProvider` and `BootGuardProvider`, creating three parallel auth state machines

---

## 3. OVERLAY SYSTEM MAP

### Overlay Implementations

**System A: SheetContext + SheetRouter (L2 Sheets)**  
Location: `src/contexts/SheetContext.jsx` + `src/components/sheets/SheetRouter.jsx`  
Mounted in: `Layout.jsx` → `<SheetRouter>` (bottom of LayoutInner, after all page content)  
Sheet types: `profile`, `event`, `chat`, `vault`, `shop`, `ghosted`, `product`, `social`, `events`, `marketplace`  
Components: `L2EventSheet`, `L2ProfileSheet`, `L2ChatSheet`, `L2VaultSheet`, `L2ShopSheet`, `L2GhostedSheet`, `L2SocialSheet`, `L2EventsSheet`, `L2MarketplaceSheet` (all lazy-loaded)  
Mechanism: `useReducer` FSM, URL sync via `?sheet=X` query param  
Z-index: Contained within `Layout.jsx` rendering hierarchy  

**System B: OSSheetRenderer (OS FSM Sheets)**  
Location: `src/components/os/OSSheetRenderer.jsx`  
Backed by: `src/os/store.tsx` (separate OS FSM using React Context + `useReducer`)  
Sheet types: `grid`, `pulse`, `market`, `chat`, `stack`, `radio`, `care`, `affiliate`, `profile`, `event`, `vault`, `shop`, `ghosted`, `product`  
Status: Only renders a **demo/placeholder** — no real content. Sheet content displays "This is a demo sheet overlay."  
Mounted in: Not currently mounted in the main render tree (not found in Layout or App).  

**System C: OSInterruptRenderer (OS FSM Interrupts)**  
Location: `src/components/os/OSInterruptRenderer.jsx`  
Backed by: `src/os/store.tsx`  
Interrupt types: `sos`, `safety`, `age-gate`, `onboarding`, `auth`, `verification`  
Status: Only renders a **demo/placeholder** — no real content.  
Mounted in: Not currently mounted in the main render tree.  

**System D: Radix UI Dialog / AlertDialog**  
Used by individual components with **local** `useState` for open/close:
- `BeaconActions.jsx` — `<Dialog>` for beacon share
- `ShareButton.jsx` — `<Dialog>` for sharing
- `ConvictPlayer.jsx` — `<Dialog>` for radio player

**System E: Vaul Drawer**  
Location: `src/components/ui/drawer.jsx` (shadcn/Vaul wrapper)  
Used by individual components with local state.

**System F: Custom local modal components**  
Each has its own `useState` open/close:
- `MakeOfferModal.jsx` — marketplace offer
- `MarketplaceReviewModal.jsx` — marketplace review
- `NewMessageModal.jsx` — messaging
- `RightNowModal.jsx` — Right Now feature
- `AchievementUnlockModal.jsx` — gamification
- `LevelUpModal.jsx` — gamification
- `UpsellModal.jsx` — monetization
- `FiltersDrawer.jsx` — discovery filters
- `AppsGridModal` (inline in `BottomNav.jsx`) — apps grid

**System G: Interrupt layer components**  
Located in `src/components/interrupts/`:
- `AgeGate.tsx` (note: duplicates `src/components/auth/AgeGate.jsx`)
- `SOSOverlay.tsx`
- `SafetyOverlay.tsx`
- `VerificationRequired.tsx`  
Mounted by: Not confirmed to be mounted in main render tree.

### Portal Usage

No explicit `ReactDOM.createPortal()` calls found. Radix UI primitives (Dialog, Sheet, AlertDialog) use their own portals internally. No custom portal roots detected.

### Multiple Overlay Roots

- `SheetRouter` renders sheets inside `LayoutInner` DOM — sheets are children of the page layout, not a true top-level portal
- `OSSheetRenderer` and `OSInterruptRenderer` exist but are not mounted — if they were added without removing `SheetRouter`, there would be two competing sheet systems

### Topology Diagram

```
App DOM Root
├─ UnifiedGlobe (Z-0)
└─ AuthenticatedApp
   └─ PageTransition
      └─ Routes
         └─ LayoutWrapper → Layout → LayoutInner
            ├─ Mobile Header (Z-50)
            ├─ Desktop Sidebar (Z-40)
            ├─ <main> → page content
            ├─ SafetyFAB (floating)
            ├─ GlobalAssistant (floating)
            ├─ GlobalSearch (floating/overlay)
            ├─ BottomNav (Z-50 via absolute/fixed)
            ├─ CookieConsent (fixed)
            └─ SheetRouter (fixed, slide-up sheets)
               └─ L2SheetContainer → L2*Sheet (one active at a time)

Separate local overlays (mounted inside individual page/component trees):
   - Radix Dialog (Radix portal to body)
   - Vaul Drawer (Radix portal to body)
   - Custom modal components (rendered in-place, no portal)
```

**Violations:**
- Overlay system is **fragmented** across 7 different mechanisms
- SheetRouter sheets are not at document body level — they render inside the Layout DOM hierarchy, limiting z-index stacking context
- AppsGridModal inside BottomNav uses fixed positioning inside a non-isolated stacking context
- Duplicate interrupt/age-gate implementations: `src/components/auth/AgeGate.jsx` vs. `src/components/interrupts/AgeGate.tsx`

---

## 4. SUPABASE INTEGRATION MAP

### Client Initialization

**Primary client:** `src/components/utils/supabaseClient.jsx`
```js
export const supabase = createClient(supabaseUrl, supabaseKey);
// Uses VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
```
This is the **singleton**. All legitimate Supabase calls flow through this file.

**Re-export alias:** `src/api/base44Client.js`
```js
export { base44, supabase } from '@/components/utils/supabaseClient';
```
This is a pass-through, does not create a second client.

**Broken import:** `src/components/auth/TwoFactorSetup.jsx`
```js
import { supabase } from '@/lib/supabase'; // THIS FILE DOES NOT EXIST
```
The file `src/lib/supabase.ts` does not exist. This component will throw a runtime module resolution error when rendered.

**Debug leak:** `supabaseClient.jsx` line 19 calls `console.log('[supabase] URL:', supabaseUrl)` — the Supabase project URL is logged to the console on every app load in all environments.

### Auth State Flow

Auth state is tracked in **three parallel systems**:

| System | File | Mechanism | Scope |
|---|---|---|---|
| `AuthProvider` | `src/lib/AuthContext.jsx` | polls `base44.auth.isAuthenticated()` once on mount | Provides `user`, `isAuthenticated`, `isLoadingAuth` to consumers |
| `BootGuardProvider` | `src/contexts/BootGuardContext.jsx` | `supabase.auth.getSession()` + `onAuthStateChange` | Drives boot gate state machine (`LOADING/UNAUTHENTICATED/NEEDS_AGE/NEEDS_ONBOARDING/READY`) |
| `Layout.jsx` | `src/Layout.jsx` | calls `base44.auth.isAuthenticated()` + `base44.auth.me()` on every `currentPageName` change | Local `user` state for rendering nav + gating |

**`onAuthStateChange` listeners registered simultaneously:**

| File | Subscriber |
|---|---|
| `src/contexts/BootGuardContext.jsx:84` | BootGuardProvider — drives boot state |
| `src/contexts/NowSignalContext.jsx:139` | NowSignalContext — subscribes to auth events |
| `src/lib/bootGuard.ts:272` | Standalone `bootGuard.ts` module (not same as BootGuardContext) |
| `src/core/viewerState.ts:160` | viewerState module |
| `src/pages/Auth.jsx:98` | Auth page |

5 separate `onAuthStateChange` listeners active simultaneously, each operating independently. No shared de-duplication.

### Data Fetching Patterns

| Pattern | Files | Notes |
|---|---|---|
| `base44.entities.*.filter()` / `.list()` | Globe.jsx, Marketplace.jsx, Beacons.jsx, etc. | Uses the Base44 compatibility wrapper which calls Supabase under the hood |
| `supabase.from(table).select()` | 80+ component files | Direct Supabase queries inside UI components |
| `@tanstack/react-query` + `useQuery` | Throughout | Some queries, not all |
| Direct `async/await` in `useEffect` | Throughout | Many components without React Query |
| Server-side API routes (`api/`) | Shopify, routing, events cron | Vercel serverless functions |

**Count of direct Supabase calls in UI components:** 186 (grep for `supabase.from\|supabase.auth\|supabase.channel`)

### Realtime Subscriptions

| File | Channels | Cleanup |
|---|---|---|
| `ActivityStream.jsx` | 6 channels (`globe-activities`, `globe-checkins`, `globe-rightnow`, `globe-messages`, `globe-orders`, `globe-rsvps`) | ✅ `supabase.removeChannel(sub)` in cleanup |
| `useRealtimeBeacons.js` | 3 channels (`presence-beacons`, `events-beacons`, `presence-count`) | ✅ cleaned up |
| `NotificationCenter.jsx` | 2 channels (`notifications-realtime`, `notifications-admin-realtime`) | ✅ cleaned up |
| `TypingIndicator.jsx` | 1 channel per `channelName` | ✅ cleaned up |
| `LiveLocationShare.jsx` | 1 channel per location share session | ✅ cleaned up |
| `VideoCallRoom.jsx` | 1 channel per `callId` | ✅ via `subscription.unsubscribe()` |
| `WorldPulseContext.jsx` | Multiple (global ambient signals) | Needs verification |
| `NowSignalContext.jsx` | `onAuthStateChange` subscription | ✅ cleaned up |

`ActivityStream.jsx` is mounted inside `GlobePage` which is inside `UnifiedGlobe` — because `UnifiedGlobe` never unmounts, these 6 channels remain subscribed for the entire app session. This is by design but means 6 persistent realtime channels are always open.

### Supabase Risk Areas

1. **Broken import in TwoFactorSetup.jsx** — runtime crash when that component renders
2. **Debug `console.log` of Supabase URL** — logs project URL to console in production
3. **5 parallel `onAuthStateChange` listeners** — potential for conflicting auth state
4. **186 direct DB calls in UI** — no data access layer; hard to audit, test, or mock
5. **3 parallel auth state machines** — AuthContext, BootGuardContext, Layout local state — can diverge
6. **GlobePage (never unmounts) runs 6 persistent realtime subscriptions** — connection overhead on all pages
7. **No React Query wrapping for many Supabase calls** — stale data, no deduplication, no error boundaries

---

## 5. COMPONENT DUPLICATION REPORT

### ProfileCard Variants (4 implementations)

| File | Purpose |
|---|---|
| `src/features/profilesGrid/ProfileCard.tsx` | Primary grid card (TypeScript, feature module) |
| `src/features/profilesGrid/SmartProfileCard.tsx` | AI-augmented card with match scoring |
| `src/components/react-bits/ProfileCard/ProfileCard.jsx` | React Bits animated card (demo/visual) |
| `src/components/social/TacticalProfileCard.jsx` | Tactical/OS-style card |

No shared base component. Each implements its own avatar rendering, name display, badge logic, and action buttons independently.

### Sheet Implementations (2 systems, 17+ components)

| Layer | Components |
|---|---|
| SheetContext system (active) | `L2SheetContainer`, `L2EventSheet`, `L2ProfileSheet`, `L2ChatSheet`, `L2VaultSheet`, `L2ShopSheet`, `L2GhostedSheet`, `L2SocialSheet`, `L2EventsSheet`, `L2MarketplaceSheet` |
| OS FSM system (inactive/demo) | `OSSheetRenderer` (placeholder), `OSInterruptRenderer` (placeholder) |
| BaseSheet pattern (partial) | `BaseSheet.tsx`, `EventSheet.tsx`, `MiniProfileSheet.tsx` (not wired to SheetRouter) |

### Button Variants

228 imports of `@/components/ui/button` (shadcn Button). Additionally:
- `CTAButton.jsx` — custom CTA with its own styling
- Dozens of raw `<button>` elements with inline Tailwind classes throughout Layout.jsx, BottomNav.jsx, and page components
- No unified button variant map enforced

### Layout Wrappers

| Component | File | Used By |
|---|---|---|
| `Layout` (sidebar+bottom nav) | `src/Layout.jsx` | All pages via `LayoutWrapper` in App.jsx |
| `PublicShell` (minimal) | `src/components/shell/PublicShell.jsx` | Unauthenticated boot state |
| `BootRouter` | `src/components/shell/BootRouter.jsx` | Wraps `OSArchitecture` |
| `OSArchitecture` | inline in `App.jsx` | Wraps `UnifiedGlobe` + `AuthenticatedApp` |
| `PageErrorBoundary` | `src/components/error/PageErrorBoundary.jsx` | Wraps every page inside Layout |
| `ErrorBoundary` | `src/components/error/ErrorBoundary.jsx` | Top-level in main.jsx and Layout |
| `PageTransition` | `src/components/lux/PageTransition.jsx` | Wraps all Routes in AuthenticatedApp |

7 distinct wrapper layers stack on every page render.

### ProductCard Variants (2 separate)

| File | Notes |
|---|---|
| `src/components/marketplace/ProductCard.jsx` | P2P marketplace card |
| `src/components/commerce/ProductCard.jsx` | Commerce/Shopify card |

Different implementations with no shared base.

### Inline Styling Violations

- **381** `style={...}` prop usages across JSX/TSX files
- Brand colors hard-coded 2654+ times as hex strings (e.g., `#FF1493`, `#B026FF`, `#00D9FF`, `#39FF14`, `#FFEB3B`) instead of Tailwind tokens or CSS variables

### Design Token Sources (2 active, conflicting)

| Source | Location | Usage |
|---|---|---|
| Tailwind CSS variables (shadcn pattern) | `tailwind.config.js` + `src/index.css` | `bg-background`, `text-foreground`, `border-border`, etc. |
| Hard-coded hex strings | Inline `style={}` and Tailwind arbitrary values throughout | `#FF1493`, `#B026FF`, `bg-[#050507]`, etc. |

The codebase has two design token systems operating in parallel. The Tailwind variable system (used by shadcn components) and a parallel system of hard-coded brand hex values that appear in over 2600 places. These are not reconciled.

### Tailwind Drift Zones

- `bg-[#050507]` — base background, used directly 30+ times
- `text-[#FF1493]` — primary pink, used directly 80+ times
- `bg-[#FF1493]` — primary pink fill, used directly 40+ times
- `border-[#FF1493]` — primary pink border, used directly 20+ times
- `text-[#B026FF]` — purple, used directly 30+ times
- `shadow-[0_0_10px_#FF1493]` — glow effects, used directly 15+ times

---

## 6. FLOW STABILITY REPORT

### Simulated Flow: Home → Pulse → Ghosted → Market → Profile

**Home:**  
Route: `/` → `LayoutWrapper` → `Layout` → `Home`  
Layout mounts with `currentPageName="Home"`. `useEffect` fires: checks `base44.auth.isAuthenticated()` + `base44.auth.me()`. GlobePage persists beneath at Z-0.

**Pulse:**  
Route: `/pulse` → `LayoutWrapper` → `Layout` → `Pulse`  
**Full unmount/remount of Layout** (new `LayoutWrapper` instance). `RadioProvider`, `TonightModeProvider`, `SheetProvider` all remount. `SheetProvider` loses any open sheet state. Auth `useEffect` fires again (third auth check total for the session so far). Pulse page mounts fresh.  
⚠️ Any state inside the previous `SheetProvider` (open sheet, props) is lost.

**Ghosted:**  
"Ghosted" is not a route — it is a `SHEET_TYPES.GHOSTED` sheet opened via `SheetContext.openSheet()`.  
If accessed via `BottomNav.jsx` (Social tab calls `openSheet(SHEET_TYPES.GHOSTED)`), it slides up over the current page without routing.  
⚠️ **Navigation authority conflict:** Ghosted behavior depends on how the user got there. Direct URL navigation to `/social` opens the Social page. `BottomNav` Social tab calls `openSheet(SHEET_TYPES.GHOSTED)` instead. These are two different experiences for the same user intent.

**Market:**  
Route: `/market` → `ShopHomeRoute` → `LayoutWrapper` → `Layout` → `<Shop>` (Shopify headless)  
Full unmount/remount of Layout again. `SheetProvider` remounts; any open sheet is cleared. Auth check fires again. This is the 4th Layout mount in this flow.

**Profile:**  
Route: `/Profile` or `/profile?email=...` → `LayoutWrapper` → `Layout` → `<Profile>`  
Full unmount/remount again. 5th Layout + Provider remount in this flow.

### State Unmounting Findings

| State | Behavior on Tab Switch |
|---|---|
| React Query cache | ✅ Persists (global singleton queryClient) |
| Page component local state | ❌ Destroyed (full unmount) |
| SheetContext state | ❌ Destroyed (SheetProvider remounts with Layout) |
| RadioContext state | ❌ Destroyed (RadioProvider remounts with Layout) |
| Form input state | ❌ Destroyed |
| Scroll position | ❌ Destroyed |
| AuthContext/BootGuardContext | ✅ Persists (root-level providers) |
| OSProvider (OS FSM) | ✅ Persists (root-level) |

### Back Behavior

- Browser back navigates URL history (React Router handles)
- `SheetContext` listens to `popstate` to close sheets on browser back — but this listener uses `state.activeSheet` in a closure that may be stale
- `SheetContext` also has a `useEffect` watching `searchParams` that can conflict with the `popstate` handler (double-close risk)
- `window.location.href` redirects (in Layout.jsx) do NOT push history entries, making back behavior undefined after consent/onboarding gates

### Race Conditions Identified

1. **Dual auth check on mount:** `AuthProvider` and `BootGuardProvider` both call separate Supabase auth endpoints on app load simultaneously. If one resolves before the other, there is a window where `AuthProvider` shows authenticated but `BootGuardProvider` shows loading (or vice versa).

2. **Layout auth useEffect vs. BootGuardProvider:** Layout fires its own `base44.auth.me()` call in a `useEffect` that depends on `currentPageName`. This can fire mid-navigation while BootGuardProvider is updating, creating a brief window of conflicting auth state.

3. **Cart merge race:** `mergeGuestCartToUser` is called in both `AuthContext` (on login, line 70) and `Layout.jsx` (on user load, line 167-178) with different deduplication keys (`mergedGuestCartRef` vs. `sessionStorage mergedKey`). Both can run on the same session.

4. **`SheetContext` URL sync loop risk:** Two `useEffect` hooks watch `state.activeSheet` and `searchParams` respectively and call each other's update functions. Under rapid navigation, these can trigger alternating updates.

5. **BootRouter localStorage bypass:** If a user's Supabase profile fetch fails (e.g., network error), and they have `localStorage age=true`, they are shown the full authenticated app even when `bootState === 'UNAUTHENTICATED'`. The app may then fail silently throughout.

---

## 7. TOP 10 ARCHITECTURAL RISKS (RANKED)

### Risk 1 — CRITICAL: Three Parallel Auth State Machines
**Risk type:** Structural, Flow unpredictability  
**Severity:** 🔴 Critical  
`AuthProvider`, `BootGuardProvider`, and `Layout.jsx`'s `useEffect` each independently track authenticated user state using different mechanisms. They can disagree. Layout.jsx calls `base44.auth.me()` on every page transition, but AuthContext does not re-check. A user who logs out in another tab will be correctly reflected in BootGuardContext (via `onAuthStateChange`) but Layout may still show them as logged in until the next navigation.

---

### Risk 2 — CRITICAL: Broken Import in TwoFactorSetup.jsx
**Risk type:** Supabase risk, Testing risk  
**Severity:** 🔴 Critical  
`import { supabase } from '@/lib/supabase'` — this file does not exist. The `TwoFactorSetup` component will throw a build or runtime module resolution error when imported/rendered.

---

### Risk 3 — HIGH: SheetProvider Remounts on Every Route Change
**Risk type:** Flow unpredictability, Structural  
**Severity:** 🟠 High  
`SheetProvider` is instantiated inside `Layout.jsx`, which is re-created on every route change. This means any open sheet is forcibly closed and its state destroyed whenever the user navigates. An open chat sheet, for example, is destroyed when the user navigates to a different tab. This is the primary cause of the app feeling "web-like instead of app-like."

---

### Risk 4 — HIGH: Five Parallel `onAuthStateChange` Listeners
**Risk type:** Supabase risk, Structural  
**Severity:** 🟠 High  
5 independent listeners are registered on `supabase.auth.onAuthStateChange`. Each one reacts to auth events and mutates its own state. On a `SIGNED_OUT` event, all 5 fire in undefined order. If any one fails or fires a side effect that triggers re-render, it can cause cascading state inconsistency. The `bootGuard.ts` listener and `viewerState.ts` listener are module-level singletons that are never unsubscribed.

---

### Risk 5 — HIGH: `window.location.href` Bypassing React Router in Layout
**Risk type:** Flow unpredictability, Structural  
**Severity:** 🟠 High  
Layout.jsx performs 3 hard redirects via `window.location.href` for consent/onboarding gating. These cause full page reloads, destroying all React state, React Query cache, and history entries. Back button behavior after these redirects is undefined. Users can get stuck in redirect loops if consent flags are inconsistently set (which is possible given the three auth systems).

---

### Risk 6 — HIGH: GlobePage Never Unmounts, 6 Persistent Realtime Channels
**Risk type:** Supabase risk, Scalability  
**Severity:** 🟠 High  
`UnifiedGlobe` → `GlobePage` runs for the full app session. `GlobePage` mounts `ActivityStream.jsx` which opens 6 Supabase realtime channels simultaneously. These remain open indefinitely. `GlobePage` also runs `useRealtimeBeacons` (3 more channels) and fires React Query polls every 30 seconds for beacons, cities, user intents, and right-now users. This is 9+ persistent realtime channels + 4 polling queries running permanently in the background.

---

### Risk 7 — HIGH: No Data Access Layer; 186 Direct DB Calls in UI
**Risk type:** Scalability, Testing risk  
**Severity:** 🟠 High  
186 direct Supabase queries are scattered across UI components. There is no centralized data access layer, repository pattern, or service layer. This makes it impossible to add caching, offline support, or audit data access patterns. Testing components requires a live Supabase connection or complex mocking.

---

### Risk 8 — MEDIUM: Duplicate Route Declarations
**Risk type:** Flow unpredictability  
**Severity:** 🟡 Medium  
`/more/beacons`, `/more/beacons/new`, `/more/beacons/:id` are declared twice in `AuthenticatedApp`. `/onboarding` is declared twice with different `pageKey` values (`"OnboardingGate"` and `"Onboarding"`). React Router will use the first match, silently ignoring the second. These duplicates can cause confusion when debugging routing behavior.

---

### Risk 9 — MEDIUM: Design Token Fragmentation (2654+ Hard-Coded Hex Values)
**Risk type:** Scalability, Long-term  
**Severity:** 🟡 Medium  
Brand colors are defined as CSS variables in the Tailwind config but are never used in the component layer. Instead, 2654+ Tailwind arbitrary values (`bg-[#FF1493]`, `text-[#B026FF]`) and 381 inline `style={}` props reference hex strings directly. A single brand color change requires finding and replacing thousands of hardcoded values. There is no single source of truth for design tokens in component code.

---

### Risk 10 — MEDIUM: 4 ProfileCard Variants With No Shared Base
**Risk type:** Scalability, Testing risk  
**Severity:** 🟡 Medium  
Four ProfileCard implementations exist with no shared base component. Bugs or design changes must be applied to all four separately. Feature parity (badges, match scores, action buttons) diverges over time between variants.

---

## 8. ARCHITECTURAL HEALTH SCORE

```
HOTMESS GLOBE — ARCHITECTURAL HEALTH SCORE

┌─────────────────────────────────────────────────────┐
│                                                     │
│   Overall Score:  38 / 100                          │
│                                                     │
│   Structural Architecture       42 / 100            │
│   Supabase Integration          35 / 100            │
│   Navigation Reliability        30 / 100            │
│   Overlay System                25 / 100            │
│   Component Consistency         40 / 100            │
│   Flow Stability                38 / 100            │
│   Long-term Scalability         45 / 100            │
│   Testability                   30 / 100            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Score Rationale

**What is working (positive signals):**
- Supabase client is a true singleton — no duplicate `createClient()` calls
- Realtime subscriptions largely have cleanup functions
- React Query is present and used in key locations
- ErrorBoundary coverage at multiple levels
- OS FSM architecture (`src/os/`) is well-designed in theory with a clean types/FSM/store separation
- `UnifiedGlobe` persistence intention is correct for app-feel
- `clearBadSupabaseSessions()` runs before React prevents stale token issues

**What is degrading the score:**
- Three competing auth state machines that can and do diverge
- Five `onAuthStateChange` listeners with no coordination
- SheetProvider remounting on every route change, killing "app feel"
- `window.location.href` hard redirects bypassing React Router
- Broken import that will crash TwoFactorSetup
- OSSheetRenderer/OSInterruptRenderer exist but contain only demo content — the OS FSM architecture is defined but not wired to real content
- 2654+ hard-coded hex values vs. zero token-based color usage in components
- 186 direct DB calls in UI components with no data layer
- 9+ persistent realtime channels running from GlobePage on every page
- Duplicate routes and navigation authorities creating non-deterministic behavior
- Cart merge runs twice per session from two different modules

---

*This report is observation-only. No code was modified in its production.*  
*Generated from direct codebase exploration of the live `src/` tree.*
