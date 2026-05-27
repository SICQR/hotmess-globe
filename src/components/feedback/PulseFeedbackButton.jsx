/**
 * Floating "HOW'S IT FEEL?" pulse feedback button.
 *
 * Phil 2026-05-27 — emotional/cultural/trust telemetry, not just bug reports.
 *
 * Visible to ALL signed-in users (we want everyone's voice, not just betas).
 * Hidden on /redeem, /auth, and during active SOS/safety flows.
 *
 * Position: bottom-right, above bottom nav, above music mini-player.
 * Z-index: 60 (below sheets z-[100], above nav z-50).
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { MessageCircleHeart } from 'lucide-react';
import { useUserContext } from '@/hooks/useUserContext';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { PulseFeedbackSheet } from './PulseFeedbackSheet';

const GOLD = '#C8962C';

const HIDDEN_PATHS = ['/redeem', '/auth', '/sign-in', '/sign-up', '/onboarding'];

export function PulseFeedbackButton() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { isLoggedIn, isLoading } = useUserContext();
  const { currentTrack } = useMusicPlayer();

  // Hide on auth/onboarding flows where the button would be noise
  if (isLoading) return null;
  if (!isLoggedIn) return null;
  if (HIDDEN_PATHS.some(p => location.pathname.startsWith(p))) return null;

  // Lift above music mini player when it's visible
  const bottomOffset = currentTrack ? 148 : 92;

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        title="How's it feel?"
        aria-label="Send feedback to HOTMESS"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', delay: 1.2, stiffness: 300, damping: 25 }}
        whileTap={{ scale: 0.92 }}
        className="fixed right-4 z-[60] flex items-center gap-2 h-10 pl-3 pr-3.5 rounded-full bg-black/80 border border-[#C8962C]/40 backdrop-blur-md text-white shadow-lg overflow-hidden group"
        style={{ bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px))` }}
        data-pull-refresh-ignore
      >
        <span className="relative flex-shrink-0 w-2 h-2">
          <span className="absolute inset-0 rounded-full animate-ping" style={{ background: GOLD, opacity: 0.6 }} />
          <span className="relative block w-2 h-2 rounded-full" style={{ background: GOLD }} />
        </span>
        <MessageCircleHeart className="w-3.5 h-3.5" style={{ color: GOLD }} />
        <span className="text-[10px] font-black tracking-widest uppercase whitespace-nowrap" style={{ color: '#fff' }}>
          How&apos;s it feel?
        </span>
      </motion.button>

      <AnimatePresence>
        {open && <PulseFeedbackSheet onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

export default PulseFeedbackButton;
