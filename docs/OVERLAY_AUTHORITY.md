# Overlay Authority Documentation

## Executive Summary

**CANONICAL OVERLAY OWNER:** `SheetContext` (`src/contexts/SheetContext.jsx`)

**OVERLAY ROOT MOUNT LOCATION:** `App.jsx` → `SheetProvider` wraps Router contents (OUTSIDE route remount boundary), with `SheetRouter` rendered at same level.

**STABLE AFTER STAGE 2:** SheetProvider and SheetRouter are now mounted in App.jsx, outside all route trees. Sheets persist across route changes and tab switches.

---

## Architecture After Stage 2

### Provider Hierarchy (from main.jsx down)

```
main.jsx
├── Sentry.ErrorBoundary
│   └── ErrorBoundary
│       └── OSProvider (src/os/store.tsx) ← system modes only
│           └── App.jsx
│               └── Router (BrowserRouter)
│                   └── SheetProvider ← CANONICAL OVERLAY OWNER (stable!)
│                       ├── NavigationTracker
│                       ├── BootRouter
│                       │   └── OSArchitecture
│                       │       ├── UnifiedGlobe (L0)
│                       │       └── AuthenticatedApp (routes)
│                       └── SheetRouter ← renders sheets (stable!)
```

### Authority Division

| System | Owner | Responsibility |
|--------|-------|----------------|
| L2 Sheets (profile, event, chat, etc.) | SheetContext | ALL sheet overlays |
| System Interrupts (SOS, errors) | OS Store | System-level blocking |
| URL Sync for Sheets | SheetContext | `?sheet=` params |
| Back Button | SheetContext | Overlay-first pop |

---

## Current Call Sites

### SheetContext openSheet calls (primary system):
| File | Usage |
|------|-------|
| `BottomNav.jsx` | Opens GHOSTED, SHOP sheets from nav |
| `BottomDock.tsx` | Opens sheets from dock icons |
| `EventCard.jsx` | Opens EVENT sheet |
| `L2EventSheet.jsx` | Opens PROFILE sheet for event creator |
| `L2ProfileSheet.jsx` | Opens CHAT, EVENT, SHOP sheets |
| `L2ChatSheet.jsx` | Opens PROFILE sheet |
| `L2GhostedSheet.jsx` | Opens PROFILE, CHAT sheets |
| `L2VaultSheet.jsx` | Opens EVENT, SHOP sheets |
| `L2ShopSheet.jsx` | Opens VAULT sheet |
| `SheetLink.jsx` | Generic sheet opener component |
| `legacyRedirects.js` | Opens sheets from legacy URLs |

### OS Store openSheet calls (secondary - demo):
| File | Usage |
|------|-------|
| `OSHUDDemo.jsx` | Demo buttons for grid, pulse, market, chat |
| `OSSheetRenderer.jsx` | Demo sheet renderer (not connected to real sheets) |
| `os/url-sync.ts` | URL sync for OS state |

---

## Back Button Behavior

### Current Implementation (SheetContext.jsx lines 179-190):
```javascript
useEffect(() => {
  const handlePopState = () => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('sheet') && state.activeSheet) {
      closeSheet();
    }
  };
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, [state.activeSheet, closeSheet]);
```

**Current Behavior:**
- Sheet opens → URL gets `?sheet=profile&email=...`
- Back button pressed → `popstate` fires → if no `?sheet=` in URL, close sheet
- Sheet closing updates URL to remove params

**Gap:** This doesn't prevent route navigation when sheet is open. Back button both closes sheet AND navigates back.

---

## Component-Local Modals/Dialogs

Found via `createPortal|Portal|Dialog|Modal|Drawer` grep:

| Component | Type | Notes |
|-----------|------|-------|
| `AppsGridModal` (BottomNav.jsx) | Local modal | Opens via button, has backdrop |
| `UnifiedCartDrawer` | Drawer | Cart slide-out |
| `GlobalSearch` | Overlay | Search modal |
| `MobileMenuPanel` | Menu | Mobile nav |
| Various Radix Dialog/Drawer | UI primitives | Used in forms, confirmations |

These are acceptable as local UI and don't compete with the sheet system.

---

## Required Changes

### 1. Move SheetProvider Outside Route Boundary

**Current (Layout.jsx):**
```jsx
export default function Layout(props) {
  return (
    <RadioProvider>
      <TonightModeProvider>
        <SheetProvider>  {/* INSIDE route tree - remounts! */}
          <LayoutInner {...props} />
        </SheetProvider>
      </TonightModeProvider>
    </RadioProvider>
  );
}
```

**Target (App.jsx):**
```jsx
// App.jsx - add SheetProvider ABOVE Routes but INSIDE Router
<Router>
  <SheetProvider>  {/* STABLE - outside route remount boundary */}
    <Routes>
      ...
    </Routes>
    <SheetRouter />  {/* Move here - renders over routes */}
  </SheetProvider>
</Router>
```

### 2. Enforce Overlay-First Back Behavior

Add history state management so back button pops overlay first:
- When sheet opens, push a history entry
- When back pressed, check if sheet open → close sheet instead of route back

### 3. OS Store Delegation

- OS Store `openSheet` should delegate to SheetContext
- Or restrict OS Store to system interrupts only (SOS, errors, etc.)

---

## Decision: Tab Switch Behavior

**Options:**
A) Sheets persist across tab switches (overlay stays open)
B) Sheets dismiss on tab switch (overlay closes)

**Recommendation:** Option A - sheets persist. This matches mobile app behavior where switching tabs doesn't close modals.

---

## Verification Commands

```bash
# Sheet context usage
rg "useSheet|SheetContext|SheetProvider" -n src

# OS store sheet usage  
rg "useOS\(\)|useOSSheet\(\)" -n src

# Overlay rendering
rg "SheetRouter|OSSheetRenderer" -n src

# Back button handling
rg "popstate|history\." -n src
```
