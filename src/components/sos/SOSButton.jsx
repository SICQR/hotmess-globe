import { useState, useCallback, useRef, useEffect } from 'react';
import { usePulse } from '@/contexts/PulseContext';
import { cn } from '@/lib/utils';
import { AlertTriangle, Phone, X } from 'lucide-react';

/**
 * SOS Button
 * Long-press activated emergency button
 *
 * Behaviour:
 * - UI freezes
 * - Globe earthquake
 * - Local radius only alerted
 * - Care routes unlocked
 * - No user identity exposed
 */

const HOLD_DURATION_MS = 2000;

  // ── Invisible Gestures Logic ──────────────────────────────────────────────
  const { triggerSOS, triggerTheExit } = useSOSContext();
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef(null);

  const HOLD_DURATION_MS = 2000;
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const startRef = useRef(null);
  const timerRef = useRef(null);

  const handleTap = useCallback(() => {
    setTapCount(prev => {
      const next = prev + 1;
      if (next === 3) {
        if (navigator?.vibrate) navigator.vibrate([50, 30, 50]);
        triggerSOS({ silent: true });
        return 0;
      }
      return next;
    });
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => setTapCount(0), 400);
  }, [triggerSOS]);

  const startHold = useCallback(() => {
    setIsHolding(true);
    startRef.current = Date.now();

    timerRef.current = requestAnimationFrame(function tick() {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(1, elapsed / HOLD_DURATION_MS);
      setProgress(pct);

      if (pct >= 1) {
        // Triggered
        setIsHolding(false);
        setProgress(0);
        startRef.current = null;
        if (navigator?.vibrate) navigator.vibrate(100);
        triggerTheExit();
      } else if (startRef.current) {
        timerRef.current = requestAnimationFrame(tick);
      }
    });
  }, [triggerTheExit]);

  const endHold = useCallback(() => {
    const elapsed = startRef.current ? Date.now() - startRef.current : 0;
    setIsHolding(false);
    setProgress(0);
    startRef.current = null;
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
    }

    if (elapsed < 300) {
      handleTap();
      onTrigger?.();
    }
  }, [handleTap, onTrigger]);

  useEffect(() => {
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={endHold}
      onMouseLeave={endHold}
      onTouchStart={startHold}
      onTouchEnd={endHold}
      className={cn(
        'relative w-10 h-10 rounded-full flex items-center justify-center transition-all',
        'bg-white/5 border border-white/10 hover:bg-white/10',
        className
      )}
    >
      <AlertTriangle
        size={16}
        className={cn(
          'relative z-10 transition-colors text-white/40'
        )}
      />
    </button>
  );
}

export default SOSButton;
