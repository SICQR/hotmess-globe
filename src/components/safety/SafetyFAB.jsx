/**
 * SafetyFAB - Floating safety button
 *
 * Calm idle state. Long-press (1.5s) → fake call (The Exit). Long-press (3s)
 * → stealth wipe (The Disappear). Short tap opens compact menu: Fake Call,
 * Check-in Timer, Safety Hub.
 *
 * Does NOT duplicate the full SOSOverlay — just provides the trigger.
 *
 * Route guard (Phil v1.0 — 2026-05-20):
 *   The FAB hides itself on /safety. That page has its own dedicated SOS
 *   hold-to-fire surface (the big 168×168 gold ring); two SOS controls with
 *   different gesture logic on the same screen creates danger/confusion.
 *   ONE PAGE, ONE SOS SURFACE, ONE MENTAL MODEL.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Phone, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTonightModeContext } from '@/hooks/useTonightMode';
import FakeCallGenerator from '@/components/safety/FakeCallGenerator';
import CheckInTimerModal from '@/components/safety/CheckInTimerModal';
import { useCheckinTimer } from '@/contexts/CheckinTimerContext';
import { useSOSContext } from '@/contexts/SOSContext';

/**
 * Inner FAB — unchanged from prior behaviour. The default export wraps this
 * with a route guard so it doesn't render on /safety.
 */
