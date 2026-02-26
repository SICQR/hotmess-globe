# HOTMESS — Figma Account Inventory
**Generated:** 2026-02-26
**Figma Account:** PHIL (scanme@sicqr.com, user ID: 1288223216649154360)
**Discovery Method:** Figma REST API v1 + Figma desktop app IndexedDB cache scan

---

## 1. Account Summary

| Field | Value |
|-------|-------|
| Handle | PHIL |
| Email | scanme@sicqr.com |
| User ID | 1288223216649154360 |
| Figma Desktop Version | 126.1.2 (Electron 39.4.0 / Chrome 142) |
| Files discovered via API | 2 accessible |
| Files returning 400 (likely deleted/moved) | 6 |
| Design systems / component libraries | 0 standalone |
| Personal teams | None found via API |

---

## 2. Complete File List

### Files Accessible via API

| # | File Name | File Key | Last Modified | Type | Pages |
|---|-----------|----------|---------------|------|-------|
| 1 | **HOTMESS OS V2 System Map** | `CUJkrcFcDmKCaQyXniSemg` | 2026-02-13T06:31:29Z | FigJam | 1 |
| 2 | Untitled | `uAlpozgrSCfJ3ykoStbG1g` | 2026-02-17T20:41:49Z | Figma | 1 (empty) |

### Files Found in Cache But Returning 400 (Inaccessible)

These file keys were discovered in the Figma desktop app's IndexedDB (`~/.../DesktopProfile/v39/IndexedDB/https_www.figma.com_0.indexeddb.leveldb/000003.log`) but the API returns 400. They are likely deleted, moved to a team you no longer have access to, or personal drafts that have been removed.

| File Key | Notes |
|----------|-------|
| `7mRfIDcfMMAlZbYTJOWY2c` | Had active "Code Component Preview" sessions — possibly a component library or visual design file |
| `f80K2AsqRIszGrXNu0ixej` | Had active "Code Component Preview" sessions |
| `xkBsvjAtBtkuC19GzDTl1J` | Had active "Code Component Preview" sessions |
| `5lbli4GLH4g1k4uw2wHLcd` | Had active "Code Component Preview" sessions |
| `YNiRSxeGGGYWUoA7rX1zv6` | Empty file (open-empty-file session) |
| `OiBgfMuVcSq5KTvSpmZEWD` | Empty file (open-empty-file session) |

**Note on the 400s:** The IndexedDB cache also contains a reference to `HOTMESS_OS_V2_PROTOTYPE.htm` — a converted HTML prototype of the OS — suggesting that at least one Figma file existed containing visual mockups of the OS. This file is not accessible via the current token.

---

## 3. File Deep Dive: HOTMESS OS V2 System Map

**File Key:** `CUJkrcFcDmKCaQyXniSemg`
**URL:** `https://www.figma.com/design/CUJkrcFcDmKCaQyXniSemg`
**Type:** FigJam (collaborative whiteboard / system diagram)
**Version:** 2319919369392026133
**Components in file:** 13 (all FigJam template components — not HOTMESS design components)
**Design styles:** 1 (`FigJam Tips/Card shadow` — effect style, not a brand style)

### 3.1 Page Inventory

| Page | ID | Description |
|------|----|-------------|
| Page 1 | `0:1` | Single canvas containing the entire OS V2 architecture diagram |

### 3.2 Frame/Node Inventory (Page 1)

The canvas contains two categories of nodes: **Screen nodes** (the main OS screens/states) and **Connector nodes** (the flow arrows linking them), plus **FigJam template sections** (boilerplate from the FigJam website wireframe template).

#### Screen Nodes (SHAPE_WITH_TEXT — OS Architecture)

