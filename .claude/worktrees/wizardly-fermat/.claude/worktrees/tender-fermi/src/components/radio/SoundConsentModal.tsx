/**
 * SoundConsentModal — Browser autoplay consent for radio
 *
 * Noir-gold design. Premium audio consent card.
 * Shows on first radio play attempt, stores consent.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Headphones } from 'lucide-react';

const CONSENT_KEY = 'hm_sound_consent_v1';
const GOLD = '#C8962C';

const springSmooth = { type: 'spring' as const, stiffness: 250, damping: 22 };

interface SoundConsentModalProps {
  isOpen: boolean;
  onConsent: () => void;
  onDecline: () => void;
}

export function SoundConsentModal({ isOpen, onConsent, onDecline }: SoundConsentModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 12 }}
            transition={springSmooth}
            className="w-full max-w-sm rounded-3xl bg-[#1C1C1E] border border-white/10 p-6 text-center"
          >
            {/* Icon with gold glow ring */}
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, rgba(200,150,44,0.15) 0%, transparent 70%)`,
                  filter: 'blur(8px)',
                  transform: 'scale(2)',
                }}
              />
              <div
                className="relative w-full h-full rounded-full flex items-center justify-center border-2"
                style={{ borderColor: 'rgba(200,150,44,0.25)' }}
              >
                <Headphones
                  className="w-7 h-7"
                  style={{ color: GOLD, filter: 'drop-shadow(0 0 6px rgba(200,150,44,0.4))' }}
                />
              </div>
            </div>

            {/* Title */}
            <h2 className="mb-2 text-xl font-black text-white">Enable Sound</h2>

            {/* Description */}
            <p className="mb-6 text-sm text-white/40 leading-relaxed">
              HOTMESS Radio streams live audio. Enable for the full experience.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onDecline}
                className="flex-1 h-12 rounded-xl border border-white/10 bg-transparent text-sm font-bold text-white/40 transition-colors hover:bg-white/5 hover:text-white/60 flex items-center justify-center gap-2"
              >
                <VolumeX className="w-4 h-4" />
                Not Now
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onConsent}
                className="flex-1 h-12 rounded-xl text-sm font-black text-black flex items-center justify-center gap-2 transition-colors"
                style={{
                  background: GOLD,
                  boxShadow: '0 0 20px rgba(200,150,44,0.25)',
                }}
              >
                <Volume2 className="w-4 h-4" />
                Enable
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to manage sound consent state
 */
export function useSoundConsent() {
  const [hasConsent, setHasConsent] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(CONSENT_KEY) === 'true';
  });
  const [showModal, setShowModal] = useState(false);

  const requestConsent = () => {
    if (hasConsent) return true;
    setShowModal(true);
    return false;
  };

  const grantConsent = () => {
    localStorage.setItem(CONSENT_KEY, 'true');
    setHasConsent(true);
    setShowModal(false);
  };

  const declineConsent = () => {
    setShowModal(false);
  };

  return {
    hasConsent,
    showModal,
    requestConsent,
    grantConsent,
    declineConsent,
  };
}

export default SoundConsentModal;
