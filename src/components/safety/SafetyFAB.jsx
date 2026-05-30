/**
 * SafetyFAB - Floating safety button
 *
 * Calm idle state. Long-press (1.5s) → fake call (The Exit). Long-press (3s)
 * → stealth wipe (The Disappear). Short tap opens compact menu.
 *
 * Menu (Phil v1.0 — 2026-05-20):
 *   - Fake Call          → opens FakeCallGenerator
 *   - Check-in Timer     → opens CheckInTimerModal
 *   - SOS                → opens SOSHoldButton in a full-screen inline
 *                          overlay (NO navigation). Same gold 168×168
 *                          hold-to-fire surface as /safety. Doctrine: one
 *                          tap from anywhere fires SOS, no routing under
 *                          stress.
 *
 * Route guard: the FAB hides itself on /safety (that page has its own
 * dedicated SOS surface — ONE PAGE, ONE SOS SURFACE, ONE MENTAL MODEL).
 *
 * Dismiss rules for the SOS overlay (Phil v1.0):
 *   - Swipe down on the sheet → dismiss
 *   - Tap outside the sheet (backdrop) → dismiss
 *   - Never by accident: drag has a threshold; backdrop tap is a real tap,
 *     not a touchstart on a stray brush; an explicit "Close" affordance is
 *     always visible.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Phone, Clock, X, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTonightModeContext } from '@/hooks/useTonightMode';
import FakeCallGenerator from '@/components/safety/FakeCallGenerator';
import CheckInTimerModal from '@/components/safety/CheckInTimerModal';
import SOSHoldButton from '@/components/safety/SOSHoldButton';
import { useCheckinTimer } from '@/contexts/CheckinTimerContext';
import { useSOSContext } from '@/contexts/SOSContext';
import { useSurfaceVisibility } from '@/lib/surfaceLayers';

const TOKENS = {
  ink: '#050507',
  gold: '#C8962C',
};

/**
 * Inline SOS overlay — full-screen scrim + bottom sheet containing the
 * canonical SOSHoldButton. Mounted from the FAB menu so SOS is always one
 * tap away from any page, without routing.
 */
function SOSInlineOverlay({ open, onClose }) {
  // Block background scroll while open.
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ESC to dismiss (desktop convenience; doesn't change mobile UX).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center"
          style={{
            background: 'rgba(5,5,7,0.78)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}
          // Backdrop tap dismisses — but only when the tap target IS the
          // backdrop, never bubbled from a child. No accidental dismiss.
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          role="dialog"
          aria-modal="true"
          aria-label="Hold for SOS"
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            // Drag-to-dismiss with a deliberate threshold so a stray finger
            // brush won't close it. Only downward drag past 120px or with
            // velocity > 500 dismisses.
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) onClose();
            }}
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{
              background: TOKENS.ink,
              border: '1px solid rgba(200,150,44,0.20)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            }}
          >
            {/* Drag handle + close affordance */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <span
                aria-hidden
                className="block mx-auto rounded-full"
                style={{ width: 44, height: 4, background: 'rgba(255,255,255,0.18)' }}
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close SOS"
                className="absolute right-3 top-3 p-2 rounded-full text-white/60 hover:text-white active:scale-95"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Header */}
            <div className="px-6 pt-2 pb-1 text-center">
              <p
                className="font-mono text-[10px] uppercase tracking-[0.22em]"
                style={{ color: TOKENS.gold }}
              >
                Safety
              </p>
              <p className="text-sm text-white/55 mt-1 leading-snug">
                Hold the ring to alert the people you trust.
              </p>
            </div>

            {/* The canonical SOS hold button — same component as /safety */}
            <div className="px-6 py-6 flex flex-col items-center">
              <SOSHoldButton onSent={() => { /* keep overlay open so the user sees the live ack feed land */ }} />
            </div>

            <p className="px-6 text-[11px] text-white/40 text-center leading-snug">
              HOTMESS Safety helps notify people you trust. It is not emergency services.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Inner FAB — unchanged hold behaviour. The default export wraps this with
 * a route guard so it doesn't render on /safety.
 */
function SafetyFABInner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [showCheckinTimer, setShowCheckinTimer] = useState(false);
  const [showSOSOverlay, setShowSOSOverlay] = useState(false);
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

      if (elapsed >= HOLD_EXIT_MS && !thresholdReachedRef.current.exit) {
        if (navigator?.vibrate) navigator.vibrate(50);
        thresholdReachedRef.current.exit = true;
      }
      if (elapsed >= HOLD_DISAPPEAR_MS && !thresholdReachedRef.current.disappear) {
        if (navigator?.vibrate) navigator.vibrate([100, 50, 100]);
        thresholdReachedRef.current.disappear = true;
      }

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

    if (elapsed < 300) {
      handleTap();
      return;
    }

    if (elapsed >= HOLD_EXIT_MS && elapsed < HOLD_DISAPPEAR_MS) {
      if (navigator?.vibrate) navigator.vibrate(100);
      triggerTheExit();
    }
    else if (elapsed >= HOLD_DISAPPEAR_MS) {
      triggerTheDisappear();
    }
  }, [handleTap, triggerTheExit, triggerTheDisappear]);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Close menu on outside tap (unless the SOS overlay is open — that has
  // its own dismiss rules).
  useEffect(() => {
    if (!isExpanded) return;
    const close = () => setIsExpanded(false);
    const timer = setTimeout(() => document.addEventListener('click', close, { once: true }), 100);
    return () => { clearTimeout(timer); document.removeEventListener('click', close); };
  }, [isExpanded]);

  return (
    <>
      <div className="fixed z-[150] right-4 top-[calc(env(safe-area-inset-top)+72px)]">
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-14 right-0 bg-[#1C1C1E] border border-white/10 rounded-xl p-2 min-w-[180px] shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-0.5">
                {/* SOS — primary safety action. Top of the menu so it's the
                    first thing under the thumb. Renders the canonical hold
                    button inline, no navigation. */}
                <Button
                  variant="ghost"
                  className="w-full justify-start h-11 text-sm font-bold"
                  style={{ color: TOKENS.gold }}
                  onClick={() => { setShowSOSOverlay(true); setIsExpanded(false); }}
                >
                  <ShieldAlert className="w-4 h-4 mr-2.5" />
                  SOS
                </Button>

                <div className="h-px bg-white/5 my-1" />

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

      {/* SOS Inline Overlay — same gold hold-button as /safety, no routing */}
      <SOSInlineOverlay
        open={showSOSOverlay}
        onClose={() => setShowSOSOverlay(false)}
      />
    </>
  );
}

/**
 * Default export — route-guarded wrapper. Renders the FAB everywhere EXCEPT
 * /safety, where the page has its own dedicated SOS surface and a second
 * floating control would create two competing SOS interactions.
 */
/**
 * SafetyFAB wrapper — visibility delegated to D16 §3 (Surface Layer Doctrine).
 * The `useSurfaceVisibility('safety-fab')` hook reads the canonical hide-rules
 * matrix from `src/lib/surfaceLayers.ts`. To change when this FAB hides,
 * update D16 §3 and the hook — do not patch route checks here.
 *
 * Current rules (D16 §3):
 *   - Hidden on /safety (page owns its own SOS surface)
 *   - Hidden when any L2 sheet is open (covering people's faces — fixed in #395)
 */
export default function SafetyFAB() {
  const { visible } = useSurfaceVisibility('safety-fab');
  if (!visible) return null;
  return <SafetyFABInner />;
}

