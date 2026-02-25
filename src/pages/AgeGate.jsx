import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { safeGetViewerLatLng } from '@/utils/geolocation';
import { useBootGuard } from '@/contexts/BootGuardContext';

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
    <div className="fixed inset-0 bg-black flex items-end justify-center pb-20 text-white overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="bg-[#1C1C1E] rounded-3xl p-8 mx-4 max-w-sm w-full"
      >
        {/* Wordmark */}
        <p className="font-black text-2xl text-white leading-none">
          HOT<span className="text-[#C8962C]">MESS</span>
        </p>

        {/* Title + subtitle */}
        <h1 className="font-black text-xl text-white mt-4">You&apos;re in grown territory.</h1>
        <p className="text-white/60 text-sm mt-1">This is an 18+ space for gay and bisexual men.</p>

        {/* Age checkbox */}
        <label className="flex items-start gap-3 cursor-pointer bg-black/30 border border-white/10 rounded-xl p-3 hover:bg-black/40 transition-colors select-none mt-6">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(v) => setConfirmed(v === true)}
            className="mt-0.5 border-white/30 data-[state=checked]:bg-[#C8962C] data-[state=checked]:border-[#C8962C]"
          />
          <span className="text-xs text-white/70 leading-relaxed">
            <span className="font-bold text-white">I confirm I am 18+</span> and agree to view adult content on this platform.
          </span>
        </label>

        {/* Location checkbox */}
        <label className="flex items-start gap-3 cursor-pointer bg-black/30 border border-white/10 rounded-xl p-3 hover:bg-black/40 transition-colors select-none mt-3">
          <Checkbox
            checked={locationConsent}
            onCheckedChange={(v) => setLocationConsent(v === true)}
            className="mt-0.5 border-white/30 data-[state=checked]:bg-[#C8962C] data-[state=checked]:border-[#C8962C]"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs leading-relaxed text-white/70">
              <span className="font-bold text-white flex items-center gap-1 mb-0.5">
                <MapPin className="w-3 h-3 text-[#C8962C]" /> Location services
              </span>
              Required for beacons, nearby users, and Right Now features.
            </p>
            {locationPermissionStatus === 'granted' && (
              <p className="text-[10px] text-[#C8962C] mt-1 font-mono uppercase">✓ Granted</p>
            )}
            {locationPermissionStatus === 'denied' && (
              <p className="text-[10px] text-white/50 mt-1 font-mono uppercase">Blocked — enable in browser settings</p>
            )}
            {locationConsent && locationPermissionStatus !== 'granted' && (
              <button
                type="button"
                onClick={requestBrowserLocationPermission}
                disabled={requestingLocation}
                className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#C8962C] hover:underline disabled:opacity-40"
              >
                {requestingLocation ? 'Requesting…' : 'Enable Now →'}
              </button>
            )}
          </div>
        </label>

        {/* Primary CTA */}
        <button
          onClick={handleConfirm}
          disabled={!confirmed || requestingLocation}
          className="bg-[#C8962C] text-black font-black rounded-2xl w-full py-4 text-base mt-6 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
        >
          I&apos;m 18+ — Enter
        </button>

        {/* Secondary CTA */}
        <button
          onClick={handleExit}
          className="bg-[#2A2A2A] text-white font-bold rounded-2xl w-full py-3 text-sm mt-3 active:scale-95 transition-all"
        >
          Leave
        </button>

        {/* Fine print */}
        <p className="text-white/30 text-xs text-center mt-4 leading-relaxed">
          By entering you confirm you are 18 or older.
        </p>
      </motion.div>
    </div>
  );
}