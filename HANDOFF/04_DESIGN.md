# HOTMESS — Design Specification

---

## Brand Identity

**HOTMESS** is brutalist luxury. Dark, warm, underground, knowing, held.

Not friendly. Not corporate. Not sanitized.
Confident. Care-first. Cheeky.

---

## Color Palette

### Primary
| Name | Hex | Usage |
|------|-----|-------|
| **Hot Pink** | `#FF1493` | Primary CTA, brand moments, "HOT" in wordmark |
| **Black** | `#000000` | Backgrounds |
| **White** | `#FFFFFF` | Text on dark |

### Secondary
| Name | Hex | Usage |
|------|-----|-------|
| **Cyan** | `#00D9FF` | Events, TONIGHT, info |
| **Purple** | `#B026FF` | Music, RAW CONVICT, releases |
| **Lime** | `#39FF14` | Success, online, Right Now active |
| **Red** | `#FF0000` | Alerts, RAW CONVICT (alt) |
| **Gold** | `#FFB800` | Premium, warmth |

### Glass Effects
```css
--glass: rgba(255, 255, 255, 0.05);
--glass-border: rgba(255, 255, 255, 0.1);
--glass-hover: rgba(255, 255, 255, 0.08);
```

---

## Typography

### Fonts
- **Display**: Inter Black Italic (wordmark, heroes)
- **Headings**: Inter Bold/Black
- **Body**: Inter Regular/Medium
- **Accent**: Space Grotesk (optional)

### Scale
| Level | Mobile | Desktop | Weight | Usage |
|-------|--------|---------|--------|-------|
| Display | 15vw | 10vw | 900 Italic | Wordmark |
| H1 | 3rem | 6rem | 900 | Page titles |
| H2 | 2rem | 4rem | 900 | Sections |
| H3 | 1.5rem | 2rem | 800 | Subsections |
| Body | 1rem | 1rem | 400 | Paragraphs |
| Caption | 0.75rem | 0.875rem | 500 | Labels |
| Micro | 0.625rem | 0.75rem | 600 | Legal |

### Treatment
- Wordmark: `HOT` white, `MESS` hot pink, italic black
- Taglines: ALL-CAPS, letter-spacing 0.2–0.4em
- CTAs: ALL-CAPS, black weight, no italic

---

## Voice & Microcopy

### Personality
- Bold, not crude
- Provocative, not offensive
- Care-first, always
- Cheeky, self-aware
- Community, not corporate

### Signature Lines
- "Don't make the same mistake twice unless he's hot"
- "LIVE LIFE LEFT"
- "School of HOTMESS;LONDON"

### Standard Copy
| Context | Copy |
|---------|------|
| Consent cue | "Ask first. Confirm yes. Respect no. No pressure." |
| Aftercare | "Hydrate. Reset. Check in. Land in Safety if you need it." |
| Footer | "18+ • Consent-first • Care always." |
| Safety check | "You good?" |
| Late night | "Still up? Care is here if you need it." |
| Empty state | "Nothing here yet. That's okay." |
| Exit | "You can always leave." |

---

## Components

### Buttons
| Variant | Usage |
|---------|-------|
| `hot` | Primary CTA (hot pink bg) |
| `cyan` | Secondary/info actions |
| `glass` | Subtle actions on dark bg |
| `ghost` | Tertiary, text-only |
| `glow` | Premium/highlighted actions |

### Cards
- Glass morphism (blur backdrop, subtle border)
- Rounded corners (1rem default)
- Hover: subtle glow, slight lift

### Profile Cards (GHOSTED)
- Single photo tile in grid
- Up to 5 photos in detail view
- No ranking indicators
- Right Now badge if active
- Match score subtle (not prominent)

### Beacons
- Pulsing glow effect
- Time-limited visual (countdown or decay)
- No exact location
- Warm, inviting, not urgent

---

## Motion

### Principles
- Smooth, not snappy
- Purposeful, not decorative
- Calm energy, not anxiety-inducing

### Defaults
```javascript
transition: { duration: 0.3, ease: "easeOut" }
```

### Page Transitions
- Fade + slight slide
- No harsh cuts

### Micro-interactions
- Button hover: subtle glow
- Card hover: slight lift
- Success: gentle pulse
- Error: shake (subtle)

---

## Layout

### Navigation
| Tab | Icon | Label |
|-----|------|-------|
| Radio | 📻 | RADIO |
| Tonight | ⚡ | TONIGHT |
| GHOSTED | 👻 | GHOSTED |
| Shop | 🛒 | SHOP |
| More | ☰ | MORE |

### Grid
- Mobile: 2 columns
- Tablet: 3 columns
- Desktop: 4–5 columns

### Spacing
- Base unit: 4px
- Padding: 16px (mobile), 24px (desktop)
- Section gaps: 48px (mobile), 64px (desktop)

---

## States

### GHOSTED States
| State | Visual |
|-------|--------|
| Online | Lime dot |
| Right Now | Lime badge + "out" |
| Invisible | No indicator (silent) |
| Away | Grey dot (optional) |

### Care States
| State | Visual |
|-------|--------|
| Default | Care link subtle |
| Prompted | Care card surfaces |
| SOS Active | Full-screen overlay |

### Beacon States
| State | Visual |
|-------|--------|
| Active | Pulsing glow |
| Peak | Brighter pulse, "hot" badge |
| Ending soon | Fading pulse |
| Ended | Removed from view |

---

## Dark Mode Only

HOTMESS is always dark. No light mode.

- Background: `#000000` or `#0A0A0A`
- Surface: Glass effects on black
- Text: White with opacity variations
- Accents: Neon colors (pink, cyan, lime)

---

## Accessibility

- Contrast ratios meet WCAG AA minimum
- Focus states visible (pink ring)
- Touch targets 44px minimum
- Skip to content link
- Screen reader labels on icons
- Reduced motion option respected

---

## Don'ts

- ❌ No light mode
- ❌ No friendly/corporate feel
- ❌ No engagement metrics visible to users
- ❌ No anxiety-inducing counters (unread, views)
- ❌ No ranking by "hotness"
- ❌ No shame for silence/invisibility
- ❌ No burying Care behind menus

---

*This is the design source of truth. Reference for all Figma work.*
