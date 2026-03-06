# HOTMESS OS — Design System

**Version**: 1.0.0
**Last updated**: 2026-03-06
**Theme**: Dark-only. Gold-only accent. No exceptions.

---

## 1. Color Tokens

These are the canonical brand colors. Every color used in the UI must come from this list. **Never hard-code hex values outside this reference.**

### CSS Custom Properties (map to Tailwind config)

```css
:root {
  /* === Gold (sole accent) === */
  --gold:       #C8962C;                      /* Primary CTA, active states, prices */
  --gold-light: #D4A84B;                      /* Hover states, gradient endpoints */
  --gold-dim:   rgba(200, 150, 44, 0.15);     /* Badge backgrounds, pill backgrounds */
  --gold-glow:  rgba(200, 150, 44, 0.30);     /* Box shadows, icon glows */

  /* === Surface / Background === */
  --bg:         #000000;    /* Root OS background */
  --surface:    #0D0D0D;    /* Nav background, deep surfaces */
  --card:       #1C1C1E;    /* Cards, sheets, modals */
  --card-hover: #2C2C2E;    /* Card hover / pressed state */

  /* === Text === */
  --text:       #FFFFFF;    /* Primary body copy, headings */
  --text-muted: #8E8E93;    /* Secondary labels, subtitles */
  --text-dim:   #636366;    /* Placeholders, timestamps, meta */

  /* === Semantic === */
  --danger:     #FF3B30;    /* SOS, errors, destructive actions */
  --green:      #30D158;    /* Online dot, success states */

  /* === Nav === */
  --nav-bg:     #0D0D0D;    /* OSBottomNav background */
}
```

### Tailwind Aliases (tailwind.config.js)

```js
colors: {
  'brand':        '#C8962C',
  'brand-light':  '#D4A84B',
  'brand-dim':    'rgba(200,150,44,0.15)',
  'brand-glow':   'rgba(200,150,44,0.30)',
  'os-bg':        '#000000',
  'os-surface':   '#0D0D0D',
  'os-card':      '#1C1C1E',
  'os-card-hover':'#2C2C2E',
  'os-nav':       '#0D0D0D',
  'text-primary': '#FFFFFF',
  'text-muted':   '#8E8E93',
  'text-dim':     '#636366',
  'danger':       '#FF3B30',
  'success':      '#30D158',
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

Screen padding:   20px (horizontal page margins)
Card padding:     14px 16px (body), 10px 12px (product)
Section gap:      16px between vertical sections
Grid gap (3-col): 2px (Ghosted tight grid)
Grid gap (2-col): 12px (Market grid)
H-scroll gap:     12px
Chip/pill gap:    8px
```

---

## 4. Border Radius

```
--radius:       12px   → Cards, sheets, modals, product cards
Pill:           20–24px → Right-now pills, filter chips
Badge:          6px    → Card overlay badges (TONIGHT, HOT)
Small badge:    4px    → Ghosted RN badges (HOOKUP, HANG)
Avatar:         50%    → All avatars
Icon button:    50%    → Header icon buttons
Tab underline:  1px    → Market tab active indicator
```

---

## 5. Shadows & Glows

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

/* Phone frame (mockup only) */
box-shadow: 0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,150,44,0.08);
```

---

## 6. Z-Index Layers

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

## 7. Components

### 7.1 Bottom Nav (`OSBottomNav`)

```
Height:         83px
Background:     #0D0D0D
Top border:     1px solid rgba(255,255,255,0.06)
Backdrop blur:  blur(20px)
Padding-top:    8px (items align from top)

Nav item:
  Icon:         24×24px
  Label:        10px, 600 weight
  Default:      color #636366
  Active:       color #C8962C + icon glow drop-shadow(0 0 6px rgba(200,150,44,0.4))
  Gap icon→label: 4px

5 tabs: Home · Pulse · Ghosted · Market · Profile
```

### 7.2 Card

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

### 7.3 Buttons

```css
/* Primary CTA */
.btn-primary {
  background: #C8962C;
  color: #000;
  font-weight: 700;
  border-radius: 12px;
  padding: 14px 24px;
  font-size: 15px;
  box-shadow: 0 0 12px rgba(200,150,44,0.3);
}

/* Ghost / Secondary */
.btn-ghost {
  background: transparent;
  color: #C8962C;
  border: 1px solid rgba(200,150,44,0.3);
  font-weight: 600;
  border-radius: 12px;
  padding: 12px 20px;
}

/* Destructive */
.btn-danger {
  background: #FF3B30;
  color: #fff;
  font-weight: 700;
  border-radius: 12px;
}

/* Icon button (header) */
.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #1C1C1E;
  color: #fff;
}
```

### 7.4 Badge / Pill

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

### 7.5 Filter Chips

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
```

