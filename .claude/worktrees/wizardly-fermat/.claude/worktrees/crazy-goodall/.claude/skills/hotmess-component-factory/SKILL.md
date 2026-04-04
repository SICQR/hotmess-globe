---
name: hotmess-component-factory
description: >
  Scaffolds HOTMESS UI components that follow every project convention — sheet registration,
  z-index layers, gold palette, Framer Motion springs, Tailwind aliases, and OS architecture.
  Use this skill whenever building a new sheet (L2/L3), mode section, page, or UI component
  for the HOTMESS app. Also use when adding sections to HomeMode, creating new pages like
  Care.jsx or More.jsx, building onboarding screens, wiring nav tabs, creating empty states,
  or modifying existing components. If the task involves React + Tailwind + Framer Motion in
  the HOTMESS codebase, use this skill. Triggers on "build", "create", "add", "scaffold",
  "wire", "new sheet", "new page", "new component", "new section", or any feature task from
  the product plan.
---

# HOTMESS Component Factory

You build UI components for the HOTMESS social OS. Every component must follow the conventions
below — these aren't guidelines, they're the law. The app is dark-only, gold-accent, mobile-first.

## Design Tokens (use these, never hard-code)

```
Gold CTA:        #C8962C  → text-brand, bg-brand
Gold dim bg:     rgba(200,150,44,0.15) → bg-brand-dim
Gold glow:       rgba(200,150,44,0.30) → shadow-brand-glow
OS root bg:      #050507  → bg-os-bg (NOT #000000)
Card:            #1C1C1E  → bg-os-card
Card hover:      #2C2C2E  → bg-os-card-hover
Nav/surface:     #0D0D0D  → bg-os-surface
Text:            #FFFFFF  → text-white
Text muted:      #8E8E93  → text-text-muted
Text dim:        #636366  → text-text-dim
Danger:          #FF3B30  → text-danger, bg-danger
Success dot:     #30D158  → bg-success (online indicators ONLY)
Warn:            #FF9F0A  → text-warn

Intent rings (semantic ONLY, never CTAs):
  Hookup: #FF5500   Hang: #00C2E0   Explore: #A899D8

Channel colours (brand sovereign, never CTAs):
  Radio: #00C2E0   HUNG: #C41230   RAW CONVICT: #9B1B2A
```

### What NEVER to use
- Pink (#FF1493) — anywhere, ever
- Pure black (#000000) — use #050507 for root bg
- Cyan/blue as CTA — #00C2E0 is Radio brand colour only
- Intent colours as buttons — they're status rings only
- Green for success toasts — use gold

## Typography

Font: Inter. Fallback: -apple-system, BlinkMacSystemFont, sans-serif.

```
Wordmark:     22px  900 italic  → HOT(white) MESS(gold)
Section H2:   18px  800         → text-[18px] font-extrabold
Card title:   15px  700         → text-[15px] font-bold
Body:         14px  400-600     → text-[14px]
Label/CTA:    13px  600         → text-[13px] font-semibold
Meta:         12px  400-600     → text-[12px]
Micro:        11px  600-700     → text-[11px] font-semibold
Nano:         10px  600-700     → text-[10px] font-semibold
```

## Spacing

```
Screen padding:    px-5 (20px horizontal margins)
Card padding:      p-3.5 (14px body) or p-2.5 (10px product cards)
Section gap:       space-y-4 (16px between vertical sections)
Grid gap 3-col:    gap-[3px] (Ghosted tight grid)
Grid gap 2-col:    gap-3 (12px, Market grid)
H-scroll gap:      gap-3 (12px)
Chip/pill gap:     gap-2 (8px)
```

## Border Radius

```
Cards, sheets, modals:  rounded-xl (12px)
Sheet top corners:      rounded-t-[20px]
Avatars, thumbnails:    rounded-full
Buttons:                rounded-lg (8px) or rounded-full (pill)
Input fields:           rounded-lg (8px)
Badges, pills:          rounded-full
```

## Z-Index Layers (immutable)

```
L0:  z-0          Globe (only on /pulse)
L1:  z-50         OSBottomNav (83px), RadioMiniPlayer (56px above nav)
L2:  z-100        Content sheets (SheetRouter)
L3:  z-150        Higher sheets: persona switcher, filters
INT: z-[180]      IncomingCallBanner
INT: z-[190]      SOSButton
INT: z-[200]      SOSOverlay, Auth bottom sheet
PIN: above all    PinLockOverlay
```

## Framer Motion Constants

```tsx
// Sheet spring physics
const spring = { damping: 30, stiffness: 300, mass: 0.8 };

// Backdrop fade
const backdrop = { enter: 200, exit: 150 }; // ms

// Swipe thresholds
const swipe = { distance: 100, velocity: 500, elasticity: 0.5 };

// Standard entry animation for list items
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ ...spring, delay: index * 0.05 }}
```

## Building a New Sheet

Sheets are the primary UI surface. Follow this exact sequence:

### 1. Register in sheetSystem.ts

Add entry to `SHEET_REGISTRY` in `src/lib/sheetSystem.ts`:

```ts
'my-feature': {
  id: 'my-feature',
  title: 'My Feature',
  height: 'large',    // full|large|medium|small|mini → 95|90|85|70|50vh
  auth: true,          // requires login?
  deepLinkParams: [],  // URL params for deep linking
},
```

### 2. Create the component

File: `src/components/sheets/L2MyFeatureSheet.tsx`

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useSheet } from '@/contexts/SheetContext';

export default function L2MyFeatureSheet() {
  const { closeSheet } = useSheet();
  const spring = { damping: 30, stiffness: 300, mass: 0.8 };

  return (
    <div className="flex flex-col h-full bg-os-card rounded-t-[20px]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5">
        <h2 className="text-[18px] font-extrabold text-white">Title</h2>
        <button
          onClick={() => closeSheet()}
          className="text-text-muted text-[14px] font-semibold"
        >
          Close
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 space-y-3 pb-[160px]">
        {/* pb-[160px] clears nav (83px) + mini player (56px) + breathing room */}
        {/* Content here */}
      </div>
    </div>
  );
}
```

### 3. Wire into SheetRouter.jsx

In `src/components/sheets/SheetRouter.jsx`:

```tsx
// Add lazy import at top
const L2MyFeatureSheet = lazy(() => import('./L2MyFeatureSheet'));

// Add case in SHEET_MAP
'my-feature': L2MyFeatureSheet,
```

### 4. Check sheet policy

If the sheet should be gated (only openable from /ghosted or with profile in stack),
add the type to `GATED_TYPES` in `src/lib/sheetPolicy.ts`. Currently gated: chat, video, travel.

### 5. Open the sheet

```tsx
import { useSheet } from '@/contexts/SheetContext';
const { openSheet } = useSheet();
openSheet('my-feature', { someParam: value });
```

## Building a New Page

Pages are full-screen routes (not sheets). Examples: Care.jsx, More.jsx.

### 1. Create the component

File: `src/pages/MyPage.jsx` or `src/modes/MyMode.tsx`

```tsx
import React from 'react';

export default function MyPage() {
  return (
    <div className="min-h-screen bg-os-bg px-5 pt-4 pb-[160px]">
      <h1 className="text-[18px] font-extrabold text-white mb-4">Title</h1>
      {/* Content */}
    </div>
  );
}
```

### 2. Add route in App.jsx

```tsx
const MyPage = lazy(() => import('@/pages/MyPage'));
// Inside router:
<Route path="/my-page" element={<MyPage />} />
```

### 3. Add nav entry if needed

If it goes in the bottom nav, edit `src/modes/OSBottomNav.tsx`.
If it goes in /more, add it to the More page's item list.

## Building a HomeMode Section

HomeMode has 12 sections. To add one:

```tsx
{/* Section: [Name] */}
<section className="px-5">
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-[18px] font-extrabold text-white">Section Title</h2>
    <button className="text-brand text-[13px] font-semibold">See All</button>
  </div>
  {/* Horizontal scroll */}
  <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5">
    {items.map((item, i) => (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ damping: 30, stiffness: 300, mass: 0.8, delay: i * 0.05 }}
        className="flex-shrink-0 w-[140px] bg-os-card rounded-xl overflow-hidden"
      >
        {/* Card content */}
      </motion.div>
    ))}
  </div>
