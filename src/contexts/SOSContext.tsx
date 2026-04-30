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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 2. Immediate Location Capture
      const position = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          reject,
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }).catch(() => null);

      // 3. Atomically log safety event
      const { data: event } = await supabase.from('safety_events').insert({
        user_id: user.id,
        event_type: 'sos',
        lat: position?.latitude,
        lng: position?.longitude,
        metadata: { trigger: 'silent_gesture' }
      }).select().single();

      // 4. Trigger Alerts to Trusted Contacts
      const { data: contacts } = await supabase
        .from('trusted_contacts')
        .select('*')
        .eq('user_id', user.id)
        .eq('notify_on_sos', true);

      const locStr = position
        ? `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`
        : 'Location unavailable';

      for (const contact of contacts || []) {
        if (contact.contact_phone) {
          await supabase.from('notification_outbox').insert({
            user_email: contact.contact_email || user.email,
            notification_type: 'sos_alert',
            title: '🆘 HOTMESS Safety Alert',
            message: `Your friend needs help right now. Last location: ${locStr}`,
            channel: 'whatsapp',
            metadata: {
              type: 'sos',
              user_id: user.id,
              user_name: user.email,
              location_str: locStr,
              contact_phone: contact.contact_phone,
              event_id: event?.id
            }
          });
        }
      }

      console.log('[InvisibleSafety] SOS Triggered Silently');

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