| Node ID | Screen Name | Dimensions | Description |
|---------|------------|------------|-------------|
| `1:3` | THE GLOBE | 200×200 | Root/entry screen — the 3D globe view |
| `1:6` | HUD: Nav + Radio + SOS | 224×128 | Persistent HUD layer overlaying all screens |
| `1:9` | Ghosted Grid | 224×128 | Proximity discovery grid (/ghosted) |
| `1:12` | Lux Market | 224×128 | Market mode (/market) |
| `1:15` | Chat Threads | 224×128 | Messaging list |
| `1:18` | Safety Overlay | 224×128 | SOS interrupt overlay |
| `1:21` | Profile Stack | 224×128 | Profile sheets + persona switcher |
| `1:24` | Hookup Card | 224×128 | Profile card opened via tap from Ghosted Grid |
| `1:27` | Creator Card | 224×128 | Creator-type profile card |
| `1:30` | Travel Skin | 224×128 | Travel persona variant of the UI |
| `1:33` | Inline Map + Uber + ETA | 224×128 | Map/directions panel with Uber deep-link |
| `1:36` | Live Radio + Tickets | 224×128 | Radio mini-player + ticket integration |
| `1:39` | Auto Skin Switch | 224×128 | Automatic skin/theme switching (persona-based) |
| `1:42` | Biometric Checkout | 224×128 | Face ID / Touch ID checkout flow |
| `1:45` | Persona Bound Conversation | 224×128 | Chat thread keyed to active persona |
| `1:48` | Fake Call Screen | 224×128 | Safety fake call interrupt overlay |
| `1:51` | Alert Contacts + Location | 224×128 | Emergency alert with live location to contacts |

#### Connector Nodes (Flow Arrows)

| Connector | From | To | Label |
|-----------|------|----|-------|
| `1:54` | THE GLOBE (`1:3`) | HUD: Nav + Radio + SOS (`1:6`) | Persistent Layer |
| `1:58` | HUD (`1:6`) | Ghosted Grid (`1:9`) | Open Sheet |
| `1:62` | HUD (`1:6`) | Lux Market (`1:12`) | Open Sheet |
| `1:66` | HUD (`1:6`) | Chat Threads (`1:15`) | Open Sheet |
| `1:70` | HUD (`1:6`) | Safety Overlay (`1:18`) | Interrupt |
| `1:74` | Ghosted Grid (`1:9`) | Profile Stack (`1:21`) | Tap Card |
| `1:78` | Profile Stack (`1:21`) | Hookup Card (`1:24`) | (unlabelled) |
| `1:82` | Profile Stack (`1:21`) | Creator Card (`1:27`) | (unlabelled) |
| `1:86` | Profile Stack (`1:21`) | Travel Skin (`1:30`) | (unlabelled) |
| `1:90` | Hookup Card (`1:24`) | Inline Map + Uber + ETA (`1:33`) | Share Location |
| `1:94` | Creator Card (`1:27`) | Live Radio + Tickets (`1:36`) | Drop or Event |
| `1:98` | Travel Skin (`1:30`) | Auto Skin Switch (`1:39`) | Geo Trigger |
| `1:102` | Lux Market (`1:12`) | Biometric Checkout (`1:42`) | Select Product |
| `1:106` | Chat Threads (`1:15`) | Persona Bound Conversation (`1:45`) | Message |
| `1:110` | Safety Overlay (`1:18`) | Fake Call Screen (`1:48`) | Fake Call |
| `1:114` | Safety Overlay (`1:18`) | Alert Contacts + Location (`1:51`) | Alert |

#### FigJam Template Sections (Boilerplate — Not HOTMESS Design)

| Section ID | Name | Notes |
|-----------|------|-------|
| `16:2566` | Context | FigJam website wireframe template section ("Goals + Success", "Audience + Need") |
| `16:2573` | Starter Toolkit | FigJam template — Boxes, Buttons, Icons starter kit |
| `16:2623` | Website Wireframe | FigJam template wireframe skeleton (Footer, Nav, LINK 1/2/3, YOUR LOGO) |
| `16:2671` | About this template | FigJam template instructions |
| `16:2691` | Quick tips | FigJam navigation/usage tips |
| `16:2862` | Group 633022 | FigJam template instruction overlay |
| `16:2868` | Widgets to try | FigJam lil notes / lil todo widgets |

**Important:** Sections `16:2566` through `16:2868` are leftover FigJam template boilerplate from the "Website Wireframe" starter. They contain no HOTMESS-specific content and can be deleted from the canvas.

---

## 4. File 2: Untitled

**File Key:** `uAlpozgrSCfJ3ykoStbG1g`
**URL:** `https://www.figma.com/design/uAlpozgrSCfJ3ykoStbG1g`
**Last Modified:** 2026-02-17T20:41:49Z
**Status:** Empty — one page, no children, no styles, no components.
**Action:** Can be deleted.

---

## 5. Design Token Audit

