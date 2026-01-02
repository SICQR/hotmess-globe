import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import AgeGate from './AgeGate';
import ConsentForm from './ConsentForm';

export default function Gatekeeper({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [ageVerified, setAgeVerified] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);

  useEffect(() => {
    checkCompliance();
  }, []);

  const checkCompliance = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        setAgeVerified(false);
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
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAgeVerified(false);
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
    return <AgeGate onVerified={() => setAgeVerified(true)} />;
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