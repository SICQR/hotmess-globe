import { useCallback, useRef, useState } from 'react';

export type UseLongPressOptions = {
  delayMs?: number;
  moveThresholdPx?: number;
};

export function useLongPress({ delayMs = 300, moveThresholdPx = 10 }: UseLongPressOptions = {}) {
  const timerIdRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [isLongPressActive, setIsLongPressActive] = useState(false);
  const [didLongPress, setDidLongPress] = useState(false);

  const clearTimer = useCallback(() => {
    if (timerIdRef.current !== null) {
      window.clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') return;

      startRef.current = { x: e.clientX, y: e.clientY };
      setIsLongPressActive(false);
      setDidLongPress(false);
      clearTimer();

      timerIdRef.current = window.setTimeout(() => {
        setIsLongPressActive(true);
        setDidLongPress(true);
      }, delayMs);
    },
    [clearTimer, delayMs]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current) return;
      if (isLongPressActive) return;

      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      if (Math.hypot(dx, dy) > moveThresholdPx) {
        clearTimer();
        startRef.current = null;
      }
    },
    [clearTimer, isLongPressActive, moveThresholdPx]
  );

  const end = useCallback(() => {
    clearTimer();
    startRef.current = null;
    setIsLongPressActive(false);
  }, [clearTimer]);

  const onPointerUp = useCallback(() => end(), [end]);
  const onPointerCancel = useCallback(() => end(), [end]);
  const onPointerLeave = useCallback(() => end(), [end]);

  return {
    isLongPressActive,
    didLongPress,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onPointerLeave,
    },
  };
}
