/**
 * CookieBanner — GDPR-compliant cookie consent
 *
 * Noir-gold design. Minimal, non-intrusive.
 * Required for UK/EU users. Shows once, stores preference.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'hm_cookie_consent_v1';

type ConsentChoice = 'all' | 'essential' | null;

interface CookieBannerProps {
  onConsent?: (choice: ConsentChoice) => void;
}

export function CookieBanner({ onConsent }: CookieBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) {
      // Delay to not interrupt initial experience
      const timer = setTimeout(() => setIsVisible(true), 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConsent = (choice: ConsentChoice) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, choice || 'essential');
    setIsVisible(false);
    onConsent?.(choice);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="fixed bottom-20 left-4 right-4 z-[100] mx-auto max-w-md"
        >
          <div className="rounded-2xl bg-[#1C1C1E]/95 backdrop-blur-xl border border-white/8 p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <Shield className="h-4 w-4 text-[#C8962C]/60" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-white/60 leading-relaxed">
                  We use cookies to keep HOTMESS running.{' '}
                  <a href="/legal/privacy" className="text-[#C8962C]/50 underline decoration-[#C8962C]/20 hover:text-[#C8962C]/80">
                    Learn more
                  </a>
                </p>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleConsent('essential')}
                    className="rounded-xl bg-white/6 border border-white/8 px-4 py-2 text-xs font-bold text-white/50 hover:bg-white/10 hover:text-white/70 transition-all active:scale-[0.97]"
                  >
                    Essential Only
                  </button>
                  <button
                    onClick={() => handleConsent('all')}
                    className="rounded-xl bg-[#C8962C] px-5 py-2 text-xs font-black text-black hover:bg-[#D4A84B] transition-colors active:scale-[0.97]"
                  >
                    Accept All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to check cookie consent status
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentChoice>(null);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY) as ConsentChoice;
    setConsent(stored);
  }, []);

  return {
    consent,
    hasAnalytics: consent === 'all',
    hasEssential: consent === 'all' || consent === 'essential',
  };
}

export default CookieBanner;
