# HOTMESS OS Remap Blueprint

**Version:** 1.0  
**Date:** 2026-02-20  
**Status:** STAGE 0 — Documentation Complete

---

## 1. OS Architecture: The Ring Model

HOTMESS must operate as a **Spatial OS**, not a website with pages. All functionality maps to rings:

```
┌─────────────────────────────────────────────────────────────┐
│ Ring 4: FEATURE MODULES                                      │
│   Globe · Radio · Safety · Social · Market · Profiles        │
├─────────────────────────────────────────────────────────────┤
│ Ring 3: NAVIGATION                                           │
│   React Router (SOLE URL authority)                          │
├─────────────────────────────────────────────────────────────┤
│ Ring 2: WINDOW MANAGER                                       │
│   Unified Sheet/Overlay Stack (LIFO + back integration)      │
├─────────────────────────────────────────────────────────────┤
│ Ring 1: SERVICES                                             │
│   Auth · Storage · Analytics · Feature Flags · Realtime      │
├─────────────────────────────────────────────────────────────┤
│ Ring 0: RUNTIME                                              │
│   Boot FSM · Error Boundaries · Instrumentation (Sentry)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Ring 0: Runtime Layer

### Components
- **BootGuardContext** (`src/contexts/BootGuardContext.jsx`) — Boot state machine
- **ErrorBoundary** (`src/components/error/ErrorBoundary.jsx`) — Global error handling
- **Sentry** (`src/main.jsx`) — Error instrumentation

### Boot State Machine (Current)
```
LOADING → UNAUTHENTICATED (valid) → [Auth] → NEEDS_AGE → NEEDS_ONBOARDING → READY
```

### Contract
```typescript
interface BootRuntime {
  bootState: 'LOADING' | 'UNAUTHENTICATED' | 'NEEDS_AGE' | 'NEEDS_ONBOARDING' | 'READY';
  isAuthenticated: boolean;
  canMountOS: boolean;
  markAgeVerified(): Promise<boolean>;
  completeOnboarding(): Promise<boolean>;
}
```

---

## 3. Ring 1: Services Layer

### Auth Service (CANONICAL OWNER)
**File:** `src/contexts/BootGuardContext.jsx` + `src/lib/AuthContext.jsx`

**Problem:** 6 files contain `onAuthStateChange` listeners:
1. `BootGuardContext.jsx` — Primary (manages boot flow)
2. `AuthContext.jsx` — User object wrapper
3. `NowSignalContext.jsx` — Subscribes to presence channels on auth
4. `viewerState.ts` — Viewer session cache
5. `bootGuard.ts` — Duplicate of context (remove)
6. `Auth.jsx` — Page-specific auth handling

**Resolution:** 
- BootGuardContext = canonical session owner
- AuthContext = exposes user + helpers (wraps BootGuard)
- Others subscribe to AuthContext events, do NOT add listeners

### Realtime Service
**Current:** Channels created ad-hoc in 20+ locations with inconsistent cleanup.

**Contract:**
```typescript
interface RealtimeService {
  subscribe(table: string, event: string, filter?: object, callback: (payload) => void): () => void;
  subscribePresence(channelName: string, onSync: (state) => void): () => void;
  broadcast(channelName: string, event: string, payload: object): void;
  cleanup(): void; // Called on logout
}
```

**Ownership Rules:**
- Globe owns: `presence-beacons`, `events-beacons`, `globe-*`
- WorldPulse owns: `world-pulse-*`
- Notifications owns: `notifications-*`
- Safety owns: `safety-*`
- Each owner MUST cleanup on unmount/logout

---

## 4. Ring 2: Window Manager (Overlay Authority)

### Current State (PROBLEM)
Two competing systems:
1. **OSProvider** (`src/os/store.tsx`) — FSM-based sheet/interrupt management
2. **SheetContext** (`src/contexts/SheetContext.jsx`) — Reducer-based sheet stack with URL sync

**Both systems exist but are not integrated.**

### Resolution: Unified Window Manager

**Canonical Owner:** SheetContext (it has URL sync + stack)

**Contract A: Window Manager**
```typescript
interface WindowManager {
  // Stack state
  activeSheet: SheetType | null;
  sheetStack: Array<{ type: SheetType; props: object }>;
  
  // Actions
  push(sheet: SheetType, props?: object): void;
  pop(): void;
  replace(sheet: SheetType, props?: object): void;
  dismissAll(): void;
  
  // URL sync
  syncToUrl: boolean; // Controlled per-sheet
  
  // Back button integration
  // Rule: Overlay pop BEFORE route back
}

// Sheet types (canonical list)
type SheetType = 
  | 'profile'
  | 'event'
  | 'chat'
  | 'vault'
  | 'shop'
  | 'product'
  | 'ghosted'
  | 'social'
  | 'events'
  | 'marketplace'
  | 'safety'
  | 'settings';
