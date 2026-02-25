import { useCallback, useRef } from 'react';

export function useLongPress(onLongPress: () => void, ms = 600) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    timer.current = setTimeout(onLongPress, ms);
  }, [onLongPress, ms]);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
  };
}
