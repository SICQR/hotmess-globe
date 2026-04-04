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

    const setup = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');

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
                { onConflict: 'user_id' }
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
  }, []);
}

export default usePushNotifications;