### 5.1 Colors Found in Figma Files

The HOTMESS OS V2 System Map is a **FigJam file** (whiteboard), not a visual design file. It uses only FigJam's default color palette for diagram shapes:

| Token | Hex | Usage in Figma |
|-------|-----|----------------|
| Default shape fill | `#FFFFFF` | All 17 screen nodes |
| Shape stroke | `#757575` | All shape borders (4px) |
| Section fill (FigJam) | `#F5FBFF` | Template sections (Context, Quick tips) |
| Section stroke (FigJam) | `#C2E5FF` | Template section borders (1px) |
| Section stroke (custom) | `#E6E6E6` | Starter Toolkit, Website Wireframe sections |

**There are zero HOTMESS brand colors in the accessible Figma files.** No `#C8962C`, `#1C1C1E`, `#0D0D0D`, or `#050507` appear in any discoverable file. The visual design work either lives in the inaccessible files (those returning 400) or has been done directly in code.

### 5.2 Brand Colors: Code vs. Figma

| Color | Hex | In Code | In Figma |
|-------|-----|---------|---------|
| Antique Gold (primary) | `#C8962C` | Yes — tailwind.config.js `hot.DEFAULT`, `gold.DEFAULT`; inline in modes | Not found |
| Card Background | `#1C1C1E` | Yes — all mode files, sheets | Not found |
| Nav Background | `#0D0D0D` | Yes — referenced in memory/CLAUDE.md | Not found |
| OS Root Background | `#050507` | Yes — HomeMode.tsx `ROOT_BG` constant | Not found |
| Text Muted | `#8E8E93` | Yes — GhostedMode.tsx `MUTED` constant | Not found |
| Gold Light | `#D4A84B` | Yes — tailwind.config.js | Not found |
| Gold Dark | `#9A7020` | Yes — tailwind.config.js | Not found |
| Cyan | `#00D9FF` | Yes — tailwind.config.js | Not found |
| Neon Purple | `#B026FF` | Yes — tailwind.config.js | Not found |
| Neon Green | `#39FF14` | Yes — tailwind.config.js | Not found |

**Conclusion:** The brand color system lives entirely in code (`tailwind.config.js` + CSS variables in `src/index.css`). There is no Figma design token library. The visual design is code-first.

### 5.3 Typography Tokens

No text styles found in any accessible Figma file. Typography is defined entirely in code via Tailwind utility classes.

### 5.4 Effect Styles

Only one style found: `FigJam Tips/Card shadow` — this is a FigJam template effect, not a HOTMESS brand style.

---

## 6. Component Inventory

### 6.1 FigJam Components (in HOTMESS OS V2 System Map)

These are FigJam template/system components — not HOTMESS design components:

| Component | Node ID | Type |
|-----------|---------|------|
| Property 1=Default | `16:85` | FigJam shape variant |
| Property 1=Default | `16:94` | FigJam shape variant |
| Property 1=Default | `16:107` | FigJam shape variant |
| Number=Circle4 | `16:2540` | FigJam step indicator |
| Number=Triangle | `16:2563` | FigJam step indicator |
| Number=Crown | `16:2553` | FigJam step indicator |
| Number=Ovals | `16:2549` | FigJam step indicator |
| Basics / Navigating FigJam | `16:123` | FigJam tip card |
| Basics / Zooming in FigJam | `16:155` | FigJam tip card |
| Cursor Type=Pointer | `16:2511` | FigJam cursor icon |
| Light bulb | `16:2518` | FigJam icon |
| Arrow | `16:116` | FigJam arrow |
| Arrow | `16:113` | FigJam arrow |

**Total HOTMESS design components in Figma: 0.** All component work lives in the React codebase.

### 6.2 React Components in Codebase (413 total files)

The codebase at `/Users/philipgizzie/hotmess-globe/src/components/` contains 413 component files across 70+ directories. Key categories:

| Directory | Component Count | Purpose |
|-----------|----------------|---------|
| `sheets/` | 47 | All L2 bottom sheets (the primary UI layer) |
| `ui/` | 65 | Design system primitives (shadcn/ui + custom) |
| `globe/` | 17 | 3D globe and city data overlays |
| `safety/` | 8 | Safety toolkit (panic, fake call, location share, aftercare) |
| `marketplace/` | 12 | Commerce UI |
| `profile/` | 13 | Profile views and editors |
| `discovery/` | 14 | Proximity grid, filters, right-now system |
| `events/` | 12 | Event cards, RSVP, tickets |
| `radio/` | 5 | Mini player, show cards, schedule |

