/**
 * SoundConsentModal — Browser autoplay consent for radio
 * 
 * Browsers block autoplay until user interaction. This modal:
 * 1. Shows on first radio play attempt
 * 2. Gets user click/tap (satisfies autoplay policy)
 * 3. Stores consent in localStorage
 * 4. Never shows again after consent
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Radio } from 'lucide-react';

const CONSENT_KEY = 'hm_sound_consent_v1';

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
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm rounded-2xl bg-[#1A1A1E] border border-white/10 p-6 text-center"
          >
            {/* Radio icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-pink-600">
              <Radio className="h-8 w-8 text-white" />
            </div>

            {/* Title */}
            <h2 className="mb-2 text-xl font-bold text-white">
              Enable Sound?
            </h2>

            {/* Description */}
            <p className="mb-6 text-sm text-gray-400">
              HOTMESS Radio is live 24/7. Tap below to enable audio and start listening.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onDecline}
                className="flex-1 rounded-xl border border-white/20 bg-transparent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
              >
                <VolumeX className="mr-2 inline-block h-4 w-4" />
                Not Now
              </button>
              <button
                onClick={onConsent}
                className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 px-4 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Volume2 className="mr-2 inline-block h-4 w-4" />
                Enable Sound
              </button>
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
