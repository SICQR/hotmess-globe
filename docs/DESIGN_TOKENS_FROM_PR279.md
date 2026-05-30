# Salvaged from PR #279 (design-system reset) — 2026-05-23

PR **#279** (`design/system-reset-2026-05-19`, "canonical tokens, 8 primitives, 6 surface migrations + fix-in-pass") is being **closed as stale**, not merged. This doc preserves the parts worth keeping so they aren't lost with the branch.

## Why #279 was closed instead of merged

- It branched **2026-05-19**, *before* the **2026-05-20 stability revert** (`bdf8315c` "roll back to a75aa2b9 — last stable build"), which was a deliberate product call after stacked regressions.
- `main` then moved substantially: Safety v1 (#280), Ghosted boo-first (#281–283), the photo grid (#285), the geo coalescer, the cron fix (#286), governance (#287).
- Rebasing #279's 8 commits onto today's `main` produces a **deep conflict on `src/pages/Safety.jsx`** — not a placement tweak but two entirely different Safety-page implementations. Taking #279's side would roll the live Safety page back to its pre-revert design on the most safety-critical screen.
- It also relies on a `z-fab` class that doesn't exist on `main` (it was introduced in #279's tokens), so its FAB markup is a no-op without the rest of the branch.

Conclusion: reconciling 6 migrated surfaces against a `main` that reverted underneath the branch is **more rework than rebuild**. The design-system reset deserves a fresh branch off current `main`, scoped properly — not a struggle-rebase. This doc keeps the portable pieces.

## What was already extracted separately

- **SafetyFAB top-right placement** — the one piece with a live decision behind it (beacon-sheet + radio-mini-player collision) — is shipped as its own small PR off current `main`, using `main`'s real `z-[150]` (not `z-fab`). It does **not** depend on #279.

## Salvage assessment — what to re-derive in a future design-system pass