---

## 7. Design-to-Code Gap Analysis

### 7.1 System Map Nodes vs. React Implementation

Mapping each Figma system map node to its codebase equivalent:

| Figma Node | Status | React Implementation |
|-----------|--------|---------------------|
| THE GLOBE | **Implemented** | `src/components/globe/UnifiedGlobe.tsx` + `GlobeHero.jsx`; renders on `/pulse` |
| HUD: Nav + Radio + SOS | **Implemented** | `src/modes/OSBottomNav.tsx` (nav) + `src/components/radio/RadioMiniPlayer.tsx` + `src/components/sos/SOSButton.jsx` + `src/components/shell/TopHUD.tsx` |
| Ghosted Grid | **Implemented** | `src/modes/GhostedMode.tsx` + `src/features/profilesGrid/ProfilesGrid` — 3-col proximity grid at `/ghosted` |
| Lux Market | **Implemented** | `src/modes/MarketMode.tsx` at `/market` |
| Chat Threads | **Implemented** | `src/components/sheets/L2ChatSheet.jsx` + `src/components/messaging/ThreadList.jsx` |
| Safety Overlay | **Implemented** | `src/components/interrupts/SOSOverlay.tsx` (Z-200) + `src/components/interrupts/SafetyOverlay.tsx` |
| Profile Stack | **Implemented** | `src/components/sheets/L2ProfileSheet.jsx` + `src/components/sheets/PersonaSwitcherSheet.tsx` |
| Hookup Card | **Partial** | `src/features/profilesGrid/ProfileCard.tsx` + `src/features/profilesGrid/SmartProfileCard.tsx` support `standard` profile type. No dedicated "HookupCard" component exists as a named type — the card is the standard proximity discovery card when the persona/intent is hookup-oriented. |
| Creator Card | **Partial** | `src/features/profilesGrid/SmartProfileCard.tsx` has `profile_type === 'creator'` branch. No dedicated `CreatorCard` component. |
| Travel Skin | **Partial** | `src/components/travel/SmartTravelSelector.tsx` handles transport mode selection + Uber deep-link. `src/contexts/PersonaContext.jsx` handles persona switching. No dedicated "Travel Skin" UI mode (visual re-theme when travel persona is active). |
| Inline Map + Uber + ETA | **Implemented** | `src/features/profilesGrid/GPSSmartCard.tsx` has Uber deep-link. `src/features/profilesGrid/ProfileCard.tsx` shows `foot`/`cab`/`bike`/`uber` travel times. `src/components/travel/SmartTravelSelector.tsx` for full travel UI. |
| Live Radio + Tickets | **Partial** | Radio: `src/components/radio/RadioMiniPlayer.tsx` (persistent). Tickets: `src/components/sheets/L2TicketSheet.tsx` + `src/components/events/EventTicket.jsx`. **Gap:** No combined "Live Radio + Tickets" panel that surfaces event tickets contextually when a radio show is playing. |
| Auto Skin Switch | **Not implemented** | No automatic theme/skin switching based on persona, time-of-day, or geolocation trigger. `PersonaContext` switches personas but does not trigger a visual skin change. The Figma diagram shows this being triggered by "Geo Trigger" from Travel Skin. |
| Biometric Checkout | **Stub only** | `src/components/auth/PinLockScreen.jsx` has a `biometricAvailable` prop placeholder. `src/components/auth/FaceVerification.jsx` exists for identity verification but is not wired into the checkout flow. No `L2BiometricCheckoutSheet` component exists. |
| Persona Bound Conversation | **Not implemented** | `src/components/sheets/L2ChatSheet.jsx` exists but chat threads are not keyed to the active persona. The messages table has no `persona_id` column. Chat threads open from any persona context using the same thread. |
| Fake Call Screen | **Partial** | `src/components/safety/FakeCallGenerator.jsx` generates a fake call. `src/core/emergency.ts` has `scheduleFakeCall()` which dispatches `hotmess:fake-call` event. **Gap:** No full-screen iOS-style fake incoming call overlay (the Figma node implies a visual interrupt that mimics a real incoming call screen). `src/components/calls/IncomingCallBanner.tsx` exists at Z-180 but is for real incoming calls, not fake ones. |
| Alert Contacts + Location | **Implemented** | `src/components/interrupts/SOSOverlay.tsx` stops location shares + shows emergency contact button. `src/components/sheets/L2EmergencyContactSheet.jsx` + `src/components/safety/LiveLocationShare.jsx` + `src/components/safety/EmergencyMessageEditor.jsx`. |

