# HOTMESS Brand Style Guide v1.0

## Brand Overview

**HOTMESS** is a brutalist luxury platform combining nightlife OS, radio, and records. The brand speaks to gay men in London with confidence, care, and a cheeky wink.

---

## Color Palette

### Primary Colors

| Name | Hex | HSL | Usage |
|------|-----|-----|-------|
| **Hot Pink** | `#FF1493` | `328 100% 54%` | Primary CTA, brand moments, "HOT" in wordmark |
| **Royal Blue** | `#0047AB` | `216 100% 34%` | Secondary accent, "School of HOTMESS", merch |
| **Black** | `#000000` | `0 0% 0%` | Backgrounds, text |
| **White** | `#FFFFFF` | `0 0% 100%` | Text on dark, reverse |

### Secondary Colors

| Name | Hex | HSL | Usage |
|------|-----|-----|-------|
| **Cyan** | `#00D9FF` | `189 100% 50%` | Events, TONIGHT, info |
| **Purple** | `#B026FF` | `276 100% 57%` | Music, RAW CONVICT, releases |
| **Lime** | `#39FF14` | `112 100% 54%` | Success, online, Right Now active |
| **Red** | `#FF0000` | `0 100% 50%` | RAW CONVICT Records (red variant), alerts |
| **Gold/Amber** | `#FFB800` | `43 100% 50%` | Premium, photography warmth |

### Photography Tones

The HNH MESS product photography uses warm amber/golden lighting:
- Background warmth: `#D4A574` to `#8B6914`
- This should influence hero sections and product displays

---

## Typography

### Display Font (Headings)

**Primary**: Condensed, angular, industrial sans-serif
- Use for headlines, wordmarks, section titles
- All-caps, tight tracking
- The RAW CONVICT typography is geometric and angular

**Fallback**: Inter Black (900), Italic for brand moments

### Body Font

**Inter** - 400/500/600/700 weights
- Clean, modern, readable
- Use for body copy, UI elements

### Typography Scale

| Level | Size (Mobile) | Size (Desktop) | Weight | Usage |
|-------|---------------|----------------|--------|-------|
| Display | 15vw | 10vw | 900 Italic | Brand wordmark |
| H1 | 3rem | 6rem | 900 | Page titles |
| H2 | 2rem | 4rem | 900 | Section titles |
| H3 | 1.5rem | 2rem | 800 | Subsections |
| Body | 1rem | 1rem | 400 | Paragraphs |
| Caption | 0.75rem | 0.875rem | 500 | Labels |
| Micro | 0.625rem | 0.75rem | 600 | Legal, metadata |

### Typography Treatment

- **Wordmark**: `HOT` in white, `MESS` in Hot Pink, Italic Black
- **Taglines**: ALL-CAPS, letter-spacing: 0.2-0.4em
- **CTAs**: ALL-CAPS, Font Black, no italic

---

## Brand Voice & Microcopy

### Personality

- Bold, not crude
- Provocative, not offensive
- Care-first, always
- Cheeky, self-aware
- Community, not corporate

### Signature Lines

From the hoodie:
- *"Don't make the same mistake twice unless he's hot"*
- *"Wait for me boys, let's have one more puff"*
- *"LIVE LIFE LEFT"*
- *"School of HOTMESS;LONDON"*

### Standard Microcopy

| Context | Copy |
|---------|------|
| Consent cue | "Ask first. Confirm yes. Respect no. No pressure." |
| Aftercare cue | "Hydrate. Reset. Check in. Land in Safety if you need it." |
| Footer stamp | "18+ • Consent-first • Care always." |
| Safety check | "You good?" |
| Right Now expiry | "Right now ends automatically." |
| No ghosts | "No swiping. No ghosts." |

---

## Logo Usage

### Wordmark

```
HOTMESS
HOT = White or Black
MESS = Hot Pink (#FF1493)
```

Always italic. Always black weight.

### RAW CONVICT

The RAW logo is a distinctive geometric/angular mark:
- Vertical "RAW" letterforms
- Industrial, record-label aesthetic
- Colors: Hot Pink, Red, or White on Black

### HNH MESS

Product brand for the lube line:
- "HNH" stacked above "MESS"
- Industrial typography
- Associated with aftercare messaging

---

## Photography Style

### Product Photography

From the HNH MESS hero images:
- Warm amber/golden lighting (gym/locker room aesthetic)
- High production value
- Masculine, confident poses
- Clean, professional
- Chain-link or industrial backgrounds

### Editorial

- High contrast
- Grayscale with brand color overlays
- Urban, nightlife contexts

### User/Profile Photos

- Square aspect ratio preferred
- Encourage good lighting
- Allow personality to show

---

## Component Styling

### Buttons

| Type | Background | Text | Border |
|------|------------|------|--------|
| Primary | Hot Pink | Black | None |
| Secondary | Cyan | Black | None |
| Outline | Transparent | White | 2px White |
| Ghost | Transparent | White/60 | None |
| Destructive | Red | White | None |

All buttons: Font Black, UPPERCASE, py-4 px-6 minimum

### Cards

