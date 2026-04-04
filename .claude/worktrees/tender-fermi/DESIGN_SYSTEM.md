# HOTMESS OS — Design System

**Version**: 2.0.0
**Last updated**: 2026-03-07
**Theme**: Dark-only. Gold-only accent. No exceptions.
**Source**: Compiled from HOTMESS-Design-Reference.html, HOTMESS-HomeMode-Design.html, HOTMESS-Brand-Palette-v2.html

---

## 1. Color Tokens

These are the canonical brand colors. Every color used in the UI must come from this list. **Never hard-code hex values outside this reference.**

### CSS Custom Properties (map to Tailwind config)

```css
:root {
  /* === Gold (sole CTA accent) === */
  --gold:       #C8962C;                      /* Primary CTA, active states, prices */
  --gold-light: #D4A84B;                      /* Hover states, gradient endpoints */
  --gold-dim:   rgba(200, 150, 44, 0.15);     /* Badge backgrounds, pill backgrounds */
  --gold-glow:  rgba(200, 150, 44, 0.30);     /* Box shadows, icon glows */
  --gold-border:rgba(200, 150, 44, 0.28);     /* Border accents */

  /* === Surface / Background === */
  --bg:         #050507;    /* Root OS background (deep space) */
  --surface:    #0D0D0D;    /* Nav background, deep surfaces */
  --card:       #1C1C1E;    /* Cards, sheets, modals */
  --card2:      #111111;    /* Deep card variant, design reference blocks */
  --card-hover: #2C2C2E;    /* Card hover / pressed state */

  /* === Text === */
  --text:       #FFFFFF;    /* Primary body copy, headings */
  --text-muted: #8E8E93;    /* Secondary labels, subtitles */
  --text-dim:   #636366;    /* Placeholders, timestamps, meta */

  /* === Semantic === */
  --danger:     #FF3B30;    /* SOS, errors, destructive actions */
  --green:      #30D158;    /* Online dot, success states */
  --warn:       #FF9F0A;    /* Warnings, amber alerts */

  /* === Right-Now Intent Colours (semantic status only — NOT CTAs) === */
  --rn-hookup:  #FF5500;    /* Hookup intent ring/badge */
  --rn-hang:    #00C2E0;    /* Hang intent ring/badge */
  --rn-explore: #A899D8;    /* Explore intent ring/badge */

  /* === Channel Colours (brand sovereign — NOT CTAs) === */
  --radio:      #00C2E0;    /* HOTMESS RADIO channel */
  --hung:       #C41230;    /* HUNG sub-brand */
  --raw-convict:#9B1B2A;    /* RAW CONVICT RECORDS */

  /* === Market Tab Colours === */
  --market-shop:    #C8962C; /* Official shop — OS gold */
  --market-preloved:#9E7D47; /* Preloved — aged brass */
  --market-creator: #CF3A10; /* Creator drops — RCR vinyl red */

  /* === Nav === */
  --nav-bg:     #0D0D0D;    /* OSBottomNav background */
  --nav-h:      83px;       /* Bottom nav height — immutable */
}
```

### Tailwind Aliases (tailwind.config.js)

```js
colors: {
  'brand':        '#C8962C',
  'brand-light':  '#D4A84B',
  'brand-dim':    'rgba(200,150,44,0.15)',
  'brand-glow':   'rgba(200,150,44,0.30)',
  'os-bg':        '#050507',
  'os-surface':   '#0D0D0D',
  'os-card':      '#1C1C1E',
  'os-card-hover':'#2C2C2E',
  'os-nav':       '#0D0D0D',
  'text-primary': '#FFFFFF',
  'text-muted':   '#8E8E93',
  'text-dim':     '#636366',
  'danger':       '#FF3B30',
  'success':      '#30D158',
  'warn':         '#FF9F0A',
}
```

### Rules

| ✅ DO | ❌ DON'T |
|---|---|
| Use `#C8962C` for all CTAs, active states, prices | Use pink `#FF1493` anywhere |
| Use `#C8962C` for all text accents | Use purple, blue, cyan as primary accents |
| Use `--gold-dim` for badge/pill backgrounds | Use full-opacity gold as background fill on large areas |
| Use `--danger` for SOS and destructive only | Use red for decoration |
| Use `--green` for online indicators only | Use green for success toasts (use gold instead) |
| Use intent colours (`--rn-*`) for right-now rings only | Use intent colours as CTA buttons |
| Use channel colours (`--radio`, `--hung`) for channel UI only | Mix channel colours into the main OS chrome |

