import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Settings, Check } from 'lucide-react';
import { createPageUrl } from '../../utils';

const COOKIE_CONSENT_KEY = 'hotmess_cookie_consent';

const COOKIE_CATEGORIES = [
  {
    id: 'essential',
    name: 'Essential',
    description: 'Required for the platform to function. Cannot be disabled.',
    required: true,
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Help us understand how you use the platform to improve your experience.',
    required: false,
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Used to show you relevant advertisements and measure campaign effectiveness.',
    required: false,
  },
];

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if already consented via splash screen or previous visit
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    const splashConsent = sessionStorage.getItem('cookies_accepted');
    
    if (splashConsent === 'true' && !stored) {
      // User accepted via splash - save to localStorage and don't show banner
      saveConsent({
        essential: true,
        analytics: true,
        marketing: true,
      });
      return;
    }
    
    if (!stored && !splashConsent) {
      // No consent yet - show banner after delay (but only if no splash consent)
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    } else if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences(parsed);
      } catch (e) {
        console.error('Failed to parse cookie consent:', e);
      }
    }
  }, []);

  const saveConsent = (newPreferences) => {
    const consent = {
      ...newPreferences,
      essential: true, // Always true
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    setPreferences(consent);
    setVisible(false);
    setShowSettings(false);

    // Dispatch event for other components to react
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: consent }));
  };

  const acceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
    });
  };

  const acceptEssential = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
    });
  };

  const savePreferences = () => {
    saveConsent(preferences);
  };

  const toggleCategory = (categoryId) => {
    if (categoryId === 'essential') return; // Can't toggle essential
    setPreferences(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4"
      >
        <div className="max-w-4xl mx-auto bg-black/95 border-2 border-white/20 backdrop-blur-lg shadow-2xl">
          {!showSettings ? (
            // Simple Banner
            <div className="p-4 md:p-6">
              <div className="flex items-start gap-4">
                <Cookie className="w-8 h-8 text-[#FF1493] shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-black uppercase mb-2">Cookie Settings</h3>
                  <p className="text-sm text-white/70 mb-4">
                    We use cookies to enhance your experience, analyze site traffic, and for marketing purposes. 
                    By clicking "Accept All", you consent to our use of cookies. 
                    Read our{' '}
                    <Link to={createPageUrl('PrivacyPolicy')} className="text-[#FF1493] hover:underline">
                      Privacy Policy
                    </Link>{' '}
                    for more information.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={acceptAll}
                      className="px-6 py-2 bg-[#FF1493] hover:bg-[#FF1493]/80 font-bold uppercase text-sm transition-colors"
                    >
                      Accept All
                    </button>
                    <button
                      onClick={acceptEssential}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 font-bold uppercase text-sm transition-colors"
                    >
                      Essential Only
                    </button>
                    <button
                      onClick={() => setShowSettings(true)}
                      className="px-6 py-2 border border-white/30 hover:border-white/50 font-bold uppercase text-sm transition-colors flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Customize
                    </button>
                  </div>
                </div>
                <button
                  onClick={acceptEssential}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  aria-label="Close cookie banner"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            // Settings Panel
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Cookie className="w-6 h-6 text-[#FF1493]" />
                  <h3 className="font-black uppercase">Cookie Preferences</h3>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {COOKIE_CATEGORIES.map((category) => (
                  <div
                    key={category.id}
                    className={`p-4 border-2 transition-colors ${
                      preferences[category.id]
                        ? 'border-[#FF1493]/50 bg-[#FF1493]/5'
                        : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold uppercase text-sm">{category.name}</h4>
                        <p className="text-xs text-white/60 mt-1">{category.description}</p>
                      </div>
                      {category.required ? (
                        <span className="text-xs text-white/40 uppercase">Required</span>
                      ) : (
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className={`w-12 h-6 rounded-full transition-colors relative ${
                            preferences[category.id] ? 'bg-[#FF1493]' : 'bg-white/20'
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              preferences[category.id] ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={savePreferences}
                  className="px-6 py-2 bg-[#FF1493] hover:bg-[#FF1493]/80 font-bold uppercase text-sm transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Save Preferences
                </button>
                <button
                  onClick={acceptAll}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 font-bold uppercase text-sm transition-colors"
                >
                  Accept All
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook to check cookie consent status
export function useCookieConsent() {
  const [consent, setConsent] = useState({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      try {
        setConsent(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse cookie consent:', e);
      }
    }

    const handleUpdate = (event) => {
      setConsent(event.detail);
    };

    window.addEventListener('cookieConsentUpdated', handleUpdate);
    return () => window.removeEventListener('cookieConsentUpdated', handleUpdate);
  }, []);

  return consent;
}

// Utility to check if a specific cookie category is allowed
export function isCookieAllowed(category) {
  const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (!stored) return category === 'essential';
  
  try {
    const consent = JSON.parse(stored);
    return consent[category] === true;
  } catch (e) {
    return category === 'essential';
  }
}

export default CookieConsent;
