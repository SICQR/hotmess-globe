import { useEffect, useRef } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BFWgyAvJsZf4wZavZ-6X6c934k13RiYwjeEEIgQeOK0PyrBbvcJrqLL9llzV2Phee9GDOLpSVPSvGIja5eyr5WY';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * usePushNotifications (auto-setup)
 *
 * Registers the SW and — if permission is already granted (via onboarding step 3)
 * — subscribes and stores all fields in push_subscriptions.
 * Does NOT call requestPermission() itself; that fires from OnboardingGate step 3.
 */
export function usePushNotifications(): void {
  const subscribed = useRef(false);

  useEffect(() => {
    if (subscribed.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Cleanup for the auto-update listeners/timer set up inside setup().
    let cleanupAutoUpdate: () => void = () => {};

    const setup = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');

        // Surface a "new version available" signal so the app shell can
        // prompt the user to refresh. SWUpdateBanner listens for the custom
        // event and renders a sonner toast with a Refresh action.
        // First-install case (no existing controller) intentionally skipped
        // — the page is already on the fresh code, no prompt needed.
        reg.addEventListener('updatefound', () => {
          const newSw = reg.installing;
          if (!newSw) return;
          newSw.addEventListener('statechange', () => {
            if (newSw.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent('hm_sw_update_available'));
            }
          });
        });

        // ── Auto-update: keep open tabs on the latest deploy ────────────────
        // The app shell is network-first, but an open tab only re-fetches
        // sw.js on navigation — so a tab left open across a deploy keeps the
        // stale bundle until a manual hard-refresh. Poll for a new SW and
        // reload once when it takes control. Guard on an existing controller
        // so a first-time visitor is never reloaded out from under themselves.
        if (navigator.serviceWorker.controller) {
          let refreshing = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
          });
        }
        const pollUpdate = () => { reg.update().catch(() => {}); };
        const updateTimer = window.setInterval(pollUpdate, 60_000);
        const onVisible = () => { if (!document.hidden) pollUpdate(); };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', pollUpdate);
        cleanupAutoUpdate = () => {
          window.clearInterval(updateTimer);
          document.removeEventListener('visibilitychange', onVisible);
          window.removeEventListener('focus', pollUpdate);
        };

        if (Notification.permission !== 'granted') {
          subscribed.current = true;
          return;
        }

        const existing = await reg.pushManager.getSubscription();
        const sub =
          existing ||
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
          }));

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const subJson = sub.toJSON();
            await supabase
              .from('push_subscriptions')
              .upsert(
                {
                  user_id: user.id,
                  user_email: user.email,
                  endpoint: sub.endpoint,
                  keys: subJson.keys ?? null,
                  subscription: subJson,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'endpoint' } // table's unique key is endpoint (one row per device); user_id has no unique constraint — 'user_id' here made PostgREST 400 every upsert
              )
              .select();
          }
        } catch (dbErr) {
          console.warn('[Push] push_subscriptions upsert skipped:', dbErr);
        }

        subscribed.current = true;
      } catch (e) {
        console.warn('[Push] Push setup failed:', e);
      }
    };

    setup();

    return () => { cleanupAutoUpdate(); };
  }, []);
}

export default usePushNotifications;
