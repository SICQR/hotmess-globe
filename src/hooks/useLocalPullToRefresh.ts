import { useState, useCallback, useRef, useEffect } from 'react';

interface UseLocalPullToRefreshOptions {
  onRefresh: () => Promise<void>;
  scrollRef: React.RefObject<HTMLElement>;
}

/**
 * useLocalPullToRefresh — Local gesture for specific containers (e.g. Sheets)
 * 
 * Prevents the global OS-level refresh from triggering by stopping propagation.
 */
export function useLocalPullToRefresh({ onRefresh, scrollRef }: UseLocalPullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const startY = useRef(0);
  const isPulling = useRef(false);
  const THRESHOLD = 80;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at the top of the local container
      if (el.scrollTop <= 0) {
        startY.current = e.touches[0].pageY;
        isPulling.current = true;
        // Stop propagation so global usePullToRefresh doesn't see this gesture
        e.stopPropagation();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const currentY = e.touches[0].pageY;
      const diff = currentY - startY.current;

      if (diff > 0 && el.scrollTop <= 0) {
        // Stop propagation so global usePullToRefresh doesn't see this gesture
        e.stopPropagation();
        
        // Prevent default browser behavior (bouncing)
        if (e.cancelable) e.preventDefault();

        // Resistance formula
        const distance = Math.pow(diff, 0.85);
        setPullDistance(Math.min(distance, 120));
      } else {
        isPulling.current = false;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isPulling.current) return;
      
      if (pullDistance >= THRESHOLD) {
        setIsRefreshing(true);
        setPullDistance(THRESHOLD);
        
        onRefresh().finally(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        });
      } else {
        setPullDistance(0);
      }
      
      isPulling.current = false;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, scrollRef, isRefreshing, pullDistance]);

  return { pullDistance, isRefreshing };
}