---

## 2. Typography

Font family: **Inter** (Google Fonts).
Fallback: `-apple-system, BlinkMacSystemFont, sans-serif`

### Scale

| Token | Size | Weight | Use |
|---|---|---|---|
| `text-wordmark` | 22px | 900 italic | HOT**MESS** logotype |
| `text-section` | 18px | 800 | Section headings (H2) |
| `text-card-title` | 15px | 700 | Card titles, sheet headings |
| `text-body` | 14px | 400–600 | Body copy |
| `text-label` | 13px | 600 | Chips, tabs, CTAs |
| `text-meta` | 12px | 400–600 | Subtitles, timestamps |
| `text-micro` | 11px | 600–700 | Badges, distance indicators |
| `text-nano` | 10px | 600–700 | Nav labels, LIVE badge |

### Wordmark

```tsx
// HOT in white, MESS in gold
<span className="text-[22px] font-black italic tracking-tight">
  <span className="text-white">HOT</span>
  <span className="text-brand">MESS</span>
</span>
```

---

## 3. Spacing & Layout

```
Base unit: 4px (Tailwind default)

Root bg:          #050507 (deep space, NOT pure #000000)
Screen padding:   20px (horizontal page margins)
Card padding:     14px 16px (body), 10px 12px (product)
Section gap:      16px between vertical sections
Grid gap (3-col): 3px (Ghosted tight grid)
Grid gap (2-col): 12px (Market grid)
H-scroll gap:     12px
Chip/pill gap:    8px
```

---

## 4. Border Radius

```
Cards, sheets, modals:  12px
Sheet top corners:      20px
Buttons (large):        10px
Buttons (small):        8px
Input fields:           10px
Pills/chips (filter):   20px (full pill)
Badge overlays:         6px
Avatar:                 50% (always circle)
Globe sphere:           50%
```

---

## 5. Fixed Measurements

```
Bottom nav height:      83px  ← immutable
Status bar:             44px
Radio mini player:      56px
Touch target minimum:   44×44px
Avatar (profile hero):  72px
Avatar (grid cell):     28–40px
Online dot:             7px
Sheet handle:           36×4px
SOS button:             52×52px
```

---

## 6. Shadows & Glows

```css
/* Card elevation */
box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset;

/* Active nav icon */
filter: drop-shadow(0 0 6px rgba(200,150,44,0.4));

/* Profile avatar ring */
box-shadow: 0 0 20px rgba(200,150,44,0.2);

/* Active pill / CTA button */
box-shadow: 0 0 12px rgba(200,150,44,0.3);

/* Globe node */
box-shadow: 0 0 10px rgba(200,150,44,0.5);

/* Online dot */
box-shadow: 0 0 6px rgba(48,209,88,0.5);

/* SOS button */
box-shadow: 0 0 20px rgba(255,59,48,0.4);

/* Phone frame (mockup only) */
box-shadow: 0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,150,44,0.08);
```

---

## 7. Z-Index Layers

| Layer | Z-index | Components |
|---|---|---|
| L0 — Globe | 0 | `UnifiedGlobe` (Three.js — **only on `/pulse`**, null elsewhere) |
| L1 — Shell | 50 | `OSBottomNav`, `RadioMiniPlayer` |
| L2 — Sheets | 100 | All content sheets (`SheetRouter`) |
| L3 — Overlays | 150 | Persona switcher, filters drawer |
| Interrupt — Call | 180 | `IncomingCallBanner` |
| Interrupt — SOS btn | 190 | `SOSButton` |
| Interrupt — SOS overlay | 200 | `SOSOverlay` |
| Interrupt — PIN lock | 210+ | `PinLockOverlay` |

---

## 8. Motion Tokens

| Animation | Duration | Easing |
|---|---|---|
| Button press | 150ms | ease |
| Tab switch | 200ms | ease-in-out |
| Card hover | 250ms | ease |
| Filter chip toggle | 300ms | ease |
| Sheet slide-up | 350ms | cubic-bezier(0.32,0.72,0,1) |
| Sheet dismiss | 400ms | cubic-bezier(0.32,0.72,0,1) |
| Screen transition | 500ms | ease-in-out |
| Beacon pulse ring | 2000ms | ease-out · infinite |
| SOS pulse ring | 2500ms | ease-out · infinite |
| Waveform bar | 800ms | ease-in-out · infinite |