```

### OSProvider Fate
- Keep for FSM transitions (boot → idle → sheet → interrupt)
- Do NOT use for sheet stack (delegate to SheetContext)
- Use for interrupts (SOS, age gate) which are blocking

---

## 5. Ring 3: Navigation Authority

### Current State (PROBLEM)
1. **React Router** — Primary routes in `App.jsx`
2. **SheetContext URL sync** — `?sheet=` params
3. **window.location.href** — 40+ files with hard redirects

### Resolution: Router is SOLE URL Authority

**Contract B: Navigation**
```typescript
interface NavigationContract {
  // Wrapper that modules use (no direct router access)
  go(path: string, options?: { replace?: boolean; state?: object }): void;
  
  // Sheet awareness
  goWithSheet(path: string, sheet: SheetType, sheetProps?: object): void;
  
  // Query params
  setParam(key: string, value: string): void;
  clearParam(key: string): void;
  
  // Back handling
  canGoBack(): boolean;
  goBack(): void; // Respects overlay-pop-first rule
}
```

**Implementation:**
```typescript
// src/lib/nav.ts
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useSheet } from '@/contexts/SheetContext';

export function useNav() {
  const navigate = useNavigate();
  const { closeSheet, activeSheet } = useSheet();
  
  return {
    go: (path, opts) => navigate(path, opts),
    
    goBack: () => {
      if (activeSheet) {
        closeSheet();
      } else {
        navigate(-1);
      }
    },
    // ...
  };
}
```

### Files Requiring Migration (window.location.href)
See `docs/ROUTING_COLLISION_REPORT.md` for full list.

---

## 6. Ring 4: Feature Modules

### Globe Module
**Entry:** `src/components/globe/UnifiedGlobe.tsx`
**Lifecycle:** Mounts once at OSArchitecture level, never remounts
**Realtime ownership:** All `globe-*` and `presence-*` channels

### Radio Module
**Entry:** `src/components/shell/PersistentRadioPlayer.jsx`
**Lifecycle:** Persistent, controlled by RadioContext
**State:** RadioContext (separate from sheet stack)

### Safety Module
**Entry:** `src/pages/Safety.jsx` + `src/components/safety/*`
**Interrupts:** SOS overlay uses OSProvider interrupt system
**Realtime ownership:** `safety-*` channels

### Social Module
**Entry:** `src/pages/Social.jsx`
**Sheets:** Profile (L2ProfileSheet), Chat (ChatSheet)
**Realtime ownership:** `messages-*` channels

### Market Module (MESSMARKET)
**See:** `docs/MARKET_ARCHITECTURE.md`

### Profiles Module
**See:** `docs/PROFILE_MAP_AUTHORITY.md`

---

## 7. Provider Mount Order (Canonical)

```jsx
// main.jsx
<Sentry.ErrorBoundary>
  <ErrorBoundary>
    <OSProvider> {/* Ring 0 FSM */}
      <App />
    </OSProvider>
  </ErrorBoundary>
</Sentry.ErrorBoundary>

// App.jsx
<I18nProvider>
  <AuthProvider> {/* Ring 1 */}
    <BootGuardProvider> {/* Ring 0 + 1 */}
      <QueryClientProvider>
        <WorldPulseProvider>
          <ShopCartProvider>
            <Router>
              <SheetProvider> {/* Ring 2 — MOVE HERE from Layout */}
                <BootRouter>
                  <OSArchitecture />
                </BootRouter>
              </SheetProvider>
            </Router>
          </ShopCartProvider>
        </WorldPulseProvider>
      </QueryClientProvider>
    </BootGuardProvider>
  </AuthProvider>
</I18nProvider>
```

**Critical Change:** SheetProvider must be OUTSIDE Layout, directly under Router.

---

## 8. Z-Index Layers (Canonical)

```css
/* L0: Globe background */
.globe-layer { z-index: 0; }

/* L1: HUD (always visible) */
.top-hud { z-index: 50; }
.bottom-dock { z-index: 50; }
.radio-bar { z-index: 50; }

/* L2: Sheets (slide-up content) */
.sheet-overlay { z-index: 80; }
.sheet-backdrop { z-index: 79; }

/* L3: Interrupts (blocking) */
.interrupt-overlay { z-index: 100; }
.sos-overlay { z-index: 110; }
.age-gate { z-index: 120; }
```

---

## 9. Implementation Priority

1. **Move SheetProvider** outside Layout (fixes sheet remount on route change)
2. **Create nav.go()** wrapper (prevents internal hard reloads)
3. **Consolidate auth listeners** (prevent multiplication)
4. **Assign realtime channel ownership** (prevent channel multiplication)
5. **Unify profile opening** (single entry point)
6. **Unify market** (Shopify + Preloved adapters)

---

## 10. Success Criteria

- [ ] Zero `window.location.href` assignments (except external links + checkout)
- [ ] Single SheetProvider mounted once at router level
- [ ] All auth listeners are subordinate to BootGuardContext
- [ ] All realtime channels have documented owners + cleanup
- [ ] Profile opens via `openProfile()` contract only
- [ ] Market renders unified grid (both sources)
- [ ] Tab switch does not reload app
- [ ] Back button pops overlay before route
- [ ] Playwright E2E tests pass
