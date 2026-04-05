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

export function SOSButton({ className, onTrigger }) {
  const { tremor } = usePulse();
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isTriggered, setIsTriggered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(() => {
    try {
      return localStorage.getItem('hm_sos_seen') !== 'true';
    } catch {
      return true;
    }
  });
  const timerRef = useRef(null);
  const startRef = useRef(null);

  const startHold = useCallback(() => {
    if (isTriggered) return;

    if (showTooltip) {
      setShowTooltip(false);
      try {
        localStorage.setItem('hm_sos_seen', 'true');
      } catch {}
    }

    setIsHolding(true);
    startRef.current = Date.now();

    timerRef.current = requestAnimationFrame(function tick() {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(1, elapsed / HOLD_DURATION_MS);
      setProgress(pct);

      if (pct >= 1) {
        // Triggered
        setIsTriggered(true);
        setIsHolding(false);
        tremor({ local: true });
        onTrigger?.();
      } else if (startRef.current) {
        timerRef.current = requestAnimationFrame(tick);
      }
    });
  }, [isTriggered, tremor, onTrigger, showTooltip]);

  const endHold = useCallback(() => {
    setIsHolding(false);
    setProgress(0);
    startRef.current = null;
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!showTooltip) return;
    const timer = setTimeout(() => {
      setShowTooltip(false);
      try {
        localStorage.setItem('hm_sos_seen', 'true');
      } catch {}
    }, 5000);
    return () => clearTimeout(timer);
  }, [showTooltip]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, []);

  // When an external onTrigger is provided, defer the emergency UI to the caller.
  // Only show internal DistressModal when used standalone (no external handler).
  if (isTriggered && !onTrigger) {
    return <DistressModal onClose={() => setIsTriggered(false)} />;
  }

  return (
    <>
      {showTooltip && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 bg-black/90 border border-white/10 rounded-lg text-xs text-white font-semibold shadow-lg pointer-events-none z-10">
          Hold for SOS
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-black/90 border-r border-b border-white/10 rotate-45 -mt-1" />
        </div>
      )}
      <button
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={startHold}
        onTouchEnd={endHold}
        className={cn(
          'relative w-10 h-10 rounded-full flex items-center justify-center transition-all',
          isHolding
            ? 'bg-red-600 scale-110'
            : 'bg-red-600/30 border border-red-500/60 hover:bg-red-600/50',
          className
        )}
      >
        {/* Progress ring */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 40 40"
        >
          <circle
            cx="20"
            cy="20"
            r="17"
            fill="none"
            stroke="rgba(255,0,0,0.2)"
            strokeWidth="3"
          />
          <circle
            cx="20"
            cy="20"
            r="17"
            fill="none"
            stroke="#FF0000"
            strokeWidth="3"
            strokeDasharray={`${progress * 107} 107`}
            strokeLinecap="round"
            className="transition-all"
          />
        </svg>

        <AlertTriangle
          size={16}
          className={cn(
            'relative z-10 transition-colors',
            isHolding ? 'text-white' : 'text-red-500'
          )}
        />
      </button>
    </>
  );
}

/**
 * Distress Modal
 * Emergency UI when SOS triggered
 */
export function DistressModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-6">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/40 hover:text-white"
      >
        <X size={24} />
      </button>

      {/* Main content */}
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
          <AlertTriangle size={40} className="text-red-500" />
        </div>

        <h2 className="text-2xl font-black text-white mb-2">
          You're not alone
        </h2>

        <p className="text-white/60 mb-8">
          We're here. Take a breath. Your location is private.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <a
            href="tel:999"
            className="flex items-center justify-center gap-3 w-full py-4 bg-red-500 text-white font-bold rounded-xl"
          >
            <Phone size={20} />
            Call Emergency (999)
          </a>

          <button
            onClick={() => { setShowDistress(false); window.location.href = '/care'; }}
            className="flex items-center justify-center gap-3 w-full py-4 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20"
          >
            Contact Hand N Hand
          </button>

          <button
            onClick={() => { setShowDistress(false); window.location.href = '/care#breathing'; }}
            className="flex items-center justify-center gap-3 w-full py-4 bg-white/5 text-white/60 rounded-xl hover:bg-white/10"
          >
            Grounding exercise
          </button>
        </div>

        {/* Privacy note */}
        <p className="mt-8 text-xs text-white/40">
          No one can see this screen. Your identity is protected.
        </p>
      </div>
    </div>
  );
}

export default SOSButton;
