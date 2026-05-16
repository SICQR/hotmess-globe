/**
 * SWUpdateBanner — listens for the SW updatefound -> installed transition
 * (dispatched by usePushNotifications as `hm_sw_update_available`) and
 * surfaces a persistent sonner toast prompting the user to refresh.
 *
 * Tap on "Refresh" posts SKIP_WAITING to the waiting SW (the new version
 * sitting installed-but-not-yet-active behind the current controller) and
 * reloads. After the reload the new SW is active and serving the latest
 * bundle.
 *
 * Mount once near the global Toaster (App.jsx). Renders nothing.
 */
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export default function SWUpdateBanner() {
  // Guard so we don't stack multiple toasts if multiple updatefound events
  // fire (e.g. SW updates again while the banner is still visible).
  const shown = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onUpdate = () => {
      if (shown.current) return;
      shown.current = true;

      toast('New version available', {
        description: 'Tap Refresh to load the latest HOTMESS.',
        duration: Infinity,
        action: {
          label: 'Refresh',
          onClick: () => {
            // Find the waiting SW (the new one) and tell it to skipWaiting.
            // Posting SKIP_WAITING to the current `controller` would target
            // the OLD SW, which is a no-op for activation.
            navigator.serviceWorker?.getRegistration().then((reg) => {
              const waiting = reg?.waiting;
              if (waiting) {
                waiting.postMessage({ type: 'SKIP_WAITING' });
              }
              window.location.reload();
            }).catch(() => {
              // Fallback: reload anyway. The browser will pick up the new SW
              // on the next navigation regardless.
              window.location.reload();
            });
          },
        },
      });
    };

    window.addEventListener('hm_sw_update_available', onUpdate);
    return () => window.removeEventListener('hm_sw_update_available', onUpdate);
  }, []);

  return null;
}
