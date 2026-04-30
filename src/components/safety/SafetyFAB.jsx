/**
 * SafetyFAB - Floating safety button
 *
 * Calm idle state. Long-press (3s) triggers SOS overlay.
 * Short tap opens compact menu: Fake Call, Check-in Timer, Safety Hub.
 *
 * Does NOT duplicate the full SOSOverlay — just provides the trigger.
 * Emergency Mode overlay removed (SOS overlay is the canonical panic path).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Phone, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTonightModeContext } from '@/hooks/useTonightMode';
import FakeCallGenerator from '@/components/safety/FakeCallGenerator';
import CheckInTimerModal from '@/components/safety/CheckInTimerModal';
import { useCheckinTimer } from '@/contexts/CheckinTimerContext';
import { useSOSContext } from '@/contexts/SOSContext';

export default function SafetyFAB() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [showCheckinTimer, setShowCheckinTimer] = useState(false);
  const tonightMode = useTonightModeContext();
  const { isActive: timerActive, secondsLeft } = useCheckinTimer();
  console.log('[SafetyFAB] timerActive:', timerActive);

  const isTonight = tonightMode?.isTonight ?? false;

  // ── Invisible Gestures Logic ──────────────────────────────────────────────
  const { triggerSOS, triggerTheExit, triggerTheDisappear } = useSOSContext();
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef(null);

  const HOLD_EXIT_MS = 1500;
  const HOLD_DISAPPEAR_MS = 3000;
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdStartRef = useRef(null);
  const rafRef = useRef(null);
  const thresholdReachedRef = useRef({ exit: false, disappear: false });

  // Triple Tap Handler
  const handleTap = useCallback(() => {
    console.log(`[SafetyFAB] Tap count: ${tapCount + 1}`);
    setTapCount(prev => {
      const next = prev + 1;
      if (next === 3) {
        console.log('[SafetyFAB] SOS TRIGGERED (Triple Tap)');
        if (navigator?.vibrate) navigator.vibrate([50, 30, 50]);
        triggerSOS({ silent: true });
        return 0;
      }
      return next;
    });

    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      setTapCount(0);
      console.log('[SafetyFAB] Tap sequence reset');
    }, 600);
  }, [triggerSOS, tapCount]);

  const startHold = useCallback((e) => {
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

    // 1. Short tap (< 300ms) → Handle Triple Tap or Menu
    if (elapsed < 300) {
      handleTap();
      // Only toggle menu if it's not the middle of a triple tap? 
      // Actually, menu is fine for short tap.
      if (tapCount === 0) {
        // Delay menu slightly to see if another tap comes
        setTimeout(() => {
          if (tapCount === 0) setIsExpanded(prev => !prev);
        }, 200);
      }
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
  }, [handleTap, tapCount, triggerTheExit, triggerTheDisappear]);

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