### 7.2 Unimplemented Features (Gap Summary)

| Feature | Figma Node | Priority | Notes |
|---------|-----------|----------|-------|
| Auto Skin Switch | `1:39` | Medium | Persona-based UI re-theming triggered by geo/time. No code equivalent at all. |
| Biometric Checkout | `1:42` | Medium | Face ID / Touch ID for market checkout. PinLockScreen has a `biometricAvailable` stub but it's not connected to checkout. |
| Persona Bound Conversation | `1:45` | High | Chat threads should be persona-scoped. Currently all personas share thread history. Requires `persona_id` in `messages` table and `chat_threads` table. |
| Live Radio + Tickets (contextual) | `1:36` | Low | A panel combining live radio playback state with relevant event tickets is not built. Radio and tickets work independently. |
| Full-Screen Fake Call Overlay | `1:48` | Medium | A full-screen iPhone-style incoming call overlay for the safety fake call. The current `FakeCallGenerator` is a settings UI, not a visual interrupt. |
| HookupCard as distinct component | `1:24` | Low | The hookup card is conceptually a profile card with intent context — currently this is the standard ProfileCard with no mode-specific rendering distinction. |
| CreatorCard as distinct component | `1:27` | Low | `SmartProfileCard` has a creator branch but no dedicated card with creator-specific UI (track listings, show dates embedded in the card). |
| Travel Skin (visual theme) | `1:30` | Low | Travel persona exists in context but doesn't trigger a visual skin. Map-centric layout with muted colors for "I'm travelling" mode is not built. |

---

## 8. Prototype Flows Documented in Figma

The system map defines one complete prototype flow graph. All flows are documented as connector arrows in FigJam. Here is the complete flow as discovered:

```
THE GLOBE
  └─[Persistent Layer]─→ HUD: Nav + Radio + SOS
                              ├─[Open Sheet]─→ Ghosted Grid
                              │                    └─[Tap Card]─→ Profile Stack
                              │                                        ├─────────→ Hookup Card
                              │                                        │               └─[Share Location]─→ Inline Map + Uber + ETA
                              │                                        ├─────────→ Creator Card
                              │                                        │               └─[Drop or Event]─→ Live Radio + Tickets
                              │                                        └─────────→ Travel Skin
                              │                                                        └─[Geo Trigger]─→ Auto Skin Switch
                              ├─[Open Sheet]─→ Lux Market
                              │                    └─[Select Product]─→ Biometric Checkout
                              ├─[Open Sheet]─→ Chat Threads
                              │                    └─[Message]─→ Persona Bound Conversation
                              └─[Interrupt]─→ Safety Overlay
                                                  ├─[Fake Call]─→ Fake Call Screen
                                                  └─[Alert]─→ Alert Contacts + Location
```

### Flow Implementation Status

| Flow | Connector Label | Implemented |
|------|----------------|-------------|
| Globe → HUD | Persistent Layer | Yes — HUD/nav persists across all routes |
| HUD → Ghosted Grid | Open Sheet | Yes — OSBottomNav routes to `/ghosted` |
| HUD → Lux Market | Open Sheet | Yes — OSBottomNav routes to `/market` |
| HUD → Chat Threads | Open Sheet | Yes — `openSheet('chat')` from any nav |
| HUD → Safety Overlay | Interrupt | Yes — SOSButton long-press triggers SOSOverlay |
| Ghosted Grid → Profile Stack | Tap Card | Yes — grid tap opens `L2ProfileSheet` |
| Profile Stack → Hookup Card | (unlabelled) | Partial — profile sheet opens but no distinct hookup card mode |
| Profile Stack → Creator Card | (unlabelled) | Partial — `profile_type === 'creator'` handled in SmartProfileCard |
| Profile Stack → Travel Skin | (unlabelled) | Partial — persona switch possible but no skin change |
| Hookup Card → Inline Map | Share Location | Yes — GPSSmartCard + SmartTravelSelector |
| Creator Card → Live Radio + Tickets | Drop or Event | Partial — EventSheet + RadioMiniPlayer exist separately |
| Travel Skin → Auto Skin Switch | Geo Trigger | Not implemented |
| Lux Market → Biometric Checkout | Select Product | Stub only — checkout exists without biometric |
| Chat Threads → Persona Bound Conv | Message | Not implemented — no persona scoping in chat |
| Safety Overlay → Fake Call Screen | Fake Call | Partial — generator exists, full-screen interrupt missing |
| Safety Overlay → Alert Contacts | Alert | Implemented — SOSOverlay + EmergencyContactSheet |

