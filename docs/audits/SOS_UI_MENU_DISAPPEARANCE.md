# SOS UI menu disappearance — investigation (no fix)

**Date:** 2026-05-20 · **Component:** `src/components/safety/SafetyFAB.jsx` · **Status:** investigation only, awaiting Phil review.

## Summary

The Safety FAB menu (Fake Call / Check-in Timer / SOS) closes unexpectedly on certain desktop cursor paths between the shield badge and a menu item. Root cause is a global document-level click-to-close listener combined with a positioning gap between the FAB button and the floating menu — not a hover-intent bug (there is no hover logic at all).

## Reproduction

1. Desktop browser (mouse, not touch). Any route except `/safety` (FAB is hidden on `/safety`).
2. Tap the shield FAB (bottom-left, `fixed bottom-24 left-6`). Menu opens upward (`absolute bottom-14 left-0`).
3. Move the cursor from the shield toward the SOS item.
   - **Path that KEEPS it open:** cursor travels straight up onto the menu panel and the first click lands inside the panel (the panel has `onClick={e => e.stopPropagation()}`).
   - **Path that CLOSES it:** the cursor crosses the ~8px gap between the top of the FAB and the bottom of the menu panel, and a click registers on the document there (or anywhere outside the panel). The menu collapses before the SOS item is reached.

## Mechanism (code references)

- `SafetyFAB.jsx:22` — `isExpanded` is a click toggle (`setIsExpanded(prev => !prev)` at line 48). There is **no** `onMouseEnter`/`onMouseLeave`/`onFocus`/`onBlur` anywhere. The menu is not hover-driven.
- `SafetyFAB.jsx:111-116` — outside-click close:
  ```js
  useEffect(() => {
    if (!isExpanded) return;
    const close = () => setIsExpanded(false);
    const timer = setTimeout(() => document.addEventListener('click', close, { once: true }), 100);
    return () => { clearTimeout(timer); document.removeEventListener('click', close); };
  }, [isExpanded]);
  ```
  This registers a one-shot `click` listener on `document` 100ms after open. **Any** click outside the panel — including in the dead gap between the FAB and the menu — fires `close`.
- `SafetyFAB.jsx:130` — the panel stops propagation (`onClick={e => e.stopPropagation()}`), which is why clicks *inside* the panel are safe. The gap between FAB and panel is not covered by either element, so a click there bubbles to `document` and closes the menu.

## Root-cause hypothesis (no fix applied)

Primary: the dead zone between the FAB (`bottom-24`) and the menu panel (`bottom-14` within the FAB's relative wrapper) is not part of the panel's hit area, so a pointer-up there is treated as an outside click. Combined with the `{ once: true }` global listener, a single stray click on that path collapses the menu.

Secondary: the 100ms `setTimeout` before attaching the listener is a race guard against the opening tap; it does not address the gap problem.

## Likely fix directions (for Phil to choose later — NOT implemented)

1. Wrap the FAB button + menu in a single relatively-positioned container and attach the outside-click check to that container (`if (!containerRef.current.contains(e.target)) close()`), instead of a blanket document listener. Removes the gap-click false positive.
2. Bridge the visual gap with an invisible hit area (or set the menu flush to the FAB) so there is no uncovered path.
3. If hover-to-keep-open is the intended desktop UX, add `onMouseLeave`-with-delay on the container — but that conflicts with the touch model; recommend ref-based containment (option 1) as the cross-input-safe fix.

## Touch impact

Not affected. On touch there is no "cursor path"; tap-to-open then tap-the-item works because the item tap lands inside the panel (stopPropagation). This is a desktop-pointer-only defect.

## Recommendation

Option 1 (ref-based containment) is the minimal, cross-input-safe fix. Hold for Phil sign-off before implementing — per sprint brief, investigation only.
