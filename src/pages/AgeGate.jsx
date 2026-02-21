import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { safeGetViewerLatLng } from '@/utils/geolocation';
import { useBootGuard } from '@/contexts/BootGuardContext';
import BrandBackground from '@/components/ui/BrandBackground';

// Must match BootGuardContext
const AGE_KEY = 'hm_age_confirmed_v1';

export default function AgeGate() {
  const [confirmed, setConfirmed] = useState(false);
  const [locationConsent, setLocationConsent] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const nextUrl = searchParams.get('next') || createPageUrl('Home');
  const { markAgeVerified, session } = useBootGuard();

  useEffect(() => {
    // Read any cached status first.
    try {
      const cached = sessionStorage.getItem('location_permission');
      if (cached === 'granted' || cached === 'denied') setLocationPermissionStatus(cached);
    } catch {
      // ignore
    }

    // If supported, query permission state without prompting.
    const canQuery = typeof navigator !== 'undefined' && navigator.permissions?.query;
    if (!canQuery) return;

    let cancelled = false;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (cancelled) return;
        const state = result?.state;
        if (state === 'granted' || state === 'denied' || state === 'prompt') {
          setLocationPermissionStatus(state);
        }

        result.onchange = () => {
          const next = result?.state;
          if (next === 'granted' || next === 'denied' || next === 'prompt') {
            setLocationPermissionStatus(next);
            try {
              if (next === 'granted' || next === 'denied') sessionStorage.setItem('location_permission', next);
            } catch {
              // ignore
            }
          }
        };
      })
      .catch(() => {
        // ignore
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const requestBrowserLocationPermission = async () => {
    if (!('geolocation' in navigator)) {
      toast.error('Location is not available in this browser');
      return { granted: false, error: 'geolocation_unavailable' };
    }

    setRequestingLocation(true);
    try {
      // Best-effort: sometimes CoreLocation returns transient "unknown" errors.
      // A short retry keeps this from looking like an immediate "deny".
      const loc = await safeGetViewerLatLng(
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
        { retries: 1, logKey: 'age-gate' }
      );
      if (!loc) throw new Error('Unable to get location');
      try {
        sessionStorage.setItem('location_permission', 'granted');
      } catch {
        // ignore
      }
      setLocationPermissionStatus('granted');
      return { granted: true, error: null };
    } catch (err) {
      try {
        sessionStorage.setItem('location_permission', 'denied');
      } catch {
        // ignore
      }
      setLocationPermissionStatus('denied');
      return { granted: false, error: err?.message || 'denied' };
    } finally {
      setRequestingLocation(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirmed) {
      toast.error('You must confirm you are 18+ to continue');
      return;
    }

    // Store age + location consent in localStorage (pre-auth). 
    // Profile-level consents are synced after login by BootGuardContext.
    try {
      localStorage.setItem(AGE_KEY, 'true');
      sessionStorage.setItem('location_consent', locationConsent ? 'true' : 'false');
    } catch {
      // ignore
    }

    // Trigger the browser permission prompt so location-based features can work immediately.
    // Only do this if the user opted in to location services.
    if (locationConsent && locationPermissionStatus !== 'granted') {
      const { granted } = await requestBrowserLocationPermission();
      if (!granted) {
        toast.error('Location permission was blocked. You can enable it in browser settings.');
      }
    }

    // If already authenticated, mark age verified in profile and go to app
    if (session) {
      await markAgeVerified();
      navigate(nextUrl);
    } else {
      // Not authenticated - go to auth page
      navigate('/auth');
    }
  };

  const handleExit = () => {
    // External exit to google.com - intentional hard redirect
    window.location.href = 'https://www.google.com';
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 overflow-hidden">
      <BrandBackground />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Wordmark */}
        <div className="text-center mb-8">
          <p className="text-5xl font-black tracking-tight text-white leading-none">
            HOT<span className="text-[#FF1493]" style={{ textShadow: '0 0 24px rgba(255,20,147,0.6)' }}>MESS</span>
          </p>
          <p className="text-[10px] tracking-[0.45em] text-white/30 uppercase font-mono mt-2">LONDON · 18+ ONLY</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 shrink-0" style={{ color: '#FF1493', filter: 'drop-shadow(0 0 8px rgba(255,20,147,0.5))' }} />
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-white">Age Verification</p>
              <p className="text-xs text-white/40">18+ required by law</p>
            </div>
          </div>

          {/* Red warning */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 leading-relaxed">
              This platform contains adult content for users 18+. By continuing you confirm you meet the age requirement.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-2">
            {[
              'Consent-first community with clear boundaries',
              'Safety resources always available',
              'Report, block, and moderation built-in',
            ].map((txt) => (
              <div key={txt} className="flex items-start gap-2 text-xs text-white/60">
                <CheckCircle className="w-4 h-4 text-[#39FF14] shrink-0 mt-0.5" />
                <span>{txt}</span>
              </div>
            ))}
          </div>

          {/* Age checkbox */}
          <label className="flex items-start gap-3 cursor-pointer bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-colors select-none">
            <Checkbox
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              className="mt-0.5 border-white/30 data-[state=checked]:bg-[#FF1493] data-[state=checked]:border-[#FF1493]"
            />
            <span className="text-xs text-white/70 leading-relaxed">
              <span className="font-bold text-white">I confirm I am 18+</span> and agree to view adult content on this platform.
            </span>
          </label>

          {/* Location checkbox */}
          <label className="flex items-start gap-3 cursor-pointer bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-colors select-none">
            <Checkbox
              checked={locationConsent}
              onCheckedChange={(v) => setLocationConsent(v === true)}
              className="mt-0.5 border-white/30 data-[state=checked]:bg-[#00D9FF] data-[state=checked]:border-[#00D9FF]"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs leading-relaxed text-white/70">
                <span className="font-bold text-white flex items-center gap-1 mb-0.5">
                  <MapPin className="w-3 h-3 text-[#00D9FF]" /> Location services
                </span>
                Required for beacons, nearby users, and Right Now features.
              </p>
              {locationPermissionStatus === 'granted' && (
                <p className="text-[10px] text-[#39FF14] mt-1 font-mono uppercase">✓ Granted</p>
              )}
              {locationPermissionStatus === 'denied' && (
                <p className="text-[10px] text-red-400 mt-1 font-mono uppercase">Blocked — enable in browser settings</p>
              )}
              {locationConsent && locationPermissionStatus !== 'granted' && (
                <button
                  type="button"
                  onClick={requestBrowserLocationPermission}
                  disabled={requestingLocation}
                  className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#00D9FF] hover:underline disabled:opacity-40"
                >
                  {requestingLocation ? 'Requesting…' : 'Enable Now →'}
                </button>
              )}
            </div>
          </label>

          {/* CTA buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleConfirm}
              disabled={!confirmed || requestingLocation}
              className="w-full h-14 rounded-xl font-black text-black text-base uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
              style={{
                background: confirmed ? '#FF1493' : 'rgba(255,20,147,0.3)',
                boxShadow: confirmed ? '0 0 28px rgba(255,20,147,0.45)' : 'none',
              }}
            >
              Enter HOTMESS
            </button>
            <button
              onClick={handleExit}
              className="w-full h-12 rounded-xl border border-white/10 text-white/40 text-sm font-semibold hover:bg-white/5 active:scale-95 transition-all"
            >
              Exit (Under 18)
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-white/20 mt-5">
          By entering you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}