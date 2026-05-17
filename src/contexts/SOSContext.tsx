/**
 * SOSContext — loud panic-button SOS surface.
 *
 * Type semantics across the codebase:
 *   'sos'     → THIS surface — immediate panic-button trigger
 *   'get_out' → Care 3-second-hold surface (api/safety/get-out.js, discreet)
 * Both produce the same downstream cascade; only the audit type differs.
 *
 * SAFETY-CRITICAL DISABLED STATE (2026-05-17, Glen incident):
 *   When VITE_SOS_ENABLED !== 'true', triggerSOS short-circuits — it does
 *   NOT call /api/safety/sos (which was writing to safety_events with
 *   delivery_status=NULL and ZERO downstream dispatch — Phil received
 *   nothing on any channel despite Glen pressing 8 times in 90 seconds).
 *   Instead, the gate raises a Crisis Resources sheet with one-tap dial
 *   to UK Samaritans (116 123), LGBT+ Switchboard (0300 330 0630) and 999.
 *   This is the only acceptable behaviour while Sprint 1 #01 notification
 *   routing is being deployed to prod. SOS re-enables only after Phil's
 *   explicit go following three confirmed end-to-end test deliveries.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

// Default OFF unless explicitly enabled. Belt-and-braces with the Vercel env
// flag — even if someone forgets to set VITE_SOS_ENABLED, the safe state is
// disabled. Phil flips to 'true' on Vercel only after Layer 3 verification.
const SOS_ENABLED = import.meta.env.VITE_SOS_ENABLED === 'true';

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
  // Crisis-resources sheet — opens whenever the disabled SOS button is pressed
  const [crisisOpen, setCrisisOpen] = useState(false);

  // Also listen for an external event so ANY surface that wants to surface
  // the crisis resources (a top-bar banner, a settings link, the disabled
  // SOS FAB) can fire it without needing a context handle.
  useEffect(() => {
    const onShow = () => setCrisisOpen(true);
    window.addEventListener('hm:show-crisis-resources', onShow as EventListener);
    return () => window.removeEventListener('hm:show-crisis-resources', onShow as EventListener);
  }, []);

  const triggerSOS = async (options = { silent: true }) => {
    // SAFETY GATE — if SOS is disabled at the env level, do NOT touch
    // /api/safety/sos. Surface crisis resources instead. This is the
    // path Glen would have hit had the gate been in place when he pressed.
    if (!SOS_ENABLED) {
      console.warn('[SOS] disabled (VITE_SOS_ENABLED!=true) — opening crisis resources instead.');
      setCrisisOpen(true);
      // Light haptic so the user has SOME feedback even in disabled mode.
      try { if (navigator?.vibrate) navigator.vibrate(120); } catch { /* noop */ }
      return;
    }

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
      {!SOS_ENABLED && crisisOpen && (
        // CRISIS RESOURCES SHEET — overlay shown when a disabled-SOS press fires.
        // Goal: human in distress sees real help in < 1s, every option is
        // one-tap dial. Brief copy from EMERGENCY_P0_SOS_safety_restore.md.
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Crisis support resources"
          className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setCrisisOpen(false); }}
        >
          <div className="w-full max-w-md bg-[#0A0A0A] border border-[#C8962C]/40 rounded-2xl p-6 shadow-2xl">
            <div className="text-xs uppercase tracking-[0.12em] text-[#C8962C] mb-2">HOTMESS Safety</div>
            <h2 className="text-xl font-medium text-white mb-1">SOS is being upgraded</h2>
            <p className="text-sm text-white/70 mb-5 leading-relaxed">
              The HOTMESS SOS dispatcher is offline while we ship a fix.
              <strong className="text-white"> If you need help right now, use one of these:</strong>
            </p>
            <div className="space-y-2 mb-5">
              <a
                href="tel:116123"
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-white text-black font-medium hover:opacity-90 transition-opacity"
              >
                <span>Samaritans — listening support</span>
                <span className="text-sm text-black/60">116&nbsp;123</span>
              </a>
              <a
                href="tel:03003300630"
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-white text-black font-medium hover:opacity-90 transition-opacity"
              >
                <span>LGBT+ Switchboard</span>
                <span className="text-sm text-black/60">0300&nbsp;330&nbsp;0630</span>
              </a>
              <a
                href="tel:999"
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:opacity-90 transition-opacity"
              >
                <span>Police / ambulance — emergencies</span>
                <span className="text-sm text-white/90">999</span>
              </a>
            </div>
            <p className="text-xs text-white/40 mb-4 leading-relaxed">
              Tap any number to dial. These are external services &mdash; HOTMESS does not record or
              monitor the calls. Your HOTMESS trusted contacts are NOT being notified right now;
              we&apos;ll restore that as soon as the dispatcher is verified working end-to-end.
            </p>
            <button
              type="button"
              onClick={() => setCrisisOpen(false)}
              className="w-full py-2 text-sm text-white/60 hover:text-white/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </SOSContext.Provider>
  );
}

export function useSOSContext() {
  return useContext(SOSContext);
}

export default SOSContext;
