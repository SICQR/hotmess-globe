/**
 * CookieBanner — GDPR-compliant cookie consent
 * 
 * Required for UK/EU users. Shows once, stores preference.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X } from 'lucide-react';

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
      // Delay showing to not interrupt initial load
      const timer = setTimeout(() => setIsVisible(true), 2000);
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
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          className="fixed bottom-20 left-4 right-4 z-[100] mx-auto max-w-lg rounded-2xl bg-[#1A1A1E] border border-white/10 p-4 shadow-xl"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 rounded-full bg-pink-500/20 p-2">
              <Cookie className="h-5 w-5 text-pink-400" />
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-white text-sm mb-1">
                Cookie Preferences
              </h3>
              <p className="text-xs text-gray-400 mb-3">
                We use cookies to improve your experience, analyze traffic, and personalize content. 
                By clicking "Accept All", you consent to our use of cookies.{' '}
                <a href="/legal" className="text-pink-400 underline">Learn more</a>
              </p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleConsent('essential')}
                  className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/5 transition-colors"
                >
                  Essential Only
                </button>
                <button
                  onClick={() => handleConsent('all')}
                  className="rounded-lg bg-gradient-to-r from-pink-500 to-pink-600 px-4 py-1.5 text-xs font-bold text-white hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  Accept All
                </button>
              </div>
            </div>

            <button
              onClick={() => handleConsent('essential')}
              className="flex-shrink-0 rounded-full p-1 hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
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
