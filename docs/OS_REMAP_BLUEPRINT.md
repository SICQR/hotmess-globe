# OS Remap Blueprint
**Version:** 1.0  
**Date:** 2026-02-20  
**Status:** Canonical authority definition — no code changes required

---

## Purpose

This document defines the target OS architecture for the HOTMESS Globe web-app. It establishes five rings (0–4), the contracts each ring exposes, and the ownership rules every feature module must follow.

No feature code should invent its own pattern for navigation, overlay management, auth, realtime, or profile rendering. Each of those concerns is served by exactly one contract defined here.

---

## Ring Model

```
┌──────────────────────────────────────────────────────────────────────┐
│  RING 0 — OS Runtime                                                 │
│  Boot FSM • Error boundaries • Analytics init • Feature flags        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  RING 1 — OS Services                                          │  │
│  │  Auth / session • Storage keys • Instrumentation hooks         │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │  RING 2 — OS Window Manager                              │  │  │
│  │  │  Overlay portal (LIFO stack) • Sheet API • Back rules    │  │  │
│  │  │  ┌────────────────────────────────────────────────────┐  │  │  │
│  │  │  │  RING 3 — OS Navigation                            │  │  │  │
│  │  │  │  React Router as URL authority • nav.go() wrapper   │  │  │  │
│  │  │  │  Canonical route table • Legacy redirect table      │  │  │  │
│  │  │  │  ┌──────────────────────────────────────────────┐  │  │  │  │
│  │  │  │  │  RING 4 — Feature Modules                    │  │  │  │  │
│  │  │  │  │  Globe • Radio • Safety • Social • Market    │  │  │  │  │
│  │  │  │  │  Each module: defined entry + lifecycle       │  │  │  │  │
│  │  │  │  └──────────────────────────────────────────────┘  │  │  │  │
│  │  │  └────────────────────────────────────────────────────┘  │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Ring 0 — OS Runtime

**Owner:** `src/os/` + `src/main.jsx`

### What lives here

| Concern | Current home | Target home |
|---------|-------------|-------------|
| Boot finite-state machine (boot → idle → sheet → thread → interrupt) | `src/os/store.tsx` + `src/os/fsm.ts` | **KEEP** |
| Error boundaries (outer Sentry, inner React) | `src/main.jsx` | **KEEP** |
| `OSProvider` context | `src/os/store.tsx` | **KEEP** |
| Analytics initialisation | `src/main.jsx` | **KEEP** |
| Sentry init | `src/main.jsx` | **KEEP** |
| `BootGuardProvider` state machine | `src/contexts/BootGuardContext.jsx` | **KEEP** (owned by Ring 0) |

### Ring 0 contract

```ts
// src/os/store.tsx (already implemented)
openSheet(sheet: SheetType, props?)
closeSheet()
openThread(threadId: string)
closeThread()
openInterrupt(interrupt: InterruptType, props?)
closeInterrupt()
goIdle()
wipe()
```

### Z-layer constants (authoritative)

```ts
Z_LAYERS = {
  GLOBE:      0,   // L0 — UnifiedGlobe
  HUD:       10,   // L1 — TopHUD, RadioBar, BottomDock
  SHEET:     20,   // L2 — slide-up content
  THREAD:    30,   // L2 upper — thread over sheet
  INTERRUPT: 50,   // L3 — blocking overlays
}
```

---

## Ring 1 — OS Services

**Owner:** `src/lib/AuthContext.jsx` + `src/contexts/BootGuardContext.jsx`

### What lives here

| Service | Current owner | Status |
|---------|--------------|--------|
| Supabase session + user | `AuthContext` | Canonical |
| Boot state machine | `BootGuardContext` | Canonical |
| `mergeGuestCartToUser` guard | `AuthContext.mergedGuestCartRef` | Partial — 3 other callers exist (see Duplication Index) |
| Guest-cart storage keys | `src/components/marketplace/cartStorage.js` | Stable |
| Feature flags | `src/components/utils/supabaseClient.jsx` (system_settings table) | Stable |
| Analytics events | `src/components/utils/analytics.js` | Stable |

### Rules

1. `AuthContext` is the single logical auth authority. It fires `checkUserAuth()` once on mount and subscribes to `supabase.auth.onAuthStateChange` via `BootGuardContext`.
2. Side effects that depend on login (cart merge, profile bootstrap, channel subscribe) MUST be idempotent and guarded by a ref or flag. They MUST NOT run more than once per session.
3. Other `onAuthStateChange` listeners (Auth page, NowSignalContext, bootGuard.ts, viewerState.ts) are **subordinate** and must have explicit cleanup.

---

## Ring 2 — OS Window Manager

**Owner:** `src/contexts/SheetContext.jsx` + `src/components/sheets/SheetRouter.jsx`

### What lives here

| Concern | Current home | Status |
|---------|-------------|--------|
| Sheet open/close/stack state | `SheetContext` | Canonical |
| Sheet type → component mapping | `SheetRouter` | Canonical |
| Sheet portal root | Inside `Layout.jsx` (wrapped in route tree) | **Defect** — must be outside route remount boundary |
| Back-button pop behaviour | Not implemented | **Gap** |
| URL sync for sheets | `SheetContext` (partial via `useSearchParams`) | Partial |

### Target contract (Contract B)

```ts
// src/contexts/SheetContext.jsx (partially implemented)
openSheet(type: SheetType, props?: Record<string, any>): void
closeSheet(): void
pushSheet(type, props): void   // nested sheet
popSheet(): void               // pop top
dismissAll(): void             // clear stack
```

Back rules:
- If overlay stack depth > 0: `popSheet()` before any router `navigate(-1)`.
- If overlay stack empty: standard router back.

### Rules

1. `SheetProvider` MUST be mounted outside the route tree so it does not remount on navigation.
2. `SheetRouter` (the portal) MUST render at the root level, not inside a page component.
3. Every sheet component receives props via `sheetProps`; it MUST NOT fetch its own data via a new realtime subscription unless that subscription has strict lifecycle cleanup.

---

## Ring 3 — OS Navigation

**Owner:** `src/App.jsx` (route declarations) + `src/utils/legacyRedirects.js`

### What lives here

| Concern | Current home | Status |
|---------|-------------|--------|
| Route declarations | `src/App.jsx` (142 `<Route>` entries) | Has **4 duplicate paths** |
| Legacy redirect table | Scattered in App.jsx as `<Navigate>` + `src/utils/legacyRedirects.js` | Partially duplicated |
| `nav.go()` wrapper | **Does not exist** | **Gap** |
| Internal `window.location` navigation | 30+ call sites in pages | **Defect** |

### Target contract (Contract A)

```ts
// src/lib/nav.ts (to be created)
nav.go(route: string, opts?: { replace?: boolean; params?: Record<string, string> }): void
nav.back(): void
nav.openProfile(userId: string, source: 'grid' | 'globe' | 'map' | 'search' | 'deeplink'): void
```

`nav.go()` uses React Router `navigate` internally. It is the only permitted way to perform programmatic navigation (other than Shopify checkout redirect and external `sms:` links).

### Canonical route table

See `STABILIZATION_EXECUTION_PLAN.md §1` for the complete route → page-key mapping.

---

## Ring 4 — Feature Modules

Each module has: **one entry point, one lifecycle, defined realtime ownership**.

| Module | Primary entry | Sheet type | Realtime owner | Route prefix |
|--------|--------------|------------|----------------|--------------|
| Globe | `UnifiedGlobe` (always mounted at L0) | N/A | `GlobeProvider` / `WorldPulseContext` | None (background) |
| Radio | `PersistentRadioPlayer` + `Radio` page | `radio` | `RadioContext` | `/music/live` |
| Safety | `Safety` page + `SafetyFAB` | interrupt: `safety`/`sos` | `src/lib/safety.ts` | `/safety/*` |
| Social | `Social` page + `L2ProfileSheet` + `L2ChatSheet` | `profile`, `chat`, `social` | `NowSignalContext` | `/social/*` |
| Market | `Shop`/`Marketplace`/`Preloved` | `market`, `shop`, `product` | None (REST) | `/market/*` |
| Events | `Events` page + `L2EventSheet` | `event`, `events` | None (REST + cron) | `/events/*` |
| Beacons | `Beacons`/`CreateBeacon` pages | `pulse` | `useRealtimeBeacons` | `/more/beacons/*` |
| Profile | `Profile` page + `L2ProfileSheet` | `profile` | None | `/social/u/:id` |

### Module rules

1. Each module subscribes to realtime channels in ONE hook or context (no per-render duplication).
2. Each module cleans up its channels on unmount / logout.
3. Feature modules MUST NOT declare their own navigation (use Ring 3 nav contract).
4. Feature modules MUST NOT render their own sheet portals (use Ring 2 sheet contract).

---

## OS Contracts Summary

| Contract | Description | Current state | Gap |
|----------|-------------|---------------|-----|
| **A — Navigation** | `nav.go()` wrapper; one route table; no `window.location` for internal nav | Partial — 30+ `window.location` usages | `nav.go()` not yet created |
| **B — Window Manager** | LIFO sheet stack; `SheetProvider` outside route tree; back-button integration | Partial — `SheetProvider` inside `Layout`; no back integration | Provider placement; back rules |
| **C — Auth / Session** | One `onAuthStateChange` authority; idempotent side effects | Partial — 5 listener sites; 4 cart merge call sites | Subordinate listeners need cleanup guard |
| **D — Realtime** | Channels owned by modules; singleton keys; logout/login cleanup | Partial — 40+ channels across 17 files; no global registry | No registry; Globe.jsx has non-stable channels |
| **E — Profile + Maps** | `openProfile(userId, source)` → sheet or route; one profile sheet variant | Partial — 3 sheet variants + page + 3 opener patterns | No single opener; multiple profile sheets |
| **F — Market** | Unified `MarketItem` type; one grid + one detail; Shopify checkout only for hard nav | Partial — 2 cart systems, 2 product card components | `MarketItem` type not defined; cart systems not unified |
