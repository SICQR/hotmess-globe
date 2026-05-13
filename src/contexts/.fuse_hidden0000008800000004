/**
 * SOSContext — loud panic-button SOS surface.
 *
 * Type semantics across the codebase:
 *   'sos'     → THIS surface — immediate panic-button trigger
 *   'get_out' → Care 3-second-hold surface (api/safety/get-out.js, discreet)
 * Both produce the same downstream cascade; only the audit type differs.
 */
import React, { createContext, useContext, useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

interface SOSContextValue {
  sosActive: boolean;
  showRecovery: boolean;
  triggerSOS: (options?: { silent?: boolean }) => Promise<void>;
  triggerTheExit: () => void;
  triggerTheDisappear: () => void;
  clearSOS: () => void;
  dismissRecovery: () => void;
}

const SOSContext = createContext<SOSContextValue>({
  sosActive: false,
  showRecovery: false,
  triggerSOS: async () => { },
  triggerTheExit: () => { },
  triggerTheDisappear: () => { },
  clearSOS: () => { },
  dismissRecovery: () => { },
});

export function SOSProvider({ children }: { children: React.ReactNode }) {
  const [sosActive, setSosActive] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  const triggerSOS = async (options = { silent: true }) => {
    // 1. Technical lock to prevent double-firing
    if (sosActive) return;
    setSosActive(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn('[SOS] no session — cannot trigger');
        return;
      }

      // 2. Immediate Location Capture (best-effort)
      const position = await new Promise<GeolocationCoordinates | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });

      // 3. POST to /api/safety/sos — server writes safety_events + invokes the
      // multi-channel dispatcher (Mode A fan-out). The legacy client-side
      // outbox writes have been removed; the dispatcher is the single source
      // of truth for fan-out across push/sms/whatsapp/email/voice.
      const res = await fetch('/api/safety/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          lat: position?.latitude ?? null,
          lng: position?.longitude ?? null,
          trigger: 'silent_gesture',
        }),
      });
      if (!res.ok) {
        console.error('[SOS] /api/safety/sos failed:', res.status);
      } else {
        console.log('[InvisibleSafety] SOS Triggered Silently');
      }

      if (!options.silent) {
        // Only if explicitly requested (e.g. from Hub)
        // setShowRecovery(true);
      }
    } catch (err) {
      console.error('[SOS] Silent trigger failed:', err);
    } finally {
      // In invisible mode, we reset state quickly but keep the 'event' logged
      setTimeout(() => setSosActive(false), 2000);
    }
  };

  const triggerTheExit = () => {
    console.log('[InvisibleSafety] The Exit Triggered (Fake Call)');
    window.dispatchEvent(new CustomEvent('hm:trigger-fake-call', {
      detail: { delay: 0 }
    }));
  };

  const triggerTheDisappear = () => {
    console.log('[InvisibleSafety] The Disappear Triggered (Stealth Wipe)');
    // 1. Clear sensitive localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.startsWith('hm_') || k.startsWith('hm.')) localStorage.removeItem(k);
    });
    sessionStorage.clear();

    // 2. Haptic confirmation (Heavy)
    if (navigator?.vibrate) navigator.vibrate([100, 50, 100]);

    // 3. Stealth Redirect
    window.location.replace('/safe');
  };

  const clearSOS = () => {
    setSosActive(false);
    setShowRecovery(true);
  };

  const dismissRecovery = () => setShowRecovery(false);
  return (
    <SOSContext.Provider value={{
      sosActive,
      showRecovery,
      triggerSOS,
      triggerTheExit,
      triggerTheDisappear,
      clearSOS,
      dismissRecovery
    }}>
      {children}
    </SOSContext.Provider>
  );
}

export function useSOSContext() {
  return useContext(SOSContext);
}

export default SOSContext;
