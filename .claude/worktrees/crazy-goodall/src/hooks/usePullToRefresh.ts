/**
 * usePullToRefresh — Pull-down-to-refresh for scrollable containers
 *
 * Grindr / Instagram pattern: pull down past threshold → spinner → reload.
 * Requires a scroll container ref and a refresh callback.
 *
 * Returns:
 * - pullDistance: current pull distance (for animating spinner)
 * - isRefreshing: true while onRefresh promise is pending
 * - handlers: attach to the scroll container (onTouchStart, onTouchMove, onTouchEnd)
 */

import { useCallback, useRef, useState } from 'react';
import { hapticMedium } from '@/lib/haptics';

const THRESHOLD = 80; // px to pull before triggering refresh
const MAX_PULL = 120; // max visual distance

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  /** Ref to the scroll container element */
  scrollRef: React.RefObject<HTMLElement | null>;
  /** Whether pull-to-refresh is enabled (default true) */
  enabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  scrollRef,
  enabled = true,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const didTriggerHaptic = useRef(false);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || isRefreshing) return;
      const el = scrollRef.current;
      if (!el || el.scrollTop > 5) return; // only at top of scroll
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
      didTriggerHaptic.current = false;
    },
    [enabled, isRefreshing, scrollRef]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;
      const el = scrollRef.current;
      if (!el || el.scrollTop > 5) {
        isPulling.current = false;
        setPullDistance(0);
        return;
      }

      const delta = e.touches[0].clientY - startY.current;
      if (delta < 0) {
        setPullDistance(0);
        return;
      }

      // Rubber-band effect — diminishing returns past threshold
      const clamped = Math.min(delta * 0.5, MAX_PULL);
      setPullDistance(clamped);

      // Haptic when crossing threshold
      if (clamped >= THRESHOLD && !didTriggerHaptic.current) {
        didTriggerHaptic.current = true;
        hapticMedium();
      }
    },
    [isRefreshing, scrollRef]
  );

  const onTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD * 0.6); // Hold at spinner position
      try {
        await onRefresh();
      } catch {
        // swallow — caller handles errors
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  return {
    pullDistance,
    isRefreshing,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