function SafetyFABInner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [showCheckinTimer, setShowCheckinTimer] = useState(false);
  const tonightMode = useTonightModeContext();
  const { isActive: timerActive, secondsLeft } = useCheckinTimer();
  console.log('[SafetyFAB] timerActive:', timerActive);

  const isTonight = tonightMode?.isTonight ?? false;

  // ── Invisible Gestures Logic ──────────────────────────────────────────────
  const { triggerTheExit, triggerTheDisappear } = useSOSContext();

  const HOLD_EXIT_MS = 1500;
  const HOLD_DISAPPEAR_MS = 3000;
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdStartRef = useRef(null);
  const rafRef = useRef(null);
  const thresholdReachedRef = useRef({ exit: false, disappear: false });

  // Tap opens the compact safety menu only. SOS dispatch must stay behind
  // explicit hold/confirm/cancel flows; no repeated-tap panic triggers.
  const handleTap = useCallback(() => {
    console.log('[SafetyFAB] Shield tapped — opening safety menu');
    setIsExpanded(prev => !prev);
    try { if (navigator?.vibrate) navigator.vibrate(35); } catch {}
  }, []);

  const startHold = useCallback(() => {
    holdStartRef.current = performance.now();
    setIsHolding(true);
    setHoldProgress(0);

    const tick = () => {
      if (!holdStartRef.current) return;
      const elapsed = performance.now() - holdStartRef.current;

      // Haptic signals at thresholds
      if (elapsed >= HOLD_EXIT_MS && !thresholdReachedRef.current.exit) {
        if (navigator?.vibrate) navigator.vibrate(50);
        thresholdReachedRef.current.exit = true;
      }
      if (elapsed >= HOLD_DISAPPEAR_MS && !thresholdReachedRef.current.disappear) {
        if (navigator?.vibrate) navigator.vibrate([100, 50, 100]);
        thresholdReachedRef.current.disappear = true;
      }

      // Calculate progress based on the longest hold (Disappear)
      const pct = Math.min((elapsed / HOLD_DISAPPEAR_MS) * 100, 100);
      setHoldProgress(pct);

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const cancelHold = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const elapsed = holdStartRef.current ? performance.now() - holdStartRef.current : 0;
    holdStartRef.current = null;
    thresholdReachedRef.current = { exit: false, disappear: false };
    setIsHolding(false);
    setHoldProgress(0);

    // 1. Short tap (< 300ms) → open/close safety menu only.
    // Never dispatch SOS from repeated taps.
    if (elapsed < 300) {
      handleTap();
      return;
    }

    // 2. The Exit (1.5s)
    if (elapsed >= HOLD_EXIT_MS && elapsed < HOLD_DISAPPEAR_MS) {
      if (navigator?.vibrate) navigator.vibrate(100);
      triggerTheExit();
    }
    // 3. The Disappear (3s+)
    else if (elapsed >= HOLD_DISAPPEAR_MS) {
      triggerTheDisappear();
    }
  }, [handleTap, triggerTheExit, triggerTheDisappear]);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Close menu on outside tap
  useEffect(() => {
    if (!isExpanded) return;
    const close = () => setIsExpanded(false);
    const timer = setTimeout(() => document.addEventListener('click', close, { once: true }), 100);
    return () => { clearTimeout(timer); document.removeEventListener('click', close); };
  }, [isExpanded]);

  return (
    <>
      {/* FAB + menu */}
      <div className="fixed z-[150] bottom-24 left-6">
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-14 left-0 bg-[#1C1C1E] border border-white/10 rounded-xl p-2 min-w-[180px] shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-0.5">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white/80 hover:bg-white/5 hover:text-white h-10 text-sm"
                  onClick={() => { setShowFakeCall(true); setIsExpanded(false); }}
                >
                  <Phone className="w-4 h-4 mr-2.5 text-[#00C2E0]" />
                  Fake Call
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start h-10 text-sm ${timerActive
                    ? 'text-[#00C2E0] bg-[#00C2E0]/5'
                    : 'text-white/80 hover:bg-white/5 hover:text-white'
                    }`}
                  onClick={() => { setShowCheckinTimer(true); setIsExpanded(false); }}
                >
                  <Clock className="w-4 h-4 mr-2.5 text-[#00C2E0]" />
                  {timerActive
                    ? `Check-in · ${Math.floor(secondsLeft / 60)}m`
                    : 'Check-in Timer'}
                </Button>
                <div className="h-px bg-white/5 my-1" />
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white/50 hover:bg-white/5 hover:text-white/70 h-10 text-sm"
                  asChild
                >
                  <a href="/safety">
                    <Shield className="w-4 h-4 mr-2.5 text-white/30" />
                    Safety Hub
                  </a>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative">
          <Button
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
            className={`relative z-10 rounded-full w-12 h-12 shadow-md transition-all select-none bg-[#1C1C1E] ${
              timerActive
                ? 'border border-[#00C2E0]/30'
                : 'border border-white/10'
              }`}
            aria-label="Open safety menu"
          >
            <Shield className={`w-5 h-5 ${
              timerActive
                ? 'text-[#00C2E0]/70'
                : 'text-white/40'
              }`} />
          </Button>

          {/* Active timer ring — visible */}
          {timerActive && !isHolding && (
            <motion.div
              className="absolute -inset-2 rounded-full pointer-events-none z-0"
              style={{ border: '2px solid rgba(0,194,224,0.6)' }}
              animate={{ scale: [1, 1.4], opacity: [1, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </div>
      </div>

      {/* Fake Call Overlay */}
      <AnimatePresence>
        {showFakeCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[190] bg-black/70 backdrop-blur-md flex items-end justify-center pb-8 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowFakeCall(false); }}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-sm"
            >
              <FakeCallGenerator onClose={() => setShowFakeCall(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Check-in Timer Modal */}
      <CheckInTimerModal
        isOpen={showCheckinTimer}
        onClose={() => setShowCheckinTimer(false)}
      />
    </>
  );
}

/**
 * Default export — route-guarded wrapper. Renders the FAB everywhere EXCEPT
 * /safety, where the page has its own dedicated SOS surface and a second
 * floating control would create two competing SOS interactions.
 */
export default function SafetyFAB() {
  const { pathname } = useLocation();
  if (pathname === '/safety' || pathname.startsWith('/safety/')) {
    return null;
  }
  return <SafetyFABInner />;
}
