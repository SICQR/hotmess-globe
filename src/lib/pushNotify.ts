/**
 * pushNotify — fire-and-forget web push delivery via notify-push Edge Function.
 *
 * Called after boos, new messages, SOS — anything that should
 * wake the recipient's device even when the tab is closed.
 *
 * Requires: the caller to be authenticated (JWT in Supabase session).
 */

import { supabase } from '@/components/utils/supabaseClient';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL &&
  `https://${import.meta.env.VITE_SUPABASE_URL}.supabase.co`;

interface PushPayload {
  emails: string[];
  title: string;
  body: string;
  tag?: string;
  url?: string;
  icon?: string;
}

/**
 * Send a push notification to one or more users by email.
 * Fire-and-forget — never throws, never blocks the UI.
 */
export async function pushNotify(payload: PushPayload): Promise<void> {
  try {
    if (!payload.emails?.length || !payload.title || !payload.body) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const url = SUPABASE_URL
      ? `${SUPABASE_URL}/functions/v1/notify-push`
      : null;

    if (!url) {
      console.warn('[pushNotify] SUPABASE_URL not configured');
      return;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        emails: payload.emails,
        title: payload.title,
        body: payload.body,
        tag: payload.tag ?? 'hotmess',
        url: payload.url ?? '/',
        icon: payload.icon ?? '/icons/icon-192.png',
      }),
    });

    if (!res.ok) {
      console.warn(`[pushNotify] ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    // Never throw — push is best-effort
    console.warn('[pushNotify] failed:', err);
  }
}

export default pushNotify;
