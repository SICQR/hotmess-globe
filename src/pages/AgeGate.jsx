import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      window.location.href = nextUrl;
    } else {
      // Not authenticated - go to auth page
      window.location.href = '/auth';
    }
  };

  const handleExit = () => {
    window.location.href = 'https://www.google.com';
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        <div className="bg-white/5 border-2 border-white/20 p-8">
          <div className="text-center mb-8">
            <Shield className="w-20 h-20 mx-auto mb-4 text-[#FF1493]" />
            <h1 className="text-5xl font-black uppercase mb-4">
              HOT<span className="text-[#FF1493]">MESS</span>
            </h1>
            <p className="text-white/60 uppercase tracking-wider text-sm">18+ VERIFICATION REQUIRED</p>
          </div>

          <div className="space-y-6 mb-8">
            <div className="bg-red-600/20 border-2 border-red-600 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-black uppercase text-sm mb-2 text-red-400">AGE RESTRICTED CONTENT</p>
                  <p className="text-sm text-white/80">
                    This platform contains adult content and is intended for users 18 years or older. 
                    By proceeding, you confirm you meet the age requirement.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm text-white/80">
                <CheckCircle className="w-5 h-5 text-[#39FF14] flex-shrink-0 mt-0.5" />
                <span>Consent-first community with clear boundaries</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-white/80">
                <CheckCircle className="w-5 h-5 text-[#39FF14] flex-shrink-0 mt-0.5" />
                <span>Safety resources and support always available</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-white/80">
                <CheckCircle className="w-5 h-5 text-[#39FF14] flex-shrink-0 mt-0.5" />
                <span>Report, block, and moderation tools built-in</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/20 p-4 mb-6">
            <div className="flex items-start gap-3 group">
              <Checkbox 
                checked={confirmed}
                onCheckedChange={(value) => setConfirmed(value === true)}
                className="mt-1 border-white data-[state=checked]:bg-[#FF1493] data-[state=checked]:border-[#FF1493]"
              />
              <button
                type="button"
                onClick={() => setConfirmed((v) => !v)}
                className="text-left text-sm group-hover:text-white transition-colors"
              >
                <span className="font-bold">I confirm that I am 18 years of age or older</span> and agree to view adult content.
                I understand this platform contains explicit material.
              </button>
            </div>
          </div>

          <div className="bg-white/5 border border-white/20 p-4 mb-6">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#00D9FF] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-start gap-3 group">
                  <Checkbox
                    checked={locationConsent}
                    onCheckedChange={(value) => setLocationConsent(value === true)}
                    className="mt-1 border-white data-[state=checked]:bg-[#00D9FF] data-[state=checked]:border-[#00D9FF]"
                  />
                  <button
                    type="button"
                    onClick={() => setLocationConsent((v) => !v)}
                    className="text-left text-sm group-hover:text-white transition-colors"
                  >
                    <span className="font-bold">I consent to location services</span> so HOTMESS can show nearby users, events, and beacons.
                  </button>
                </div>

                {locationPermissionStatus === 'granted' ? (
                  <p className="mt-2 text-xs text-white/60 uppercase tracking-wider">Location permission: granted</p>
                ) : locationPermissionStatus === 'denied' ? (
                  <p className="mt-2 text-xs text-white/60 uppercase tracking-wider">Location permission: blocked in browser settings</p>
                ) : null}

                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={requestBrowserLocationPermission}
                    disabled={requestingLocation || locationPermissionStatus === 'granted'}
                    className="w-full border-2 border-white/20 text-white hover:bg-white hover:text-black font-black uppercase"
                  >
                    {locationPermissionStatus === 'granted'
                      ? 'LOCATION ENABLED'
                      : requestingLocation
                        ? 'REQUESTING LOCATION…'
                        : 'ENABLE LOCATION NOW'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleConfirm}
              disabled={!confirmed || !locationConsent || requestingLocation}
              className="w-full bg-[#FF1493] hover:bg-white text-black font-black uppercase py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ENTER (18+)
            </Button>
            <Button
              onClick={handleExit}
              variant="outline"
              className="w-full border-2 border-white/20 text-white hover:bg-white hover:text-black font-black uppercase py-6 text-lg"
            >
              EXIT (UNDER 18)
            </Button>
          </div>

          <p className="text-center text-xs text-white/40 mt-6 uppercase tracking-wider">
            By entering, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </motion.div>
    </div>
  );
}