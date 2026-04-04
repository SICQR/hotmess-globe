/**
 * sendPush — Client-side helper to trigger a push notification via Edge Function
 *
 * This calls the Supabase Edge Function send-push to deliver web push
 * notifications to a specific user.
 *
 * REQUIREMENTS:
 *   - VAPID keys must be set in Supabase dashboard (Settings → Edge Functions)
 *   - User must have a push subscription in the push_subscriptions table
 *   - Browser must have granted notification permission
 *
 * USAGE:
 *   import { sendPush } from '@/lib/notifications/sendPush';
 *
 *   // Send notification
 *   await sendPush(userId, {
 *     title: "Someone Boo'd you 👻",
 *     body: "Open Ghosted to see",
 *     url: "/ghosted",
 *     tag: "hotmess-boo",
 *   });
 *
 * ERROR HANDLING:
 *   sendPush does not throw. Errors are logged to console.debug.
 *   This prevents a single failed notification from breaking the app.
 */

/**
 * sendPush — Trigger a web push notification for a user
 *
 * @param userId - Target user's UUID
 * @param notification - Notification details
 *   - title: Short title (required)
 *   - body: Notification body (required)
 *   - url: URL to navigate to on click (default: "/")
 *   - tag: Deduplication tag (default: "hotmess")
 *   - icon: Icon URL (default: service worker default)
 */
export async function sendPush(
  userId: string,
  notification: {
    title: string;
    body: string;
    url?: string;
    tag?: string;
    icon?: string;
  }
): Promise<void> {
  const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`;

  if (!EDGE_FN_URL) {
    console.warn('[sendPush] Supabase config missing');
    return;
  }

  // Use the user's session JWT (not anon key) — the Edge Function accepts user
  // JWTs for self-notifications. Server-side callers use the service role key.
  let authToken: string | null = null;
  try {
    const { supabase } = await import('@/components/utils/supabaseClient');
    const { data: { session } } = await supabase.auth.getSession();
    authToken = session?.access_token ?? null;
  } catch { /* non-fatal */ }

  if (!authToken) {
    console.warn('[sendPush] No auth session — skipping push');
    return;
  }

  try {
    const response = await fetch(EDGE_FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        user_id: userId,
        title: notification.title,
        body: notification.body,
        url: notification.url || '/',
        tag: notification.tag || 'hotmess',
        icon: notification.icon,
      }),
    });

    if (!response.ok) {
      return;
    }

    await response.json();
  } catch {
    // Network error — fire-and-forget push
  }
}

/**
 * sendPushBulk — Send same notification to multiple users
 *
 * Sends notifications in parallel. Non-blocking on failures.
 *
 * @param userIds - Array of user UUIDs
 * @param notification - Notification details (same as sendPush)
 */
export async function sendPushBulk(
  userIds: string[],
  notification: {
    title: string;
    body: string;
    url?: string;
    tag?: string;
    icon?: string;
  }
): Promise<void> {
  await Promise.all(userIds.map(userId => sendPush(userId, notification)));
}