### 7.6 Section Header

```
Layout:       flex row, space-between
Title:        18px / 800 / white
Action link:  13px / 600 / #C8962C
Padding:      16px 20px 10px
```

### 7.7 Ghosted Grid

```
Layout:           3-column CSS grid
Gap:              2px (creates tight tile seam)
Outer padding:    0 2px

Ghost cell:
  Aspect ratio:   3/4
  Background:     #1C1C1E

Photo overlay:
  Bottom gradient: linear-gradient(transparent, rgba(0,0,0,0.85))
  Padding:        8px

Name:             13px / 700 / white
Distance:         10px / 600 / #C8962C

Online dot:       8×8px, top-right 8px, #30D158, glow
RN badge:         top-left 8px, 9px / 700, #C8962C bg, #000 text
```

### 7.8 Market Tabs

```
Tab bar:
  Border-bottom:  1px solid rgba(255,255,255,0.06)
  Padding:        0 20px

Tab item:
  Flex: 1 (equal width)
  Padding:        12px 0
  Font:           13px / 600
  Default:        #8E8E93
  Active:         #C8962C + 2px underline (left 20% – right 20%)

Market grid:
  2-column, gap 12px, padding 16px 20px

Product card:
  Image:     1:1 aspect ratio
  Name:      13px / 600 / white
  Price:     14px / 800 / #C8962C
  Seller:    11px / #636366
```

### 7.9 Profile Hero

```
Avatar:
  96×96px, 50% radius
  Border: 3px solid #C8962C
  Glow:   box-shadow 0 0 20px rgba(200,150,44,0.2)
  Initial letter: 36px / 800 / #C8962C

Name:     22px / 800 / white
Handle:   14px / #8E8E93

Stats row: flex, space-around
  Each stat: value (18px/700/white) + label (11px/muted)
```

### 7.10 Radio Mini Player

```
Position:     fixed, above OSBottomNav (bottom: 83px)
Background:   #1C1C1E
Border-top:   1px solid rgba(200,150,44,0.15)
Height:       64px
Padding:      0 16px

Layout: album art (40×40, radius 8) · track info (flex 1) · controls
Track name:   14px / 600 / white
Show name:    12px / #8E8E93
Controls:     play/pause in #C8962C
```

### 7.11 SOS Button

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

### 7.12 Globe (Pulse mode only)

```
Render:      null on all routes except /pulse
Background:  radial-gradient(ellipse, rgba(200,150,44,0.06) center, transparent 70%)

Sphere:
  Border:      1px solid rgba(200,150,44,0.15)
  Inner glow:  radial-gradient at 40% 40%

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

---

## 8. Sheets

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

## 9. Animations

```
Sheet slide-up:      y: 100% → 0, spring(damping: 30, stiffness: 300)
Card press:          scale 0.97, 150ms
Beacon pulse ring:   scale 1 → 2.5, opacity 1 → 0, 2s infinite
Nav active glow:     drop-shadow transition 200ms
Online dot:          no animation (static green)
Gold badge pulse:    for LIVE badges only — subtle opacity 0.7 → 1 loop
```

---

## 10. Don't List

| Never do this | Reason |
|---|---|
| Use pink `#FF1493` | Brand color purged — gold only |
| Use purple as accent | Not in the palette |
| Render globe outside `/pulse` | Constant GPU drain |
| Surface XP points in UI | Gamification removed permanently |
| Auto-merge brand channels | RAW / HUNG / HIGH / RADIO are sovereign |
| Open chat/video/travel sheets outside `/ghosted` | Policy guard — use `canOpenSheet()` |
| Write to `profiles.right_now_status` JSONB | Column doesn't exist — write to `right_now_status` TABLE |
| Hard-code hex values | Use tokens above |
| Add light mode | Dark only. Forever. |
| Use font weights below 400 | Inter thin looks weak on OLED |

---

## 11. Quick Reference Cheatsheet

```
Gold accent:     #C8962C
Gold light:      #D4A84B
Gold dim (bg):   rgba(200,150,44,0.15)
Gold glow:       rgba(200,150,44,0.30)

OS bg:           #000000
Surface/Nav:     #0D0D0D
Card:            #1C1C1E
Card hover:      #2C2C2E

Text:            #FFFFFF
Text muted:      #8E8E93
Text dim:        #636366

Danger:          #FF3B30
Success dot:     #30D158

Font:            Inter
Wordmark:        22px 900 italic, HOT=white MESS=gold
Radius:          12px cards · 20px pills · 6px badges · 50% avatars
Nav height:      83px
Sheet L2:        z-100
Sheet L3:        z-150
SOS button:      z-190
SOS overlay:     z-200
```