| Item (on #279) | Value | Recommendation |
|---|---|---|
| `src/styles/tokens.css` (full, below) | High, portable | **Re-derive first.** The token set is the foundation; the z-index scale alone fixes the FAB/sheet/modal collision class. |
| `src/lib/tokens.ts`, `src/lib/motionTokens.ts` | High | Re-derive alongside the CSS (JS mirrors for inline-style consumers). |
| Z-index scale (`--z-fab:60 … --z-emergency:200`) | High | Adopt + wire to `src/lib/layerSystem.ts`; replace arbitrary `z-[NNN]` usages. Directly prevents collisions like the SOS-FAB-vs-beacon-sheet one. |
| `useDiscreetMode.ts` | Medium, standalone | Cherry-pickable cleanly (localStorage privacy toggle); pairs with the Pulse member-dot work. |
| `CookieBanner.tsx` z-index fix | Medium | Re-derive — it's a real fix (cookie banner overlapping the SOS shield). |
| `.pulse-dot--active/recent/inactive` + reduced-motion CSS (below) | Medium | Forward-compatible primitives for member-dot rendering when PulseMode ships members. |
| `public/imagery/placeholder/*.svg` (4 files) | Low | Keep if useful; 1:1 swap when the Drive placement matrix lands. |
| 8 primitives (`src/components/system/*`: Button, Card, Heading, Body, Pill, Fab, Sheet, Toast) | Medium–High | Re-derive in the fresh pass **on top of** the tokens — not piecemeal. |
| 6 surface migrations (`Auth, Globe, Music, Profile, Radio, Safety`) | Risky | **Do not re-apply from #279.** These are the stale/conflicting part. Re-migrate against current `main` when doing the design-system pass. |
| `SilentSOSButton.jsx` "CHANNEL chip" fix | **Ship now** | **Confirmed still broken on current `main`** (line 141 `channel: a.channel \|\| 'channel'` → line 241 renders the literal text "channel" for a channel-less delivery attempt). #279's "drop the row" fix never reached `main`. File as a tiny Sprint 1 PR alongside the FAB placement: filter delivery attempts to those with a real, known channel. |

## Preserved: `src/styles/tokens.css` (canonical token set, v2.0)

```css
/* src/styles/tokens.css
 * HOTMESS Design System — canonical tokens
 * Version: 2.0 (2026-05-19 design system reset)
 */

:root {
  /* COLOR — Base */
  --c-bg:           #050507;
  --c-bg-elevated:  #0D0D0D;
  --c-surface-1:    rgba(255,255,255,0.05);
  --c-surface-2:    rgba(255,255,255,0.08);
  --c-surface-3:    rgba(255,255,255,0.12);
  --c-text-1:       rgba(255,255,255,0.95);
  --c-text-2:       rgba(255,255,255,0.70);
  --c-text-3:       rgba(255,255,255,0.45);
  --c-text-disabled:rgba(255,255,255,0.25);
  --c-border-1:     rgba(255,255,255,0.08);
  --c-border-2:     rgba(255,255,255,0.14);
  --c-border-strong:rgba(255,255,255,0.22);

  /* COLOR — Brand (one gold) */
  --c-brand:        #C8962C;
  --c-brand-hover:  #D4A84B;
  --c-brand-pressed:#9A7020;
  --c-brand-tint:   rgba(200,150,44,0.12);
  --c-brand-tint-2: rgba(200,150,44,0.20);
  --c-brand-glow:   rgba(200,150,44,0.35);

  /* COLOR — Semantic */
  --c-signal:        #30D158;            /* live / online / delivered */
  --c-signal-tint:   rgba(48,209,88,0.12);
  --c-signal-tint-2: rgba(48,209,88,0.22);
  --hotmess-safety:        #5BC8D0;      /* Safety Hub accent — distinct from signal */
  --hotmess-safety-tint:   rgba(91,200,208,0.12);
  --hotmess-safety-tint-2: rgba(91,200,208,0.22);
  --c-warn:          #FFB800;
  --c-warn-tint:     rgba(255,184,0,0.12);
  --c-emergency:     #FF3B30;            /* SOS / critical ONLY */
  --c-emergency-tint:rgba(255,59,48,0.12);
  --c-emergency-tint-2:rgba(255,59,48,0.22);
  --c-destructive:   #E0524F;            /* form/delete — NOT emergency */

  /* TYPOGRAPHY */
  --ff-display: 'Oswald','Bebas Neue',system-ui,-apple-system,sans-serif;
  --ff-mono:    'Space Mono','SF Mono',Menlo,Monaco,Consolas,monospace;
  --ff-body:    var(--ff-mono);
  --fs-micro:10px; --fs-small:12px; --fs-body:14px; --fs-body-lg:16px;
  --fs-h3:20px; --fs-h2:24px; --fs-h1:32px; --fs-hero:42px; --fs-cinematic:56px;
  --lh-tight:1.10; --lh-snug:1.25; --lh-base:1.45; --lh-loose:1.60;
  --fw-regular:400; --fw-medium:500; --fw-bold:700;
  --tr-tight:-0.01em; --tr-normal:0; --tr-loose:0.05em; --tr-display:0.15em; --tr-micro:0.20em;

  /* SPACING (4px base) */
  --sp-0:0; --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:20px;
  --sp-6:24px; --sp-7:32px; --sp-8:40px; --sp-9:48px; --sp-10:64px;

  /* RADIUS */
  --r-xs:4px; --r-sm:8px; --r-md:12px; --r-lg:16px; --r-xl:24px; --r-pill:9999px; --r-sheet:28px;

  /* SHADOW */
  --sh-soft:0 8px 24px rgba(0,0,0,0.35);
  --sh-strong:0 16px 48px rgba(0,0,0,0.55);
  --sh-brand-glow:0 0 20px var(--c-brand-glow);
  --sh-brand-glow-lg:0 0 36px var(--c-brand-glow),0 0 64px rgba(200,150,44,0.18);
  --sh-emergency-glow:0 0 24px rgba(255,59,48,0.45);

  /* MOTION */
  --dur-micro:80ms; --dur-fast:150ms; --dur-normal:250ms; --dur-sheet:320ms;
  --dur-page:380ms; --dur-modal:280ms; --dur-camera:600ms;
  --ease-ui:cubic-bezier(0.25,0.10,0.25,1.00);
  --ease-enter:cubic-bezier(0.00,0.00,0.20,1.00);
  --ease-exit:cubic-bezier(0.40,0.00,1.00,1.00);
  --ease-spring:cubic-bezier(0.20,0.80,0.20,1.00);

  /* LAYOUT */
  --dock-h:64px; --topbar-h:52px;
  --safe-top:env(safe-area-inset-top); --safe-bottom:env(safe-area-inset-bottom);
  --safe-left:env(safe-area-inset-left); --safe-right:env(safe-area-inset-right);

  /* Z-INDEX SCALE — single source of truth (mirror of src/lib/layerSystem.ts) */
  --z-base:0; --z-content:10; --z-globe-hud:40; --z-dock:50; --z-fab:60;
  --z-sheet:80; --z-modal:100; --z-toast:110; --z-cookie:115;
  --z-interrupt:120; --z-emergency:200; --z-debug:999;

  /* BLUR */
  --blur-1:10px; --blur-2:18px; --blur-3:28px;
}

/* Base type, .h-display / .h-micro utilities, safe-area helpers, .touch-target
   (44px min), and a global prefers-reduced-motion block are also defined in the
   original file. */

/* PULSE member-dot semantics (forward-compatible; wire when PulseMode renders members) */
@keyframes pulse-active-dot { 0%{opacity:.6} 50%{opacity:1} 100%{opacity:.6} }
.pulse-dot--active   { animation: pulse-active-dot 1.5s ease-in-out infinite; }
.pulse-dot--recent   { opacity: 1; }
.pulse-dot--inactive { opacity: .4; } /* hollow: consumer sets transparent fill + 1px border */
@media (prefers-reduced-motion: reduce) { .pulse-dot--active { animation:none; opacity:.9; } }
```

> Full original (incl. base-type globals and the complete reduced-motion block) is in the closed PR #279 at `src/styles/tokens.css`, commit `78d06a36`, if a byte-exact copy is ever needed.