---

## 9. Pages/Screens Designed but Not Built

Comparing the Figma system map screens to actual routes in `src/modes/` and `src/pages/`:

| Figma Screen | Built Route/Mode | Notes |
|-------------|-----------------|-------|
| THE GLOBE | `/pulse` (`PulseMode.tsx`) | Globe only renders here per architecture rules |
| HUD | Persistent in `OSShell.tsx` | Full implementation |
| Ghosted Grid | `/ghosted` (`GhostedMode.tsx`) | Full implementation |
| Lux Market | `/market` (`MarketMode.tsx`) | Full implementation |
| Chat Threads | Sheet via `L2ChatSheet.jsx` | Full implementation |
| Safety Overlay | `SOSOverlay.tsx` (Z-200) | Full implementation |
| Profile Stack | Sheet via `L2ProfileSheet.jsx` | Full implementation |
| Biometric Checkout | No dedicated screen | `L2CheckoutSheet.jsx` exists without biometric |
| Auto Skin Switch | No screen/component | Feature does not exist |
| Persona Bound Conversation | No dedicated screen | `L2ChatSheet.jsx` is not persona-scoped |
| Fake Call Screen (full-screen) | No full-screen interrupt | `FakeCallGenerator.jsx` is a settings UI only |

Additionally, the codebase has many **pages that have no Figma equivalent** — they were built code-first:

| Page File | Route | Has Figma Design |
|-----------|-------|-----------------|
| `Home.jsx` | `/` or `HomeMode.tsx` | No |
| `Radio.jsx` | `/radio` (`RadioMode.tsx`) | No |
| `VaultMode.tsx` | `/vault` | No |
| `EventsMode.tsx` | `/events` | No |
| `ProfileMode.tsx` | `/profile` | No |
| All 45 `/pages/*.jsx` files | Various | No |

---

## 10. Design System Status

### What Exists in Code (No Figma Equivalent)

The HOTMESS design system lives **entirely in code**, not in Figma. The following tokens are defined in `tailwind.config.js`:

#### Color Tokens (from tailwind.config.js)
```js
hot: {
  DEFAULT: '#C8962C',    // Primary brand gold
  light:   '#D4A84B',
  dark:    '#9A7020',
  glow:    'rgba(200, 150, 44, 0.45)'
}
gold: {
  DEFAULT: '#C8962C',    // Alias for hot
  light:   '#D4A84B',
  dark:    '#9A7020',
  glow:    'rgba(200, 150, 44, 0.45)'
}
cyan:  { DEFAULT: '#00D9FF', light: '#67E8F9', dark: '#0891B2' }
neon:  { green: '#39FF14', purple: '#B026FF', gold: '#FFD700', orange: '#FFB800' }
glass: { DEFAULT: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' }
```

#### Surface Colors (defined as constants in mode files)
```js
const AMBER   = '#C8962C';   // Primary CTA, accents
const CARD_BG = '#1C1C1E';   // Card backgrounds
const ROOT_BG = '#050507';   // OS root background
const MUTED   = '#8E8E93';   // Muted text
// Nav bg: #0D0D0D (referenced in CLAUDE.md)
```

#### Shadow Tokens
```js
'glow-hot':    '0 0 20px rgba(200,150,44,0.5), 0 0 40px rgba(200,150,44,0.3)'
'glow-hot-lg': '0 0 30px rgba(200,150,44,0.6), 0 0 60px rgba(200,150,44,0.4)'
'glow-cyan':   '0 0 20px rgba(0,217,255,0.5), ...'
'glow-purple': '0 0 20px rgba(176,38,255,0.5), ...'
```

