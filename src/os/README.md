# HOTMESS OS Runtime

**"One surface, many states. Sheets reveal. SOS overrides."**

The HOTMESS OS Runtime is a deterministic, interrupt-safe state management system that transforms a React app into an OS-grade runtime. It provides a formal Finite State Machine (FSM), state stack with interrupt priority, URL synchronization without routing, and production-ready safety layers.

---

## Architecture Overview

### Core Concepts

1. **Finite State Machine (FSM)** - Strict mode-based state transitions
2. **State Stack** - Interrupt-safe restoration
3. **Priority Layering** - Z-index based visual hierarchy
4. **URL Sync** - Deep linking without page routing
5. **Moderation Engine** - Silent safety layer
6. **Event Bus** - Centralized side effects

---

## State Machine

### Modes

The OS has 5 core modes:

```typescript
type Mode =
  | "boot"      // Initial boot sequence
  | "idle"      // Default state - Globe visible, no overlays
  | "sheet"     // Sheet overlay active
  | "thread"    // Thread/conversation view
  | "interrupt" // System interrupt (SOS, safety)
```

### Transition Rules (STRICT)

```
boot → idle
idle → sheet
sheet → idle
sheet → thread
thread → sheet
any → interrupt
interrupt → previous (restore)
interrupt → boot (wipe)
```

**Disallowed:**
- `thread → boot` (unless wipe)
- `interrupt → idle` directly (must restore previous)
- `sheet → boot` (unless wipe)

---

## Usage

### 1. Wrap your app with OSProvider

```tsx
import { OSProvider } from '@/os'

function App() {
  return (
    <OSProvider>
      <YourApp />
    </OSProvider>
  )
}
```

### 2. Use OS state in components

```tsx
import { useOS, useOSSheet } from '@/os'

function MyComponent() {
  const { state, openSheet, closeSheet } = useOS()
  
  return (
    <div>
      <p>Current mode: {state.mode}</p>
      <button onClick={() => openSheet('market')}>
        Open Market
      </button>
    </div>
  )
}
```

### 3. Enable URL sync

```tsx
import { useOSURLSync } from '@/os'

function AppRoot() {
  useOSURLSync() // Add this at your app root
  
  return <YourAppContent />
}
```

---

## Priority Layers

Visual stacking (Z-index):

```
0   - Globe (always visible)
10  - HUD (top nav, controls)
20  - Sheet (market, pulse, chat)
30  - Thread (conversation overlay)
50  - Interrupt (SOS, safety alerts)
```

**Rules:**
- Never conditionally render Globe
- Never render Sheet if `mode !== "sheet"`
- Never render Thread if interrupt active
- Interrupts always on top

---

## Sheet Types

Available sheets:

- `grid` - Profile grid discovery
- `pulse` - Events/beacons feed
- `market` - Marketplace/shop
- `chat` - Messages overview
- `stack` - Profile card stack
- `radio` - Radio player/schedule
- `care` - Aftercare resources
- `affiliate` - Affiliate program
- `profile` - User profile view
- `event` - Event detail
- `vault` - Order history
- `shop` - Shop detail
- `ghosted` - Ghosted content
- `product` - Product detail

---

## Interrupt Types

System-level overrides:

- `sos` - SOS safety interrupt
- `safety` - Safety alert/warning
- `age-gate` - Age verification required
- `onboarding` - Onboarding flow
- `auth` - Authentication required
- `verification` - Account verification

---

## URL Deep Linking

The runtime syncs state with URL search params:

```
?sheet=market          → Opens market sheet
?sheet=profile&id=123  → Opens profile sheet with ID
?thread=abc123         → Opens thread
```

**No routing** - Globe persists, state changes via query params.

---

## Moderation & Trust

### Moderation State

Silent system layer for safety:

```typescript
interface ModerationState {
  strikes: number
  restricted: boolean
  cooldownUntil?: number
}
```

**Rules:**
- Report → add strike
- 3 strikes → restrict
- Restrict → remove grid visibility
- Cooldown → auto restore

### Trust Metadata

Predictive safety scoring:

```typescript
interface TrustMeta {
  responseRate: number       // 0-1
  reliabilityScore: number   // 0-1
  verified: boolean
  noShowCount: number
  reportCount: number
}
```