---

## 9. Mode-by-Mode Specs

### 9.1 Home (`/`)

```
Layout (top → bottom):
  Status bar:       44px · system
  Header:           city pill + HOT|MESS wordmark + search + bell
  Section content:  scrollable
  Radio mini player: 56px · fixed above nav (z-50)
  Bottom nav:       83px · fixed

Sections (in order):
  01. Intention Bar   — Hookup/Hang/Explore intent picker
  02. Globe Teaser    — static orb → /pulse
  03. Who's Out RN    — avatar row, conic-gradient rings
  04. Tonight's Events — horizontal 200px cards
  05. Live Radio      — teal #00C2E0 banner
  06. Nearby (Ghost)  — 4-col teaser grid
  07. Market Picks    — horizontal 140px product cards
  08. Active Beacons  — list view
  09. Venue Kings     — horizontal scroll (conditional)
  10. Creator Drop    — HUNG #C41230 banner
  11. Your Profile    — completion card
  12. Safety Strip    — SOS reminder

Interaction Map:
  City pill tap     → L2CitySheet
  Globe Teaser tap  → navigate /pulse
  RN avatar tap     → L2ProfileSheet
  Event card tap    → L2EventSheet
  Radio banner tap  → navigate /radio
  Ghost teaser tap  → navigate /ghosted
  Market card tap   → L2ProductSheet
  Beacon row tap    → L2BeaconSheet
  Safety strip tap  → SOSButton long-press trigger
```

### 9.2 Ghosted (`/ghosted`)

```
Layout:
  Filter chips:     horizontal scroll, top
  Grid:             3-column, 3px gap, square cells (1:1)
  Photo area:       65% of cell height
  Info area:        35% — name + distance

Cell overlays:
  Online dot:       7px · top-right · #30D158 · glow
  RN badge:         top-left · emoji + colour ring
  Unread badge:     Ghosted nav tab · #FF3B30 · count

Grid specs:
  Columns:          3 — fixed always
  Cell gap:         3px
  Outer padding:    4px

Interaction Map:
  Cell tap          → L2ProfileSheet
  Cell long-press   → Quick action (Boo / Chat)
  Filter chip tap   → Apply filter inline
  "Filters" chip    → L3FiltersSheet (z-150)
  Boo action   → Haptic + gold burst animation
  Chat (gated)      → L2ChatSheet (Ghosted only)
  Video (gated)     → L2VideoCallSheet (Ghosted only)
```

### 9.3 Pulse (`/pulse`)

```
Globe specs:
  Renders on:       /pulse ONLY — null elsewhere (GPU policy)
  Globe bg:         #050507 deep space
  Sphere colour:    #0D1520 cool dark navy
  Grid lines:       rgba(200,150,44,0.05)
  City node:        #C8962C · 8px dot
  Node glow:        rgba(200,150,44,0.50)
  Ring 1 (inner):   rgba(200,150,44,0.30) · pulse anim 2s
  Ring 2 (outer):   rgba(200,150,44,0.12) · offset anim
  Safety hotspot:   #FF3B30 · danger ring anim

Interaction Map:
  City node tap     → L2CitySheet
  Beacon ring tap   → L2EventSheet
  Safety hotspot tap → L2SafetySheet
  Globe drag        → Rotate (Three.js OrbitControls)
  Globe pinch       → Zoom
  FAB tap           → L2BeaconCreateSheet (#18)
```

### 9.4 Market (`/market`)

```
Tab colours:
  Shop (official):  #C8962C OS gold
  Preloved:         #9E7D47 Aged Brass
  Creator Drops:    #CF3A10 RCR Vinyl Red
  Tab underline:    2px solid · active only

Grid specs:
  Columns:          2 — fixed always
  Gap:              12px
  Card radius:      10px
  Image height:     90px (desktop: 130px)
  Price colour:     #C8962C OS gold — always

Badge logic:
  Sale price:       #30D158 · crossed-out original
  Sold out:         #636366 overlay + "SOLD" badge
  Brand tag:        bottom of card · sub-brand colour

FAB:                + button → L2SellSheet (bottom-right)
```

