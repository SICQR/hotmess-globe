/**
 * AgeGate — Premium 18+ verification gate
 *
 * Noir-gold luxury design. Authoritative but elegant.
 * Shows before auth for first-time visitors.
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, MapPin } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { safeGetViewerLatLng } from '@/utils/geolocation';
import { useBootGuard } from '@/contexts/BootGuardContext';

const AGE_KEY = 'hm_age_confirmed_v1';
const GOLD = '#C8962C';

const springSmooth = { type: 'spring', stiffness: 200, damping: 25 };

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
    try {
      const cached = sessionStorage.getItem('location_permission');
      if (cached === 'granted' || cached === 'denied') setLocationPermissionStatus(cached);
    } catch {}

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
              if (next === 'granted' || next === 'denied')
                sessionStorage.setItem('location_permission', next);
            } catch {}
          }
        };
      })
      .catch(() => {});

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
      const loc = await safeGetViewerLatLng(
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
        { retries: 1, logKey: 'age-gate' },
      );
      if (!loc) throw new Error('Unable to get location');
      try {
        sessionStorage.setItem('location_permission', 'granted');
      } catch {}
      setLocationPermissionStatus('granted');
      return { granted: true, error: null };
    } catch (err) {
      try {
        sessionStorage.setItem('location_permission', 'denied');
      } catch {}
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

    try {
      localStorage.setItem(AGE_KEY, 'true');
      sessionStorage.setItem('location_consent', locationConsent ? 'true' : 'false');
    } catch {}

    if (locationConsent && locationPermissionStatus !== 'granted') {
      const { granted } = await requestBrowserLocationPermission();
      if (!granted) {
        toast.error('Location permission was blocked. You can enable it in browser settings.');
      }
    }

    if (session) {
      await markAgeVerified();
      navigate(nextUrl);
    } else {
      navigate('/auth');
    }
  };

  const handleExit = () => {
    window.location.href = 'https://www.google.com';
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center text-white overflow-hidden p-4">
      {/* Ambient gold glow behind card */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(200,150,44,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={springSmooth}
        className="relative z-10 bg-[#1C1C1E] border border-white/8 rounded-3xl p-7 w-full max-w-sm"
      >
        {/* Shield icon with glow ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, ...springSmooth }}
          className="flex justify-center mb-6"
        >
          <div className="relative w-16 h-16">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, rgba(200,150,44,0.12) 0%, transparent 70%)`,
                filter: 'blur(8px)',
                transform: 'scale(2)',
              }}
            />
            <div className="relative w-full h-full flex items-center justify-center">
              <Shield
                className="w-10 h-10"
                style={{ color: GOLD, filter: 'drop-shadow(0 0 10px rgba(200,150,44,0.4))' }}
              />
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-6"
        >
          <h1 className="text-2xl font-black text-white mb-1">Verify Your Age</h1>
          <p className="text-sm text-white/40">
            HOTMESS is an 18+ private members club for gay and bisexual men.
          </p>
        </motion.div>

        {/* Age checkbox */}
        <motion.label
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex items-start gap-3 cursor-pointer bg-[#0D0D0D] border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all select-none group"
        >
          <Checkbox
            checked={confirmed}
            onCheckedChange={(v) => setConfirmed(v === true)}
            className="mt-0.5 w-5 h-5 border-2 border-white/20 shrink-0 data-[state=checked]:bg-[#C8962C] data-[state=checked]:border-[#C8962C]"
          />
          <span className="text-xs text-white/60 leading-relaxed">
            <span className="font-bold text-white/80 group-hover:text-white transition-colors">
              I confirm I am 18+
            </span>{' '}
            and agree to view adult content on this platform.
          </span>
        </motion.label>

        {/* Location checkbox */}
        <motion.label
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="flex items-start gap-3 cursor-pointer bg-[#0D0D0D] border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all select-none mt-3 group"
        >
          <Checkbox
            checked={locationConsent}
            onCheckedChange={(v) => setLocationConsent(v === true)}
            className="mt-0.5 w-5 h-5 border-2 border-white/20 shrink-0 data-[state=checked]:bg-[#C8962C] data-[state=checked]:border-[#C8962C]"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs leading-relaxed text-white/60">
              <span className="font-bold text-white/80 flex items-center gap-1.5 mb-0.5 group-hover:text-white transition-colors">
                <MapPin className="w-3 h-3 text-[#C8962C]" /> Location services
              </span>
              Required for beacons, nearby users, and safety features.
            </p>
            {locationPermissionStatus === 'granted' && (
              <p className="text-[10px] text-[#C8962C] mt-1.5 font-black uppercase tracking-[0.15em]">
                Granted
              </p>
            )}
            {locationPermissionStatus === 'denied' && (
              <p className="text-[10px] text-white/30 mt-1.5 font-medium">
                Blocked — enable in browser settings
              </p>
            )}
            {locationConsent && locationPermissionStatus !== 'granted' && (
              <button
                type="button"
                onClick={requestBrowserLocationPermission}
                disabled={requestingLocation}
                className="mt-2 text-[10px] font-black uppercase tracking-[0.15em] text-[#C8962C] hover:text-[#D4A84B] disabled:opacity-40 transition-colors"
              >
                {requestingLocation ? 'Requesting...' : 'Enable Now'}
              </button>
            )}
          </div>
        </motion.label>

        {/* Primary CTA */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleConfirm}
          disabled={!confirmed || requestingLocation}
          className="w-full h-14 rounded-2xl font-black text-black text-base uppercase tracking-wide mt-6 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
          style={{
            background: confirmed ? GOLD : 'rgba(200,150,44,0.15)',
            boxShadow: confirmed ? '0 0 30px rgba(200,150,44,0.25)' : 'none',
          }}
        >
          I&apos;m 18+ — Enter
        </motion.button>

        {/* Leave button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.3 }}
          onClick={handleExit}
          className="w-full py-3 text-sm text-white/20 hover:text-white/40 font-medium mt-3 transition-colors text-center"
        >
          Leave
        </motion.button>

        {/* Fine print */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
          className="text-white/15 text-[10px] text-center mt-4 leading-relaxed"
        >
          By entering you confirm you are 18 or older.
        </motion.p>
      </motion.div>
    </div>
  );
}
