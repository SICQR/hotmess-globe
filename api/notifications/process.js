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

/**
 * Map notification types to preference categories
 */
const NOTIFICATION_CATEGORY_MAP = {
  // Message-related
  new_message: 'message_updates',
  message_received: 'message_updates',
  chat_message: 'message_updates',
  
  // Social/engagement (always allowed - no opt-out for engagement)
  new_follower: null, // Always send
  post_like: null,
  post_comment: null,
  profile_views: null,
  
  // Event-related
  event_reminder: 'event_updates',
  event_rsvp: 'event_updates',
  event_update: 'event_updates',
  event_cancelled: 'event_updates',
  
  // Order/marketplace
  order_confirmation: 'order_updates',
  order_shipped: 'order_updates',
  order_delivered: 'order_updates',
  payment_received: 'order_updates',
  product_purchased: 'order_updates',
  
  // Safety (always send)
  emergency: 'safety_updates',
  sos: 'safety_updates',
  safety_alert: 'safety_updates',
  
  // Marketing
  promotion: 'marketing_enabled',
  newsletter: 'marketing_enabled',
  
  // Premium/content
  content_unlocked: 'order_updates',
  new_subscriber: 'order_updates',
  subscription_renewed: 'order_updates',
  xp_credited: null, // Always send
};

/**
 * Check if notification should be sent based on user preferences
 */
function shouldSendNotification(preferences, notificationType) {
  // If no preferences set, default to allowing all
  if (!preferences) return true;
  
  const category = NOTIFICATION_CATEGORY_MAP[notificationType];
  
  // If notification type not mapped or mapped to null, always send
  if (category === undefined || category === null) return true;
  
  // Check the specific preference
  return preferences[category] !== false;
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
    console.warn('[NotificationProcessor] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    send(res, 200, { success: true, message: 'Notification processing skipped (missing Supabase env)', processed: 0 });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Fetch queued notifications (limit to 100 per run)
    const { data: queuedNotifications, error: fetchError } = await supabase
      .from('notification_outbox')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error('[NotificationProcessor] Fetch error:', fetchError);
      send(res, 500, { error: 'Failed to fetch notifications' });
      return;
    }

    if (!queuedNotifications?.length) {
      send(res, 200, { success: true, message: 'No queued notifications', processed: 0 });
      return;
    }

    console.log(`[NotificationProcessor] Processing ${queuedNotifications.length} notifications`);

    let processed = 0;
    let errors = 0;

    // Batch fetch preferences for all users in this batch
    const userEmails = [...new Set(queuedNotifications.map(n => n.user_email).filter(Boolean))];
    const { data: allPreferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .in('user_email', userEmails);
    
    const prefsMap = new Map((allPreferences || []).map(p => [p.user_email, p]));

    for (const notification of queuedNotifications) {
      try {
        // Check user preferences before sending
        const userPrefs = prefsMap.get(notification.user_email);
        if (!shouldSendNotification(userPrefs, notification.notification_type)) {
          // User has opted out of this notification type - mark as blocked
          await supabase
            .from('notification_outbox')
            .update({ status: 'blocked', updated_at: new Date().toISOString() })
            .eq('id', notification.id);
          continue;
        }

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
          console.error(`[NotificationProcessor] Failed to create notification for ${notification.user_email}:`, notifError);
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
          console.error(`[NotificationProcessor] Failed to update status for ${notification.id}:`, updateError);
          errors++;
        } else {
          processed++;
        }

      } catch (error) {
        console.error(`[NotificationProcessor] Error processing notification ${notification.id}:`, error);
        
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
    console.error('[NotificationProcessor] Error:', error);
    send(res, 500, { error: 'Internal server error', message: error.message });
  }
}

/**
 * Send web push notifications to user's subscribed devices.
 * Uses VAPID keys and push_subscriptions; env from Vercel.
 */
async function sendPushNotifications(supabase, notification) {
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPrivate) return;
  if (!notification.user_email || notification.user_email === 'admin') return;

  try {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, keys')
      .eq('user_email', notification.user_email);
    if (!subs?.length) return;

    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    if (!vapidPublic) return;

    try {
      webPush.setVapidDetails('mailto:noreply@hotmess.london', vapidPublic, vapidPrivate);
    } catch (e) {
      console.warn('[NotificationProcessor] Invalid VAPID keys, skip push:', e?.message);
      return;
    }

    const payload = JSON.stringify({
      title: notification.title || 'HOTMESS',
      body: notification.message || 'You have a new notification',
      icon: '/favicon.svg',
      tag: `n-${notification.id}`,
      data: { url: notification.metadata?.link || '/', id: notification.id },
    });

    for (const row of subs) {
      try {
        const keys = typeof row.keys === 'string' ? JSON.parse(row.keys) : row.keys || {};
        await webPush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
          payload,
          { TTL: 86400 }
        );
      } catch (err) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', row.endpoint);
        }
        console.warn('[NotificationProcessor] Push failed for', row.endpoint, err?.message);
      }
    }
  } catch (e) {
    console.warn('[NotificationProcessor] Push lookup/send error:', e?.message);
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(notification) {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.log(`[NotificationProcessor] Would send email to ${notification.user_email} (no API key)`);
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
      console.error(`[NotificationProcessor] Email failed for ${notification.user_email}:`, error);
    } else {
      console.log(`[NotificationProcessor] Email sent to ${notification.user_email}`);
    }
  } catch (error) {
    console.error(`[NotificationProcessor] Email error:`, error);
  }
}

// Vercel config for cron
export const config = {
  maxDuration: 30, // 30 second timeout
};