**Ranking Formula:**

```
RankScore = 
  (distanceWeight * distance) +
  (onlineWeight * online) +
  (verifiedBoost) +
  (trustWeight * reliabilityScore) +
  randomDelta
```

---

## Event Bus

Centralized side effects:

```typescript
import { eventBus, SYSTEM_EVENTS } from '@/os'

// Emit event
eventBus.emit(SYSTEM_EVENTS.PRESENCE_UPDATE, {
  userId: '123',
  online: true
})

// Subscribe to event
eventBus.on(SYSTEM_EVENTS.CHAT_NEW, (payload) => {
  console.log('New chat:', payload)
})
```

**Available Events:**
- `presence:update` / `presence:online` / `presence:offline`
- `chat:new` / `chat:read` / `chat:typing`
- `pulse:new` / `pulse:update` / `pulse:rsvp`
- `sos:armed` / `sos:triggered` / `sos:canceled`
- `system:error` / `system:warning`
- `network:online` / `network:offline`

---

## API Reference

### `useOS()`

Main OS hook:

```typescript
const {
  state,              // Current OS state
  openSheet,          // Open a sheet
  closeSheet,         // Close current sheet
  openThread,         // Open a thread
  closeThread,        // Close thread
  openInterrupt,      // Trigger interrupt
  closeInterrupt,     // Restore from interrupt
  goIdle,            // Return to idle
  wipe,              // Wipe state (back to boot)
  isMode,            // Check current mode
  isSheet,           // Check if specific sheet open
  isInterrupt,       // Check if specific interrupt active
} = useOS()
```

### `useOSSheet()`

Sheet-specific hook:

```typescript
const {
  sheet,    // Current sheet type
  props,    // Sheet props
  isOpen,   // Is any sheet open
  open,     // Open a sheet
  close,    // Close sheet
} = useOSSheet()
```

### `useOSThread()`

Thread-specific hook:

```typescript
const {
  threadId,  // Current thread ID
  isOpen,    // Is thread open
  open,      // Open thread
  close,     // Close thread
} = useOSThread()
```

### `useOSInterrupt()`

Interrupt-specific hook:

```typescript
const {
  interrupt,  // Current interrupt type
  props,      // Interrupt props
  isOpen,     // Is interrupt active
  open,       // Trigger interrupt
  close,      // Restore from interrupt
} = useOSInterrupt()
```

---

## Microcopy

Built-in voice:

```typescript
import { MICROCOPY } from '@/os'

MICROCOPY.sheets      // "Sheets don't navigate. They reveal."
MICROCOPY.globe       // "Globe stays alive."
MICROCOPY.interrupts  // "Interrupts restore context."
MICROCOPY.wipe        // "Wipe means wipe."
```

---

## Production Hardening

### Error Boundaries

Wrap each layer:

```tsx
<ErrorBoundary fallback={<GlobeFallback />}>
  <Globe />
</ErrorBoundary>
```

### Failure States

Define graceful degradation for:
- Supabase disconnect
- Presence TTL expiry
- Market load fail
- Chat send fail
- Audio fail

### Performance Guardrails

- Lazy load sheets with `React.lazy()`
- Memoize grid tiles
- Avoid re-rendering Globe on sheet open
- Use slice selectors to prevent store-wide rerenders

---

## Development

### Adding a New Sheet

1. Add type to `SheetType` in `types.ts`
2. Create sheet component in `/src/components/sheets/`
3. Use `useOS()` to open: `openSheet('your-sheet', props)`

### Adding a New Interrupt

1. Add type to `InterruptType` in `types.ts`
2. Create interrupt component in `/src/components/interrupts/`
3. Use `useOS()` to trigger: `openInterrupt('your-interrupt', props)`

---

## What This Becomes

After full integration, you don't have a React app.

**You have:**
- ✅ Deterministic runtime
- ✅ Explicit state priority
- ✅ Interrupt-safe system
- ✅ URL-shareable OS
- ✅ Production-ready architecture
- ✅ Silent safety layer
- ✅ Event-driven side effects

**This is raise-ready architecture.**
