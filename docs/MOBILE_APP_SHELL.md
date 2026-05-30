# MOBILE_APP_SHELL.md — Stage 6 Mobile-First App Shell

**Created:** Stage 6 Stabilization
**Status:** ✅ Verified (existing implementation is sound)

---

## Viewport Handling

### Dynamic Viewport Height (Correct)
- App.jsx uses `h-dvh` for dynamic viewport height
- OSShell.tsx uses `h-dvh` for OS shell container
- PublicShell.jsx uses `min-h-screen` (fallback for older browsers)

### Safe Area Support (Correct)
- BottomNav: `pb-[env(safe-area-inset-bottom)]`
- Layout header: `pt-[env(safe-area-inset-top)]`
- L2SheetContainer: `h-[env(safe-area-inset-bottom)]` spacer
- index.css: full safe-area padding on body

---

## Z-Index Layers (Correct)

| Layer | Z-Index | Purpose |
|-------|---------|---------|
| L0 Globe | z-0 | Persistent background |
| L1 Content | z-10-40 | Page content |
| L1 Navigation | z-50 | Top bar, bottom nav |
| L2 Sheets | z-80 | Overlay sheets |
| L3 Interrupts | z-100 | Blocking modals |

---

## Bottom Navigation (Correct)
- Fixed to bottom: `fixed bottom-0 left-0 right-0`
- High z-index: `z-50`
- Backdrop blur: `bg-black/95 backdrop-blur-xl`
- Safe area: `pb-[env(safe-area-inset-bottom)]`

---

## Scroll Handling

### Page Containers
Most pages use `min-h-screen` which allows content to scroll naturally.
Pages with specific scroll requirements use:
- `overflow-hidden` on containers
- `overflow-y-auto` on content areas
- `max-h-[calc(100vh-Xpx)]` for bounded scroll areas

### Potential Issues (Not Critical)
1. Some pages use `100vh` instead of `100svh` - works but not optimal
2. Some modal scroll areas may need `overscroll-behavior-contain`

---

## Stage 6 Gates

- [x] Viewport uses dynamic units (dvh/svh) — OSArchitecture uses h-dvh
- [x] Safe area support — All edges handled
- [x] Bottom nav stable — Fixed with safe-area padding
- [x] No nested scroll traps — Verified structure
- [x] Z-index layering correct — Documented

---

## Recommendations (Future)

1. **Consistent Viewport Units**: Migrate `min-h-screen` to `min-h-[100dvh]` where appropriate
2. **Scroll Container Isolation**: Add `overscroll-behavior-contain` to modal content
3. **Touch Target Sizing**: Ensure all tap targets ≥ 44x44px

These are polish items, not blockers for MVP.

---

## Verification Commands

```bash
# Find viewport usage
rg "dvh|svh|100vh|min-h-screen" -n src | head -30

# Find safe-area usage
rg "safe-area" -n src

# Find z-index patterns
rg "z-\[?[0-9]" -n src | head -30
```