#### Gradient Tokens
```js
'gradient-hot':    'linear-gradient(135deg, #C8962C 0%, #9A7020 100%)'
'gradient-fire':   'linear-gradient(135deg, #C8962C 0%, #D4A84B 50%, #FFD700 100%)'
'gradient-night':  'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)'
```

#### Z-Index Scale
```js
base:      0
hud:       50
sheet:     80
modal:     100
toast:     110
interrupt: 120
emergency: 200
debug:     999
```

### Recommendation: Create a Figma Design System File

Given that all tokens are in code but not in Figma, creating a Figma design token file would significantly improve design-to-code consistency. Suggested file structure:

```
HOTMESS Design System (Figma file)
├── Page: Colors
│   ├── Brand Gold (#C8962C variants)
│   ├── Dark Surfaces (#050507, #0D0D0D, #1C1C1E)
│   ├── Neon Accents (cyan, purple, green)
│   └── Status colors (#34C759 green, danger red)
├── Page: Typography
│   ├── Display (headline styles)
│   ├── Body + Label
│   └── Monospace (radio terminal)
├── Page: Components
│   ├── OSCard (the primary card primitive)
│   ├── L2 Sheet header pattern
│   ├── GoldButton (primary CTA)
│   └── VibeBadge, MembershipBadge
└── Page: Screens
    ├── HomeMode
    ├── GhostedMode
    ├── PulseMode
    ├── MarketMode
    └── ProfileMode
```

---

## 11. Registered Sheets Inventory

All 45 sheet types registered in `src/components/sheets/SheetRouter.jsx`:

| Sheet Key | Component File | Status |
|-----------|---------------|--------|
| `profile` | L2ProfileSheet.jsx | Built |
| `event` | L2EventSheet.jsx | Built |
| `chat` | L2ChatSheet.jsx | Built (not persona-scoped) |
| `vault` | L2VaultSheet.jsx | Built |
| `shop` | L2ShopSheet.jsx | Built |
| `ghosted` | L2GhostedSheet.jsx | Built |
| `social` | L2SocialSheet.jsx | Built |
| `events` | L2EventsSheet.jsx | Built |
| `marketplace` | L2MarketplaceSheet.jsx | Built |
| `product` | L2ShopSheet.jsx | Reuses shop sheet |
| `sell` | L2SellSheet.jsx | Built |
| `seller-onboarding` | L2SellSheet.jsx | Reuses sell sheet |
| `payouts` | L2PayoutsSheet.jsx | Built |
| `my-orders` | L2MyOrdersSheet.jsx | Built |
| `my-listings` | L2MyOrdersSheet.jsx | Reuses my-orders |
| `edit-profile` | L2EditProfileSheet.jsx | Built |
| `photos` | L2PhotosSheet.jsx | Built |
| `location` | L2LocationSheet.jsx | Built |
| `privacy` | L2PrivacySheet.jsx | Built |
| `blocked` | L2BlockedSheet.jsx | Built |
| `notifications` | L2NotificationsSheet.jsx | Built |
| `settings` | L2SettingsSheet.jsx | Built |
| `membership` | L2MembershipSheet.jsx | Built |
| `help` | L2HelpSheet.jsx | Built |
| `safety` | L2SafetySheet.jsx | Built |
| `search` | L2SearchSheet.jsx | Built |
| `directions` | L2DirectionsSheet.jsx | Built |
| `cart` | L2CartSheet.jsx | Built |
| `checkout` | L2CheckoutSheet.jsx | Built (no biometric) |
| `filters` | L2FiltersSheet.jsx | Built |
| `qr` | L2QRSheet.jsx | Built |
| `create-event` | L2CreateEventSheet.jsx | Built |
| `favorites` | L2FavoritesSheet.jsx | Built |
| `beacon` | L2BeaconSheet.jsx | Built |
| `schedule` | L2ScheduleSheet.jsx | Built |
| `show` | L2ScheduleSheet.jsx | Reuses schedule |
| `order` | L2OrderSheet.jsx | Built |
| `emergency-contact` | L2EmergencyContactSheet.jsx | Built |
| `video-call` | L2VideoCallSheet.tsx | Built |
| `admin` | L2AdminSheet.tsx | Built |
| `amplify` | L2AmplifySheet.tsx | Built |
| `brand` | L2BrandSheet.tsx | Built |
| `ticket-market` | L2TicketSheet.tsx | Built |