### 9.5 Profile (`/profile`)

```
Avatar:             72px · 50% · 3px solid gold border · glow
Name:               22px / 800 / white
Handle:             14px / #8E8E93
Stats row:          flex space-around · views/boos/events
Settings rows:      chevron right · tap → L2 sheets

Interaction Map:
  Avatar long-press → L3PersonaSwitcherSheet
  Avatar tap        → Edit Profile (L2)
  Stat: Views tap   → Who viewed you (L2)
  Stat: Boos tap   → Boos inbox (L2)
  Personas row      → L3PersonaSwitcherSheet
  SOS Contacts row  → Emergency contacts (L2)
```

### 9.6 Radio (`/radio`)

```
Full-screen player:   /radio route
Mini player:          56px · fixed above nav · z-50 · all non-radio routes
Channel colour:       #00C2E0 (HOTMESS RADIO teal)
Waveform bars:        5 bars · animated · 800ms ease-in-out infinite
Shows:                horizontal scroll from radio_shows table
```

---

## 10. Component Specs

### 10.1 Bottom Nav (`OSBottomNav`)

```
Height:         83px
Background:     #0D0D0D
Top border:     1px solid rgba(255,255,255,0.06)
Backdrop blur:  blur(20px)

Nav item:
  Icon:         24×24px
  Label:        10px, 600 weight
  Default:      color #636366
  Active:       color #C8962C + icon glow drop-shadow(0 0 6px rgba(200,150,44,0.4))
  Gap icon→label: 4px

5 tabs: Home · Pulse · Ghosted · Market · Profile
Unread badge: top-right of tab icon · #FF3B30 · 8px font · 14px circle
```

### 10.2 Card

```
Background:       #1C1C1E
Border:           1px solid rgba(255,255,255,0.04)
Border-radius:    12px
Image area:       180px tall, full width
Card body:        padding 14px 16px
Title:            15px / 700 / white
Subtitle:         12px / #8E8E93
Meta row:         11px / #636366, gold values at 600 weight

Card badge (overlay):
  Position:       absolute top-12 left-12
  Background:     #C8962C
  Color:          #000
  Font:           11px / 700
  Border-radius:  6px
  Padding:        4px 10px
```

### 10.3 Buttons

```css
/* Primary CTA */
.btn-primary {
  background: #C8962C;
  color: #000;
  font-weight: 700;
  border-radius: 10px;
  padding: 14px 24px;
  font-size: 15px;
  box-shadow: 0 0 12px rgba(200,150,44,0.3);
  height: 44px;        /* large */
}

/* Ghost / Secondary */
.btn-ghost {
  background: transparent;
  color: #C8962C;
  border: 1px solid rgba(200,150,44,0.3);
  font-weight: 600;
  border-radius: 10px;
  padding: 12px 20px;
}

/* Destructive */
.btn-danger {
  background: #FF3B30;
  color: #fff;
  font-weight: 700;
  border-radius: 10px;
}

/* Icon button (header) */
.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #1C1C1E;
  color: #fff;
}

/* Press animation — ALL buttons */
whileTap={{ scale: 0.97 }}   /* 150ms */
```

### 10.4 Badge / Pill

```
Gold badge (LIVE, labels):
  Background:    #C8962C
  Color:         #000
  Font:          10–11px / 700
  Border-radius: 6px
  Padding:       2px 8px – 4px 10px

Gold dim pill (city LIVE, tags):
  Background:    rgba(200,150,44,0.15)
  Color:         #C8962C
  Font:          10px / 700
  Border-radius: 10px
  Padding:       2px 8px

Muted pill (inactive filter):
  Background:    #1C1C1E
  Color:         #8E8E93
  Border:        1px solid rgba(255,255,255,0.08)
  Border-radius: 20px
  Padding:       8px 16px
  Font:          13px / 600
```

### 10.5 Filter Chips

```
Default:
  Background:    #1C1C1E
  Color:         #8E8E93
  Border:        1px solid rgba(255,255,255,0.06)
  Border-radius: 16px
  Padding:       6px 14px
  Font:          12px / 600

Active:
  Background:    rgba(200,150,44,0.15)
  Color:         #C8962C
  Border-color:  #C8962C
  Transition:    300ms ease
```

### 10.6 Section Header (SH pattern)

