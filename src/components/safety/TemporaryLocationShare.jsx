/**
 * TemporaryLocationShare - Quick action to share location for a limited time
 * 
 * Features:
 * - Select duration (15min, 30min, 1hr, 2hr)
 * - Auto-expires after duration
 * - Shows countdown timer when active
 * - Can be cancelled early
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { safeGetViewerLatLng } from '@/utils/geolocation';

const DURATION_OPTIONS = [
  { value: 15, label: '15 min', color: '#39FF14' },
  { value: 30, label: '30 min', color: '#00D9FF' },
  { value: 60, label: '1 hour', color: '#FFEB3B' },
  { value: 120, label: '2 hours', color: '#E62020' },
];

const LS_KEY = 'hm_temp_location_share';

export default function TemporaryLocationShare({ currentUser, compact = false }) {
  const [isActive, setIsActive] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [starting, setStarting] = useState(false);

  // Load saved state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const { expiresAt: savedExpiry } = JSON.parse(saved);
        const expiry = new Date(savedExpiry);
        if (expiry > new Date()) {
          setIsActive(true);
          setExpiresAt(expiry);
        } else {
          localStorage.removeItem(LS_KEY);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!isActive || !expiresAt) return;

    const tick = () => {
      const now = new Date();
      const remaining = expiresAt.getTime() - now.getTime();
      
      if (remaining <= 0) {
        handleExpire();
      } else {
        setRemainingMs(remaining);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isActive, expiresAt]);

  const handleExpire = useCallback(async () => {
    setIsActive(false);
    setExpiresAt(null);
    setRemainingMs(0);
    localStorage.removeItem(LS_KEY);

    // Clear location from profile
    if (currentUser?.email) {
      try {
        await base44.auth.updateMe({
          temp_location_sharing: false,
          temp_location_expires: null,
        });
      } catch {
        // ignore
      }
    }

    toast.info('Location sharing has expired');
  }, [currentUser]);

  const startSharing = async (durationMinutes) => {
    if (!currentUser) {
      toast.error('Please sign in to share your location');
      return;
    }

    setStarting(true);
    setShowDurationPicker(false);

    try {
      // Get current location
      const location = await safeGetViewerLatLng(
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        { retries: 2, logKey: 'temp-share' }
      );

      if (!location) {
        toast.error('Could not get your location. Please enable location services.');
        setStarting(false);
        return;
      }

      const expiry = new Date(Date.now() + durationMinutes * 60 * 1000);

      // Save to user profile
      await base44.auth.updateMe({
        lat: location.lat,
        lng: location.lng,
        temp_location_sharing: true,
        temp_location_expires: expiry.toISOString(),
        location_updated_at: new Date().toISOString(),
      });

      // Save to localStorage for persistence
      localStorage.setItem(LS_KEY, JSON.stringify({
        expiresAt: expiry.toISOString(),
      }));

      setIsActive(true);
      setExpiresAt(expiry);
      toast.success(`Sharing location for ${durationMinutes} minutes`);
    } catch (error) {
      console.error('Failed to start location sharing:', error);
      toast.error('Failed to share location');
    } finally {
      setStarting(false);
    }
  };

  const stopSharing = async () => {
    try {
      if (currentUser?.email) {
        await base44.auth.updateMe({
          temp_location_sharing: false,
          temp_location_expires: null,
        });
      }
    } catch {
      // ignore
    }

    setIsActive(false);
    setExpiresAt(null);
    setRemainingMs(0);
    localStorage.removeItem(LS_KEY);
    toast.info('Location sharing stopped');
  };

  const formatRemaining = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Compact mode for nav/header
  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => isActive ? stopSharing() : setShowDurationPicker(true)}
          className={`
            p-2 rounded-lg transition-all
            ${isActive 
              ? 'bg-[#39FF14]/20 text-[#39FF14] animate-pulse' 
              : 'text-white/60 hover:text-white hover:bg-white/5'
            }
          `}
          aria-label={isActive ? 'Stop sharing location' : 'Share location temporarily'}
        >
          <MapPin className="w-5 h-5" />
        </button>

        {isActive && (
          <span className="absolute -top-1 -right-1 px-1 text-[10px] font-bold bg-[#39FF14] text-black rounded">
            {formatRemaining(remainingMs)}
          </span>
        )}

        <AnimatePresence>
          {showDurationPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 bg-black border-2 border-white/20 p-3 z-50 min-w-[200px]"
            >
              <p className="text-xs text-white/60 uppercase tracking-wider mb-3">Share for:</p>
              <div className="space-y-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => startSharing(opt.value)}
                    disabled={starting}
                    className="w-full text-left px-3 py-2 border border-white/10 hover:border-white/30 transition-all flex items-center justify-between"
                    style={{ borderLeftColor: opt.color, borderLeftWidth: 3 }}
                  >
                    <span className="text-sm font-bold">{opt.label}</span>
                    <Clock className="w-4 h-4 text-white/40" />
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowDurationPicker(false)}
                className="mt-3 w-full text-center text-xs text-white/40 hover:text-white/60"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full card mode
  return (
    <div className="bg-white/5 border-2 border-white/10 p-6">
      <div className="flex items-start gap-4">
        <div className={`
          w-12 h-12 flex items-center justify-center border-2
          ${isActive ? 'bg-[#39FF14]/20 border-[#39FF14]' : 'bg-white/5 border-white/20'}
        `}>
          <MapPin className={`w-6 h-6 ${isActive ? 'text-[#39FF14]' : 'text-white/60'}`} />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-black uppercase mb-1">
            {isActive ? 'SHARING LOCATION' : 'SHARE LOCATION'}
          </h3>
          
          {isActive ? (
            <>
              <div className="flex items-center gap-2 text-[#39FF14] mb-3">
                <Clock className="w-4 h-4" />
                <span className="font-mono font-bold">{formatRemaining(remainingMs)} remaining</span>
              </div>
              <p className="text-white/60 text-sm mb-4">
                Your location is visible to nearby users. It will automatically stop when the timer ends.
              </p>
              <Button
                onClick={stopSharing}
                variant="glass"
                className="border-red-500/40 text-red-400 font-black uppercase text-xs"
              >
                <X className="w-4 h-4 mr-2" />
                Stop Sharing
              </Button>
            </>
          ) : (
            <>
              <p className="text-white/60 text-sm mb-4">
                Temporarily share your location with nearby users. Auto-expires after the selected duration.
              </p>

              {showDurationPicker ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {DURATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => startSharing(opt.value)}
                        disabled={starting}
                        className="px-4 py-3 border-2 border-white/10 hover:border-white/30 transition-all text-center disabled:opacity-50"
                        style={{ borderLeftColor: opt.color, borderLeftWidth: 4 }}
                      >
                        <span className="text-sm font-black uppercase">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowDurationPicker(false)}
                    className="text-xs text-white/40 hover:text-white/60"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <Button
                  onClick={() => setShowDurationPicker(true)}
                  disabled={!currentUser}
                  variant="glass"
                  className="border-[#39FF14]/40 text-[#39FF14] font-black uppercase text-xs"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Start Sharing
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Privacy note */}
      <div className="mt-4 pt-4 border-t border-white/10 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-[#FFEB3B] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-white/40">
          Your location uses a 500m privacy grid. Exact coordinates are never shared.
        </p>
      </div>
    </div>
  );
}

// Export a hook for checking if user is sharing
export function useTemporaryLocationShare() {
  const [isSharing, setIsSharing] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const { expiresAt: savedExpiry } = JSON.parse(saved);
        const expiry = new Date(savedExpiry);
        if (expiry > new Date()) {
          setIsSharing(true);
          setExpiresAt(expiry);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  return { isSharing, expiresAt };
}
