import { useState, useEffect, useRef, type RefObject } from 'react';

const THRESHOLD = 120;

interface UsePullToRefreshOptions {
  disabled?: boolean;
  onRefresh?: () => void | Promise<void>;
  scrollRef?: RefObject<HTMLElement | null>;
}

function shouldIgnorePullToRefresh(target: HTMLElement | null) {
  let check = target;
  while (check && check !== document.body) {
    if (check.hasAttribute('data-pull-refresh-ignore')) return true;
    if (check.hasAttribute('data-globe-interactive')) return true;

    const style = window.getComputedStyle(check);
    const isFixed = style.position === 'fixed' || style.position === 'absolute';
    const zIndex = parseInt(style.zIndex, 10);
    if (isFixed && zIndex >= 50) return true;

    if (check.hasAttribute('data-sheet') || check.getAttribute('role') === 'dialog') return true;
    if (check.scrollTop > 0) return true;

    check = check.parentElement as HTMLElement;
  }
  return false;
}

export function usePullToRefresh(options: UsePullToRefreshOptions = {}) {
  const { disabled = false, onRefresh } = options;
  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const startY = useRef(0);
  const currentY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (disabled) return;
      const target = e.target as HTMLElement | null;
      if (shouldIgnorePullToRefresh(target)) return;

      if (window.scrollY <= 0) {
        startY.current = e.touches[0].pageY;
        currentY.current = startY.current;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;
      currentY.current = e.touches[0].pageY;
      const diff = currentY.current - startY.current;

      if (diff > 0) {
        if (e.cancelable) e.preventDefault();
        setPullProgress(Math.min(diff / THRESHOLD, 1.2));
      } else {
        setPullProgress(0);
        isPulling.current = false;
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling.current) return;
      const diff = currentY.current - startY.current;

      if (diff >= THRESHOLD) {
        setIsRefreshing(true);
        setPullProgress(1);

        if (onRefreshRef.current) {
          Promise.resolve(onRefreshRef.current())
            .catch(() => {})
            .finally(() => {
              setIsRefreshing(false);
              setPullProgress(0);
            });
        } else {
          setTimeout(() => { window.location.reload(); }, 800);
        }
      } else {
        setPullProgress(0);
      }

      isPulling.current = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isRefreshing, disabled]);

  return {
    pullProgress,
    pullDistance: pullProgress * THRESHOLD,
    isRefreshing,
    handlers: {} as Record<string, never>,
  };
}