</section>
```

## Import Convention

Always use alias imports:

```tsx
import X from '@/components/...'
import X from '@/contexts/...'
import X from '@/hooks/...'
import X from '@/lib/...'
import X from '@/pages/...'
import X from '@/modes/...'
```

## CTA Buttons

```tsx
{/* Primary CTA */}
<button className="w-full py-3 bg-brand rounded-full text-white text-[14px] font-semibold">
  Action
</button>

{/* Secondary CTA */}
<button className="w-full py-3 bg-brand-dim rounded-full text-brand text-[14px] font-semibold">
  Action
</button>

{/* Danger CTA */}
<button className="w-full py-3 bg-danger/20 rounded-full text-danger text-[14px] font-semibold">
  Danger Action
</button>
```

## Empty States

```tsx
<div className="flex flex-col items-center justify-center h-64 px-6 text-center">
  <IconComponent className="w-12 h-12 text-brand mb-4" />
  <h3 className="text-[15px] font-bold text-white mb-2">Nothing here yet</h3>
  <p className="text-[13px] text-text-muted mb-4">Explanation text</p>
  <button className="px-6 py-2.5 bg-brand rounded-full text-white text-[13px] font-semibold">
    CTA
  </button>
</div>
```

## Safety-Critical Components

Components in `src/components/safety/` and `src/components/sos/` are safety-critical.
When modifying these: never reduce visibility, never remove functionality, always test
the full flow end-to-end. The SOS button must remain at z-190, always accessible.

## Common Gotchas

- `beacons` is a VIEW, not a table. `ALTER TABLE beacons` will fail. `title`/`description`/`address`/`image_url` are in `metadata` JSONB.
- `right_now_status` — always write to the TABLE, never to `profiles.right_now_status` (column doesn't exist).
- `UnifiedGlobe` returns null on non-`/pulse` routes. Don't render it elsewhere.
- Bottom padding: always `pb-[160px]` to clear nav (83px) + mini player (56px) + breathing room.
- Max 6 Supabase auth listeners exist — don't add more without auditing.
- Sheet policy: chat/video/travel only open from /ghosted or with profile sheet in stack.

## Product Plan Task Patterns

These are the types of components you'll be building most often (from the current plan):

- **P0-2**: Full-screen mobile page (Safety.jsx) — remove sidebar, use standard layout
- **P1-3**: New route page (Care.jsx) — aftercare resources, breathing, helpline numbers
- **P1-6**: Onboarding screen (SafetySeedScreen) — form capture with skip option
- **P1-7**: Visibility enhancement (SOSButton) — pulse animation, tooltip, accessible
- **P2-2**: Hub page (More/MoreMode) — icon + title + description + badge list
- **P3-1**: Empty state with CTA (invite card) — honest, actionable
- **P3-2**: Post-onboarding screen — 3 specific action buttons
- **P4-1**: HomeMode section (Leaderboard) — horizontal scroll, "See All" link
- **P5-2**: Unified mini player — single component, contextual expand
