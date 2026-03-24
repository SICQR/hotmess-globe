/**
 * LocationPermissionScreen — Geolocation permission + final onboarding writes.
 * Marks onboarding_complete, writes presence, navigates to /ghosted.
 */
import React, { useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { Loader2, MapPin } from 'lucide-react';

const GOLD = '#C8962C';

export default function LocationPermissionScreen({ session, onComplete }) {
  const [loading, setLoading] = useState(false);

  const userId = session?.user?.id;

  const finalizeOnboarding = async (coords) => {
    try {
      // Update profile with location (if granted) and mark complete
      const locationFields = coords
        ? {
            consent_location: true,
            location_opt_in: true,
            has_consented_gps: true,
            last_lat: coords.latitude,
            last_lng: coords.longitude,
            last_loc_ts: new Date().toISOString(),
            loc_accuracy_m: Math.round(coords.accuracy),
          }
        : {};

      await supabase
        .from('profiles')
        .update({
          ...locationFields,
          onboarding_complete: true,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          onboarding_stage: 'complete',
          is_online: true,
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      // Write initial presence
      await supabase.from('presence').upsert(
        {
          user_id: userId,
          mode: 'ghosted',
          lat: coords?.latitude ?? 0,
          lng: coords?.longitude ?? 0,
          status: 'live',
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          metadata: { onboarding: true },
        },
        { onConflict: 'user_id' }
      );

      // Also set localStorage age key for BootGuardContext fallback
      try {
        localStorage.setItem('hm_age_confirmed_v1', 'true');
        localStorage.setItem('hm_community_attested_v1', 'true');
      } catch {}

      onComplete();
    } catch (err) {
      console.error('[LocationPermission] finalize error:', err);
      // Still complete even on error — user shouldn't be stuck
      onComplete();
    }
  };

  const handleEnable = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        finalizeOnboarding(position.coords);
      },
      () => {
        // Denied or error — complete without location
        finalizeOnboarding(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSkip = () => {
    setLoading(true);
    finalizeOnboarding(null);
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs text-center">
        <MapPin className="w-10 h-10 mx-auto mb-6" style={{ color: GOLD }} />

        <h2 className="text-white text-xl font-bold mb-3">
          Hotmess shows you who's nearby.
        </h2>
        <p className="text-white/40 text-sm mb-10">
          We never share your exact position.
        </p>

        <button
          onClick={handleEnable}
          disabled={loading}
          className="w-full py-4 rounded-lg text-black font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-opacity mb-3"
          style={{
            backgroundColor: GOLD,
            opacity: loading ? 0.3 : 1,
          }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enable Location'}
        </button>

        <button
          onClick={handleSkip}
          disabled={loading}
          className="w-full py-3 text-sm font-medium"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
