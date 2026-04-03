/**
 * Vercel API Route: Process Notification Outbox
 *
 * Processes queued notifications from notification_outbox.
 * Creates in-app notifications, sends push (web-push) when subscribed, sends email for important types.
 *
 * Trigger: Vercel Cron /api/notifications/process (vercel.json) or manual GET/POST.
 */

import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';
import { json, getEnv } from '../shopify/_utils.js';

const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

function send(res, status, body) {
  json(res, status, body);
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    send(res, 405, { error: 'Method not allowed' });
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const auth = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (cronSecret && auth !== `Bearer ${cronSecret}` && process.env.NODE_ENV === 'production') {
    send(res, 401, { error: 'Unauthorized' });
    return;
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    send(res, 200, { success: true, message: 'Notification processing skipped (missing Supabase env)', processed: 0 });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Fetch pending/queued notifications (both status values used in codebase)
    const { data: queuedNotifications, error: fetchError } = await supabase
      .from('notification_outbox')
      .select('*')
      .in('status', ['queued', 'pending'])
      .order('created_at', { ascending: true })
      .limit(100);

    if (fetchError) {
      send(res, 500, { error: 'Failed to fetch notifications' });
      return;
    }

    if (!queuedNotifications?.length) {
      send(res, 200, { success: true, message: 'No queued notifications', processed: 0 });
      return;
    }


    let processed = 0;
    let errors = 0;

    for (const notification of queuedNotifications) {
      try {
        // 1. Create in-app notification (table uses "type", outbox uses "notification_type")
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_email: notification.user_email,
            type: notification.notification_type,
            title: notification.title || 'Notification',
            message: notification.message || '',
            link: notification.metadata?.link ?? null,
            metadata: notification.metadata || {},
            read: false,
            created_at: new Date().toISOString(),
            created_date: new Date().toISOString(),
          });

        if (notifError) {
          await supabase
            .from('notification_outbox')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', notification.id);
          errors++;
          continue;
        }

        // 2. Send push notifications (if user has subscriptions)
        await sendPushNotifications(supabase, notification);

        // 3. Send email for important notification types
        const emailTypes = ['emergency', 'sos', 'event_reminder', 'order_confirmation', 'payment_received'];
        if (emailTypes.includes(notification.notification_type)) {
          await sendEmailNotification(notification);
        }

        // 4. Update outbox status to sent
        const { error: updateError } = await supabase
          .from('notification_outbox')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', notification.id);

        if (updateError) {
          errors++;
        } else {
          processed++;
        }

      } catch (error) {
        
        // Mark as failed
        await supabase
          .from('notification_outbox')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', notification.id);
        
        errors++;
      }
    }

    send(res, 200, { success: true, processed, errors, total: queuedNotifications.length });
  } catch (error) {
    send(res, 500, { error: 'Internal server error', message: error.message });
  }
}

/**
 * Send web push notifications to user's subscribed devices.
 * Supports two storage strategies in push_subscriptions:
 *   - Flat columns: endpoint + keys (from usePushNotifications.jsx)
 *   - JSONB column: subscription (from usePushNotifications.ts)
 */
async function sendPushNotifications(supabase, notification) {
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPrivate) return;
  if (!notification.user_email || notification.user_email === 'admin') return;

  try {
    // Fetch subscription rows — support both user_email AND user_id lookup
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, keys, subscription, user_id')
      .eq('user_email', notification.user_email);

    // Fallback: look up via user_id when user_email not set on row
    let allSubs = subs || [];
    if (!allSubs.length && notification.user_id) {
      const { data: subsByUid } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, keys, subscription, user_id')
        .eq('user_id', notification.user_id);
      allSubs = subsByUid || [];
    }

    if (!allSubs.length) return;

    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    if (!vapidPublic) return;

    try {
      webPush.setVapidDetails('mailto:noreply@hotmess.london', vapidPublic, vapidPrivate);
    } catch (e) {
      return;
    }

    const pushPayload = JSON.stringify({
      title: notification.title || 'HOTMESS',
      body: notification.message || 'You have a new notification',
      icon: '/favicon.svg',
      tag: `n-${notification.id}`,
      data: { url: notification.metadata?.link || '/', id: notification.id },
    });

    for (const row of allSubs) {
      try {
        // Resolve endpoint + keys from whichever storage strategy was used
        let endpoint = row.endpoint;
        let keys = row.keys;

        if (!endpoint && row.subscription) {
          // JSONB subscription strategy (usePushNotifications.ts)
          const sub = typeof row.subscription === 'string'
            ? JSON.parse(row.subscription)
            : row.subscription;
          endpoint = sub?.endpoint;
          keys = sub?.keys;
        }

        if (!endpoint || !keys) continue;

        const parsedKeys = typeof keys === 'string' ? JSON.parse(keys) : keys;

        await webPush.sendNotification(
          { endpoint, keys: { p256dh: parsedKeys.p256dh, auth: parsedKeys.auth } },
          pushPayload,
          { TTL: 86400 }
        );
      } catch (err) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          // Subscription expired — clean it up
          await supabase.from('push_subscriptions').delete().eq('id', row.id);
        }
      }
    }
  } catch (e) {
    // Non-fatal
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(notification) {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    return;
  }

  // Skip if no valid email
  if (!notification.user_email || notification.user_email === 'admin') {
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'HOTMESS <noreply@hotmess.london>',
        to: [notification.user_email],
        subject: notification.title || 'Notification from HOTMESS',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #ec4899; margin-bottom: 10px;">${notification.title || 'HOTMESS Notification'}</h2>
            <p style="color: #333; line-height: 1.6;">${notification.message || ''}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              This notification was sent from HOTMESS. 
              <a href="https://hotmess.london/settings" style="color: #ec4899;">Manage your notification preferences</a>
            </p>
          </div>
        `,
        text: `${notification.title}\n\n${notification.message}`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
    } else {
    }
  } catch (error) {
  }
}

// Vercel config for cron
export const config = {
  maxDuration: 30, // 30 second timeout
};
