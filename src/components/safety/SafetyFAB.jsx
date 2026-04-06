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
import { useCheckinTimer } from '@/hooks/useCheckinTimer';
import { useSOSContext } from '@/contexts/SOSContext';

/**
 * SOS Progress Ring — SVG circle that fills during long-press.
 */
function SOSProgressRing({ progress }) {
  const radius = 27;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg
      className="absolute inset-0 -rotate-90 pointer-events-none"
      width="48"
      height="48"
      viewBox="0 0 56 56"
    >
      <circle
        cx="28" cy="28" r={radius}
        fill="none" stroke="rgba(255,59,48,0.2)" strokeWidth="2.5"
      />
      <circle
        cx="28" cy="28" r={radius}
        fill="none" stroke="#FF3B30" strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 30ms linear' }}
      />
    </svg>
  );
}

export default function SafetyFAB() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [showCheckinTimer, setShowCheckinTimer] = useState(false);
  const tonightMode = useTonightModeContext();
  const { isActive: timerActive, secondsLeft } = useCheckinTimer();
  const { triggerSOS } = useSOSContext();

  const isTonight = tonightMode?.isTonight ?? false;

  // ── Long-press SOS (3 seconds) ──────────────────────────────────────────────
  const SOS_HOLD_MS = 3000;
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdStartRef = useRef(null);
  const rafRef = useRef(null);
  const sosTriggeredRef = useRef(false);

  const startHold = useCallback((e) => {
    if (e.type === 'touchstart') e.preventDefault();
    holdStartRef.current = performance.now();
    sosTriggeredRef.current = false;
    setIsHolding(true);
    setHoldProgress(0);

    const tick = () => {
      if (!holdStartRef.current) return;
      const elapsed = performance.now() - holdStartRef.current;
      const pct = Math.min((elapsed / SOS_HOLD_MS) * 100, 100);
      setHoldProgress(pct);

      if (pct >= 100 && !sosTriggeredRef.current) {
        sosTriggeredRef.current = true;
        setIsHolding(false);
        setHoldProgress(0);
        holdStartRef.current = null;
        if (navigator?.vibrate) navigator.vibrate([200, 100, 200]);
        triggerSOS();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [triggerSOS]);

  const cancelHold = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const wasHolding = isHolding;
    const elapsed = holdStartRef.current ? performance.now() - holdStartRef.current : 0;
    holdStartRef.current = null;
    setIsHolding(false);
    setHoldProgress(0);

    // Short tap (< 300ms) → toggle menu
    if (wasHolding && !sosTriggeredRef.current && elapsed < 300) {
      setIsExpanded((prev) => !prev);
    }
  }, [isHolding]);

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
      <div className={`fixed z-[60] transition-all duration-300 ${
        isTonight ? 'bottom-24 left-4' : 'bottom-20 left-4'
      }`}>
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
                  className={`w-full justify-start h-10 text-sm ${
                    timerActive
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
          {/* Active timer ring — subtle */}
          {timerActive && !isHolding && (
            <motion.div
              className="absolute -inset-1 rounded-full pointer-events-none"
              style={{ border: '1.5px solid rgba(0,194,224,0.25)' }}
              animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          {/* SOS hold progress ring */}
          {isHolding && holdProgress > 0 && (
            <SOSProgressRing progress={holdProgress} />
          )}
          <Button
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
            className={`rounded-full w-12 h-12 shadow-md transition-all select-none ${
              isHolding
                ? 'bg-red-500/20 border-2 border-red-500 scale-110'
                : timerActive
                ? 'bg-[#1C1C1E] border border-[#00C2E0]/30'
                : 'bg-[#1C1C1E] border border-white/10'
            }`}
          >
            <Shield className={`w-5 h-5 ${
              isHolding
                ? 'text-red-400'
                : timerActive
                ? 'text-[#00C2E0]/70'
                : 'text-white/40'
            }`} />
          </Button>
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
