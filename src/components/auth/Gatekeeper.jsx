import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import AgeGate from './AgeGate';
import ConsentForm from './ConsentForm';
import logger from '@/utils/logger';

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name, value) {
  if (typeof document === 'undefined') return;
  // Session cookie (clears when browser session ends)
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax`;
}

export default function Gatekeeper({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [ageVerified, setAgeVerified] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      if (window.sessionStorage.getItem('hm_age_verified') === '1') return true;
    } catch {
      // ignore
    }
    return readCookie('hm_age_verified') === '1';
  });
  const [needsConsent, setNeedsConsent] = useState(false);

  useEffect(() => {
    checkCompliance();
  }, []);

  const checkCompliance = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        setUser(null);
        setNeedsConsent(false);
        setLoading(false);
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Check if user has accepted consent
      if (!currentUser.consent_accepted) {
        setNeedsConsent(true);
      } else {
        setAgeVerified(true);
        try {
          window.sessionStorage.setItem('hm_age_verified', '1');
        } catch {
          // ignore
        }
        try {
          writeCookie('hm_age_verified', '1');
        } catch {
          // ignore
        }
      }
    } catch (error) {
      logger.error('Auth check failed:', error);
      setUser(null);
      setNeedsConsent(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#FF1493] mx-auto mb-4 animate-spin" />
          <p className="text-white/60">Loading HOTMESS OS...</p>
        </div>
      </div>
    );
  }

  // Age gate for non-verified users
  if (!ageVerified && !needsConsent) {
    return (
      <AgeGate
        onVerified={() => {
          setAgeVerified(true);
          try {
            window.sessionStorage.setItem('hm_age_verified', '1');
          } catch {
            // ignore
          }
          try {
            writeCookie('hm_age_verified', '1');
          } catch {
            // ignore
          }
        }}
      />
    );
  }

  // Consent form for logged-in users who haven't accepted
  if (needsConsent && user) {
    return (
      <ConsentForm
        user={user}
        onAccepted={() => {
          setNeedsConsent(false);
          checkCompliance();
        }}
      />
    );
  }

  // If age verified but not logged in, show consent after login
  // This is handled by the app checking consent_accepted on mount

  return <>{children}</>;
}