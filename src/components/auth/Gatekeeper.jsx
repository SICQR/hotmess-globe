import React, { useState, useEffect } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { Loader2 } from 'lucide-react';
import AgeGate from './AgeGate';
import ConsentForm from './ConsentForm';

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
      const isAuth = await supabase.auth.getSession().then(r => !!r.data.session);
      if (!isAuth) {
        setUser(null);
        setNeedsConsent(false);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      let currentUser; if (!user) { currentUser = null; } else { const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(); currentUser = { ...user, ...(profile || {}), auth_user_id: user.id, email: user.email || profile?.email }; };
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
      console.error('Auth check failed:', error);
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
          <Loader2 className="w-12 h-12 text-[#C8962C] mx-auto mb-4 animate-spin" />
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