```
Layout:       flex row, space-between, items-baseline
Title:        18px / 800 / white
Dot:          6px circle · section colour · inline before title
Action link:  13px / 600 / #C8962C ("See all")
Padding:      16px 20px 10px (or mb-3 px-4)
```

### 10.7 Ghosted Grid

```
Layout:           3-column CSS grid
Gap:              3px (creates tight tile seam)
Outer padding:    4px

Ghost cell:
  Aspect ratio:   1:1 (square)
  Background:     #1C1C1E

Photo overlay:
  Bottom gradient: linear-gradient(transparent, rgba(0,0,0,0.85))
  Padding:        8px

Name:             13px / 700 / white
Distance:         10px / 600 / #C8962C
Online dot:       7px, top-right 8px, #30D158, glow
RN badge:         top-left 8px, 9px / 700, intent colour
```

### 10.8 Right-Now Intent Colours

```
These are semantic status colours for right_now_status.
NEVER use these as CTA button colours — gold only for CTAs.

hookup:   ring #FF5500  bg rgba(255,85,0,0.15)   text #FF5500   emoji 🔥
hang:     ring #00C2E0  bg rgba(0,194,224,0.12)  text #00C2E0   emoji 👋
explore:  ring #A899D8  bg rgba(168,153,216,0.12) text #A899D8  emoji 🗺
```

### 10.9 Market Tabs

```
Tab bar:
  Border-bottom:  1px solid rgba(255,255,255,0.06)
  Padding:        0 20px

Tab item:
  Flex: 1 (equal width)
  Padding:        12px 0
  Font:           13px / 600
  Default:        #8E8E93
  Active:         tab colour + 2px underline

Market grid:
  2-column, gap 12px, padding 16px 20px
```

### 10.10 Profile Hero

```
Avatar:
  72×72px, 50% radius
  Border: 3px solid #C8962C
  Glow:   box-shadow 0 0 20px rgba(200,150,44,0.2)
  Initial letter: 36px / 800 / #C8962C

Name:     22px / 800 / white
Handle:   14px / #8E8E93

Stats row: flex, space-around
  Each stat: value (18px/700/white) + label (11px/muted)
```

### 10.11 Radio Mini Player

```
Position:     fixed, above OSBottomNav (bottom: 83px)
Background:   #1C1C1E
Border-top:   1px solid rgba(0,194,224,0.20)   ← radio teal border
Height:       56px
Padding:      0 16px

Layout: album art (40×40, radius 8) · track info (flex 1) · controls
Track name:   14px / 600 / white
Show name:    12px / #8E8E93
Waveform:     5 bars · animated · #00C2E0
Controls:     play/pause in #00C2E0
```

### 10.12 SOS Button

```
Position:       fixed bottom-right
Right/Bottom:   24px / 100px (above nav)
Z-index:        190
Size:           52×52px, 50% radius
Background:     #FF3B30
Icon:           shield-alert, 22px, white
Long-press:     2s threshold → triggerSOS()
Box-shadow:     0 0 20px rgba(255,59,48,0.4)
```

### 10.13 Globe (Pulse mode only)

```
Renders:     null on all routes except /pulse
Background:  radial-gradient(ellipse, rgba(200,150,44,0.06) center, transparent 70%)

Sphere:
  Color:       #0D1520 (cool dark navy)
  Border:      1px solid rgba(200,150,44,0.15)
  Grid lines:  rgba(200,150,44,0.05)

Node:
  8×8px, #C8962C, glow: 0 0 10px rgba(200,150,44,0.5)

Beacon ring:
  Border:      1px solid rgba(200,150,44,0.2)
  Animation:   scale(1→2.5), opacity(1→0), 2s ease-out infinite

Globe label pill:
  Background:  rgba(28,28,30,0.9)
  Border:      1px solid rgba(200,150,44,0.2)
  Backdrop:    blur(10px)
  Dot:         6px, #C8962C
```

### 10.14 Sheet System

```
Sheet anatomy:
  Handle:         36×4px · #3A3A3C · centered top
  Border radius:  20px top corners
  Background:     #1C1C1E
  Backdrop:       rgba(0,0,0,0.6)

Slide animation:
  Duration:       350ms
  Easing:         cubic-bezier(0.32,0.72,0,1)
  Dismiss:        drag down ≥ 40% or tap backdrop
  URL sync:       ?sheet=<type>

Policy-gated sheets (only from /ghosted or when profile sheet in stack):
  L2ChatSheet
  L2VideoCallSheet
  L2TravelSheet
```

