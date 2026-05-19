# HOTMESS Design System

Version 2.0 — 2026-05-19 system reset.

This is the canonical reference. If a surface contradicts this document, the surface is wrong.

---

## 0. The rule

There is one of each. One gold. One safety color. One emergency color. One body font. One display font. One radius scale. One spacing scale. One z scale.

If a surface "needs" something that isn't here, the design system is wrong — fix it here, not the surface.

---

## 1. Color

### Brand — gold

| Token | Hex | When |
|---|---|---|
| `--c-brand` | `#C8962C` | All primary actions, hero accents, FABs |
| `--c-brand-hover` | `#D4A84B` | Hover state on brand surfaces |
| `--c-brand-pressed` | `#9A7020` | Active/pressed state |
| `--c-brand-tint` | rgba(200,150,44,0.12) | Chip backgrounds, hover fills, ghost-brand hovers |
| `--c-brand-tint-2` | rgba(200,150,44,0.20) | Stronger tints (filter chips selected state) |
| `--c-brand-glow` | rgba(200,150,44,0.35) | Box-shadow glows on primary FABs and CTAs |

There is one gold. Aliases `hot.*`, `gold.*`, `neon.gold` are deprecated and being removed.

### Semantic — live, warn, emergency

| Token | Hex | When |
|---|---|---|
| `--c-signal` | `#30D158` | Live, online, delivered, success confirmations |
| `--c-warn` | `#FFB800` | Non-blocking warnings, "needs attention" |
| `--c-emergency` | `#FF3B30` | **SOS only.** Never decoration. Never form validation. |
| `--c-destructive` | `#E0524F` | Form-validation errors, delete buttons, destructive confirmations |

Emergency and destructive are intentionally different. If you use emergency for form errors you've broken the signal — users will tune it out by the time it actually matters.

### Retired colors

Cyan (`#00D9FF`, `#00C2E0`) is **retired from product surfaces**. It survives only in canvas visualisers (radio waveform) where it's pre-existing brand identity.

Neon green (`#39FF14`) is **retired from UI**. Same canvas exception.

### Text

| Token | Value |
|---|---|
| `--c-text-1` | rgba(255, 255, 255, 0.95) — primary |
| `--c-text-2` | rgba(255, 255, 255, 0.70) — secondary |
| `--c-text-3` | rgba(255, 255, 255, 0.45) — tertiary, captions |
| `--c-text-disabled` | rgba(255, 255, 255, 0.25) |

### Surfaces

| Token | Value | When |
|---|---|---|
| `--c-bg` | `#050507` | Page background |
| `--c-bg-elevated` | `#0D0D0D` | Nav, cards, sheets, inputs |
| `--c-surface-1` | rgba(255, 255, 255, 0.05) | Subtle card on dark bg |
| `--c-surface-2` | rgba(255, 255, 255, 0.08) | Stronger card |
| `--c-surface-3` | rgba(255, 255, 255, 0.12) | Hover state on surface-1 |

---

## 2. Typography

Two families. One rule.

### Families

| Token | Stack | When |
|---|---|---|
| `--ff-display` | `'Oswald', 'Bebas Neue', system-ui, sans-serif` | Hero h1/h2 + chip labels. **Always uppercase, always tracked.** |
| `--ff-mono` | `'Space Mono', 'SF Mono', Menlo, monospace` | Everything else. Default body. The HOTMESS look. |
| `--ff-body` | alias for `--ff-mono` | Use this for intent when writing body styles |

If you reach for Inter, Barlow, SF Pro, or Segoe UI — stop. You're working off an old design that's been retired.

### The rule for which family

| Use display caps when | Use mono when |
|---|---|
| h1 or h2 hero headlines | h3 and below |
| Splash cinematic moments | Body paragraphs |
| Chip labels (always paired with `uppercase tracking-micro`) | Button labels |
| Section dividers (rare) | Inputs |
| Anything that screams brand drama | Anything functional / read-by-humans-not-glanced-at |

### Scale

| Token | Px | When |
|---|---|---|
| `--fs-micro` | 10 | Chip labels |
| `--fs-small` | 12 | Captions, secondary |
| `--fs-body` | 14 | Default body |
| `--fs-body-lg` | 16 | Readable body, input fields (iOS no-zoom minimum) |
| `--fs-h3` | 20 | Subsection heading |
| `--fs-h2` | 24 | Section hero |
| `--fs-h1` | 32 | Page hero |
| `--fs-hero` | 42 | Splash/cinematic hero |
| `--fs-cinematic` | 56 | Splash big-bang (use sparingly) |

### Weights

Three only: regular (400), medium (500), bold (700).

If you want `font-black` (900) you want `font-display` (Oswald) already at `font-bold` — it reads heavier than mono-bold automatically.

### Tracking

