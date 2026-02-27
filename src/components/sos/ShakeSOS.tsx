/**
 * ShakeSOS
 *
 * Invisible component that mounts the shake detection hook and renders
 * the 5-second countdown banner when a shake pattern is detected.
 *
 * Renders at z-[195] — above SOSButton (z-190), below SOSOverlay (z-200).
 * When not counting down: renders null.
 *
 * This component needs to be a sibling of SOSButton inside SOSProvider.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSOSContext } from '@/contexts/SOSContext';
import { useShakeSOS } from '@/hooks/useShakeSOS';

export default function ShakeSOS() {
  const { triggerSOS } = useSOSContext();
  const { isCountingDown, secondsLeft, cancelCountdown } = useShakeSOS(triggerSOS);

  return (
    <AnimatePresence>
      {isCountingDown && (
        <>
          {/* Full-screen tap-to-cancel overlay (transparent) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[195]"
            onClick={cancelCountdown}
            aria-label="Tap to cancel SOS"
          />

          {/* Countdown banner — top of screen */}
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed top-0 inset-x-0 z-[196] flex items-center justify-between px-5 py-4"
            style={{
              background: 'linear-gradient(135deg, #7f0000 0%, #c0392b 100%)',
              paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
            }}
          >
            <div className="flex items-center gap-3">
              {/* Pulsing red dot */}
              <div className="relative flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                <div
                  className="absolute inset-0 rounded-full bg-white animate-ping opacity-50"
                />
              </div>

              <div>
                <p className="text-white font-black text-sm uppercase tracking-wider">
                  SOS in {secondsLeft}s
                </p>
                <p className="text-white/70 text-[11px]">
                  Tap anywhere to cancel
                </p>
              </div>
            </div>

            {/* Circular countdown */}
            <button
              onClick={cancelCountdown}
              className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-xl border-2 border-white/40 flex-shrink-0"
              aria-label="Cancel SOS countdown"
            >
              {secondsLeft}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Re-export the hook so SafetyFAB can import from one place.
 * Usage: import { useShakeSOS } from '@/components/sos/ShakeSOS'
 */
export { useShakeSOS } from '@/hooks/useShakeSOS';
