import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

/**
 * usePushSubscription — explicit user-action browser push subscribe/unsubscribe.
 *
 * Notification stack PR 2 of 4 (Phil brief 2026-05-26).
 *
 * Does NOT auto-subscribe. The caller (e.g. settings sheet, onboarding step)
 * must invoke subscribe() in response to a user gesture.
 *
 * iOS PWA caveat: on non-installed iOS Safari, pushManager.subscribe()
 * throws. We surface that as { ok: false, error } and silently no-op rather
 * than crashing the caller.
 */

const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData =
    typeof window !== 'undefined' && typeof window.atob === 'function'
      ? window.atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out;
}

export interface PushSubscriptionHookResult {
  isSupported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  subscribe: () => Promise<{ ok: boolean; error?: string }>;
  unsubscribe: () => Promise<{ ok: boolean; error?: string }>;
}

export function usePushSubscription(): PushSubscriptionHookResult {
  const isSupported =
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'serviceWorker' in navigator;

  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscribed, setSubscribed] = useState<boolean>(false);

  // Best-effort read current SW subscription state on mount
  useEffect(() => {
    if (!isSupported) return;
    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (!cancelled) setSubscribed(!!existing);
      } catch {
        if (!cancelled) setSubscribed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!isSupported) return { ok: false, error: 'unsupported' };
    if (!VAPID_PUBLIC_KEY) return { ok: false, error: 'vapid_not_configured' };

    try {
      // Only request permission if it's currently 'default'.
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        const next = await Notification.requestPermission();
        setPermission(next);
        if (next !== 'granted') return { ok: false, error: 'permission_denied' };
      } else if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        return { ok: false, error: 'permission_denied' };
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
        });
      }

      const subJson = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const endpoint = sub.endpoint || subJson.endpoint;
      const p256dh = subJson.keys?.p256dh;
      const auth = subJson.keys?.auth;
      if (!endpoint || !p256dh || !auth) {
        return { ok: false, error: 'incomplete_subscription' };
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return { ok: false, error: 'not_authenticated' };

      const res = await fetch('/api/notifications/push-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          subscription: { endpoint, keys: { p256dh, auth } },
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        }),
      });

      if (!res.ok) {
        let detail = `http_${res.status}`;
        try {
          const j = await res.json();
          if (j?.error) detail = String(j.error);
        } catch { /* ignore */ }
        return { ok: false, error: detail };
      }

      setSubscribed(true);
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: msg || 'subscribe_failed' };
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!isSupported) return { ok: false, error: 'unsupported' };
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
      }
      // Per brief: don't bother deleting the DB row — UNIQUE(user_id, endpoint)
      // means the next subscribe() will replace it. Just unsubscribe locally.
      setSubscribed(false);
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: msg || 'unsubscribe_failed' };
    }
  }, [isSupported]);

  return { isSupported, permission, subscribed, subscribe, unsubscribe };
}

export default usePushSubscription;
