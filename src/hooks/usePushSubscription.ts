/**
 * usePushSubscription — browser Web Push subscribe/unsubscribe.
 *
 * Doctrine (Phil 2026-05-26): opt-in only. This hook NEVER calls subscribe()
 * automatically — only on explicit user action. Permission prompt only fires
 * inside subscribe() when the user has clicked.
 *
 * iOS PWA caveat: silently fails when not installed as PWA. Don't add
 * detection logic — the failure path is graceful.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

type Result = { ok: boolean; error?: string };

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function detectPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
}

export function usePushSubscription() {
  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const [permission, setPermission] = useState<NotificationPermission>(
    isSupported ? detectPermission() : 'denied'
  );
  const [subscribed, setSubscribed] = useState<boolean>(false);

  // Check current subscription state on mount + when permission changes.
  useEffect(() => {
    if (!isSupported) return;
    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setSubscribed(!!sub);
      } catch {
        if (!cancelled) setSubscribed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSupported, permission]);

  const subscribe = useCallback(async (): Promise<Result> => {
    if (!isSupported) return { ok: false, error: 'not_supported' };
    const vapidPublic = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublic) return { ok: false, error: 'vapid_not_configured' };

    try {
      // Permission — only request if 'default'. Never auto-prompt elsewhere.
      let perm = detectPermission();
      if (perm === 'default') {
        perm = await Notification.requestPermission();
        setPermission(perm);
      }
      if (perm !== 'granted') return { ok: false, error: 'permission_denied' };

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublic),
        });
      }

      // POST to server with the user's JWT
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess?.session?.access_token;
      if (!accessToken) return { ok: false, error: 'not_authenticated' };

      const subscription = sub.toJSON();
      const resp = await fetch('/api/notifications/push-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          subscription,
          user_agent: navigator.userAgent,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        return { ok: false, error: `server_${resp.status}: ${text.slice(0, 120)}` };
      }
      setSubscribed(true);
      return { ok: true };
    } catch (e: any) {
      const msg = String(e?.message || e || 'unknown');
      return { ok: false, error: msg };
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<Result> => {
    if (!isSupported) return { ok: false, error: 'not_supported' };
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      setSubscribed(false);
      // We don't delete the row server-side here — next subscribe upserts via
      // UNIQUE(user_id, endpoint), and the row is dropped automatically on
      // 410 Gone the next time push-send tries it.
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) };
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    subscribed,
    subscribe,
    unsubscribe,
  };
}

export default usePushSubscription;
