/**
 * killNativePullToRefresh — Phil 2026-05-31 P0
 *
 * Background: iOS Safari and Chrome on Android both fire a NATIVE
 * pull-to-refresh when the user drags downward at the top of a
 * scrollable surface — even when html/body have
 * overscroll-behavior-y: contain set. The CSS contract is honoured for
 * the bubble chain but the browser's PTR gesture is a separate window
 * level handler that fires before our overscroll-behavior can block it.
 *
 * The only reliable cross-browser cure is a document-level touchmove
 * listener registered with `{ passive: false }` that preventDefault()s
 * downward gestures when the touch chain is at the top of all
 * scrollable ancestors.
 *
 * Inner-page custom PTR (e.g. useLocalPullToRefresh) is preserved
 * because that hook calls e.stopPropagation() inside its own touchmove
 * handler, which terminates bubble before this document listener
 * receives the event.
 *
 * Idempotent. Safe to call multiple times.
 */

const INSTALLED_KEY = '__hm_kill_native_ptr_installed__';

declare global {
  interface Window {
    [INSTALLED_KEY]?: boolean;
  }
}

export function killNativePullToRefresh(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window[INSTALLED_KEY]) return;
  window[INSTALLED_KEY] = true;

  let touchStartY = 0;
  let shouldPrevent = false;

  function isScrollAtTopOfAllAncestors(target: EventTarget | null): boolean {
    let el = target as HTMLElement | null;
    while (el && el !== document.body && el !== document.documentElement) {
      // Honour an explicit opt-out: any element with data-allow-ptr lets
      // the browser's native PTR through (useful for diagnostic pages).
      if (el.dataset?.allowPtr !== undefined) return false;
      const cs = getComputedStyle(el);
      const oy = cs.overflowY;
      if (oy === 'auto' || oy === 'scroll') {
        if (el.scrollTop > 0) return false;
      }
      el = el.parentElement;
    }
    return true;
  }

  document.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        shouldPrevent = false;
        return;
      }
      touchStartY = e.touches[0].clientY;
      shouldPrevent = isScrollAtTopOfAllAncestors(e.target);
    },
    { passive: true },
  );

  document.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (!shouldPrevent || e.touches.length !== 1) return;
      const dy = e.touches[0].clientY - touchStartY;
      // Downward pull at the top of the entire scroll chain → kill PTR.
      if (dy > 0 && e.cancelable) {
        e.preventDefault();
      }
    },
    { passive: false },
  );

  document.addEventListener(
    'touchend',
    () => {
      shouldPrevent = false;
    },
    { passive: true },
  );

  document.addEventListener(
    'touchcancel',
    () => {
      shouldPrevent = false;
    },
    { passive: true },
  );
}

export default killNativePullToRefresh;