| Token | Em | When |
|---|---|---|
| `--tr-tight` | -0.01 | Dense numeric displays |
| `--tr-normal` | 0 | Default body |
| `--tr-loose` | 0.05 | Subtle emphasis |
| `--tr-display` | 0.15 | Display caps headlines (Oswald) |
| `--tr-micro` | 0.20 | Chip labels (mono caps) |

---

## 3. Spacing

4px base. One scale.

`--sp-0` 0 · `--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 20 · `--sp-6` 24 · `--sp-7` 32 · `--sp-8` 40 · `--sp-9` 48 · `--sp-10` 64

If you reach for `mb-[27px]` you're doing it wrong. Round to the scale.

---

## 4. Radius

| Token | Px | When |
|---|---|---|
| `--r-xs` | 4 | Small chips |
| `--r-sm` | 8 | Inline buttons |
| `--r-md` | 12 | Cards (default), buttons (md/lg) |
| `--r-lg` | 16 | Hero cards, large buttons |
| `--r-xl` | 24 | Sheets (alt) |
| `--r-pill` | 9999 | Pills, FABs, circular buttons |
| `--r-sheet` | 28 | Bottom-sheet top corners (canonical) |

---

## 5. Shadow

| Token | Value | When |
|---|---|---|
| `--sh-soft` | 0 8px 24px rgba(0,0,0,0.35) | Card elevation |
| `--sh-strong` | 0 16px 48px rgba(0,0,0,0.55) | Sheet, modal |
| `--sh-brand-glow` | 0 0 20px brand-glow | Primary CTA |
| `--sh-brand-glow-lg` | 0 0 36px + 0 0 64px | Primary FAB (Beacon) |
| `--sh-emergency-glow` | 0 0 24px rgba(255,59,48,0.45) | SOS button only |

---

## 6. Motion

| Token | ms | When |
|---|---|---|
| `--dur-micro` | 80 | Hover, micro-interactions |
| `--dur-fast` | 150 | Button color transitions |
| `--dur-normal` | 250 | Default UI transition |
| `--dur-sheet` | 320 | Sheet slide-up/down |
| `--dur-page` | 380 | Page route transition |
| `--dur-modal` | 280 | Modal fade-in |
| `--dur-camera` | 600 | Camera zoom (globe, splash) |

Easings: `--ease-ui` (default), `--ease-enter`, `--ease-exit`, `--ease-spring`.

Reduced motion media query disables all animation/transition globally — built into tokens.css. Don't override it.

---

## 7. Z-index

Single source of truth. **No arbitrary `z-[NNN]` literals anywhere.**

| Token | Value | When |
|---|---|---|
| `--z-base` | 0 | Page base |
| `--z-content` | 10 | Body content layered above globe |
| `--z-globe-hud` | 40 | Controls overlaid on the globe |
| `--z-dock` | 50 | Bottom navigation |
| `--z-fab` | 60 | SafetyFAB, Beacon FAB |
| `--z-sheet` | 80 | Bottom sheets, backdrops |
| `--z-modal` | 100 | Centered modals |
| `--z-toast` | 110 | Sonner toasts |
| `--z-cookie` | 115 | Cookie banner — above toast, below interrupts |
| `--z-interrupt` | 120 | Check-in modals, drop-everything overlays |
| `--z-emergency` | 200 | SOS overlays |
| `--z-debug` | 999 | Dev-only debug overlays |

If you need a layer between two existing ones, add the token here first. Then use it.

---

## 8. Primitive components

Imported from `@/components/system`. Surfaces compose primitives — they don't customise them.

### `<Button>`

```jsx
<Button variant="primary" size="md">Continue</Button>
<Button variant="signal">Confirm</Button>
<Button variant="emergency">Stop</Button>   // SOS contexts ONLY
<Button variant="secondary">Cancel</Button>
<Button variant="ghost">Skip</Button>
<Button variant="outline">More</Button>
```

Variants: `primary` (gold), `signal` (green), `emergency` (red), `secondary` (subtle), `ghost` (no fill), `outline` (bordered). Sizes: `sm` 36 / `md` 44 / `lg` 52. All hit 44px touch target.

### `<Card>`

```jsx
<Card tone="elevated" padding="md" interactive>...</Card>
```

Tones: `default`, `elevated`, `brand`, `emergency`. Paddings: `none`, `sm`, `md`, `lg`. `interactive` adds hover/active + focus ring.

### `<Heading>`

```jsx
<Heading level="hero">HOTMESS</Heading>           // cinematic caps
<Heading level="h1">Tonight in London</Heading>   // display caps
<Heading level="h2">Trusted contacts</Heading>     // display caps
<Heading level="h3">Aftercare</Heading>            // mono, no caps
<Heading level="meta">SAFETY</Heading>             // mono micro caps
```

Levels `hero/h1/h2` are Oswald caps. `h3` is mono. `meta` is mono micro caps. Always rendered as the matching semantic tag (`h1`/`h2`/`h3`).

### `<Body>`

```jsx
<Body size="lg" tone="muted">Description text.</Body>
```

Sizes: `sm/default/lg`. Tones: `default/muted/subtle/brand/signal/emergency`. Always mono. Always 1.45 line-height.

### `<Pill>`

```jsx
<Pill tone="signal" variant="tint">DELIVERED</Pill>
<Pill tone="brand" variant="outline">VIP</Pill>
```

Tones: `default/brand/signal/warn/emergency/muted`. Variants: `solid/tint/outline`. Always uppercase, always tracked-micro. For channel chips, badges, status indicators.

### `<Fab>`

```jsx
<Fab tone="brand" anchor="bottom-right" ariaLabel="Drop beacon">
  <MapPin />
