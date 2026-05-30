# Agent B — Radio · Pulse FEED Button

**Bugs:** #8, #2
**Status:** RUNNING

---

## #8 Radio tab — stream, mini player, schedule

### Findings (2026-03-09)

**RadioMode.tsx** — ✅ WORKING
- Imports: All correct (`useRadio`, `useSheet`, `supabase`, lucide icons, framer-motion)
- Stream URL: Hardcoded in RadioContext.tsx as `STREAM_URL = 'https://listen.radioking.com/radio/736103/stream/802454'`
- Structure: Hero section (40min) → Now Playing card → Schedule strip (horiz scroll) → SoundCloud embed → RCR playlist → About
- Show open handler: Line 547-549 calls `openSheet('schedule', {})` → Full Schedule button wired correctly

**RadioContext.tsx** — ✅ WORKING
- Exports: `isPlaying`, `currentShowName`, `togglePlay`, `setCurrentShowName`, `audioRef`
- Audio element lifecycle: created once on mount, event listeners for play/pause/error
- Sound consent modal integration: hasConsent check before play
- STREAM_URL correct (RadioKing Icecast stream)

**RadioMiniPlayer.tsx** — ✅ WORKING
- Z-index: `z-40` (correct, sits between PulseMode HUD z-30 and OSBottomNav z-50)
- Position: `fixed bottom-[calc(env(safe-area-inset-bottom, 0px) + 64px)]` (above nav, iOS/Android safe)
- Hidden on /radio: Line 702 in App.jsx → `<RadioMiniPlayer hidden={onRadioRoute} />`
- Renders only when `isPlaying=true` and `hidden=false`

**SheetRouter.jsx** — ✅ REGISTERED
- Line 54: `const L2ScheduleSheet = lazy(() => import('./L2ScheduleSheet'));`
- Line 145-146: Registered under both `'schedule'` and `'show'` keys
- File exists: `/src/components/sheets/L2ScheduleSheet.jsx`

**No wiring issues found. Bug #8 is CLOSED.**

---

## #2 Pulse: Globe.jsx FEED button in L0 layer

### Findings (2026-03-09)

**Globe.jsx structure** — ANALYZED
- Rendered inside `UnifiedGlobe.tsx` (z-0 wrapper) when on /pulse or /globe routes
- EnhancedGlobe3D (Three.js canvas) is the full-screen background
- Globe.jsx adds UI overlay: top header controls (Line 625+) + bottom action buttons (Line 630+)
- FEED button location: Line 687 in absolute z-30 header (not z-0)

**Z-index hierarchy on /pulse:**
- L0: UnifiedGlobe wrapper (z-0) contains GlobePage which renders EnhancedGlobe3D canvas
- L0.5: GlobePage UI controls (z-30 in absolute header) — FEED button, Search, etc.
- L1: PulseMode HUD overlay (floats above, transparent bg) — renders at top level z-auto
- L2: OSBottomNav (z-50, fixed bottom) + RadioMiniPlayer (z-40, above nav)
- L3: Sheet stack (z-100) — L2 sheets
- Interrupts: IncomingCallBanner (z-180), SOSButton (z-190), SOSOverlay (z-200)

**Potential issue:** Globe.jsx buttons (z-30) sit between EnhancedGlobe3D canvas (z-0) and PulseMode (implicit z-auto).
- FEED button itself is NOT causing pointer-events collision (it's a button, clickable)
- BUT: If PulseMode is rendering over it, the FEED button is obscured or becomes unclickable

**PulseMode analysis:**
- No explicit z-index on its root container (implicit z-auto = z-0 in stacking context)
- PulseMode is positioned absolutely inside a relative container in App.jsx
- PulseMode content (HUD + drawer) floats above UnifiedGlobe (z-0)

**Root cause:** PulseMode's implicit z-index (z-auto, which = z-0) means it stacks WITH UnifiedGlobe at same level. Browser rendering order determines which wins. Since PulseMode mounts AFTER UnifiedGlobe in DOM, it wins painting order and covers FEED button.

**Fix:** Add explicit z-index to PulseMode to position it above UnifiedGlobe.

**No code changes needed yet** — awaiting confirmation from Phil whether FEED button should be:
1. Hidden on /pulse (removed entirely)
2. Re-positioned (moved to PulseMode HUD)
3. Z-indexed correctly to remain accessible

---

## Summary
- **#8 Radio:** All wiring confirmed working. No bugs detected.
- **#2 Pulse:** Globe.jsx FEED button visibility issue due to z-index stacking context. Recommend hiding on /pulse or adding z-index fix to PulseMode.
