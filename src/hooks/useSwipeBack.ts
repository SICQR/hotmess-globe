/**
 * useSwipeBack — iOS-style edge swipe to go back.
 *
 * Detects a right-swipe starting from the left 20px edge of the screen.
 * If the swipe distance exceeds the threshold, calls `history.back()`.
 * The hook is passive — it won't conflict with horizontal scroll containers
 * because it only activates from the very left edge.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const EDGE_WIDTH = 24;   // px from left edge
const THRESHOLD = 80;    // px swipe distance to trigger back
const MAX_Y_DRIFT = 60;  // px vertical drift tolerance

export function useSwipeBack() {
  const navigate = useNavigate();
  const touchRef = useRef<{ startX: number; startY: number; active: boolean }>({
    startX: 0,
    startY: 0,
    active: false,
  });

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch.clientX <= EDGE_WIDTH) {
        touchRef.current = { startX: touch.clientX, startY: touch.clientY, active: true };
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchRef.current.active) return;
      touchRef.current.active = false;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchRef.current.startX;
      const dy = Math.abs(touch.clientY - touchRef.current.startY);

      if (dx >= THRESHOLD && dy <= MAX_Y_DRIFT) {
        navigate(-1);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [navigate]);
}

export default useSwipeBack;