</Fab>
<Fab tone="neutral" anchor="top-right" ariaLabel="Safety menu">
  <Shield />
</Fab>
```

Tones: `brand/emergency/neutral`. Anchors: `bottom-right/bottom-left/top-right/top-left`. Always pill-shaped, always safe-area aware. **One FAB per corner per surface, max.** If you have more than 2 FABs on a page, redesign the page.

### `<Sheet>`

```jsx
<Sheet open={open} onClose={close} title="Filters">
  ...
</Sheet>
```

Bottom-sheet with backdrop, ESC dismiss, focus trap, grabber, safe-area padding. For one-off sheets that don't warrant SheetRouter registration.

### `<toast>` + `<ToastRoot>`

```jsx
import { toast, ToastRoot } from '@/components/system';
toast.success('Sent');
toast.error('Failed');
```

`<ToastRoot />` renders once in the app shell. Re-export of sonner with the design system theme baked in.

---

## 9. Migration playbook

For migrating an existing surface to the system:

1. **Find hex literals.** `grep -nE "#C8962C|#00C2E0|#00D9FF|#1C1C1E|#39FF14|#30D158|#FF3B30" path/to/file`
2. **Replace tailwind class hex literals** with token classes: `bg-[#C8962C]` → `bg-brand`, `text-[#C8962C]` → `text-brand`, `bg-[#1C1C1E]` → `bg-bg-elevated`, etc. See the codemod in `outputs/design-audit-2026-05-19.md` for the full substitution list.
3. **For inline `style={{ }}`** hex literals, import `COLOR` from `@/lib/tokens` and reference `COLOR.brand`, `COLOR.signal`, etc. Don't string-concatenate hex.
4. **Replace arbitrary `z-[NNN]`** with named tokens: `z-fab`, `z-sheet`, `z-modal`, etc. If you need a layer not in the scale, add it to `tokens.css` and `tokens.ts` first.
5. **Replace ad-hoc buttons** with `<Button variant="..." />`. Replace ad-hoc chips with `<Pill tone="..." />`. Replace ad-hoc bottom sheets with `<Sheet>`.
6. **Type ramp:** any hero/h1/h2 should use `<Heading level="..." />`. Body paragraphs should use `<Body>`. Don't write `font-family` declarations.
7. **Test the surface.** Cold visitor flow. Authed user flow. Light mode does not exist — don't add it.

---

## 10. What this system does NOT cover

- Brand wordmark refresh (out of scope this sweep)
- Logo lockups / multi-mark systems
- Email HTML templates (use the brand colors but the email engine has its own constraints)
- Native canvas visualisers (radio waveform) — keep their existing palette as brand-original art
- shadcn primitives still in use (Input, Label, Tabs, etc.) — they consume `hsl(var(--*))` from `src/index.css`. Migrating those is a separate sweep.

---

## 11. What got fixed in the 2026-05-19 reset

From today's audit + Phil's 18:59 cold-incognito walkthrough:

- "Welcome back" no longer the default headline for cold visitors (HotmessSplash)
- "CHANNEL" chip placeholder no longer rendered when API omits channel name (SilentSOSButton)
- Cookie banner z-index now in the canonical scale, never obscures SOS shield (CookieBanner)
- SafetyFAB anchored top-right platform-wide (was bottom-left, conflicted with iOS back gesture + cookie banner)
- Two-FAB-on-Pulse conflict resolved by anchoring SafetyFAB top-right, Beacon stays bottom-right (Globe.jsx)
- Layers control moved to top-left on Pulse so SafetyFAB has top-right uncontested

What's still out there for follow-on sweeps:

- The 5 legacy stylesheets (`enhanced-design.css`, `lux-brutalist.css`, `typography.css`, `index.css` shadcn HSL block, `globals.css`) still exist. They no longer conflict because the tokens file v2 takes precedence, but they're code debt and should be deleted in a follow-on PR once `grep -r '.lux-brutalist\|.enhanced-design'` returns empty.
- The legacy `button.jsx` still has 15+ variants with cyan/purple/etc. Surfaces using it stay functional but new surfaces should use `@/components/system/Button` instead.
- Many surfaces beyond the 6 migrated here still have hex literals. Codemod from migration playbook §2 applies.