- Background: `rgba(255,255,255,0.05)` (glass)
- Border: `1px solid rgba(255,255,255,0.1)`
- Border-radius: 0.75rem (12px) or 0 for brutalist moments

### Input Fields

- Background: `rgba(255,255,255,0.05)`
- Border: `1px solid rgba(255,255,255,0.2)`
- Focus: `border-color: #FF1493`
- Error: `border-color: #FF0000`

### Badges

| Type | Colors |
|------|--------|
| Online | Lime bg, Black text |
| Right Now | Lime bg/border, animated pulse |
| Premium/CHROME | Gold gradient |
| Verified | Lime checkmark |
| Seller | Purple |
| New | Hot Pink |

---

## Effects

### Glows

```css
.glow-hot { box-shadow: 0 0 30px rgba(255, 20, 147, 0.5); }
.glow-cyan { box-shadow: 0 0 20px rgba(0, 217, 255, 0.4); }
.glow-purple { box-shadow: 0 0 20px rgba(176, 38, 255, 0.4); }
.glow-lime { box-shadow: 0 0 20px rgba(57, 255, 20, 0.4); }
.glow-blue { box-shadow: 0 0 20px rgba(0, 71, 171, 0.4); }
```

### Glassmorphism

```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

### Gradients

```css
/* Brand gradient (background) */
.gradient-brand {
  background: linear-gradient(135deg, #000 0%, #1a0a14 50%, #000 100%);
}

/* Accent gradient */
.gradient-accent {
  background: linear-gradient(90deg, #FF1493, #B026FF);
}

/* Golden warmth (product sections) */
.gradient-golden {
  background: linear-gradient(135deg, #8B6914 0%, #D4A574 100%);
}
```

---

## Imagery

### Hero Images (In Repository)

| File | Usage |
|------|-------|
| `HNHMESS HERO.PNG` | Product hero, masculine energy |
| `HOTMESS HERO HNH.PNG` | Full body product shot |
| `Hotmess Pink.JPEG` | RAW CONVICT pink album art |
| `Hotmess Red.JPEG` | RAW CONVICT red/black album art |
| `hot-mess-raw001-black-red-1024.jpg` | Record cover, red on black |
| `HNHMESS RECORD COVER.PNG` | Clean B&W record cover |
| `HOTMESS HOODIE BACK.jpg` | Merch reference, blue colorway |

### Placeholder Strategy

For user avatars/profiles, use:
- Silhouettes with brand gradient
- Abstract geometric shapes
- Never generic stock photos

---

## Spacing System

Base unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| space-1 | 4px | Tight inline spacing |
| space-2 | 8px | Button icon gaps |
| space-3 | 12px | Card padding compact |
| space-4 | 16px | Standard padding |
| space-5 | 20px | Card gaps |
| space-6 | 24px | Section padding mobile |
| space-8 | 32px | Section padding desktop |
| space-12 | 48px | Major section gaps |
| space-16 | 64px | Hero padding |

---

## Animation

### Timing

- **Fast**: 150ms (micro-interactions)
- **Normal**: 300ms (transitions)
- **Slow**: 500ms (page transitions)
- **Breathing**: 8-10s (background ambient)

### Easing

- **Default**: ease-out
- **Bounce**: cubic-bezier(0.68, -0.55, 0.265, 1.55)
- **Smooth**: cubic-bezier(0.4, 0, 0.2, 1)

### Common Animations

- **Pulse**: Right Now badges, SOS button
- **Fade-in-up**: Page content entrance
- **Scale**: Button hover (1.05)
- **Glow pulse**: Active audio, live indicators

---

## Accessibility

- Minimum contrast ratio: 4.5:1 for text
- Touch targets: 44x44px minimum
- Focus states: 2px outline, high contrast color
- Reduced motion: Respect `prefers-reduced-motion`

---

## File Naming

- Images: `kebab-case.extension` (e.g., `hero-product-shot.png`)
- Components: `PascalCase.jsx`
- Utilities: `camelCase.js`
- CSS: `kebab-case.css`

---

## CSS Variables (Recommended)

```css
:root {
  /* Brand Colors */
  --hot: #FF1493;
  --blue: #0047AB;
  --cyan: #00D9FF;
  --purple: #B026FF;
  --lime: #39FF14;
  --gold: #FFB800;
  --red: #FF0000;
  
  /* Neutrals */
  --black: #000000;
  --white: #FFFFFF;
  --gray-900: #0a0a0a;
  --gray-800: #1a1a1a;
  --gray-700: #262626;
  --gray-600: #404040;
  --gray-500: #737373;
  --gray-400: #a3a3a3;
  
  /* Alpha variations */
  --white-5: rgba(255,255,255,0.05);
  --white-10: rgba(255,255,255,0.1);
  --white-20: rgba(255,255,255,0.2);
  --white-40: rgba(255,255,255,0.4);
  --white-60: rgba(255,255,255,0.6);
  --white-80: rgba(255,255,255,0.8);
}
```

---

**HOTMESS** • Platform • Radio • Records • London

*Don't make the same mistake twice unless he's hot.*