---

## 11. Sheets

Sheets slide up from the bottom. The stack is LIFO. Back closes top sheet before route navigation.

| Type | Z-index | Usage |
|---|---|---|
| L2 sheets | 100 | Profile, chat, event, product, etc |
| L3 sheets | 150 | Persona switcher, filters |
| Interrupts | 180–200 | Incoming call, SOS |

Sheet header pattern:
```
Drag handle: 4×36px, #636366, radius 2, centered top
Title: 17px / 700 / white, centered
Close/Back: left-side icon button
```

---

## 12. Animations

```
Sheet slide-up:      y: 100% → 0, spring(damping: 30, stiffness: 300)
Card press:          scale 0.97, 150ms ease
Card hover:          scale 1.02, 250ms ease
Beacon pulse ring:   scale 1 → 2.5, opacity 1 → 0, 2s infinite ease-out
SOS pulse ring:      scale 1 → 3, opacity 1 → 0, 2.5s infinite ease-out
Nav active glow:     drop-shadow transition 200ms
Online dot:          no animation (static green)
Gold badge pulse:    for LIVE badges only — subtle opacity 0.7 → 1 loop
Waveform bars:       height oscillation, 800ms ease-in-out infinite
Filter chip toggle:  background/border, 300ms ease
```

---

## 13. SOS System Colours

```
Overlay background:    rgba(20,0,0,0.97) — near-black red tint
Overlay z-index:       200 — above everything
Dismiss method:        PIN entry only — no tap-to-close

Action button colours:
  Text emergency contact: #FF3B30 danger red · SMS deep link
  Share location:         #C8962C OS gold · writes to DB
  Fake call:              #30D158 success green · simulates call
  Call 999:               #FF3B30 danger red · tel: link

Data writes:
  location_shares TABLE (user_id, lat/lng, active=true)
  right_now_status TABLE (status='sos', active=true)
```

---

## 14. Don't List

| Never do this | Reason |
|---|---|
| Use pink `#FF1493` | Brand colour purged — gold only |
| Use purple as CTA accent | Not in the palette |
| Render globe outside `/pulse` | Constant GPU drain |
| Surface XP points in UI | Gamification removed permanently |
| Auto-merge brand channels | RAW / HUNG / HIGH / RADIO are sovereign |
| Open chat/video/travel sheets outside `/ghosted` | Policy guard — use `canOpenSheet()` |
| Write to `profiles.right_now_status` JSONB | Column doesn't exist — write to `right_now_status` TABLE |
| Hard-code hex values | Use tokens above |
| Add light mode | Dark only. Forever. |
| Use font weights below 400 | Inter thin looks weak on OLED |
| Use intent colours (#FF5500, #00C2E0, #A899D8) as CTAs | Semantic only — gold for all CTAs |
| Use channel colours as general accent | Each channel colour is sovereign to that channel |

---

## 15. Quick Reference Cheatsheet

```
Gold accent:      #C8962C
Gold light:       #D4A84B
Gold dim (bg):    rgba(200,150,44,0.15)
Gold glow:        rgba(200,150,44,0.30)

OS root bg:       #050507  ← deep space (NOT #000000)
Surface/Nav:      #0D0D0D
Card:             #1C1C1E
Card hover:       #2C2C2E

Text:             #FFFFFF
Text muted:       #8E8E93
Text dim:         #636366

Danger:           #FF3B30
Success/online:   #30D158
Warn:             #FF9F0A

Right-Now intents (semantic only):
  Hookup:         #FF5500
  Hang:           #00C2E0
  Explore:        #A899D8

Channel colours (sovereign — not CTAs):
  Radio:          #00C2E0
  HUNG:           #C41230
  Market Preloved:#9E7D47
  Market Creator: #CF3A10

Font:             Inter
Wordmark:         22px 900 italic, HOT=white MESS=gold
Radius:           12px cards · 20px sheet-tops · 10px buttons · 20px pills · 6px badges · 50% avatars
Nav height:       83px (immutable)
Radio player:     56px (above nav)
Sheet L2:         z-100
Sheet L3:         z-150
SOS button:       z-190
SOS overlay:      z-200
```