**Sheets in system map but not as dedicated sheets:** `biometric-checkout`, `persona-bound-conversation`, `fake-call-screen`, `auto-skin-switch`.

---

## 12. Action Items

### P0 — Architecture Gaps (features in system map, not built)
1. **Persona-Bound Conversation** — Add `persona_id` FK to `messages` and `chat_threads`, filter threads by active persona in `L2ChatSheet`.
2. **Full-Screen Fake Call Interrupt** — Build a Z-200 interrupt overlay that mimics an iOS incoming call screen, triggered by `hotmess:fake-call` event from `core/emergency.ts`.

### P1 — Partial Implementations to Complete
3. **Biometric Checkout** — Wire `PinLockScreen`'s `biometricAvailable` / WebAuthn API into `L2CheckoutSheet` for one-touch purchase confirmation.
4. **Live Radio + Tickets Integration** — When `RadioContext.isPlaying` is true and the playing show has an associated event, surface a contextual ticket CTA in the mini-player or on the show's profile card.
5. **Creator Card Distinction** — Build a dedicated creator card variant in `SmartProfileCard` that embeds upcoming show dates and a "Drop" CTA when `profile_type === 'creator'`.

### P2 — Nice-to-Have
6. **Auto Skin Switch** — Implement geo-triggered or time-triggered visual theme transitions when travel persona is active (subdued palette, map-forward layout).
7. **Travel Skin Visual Mode** — When travel persona is active, shift the `/ghosted` grid and globe to a map-centric layout with travel time emphasis.

### P3 — Cleanup
8. **Delete FigJam Template Boilerplate** from `CUJkrcFcDmKCaQyXniSemg` — Sections `16:2566`, `16:2573`, `16:2623`, `16:2671`, `16:2691`, `16:2862`, `16:2868` are unused FigJam website wireframe template sections.
9. **Delete Untitled File** (`uAlpozgrSCfJ3ykoStbG1g`) — empty file.
10. **Create Figma Design System file** with brand tokens matching `tailwind.config.js` so designers can work from the same source of truth as the codebase.
11. **Recover or recreate visual mockup file** — The HOTMESS_OS_V2_PROTOTYPE.htm reference in IndexedDB suggests a visual prototype file existed that is now inaccessible. If it still exists in another account or team, recover it; otherwise recreate screen-level mockups for the 5 OS modes.

---

## Appendix A: Discovery Methodology

1. Confirmed Figma API authentication via `GET /v1/me` — returned user ID `1288223216649154360`.
2. Figma's REST API does not expose a file listing endpoint for personal accounts (only for teams, which requires knowing the team ID).
3. Discovered file keys by reading the Figma desktop app's IndexedDB cache at:
   `~/Library/Application Support/Figma/DesktopProfile/v39/IndexedDB/https_www.figma.com_0.indexeddb.leveldb/000003.log`
4. Tested all 8 discovered file keys against `GET /v1/files/{key}?depth=1` — 2 accessible, 6 returning 400.
5. Performed deep fetch (`depth=4`) on accessible files and fetched individual nodes via `GET /v1/files/{key}/nodes?ids=...` for detailed content extraction.
6. Cross-referenced all Figma system map nodes against the React component tree in `src/components/`, `src/modes/`, and `src/features/`.

## Appendix B: File Key Reference

| File Key | File Name | Accessible |
|----------|-----------|-----------|
| `CUJkrcFcDmKCaQyXniSemg` | HOTMESS OS V2 System Map | Yes |
| `uAlpozgrSCfJ3ykoStbG1g` | Untitled (empty) | Yes |
| `7mRfIDcfMMAlZbYTJOWY2c` | Unknown (likely visual design file) | No (400) |
| `f80K2AsqRIszGrXNu0ixej` | Unknown (had code preview sessions) | No (400) |
| `xkBsvjAtBtkuC19GzDTl1J` | Unknown (had code preview sessions) | No (400) |
| `5lbli4GLH4g1k4uw2wHLcd` | Unknown (had code preview sessions) | No (400) |
| `YNiRSxeGGGYWUoA7rX1zv6` | Unknown (empty) | No (400) |
| `OiBgfMuVcSq5KTvSpmZEWD` | Unknown (empty) | No (400) |
