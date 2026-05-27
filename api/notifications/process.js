/**
 * Vercel API Route: Process Notification Outbox
 *
 * Processes queued notifications from notification_outbox.
 * Creates in-app notifications, sends push (web-push) when subscribed, sends email for important types.
 *
 * Trigger: Vercel Cron /api/notifications/process (vercel.json) or manual GET/POST.
 */

import '../_silence-dep0169.js';
import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';
import { json, getEnv } from '../shopify/_utils.js';
import { sendTelegramMessage } from '../../src/lib/notifications/telegramSend.js';
import { TYPE_PRIORITY, PRIORITY, tierFor } from '../../src/lib/notifications/notificationPriority.js';

// ── Notifications hardening constants (spec §3, §4, §7) ──────────────────────
const STALE_SIGNAL_TYPES = ['Movement', 'Arrival', 'Moment'];
const STALE_THRESHOLD_MS = 15_000; // 15 seconds — spec §7 staleness rule
const PUSH_DAILY_CAP    = 3;       // spec §3 channel rules
const PUSH_QUIET_START  = 0;       // 00:00 local
const PUSH_QUIET_END    = 9;       // 09:00 local
// Push priority order per spec §3 (lower value = higher priority)
const PUSH_PRIORITY = {
  Movement: 1,
  Arrival:  2,
  Intent:   3,
  Moment:   4,
  System:   5,
};
const SAFETY_TYPES = ['sos', 'get_out', 'land_time_miss']; // bypass all caps

/**
 * isCriticalType — uses canonical TYPE_PRIORITY first (PR 4 of notification
 * stack), falls back to legacy SAFETY_TYPES substring match for signal_type
 * values that predate the taxonomy. Cowork dispatch T6 (Phil 2026-05-26).
 */
function isCriticalType(typeOrSignalType) {
  if (!typeOrSignalType) return false;
  const t = String(typeOrSignalType).toLowerCase();
  if (TYPE_PRIORITY[t] === PRIORITY.CRITICAL) return true;
  return SAFETY_TYPES.some((s) => t.includes(s));
}
function isAmbientType(typeOrSignalType) {
  if (!typeOrSignalType) return true; // default AMBIENT per taxonomy
  return tierFor(typeOrSignalType) === PRIORITY.AMBIENT;
}

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
    // T7 (Phil 2026-05-26): skip rows still inside a retry backoff window.
    // retry_after IS NULL → never deferred; retry_after <= now() → due to retry.
    const nowIso = new Date().toISOString();
    const { data: queuedNotifications, error: fetchError } = await supabase
      .from('notification_outbox')
      .select('*')
      .in('status', ['queued', 'pending'])
      .or(`retry_after.is.null,retry_after.lte.${nowIso}`)
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
    let dropped = 0;

    // ── cron_runs: open a run record ────────────────────────────────────────
    let cronRunId = null;
    try {
      const { data: runRow } = await supabase
        .from('cron_runs')
        .insert({ job_name: 'notifications/process', status: 'running' })
        .select('id')
        .single();
      cronRunId = runRow?.id ?? null;
    } catch { /* best-effort — never block processing */ }

    // ── Sort by push_priority ASC so highest-priority signals process first ─
    const sorted = [...queuedNotifications].sort(
      (a, b) => (a.push_priority ?? 99) - (b.push_priority ?? 99)
    );

    for (const notification of sorted) {
      try {
        // ── beacon_nearby dedup check (Phil brief 2026-05-26) ─────────────
        // 30-minute cooldown via the dedup_key column added in PR 1.
        if (notification.notification_type === 'beacon_nearby' && notification.dedup_key) {
          const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
          const { count: dupCount } = await supabase
            .from('notification_outbox')
            .select('*', { count: 'exact', head: true })
            .eq('notification_type', 'beacon_nearby')
            .eq('dedup_key', notification.dedup_key)
            .eq('user_id', notification.user_id)
            .neq('id', notification.id)
            .gte('created_at', thirtyMinAgo);
          if ((dupCount ?? 0) > 0) {
            await supabase
              .from('notification_outbox')
              .update({ status: 'dropped', updated_at: new Date().toISOString() })
              .eq('id', notification.id);
            dropped++;
            continue;
          }
        }

        // ── Staleness check (spec §7) ──────────────────────────────────────
        const sigType = notification.signal_type ?? notification.notification_type ?? '';
        const isTimeSensitive = STALE_SIGNAL_TYPES.some(t =>
          sigType.toLowerCase().includes(t.toLowerCase())
        );
        if (isTimeSensitive) {
          const ageMs = Date.now() - new Date(notification.created_at).getTime();
          if (ageMs > STALE_THRESHOLD_MS) {
            await supabase.from('notification_outbox')
              .update({ status: 'dropped', dropped_stale: true, updated_at: new Date().toISOString() })
              .eq('id', notification.id);
            dropped++;
            continue;
          }
        }

        // ── Daily push cap (spec §3) ───────────────────────────────────────
        const isSafety = SAFETY_TYPES.some(t => sigType.toLowerCase().includes(t));
        if (!isSafety && notification.channel === 'push') {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const { count: pushToday } = await supabase
            .from('notification_outbox')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', notification.user_id)
            .eq('channel', 'push')
            .eq('status', 'sent')
            .gte('sent_at', todayStart.toISOString());

          if ((pushToday ?? 0) >= PUSH_DAILY_CAP) {
            // Downgrade to in-app only — do not drop entirely
            notification.channel = 'in_app';
          }

          // No push during quiet hours (spec §3: never 00:00–09:00 local)
          const localHour = new Date().getHours();
          if (localHour >= PUSH_QUIET_START && localHour < PUSH_QUIET_END) {
            notification.channel = 'in_app';
          }
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

        // 4. Send WhatsApp for safety alerts routed to whatsapp channel
        if (notification.channel === 'whatsapp' && notification.metadata?.contact_phone) {
          await sendWhatsAppAlert(notification);
        }

        // 4b. Telegram channel (Phil brief 2026-05-26).
        // The recipient's profile carries notification_channel='telegram' and
        // telegram_chat_id. The notification row optionally carries the chat_id
        // in metadata.telegram_chat_id (set by the dispatcher upstream); if not,
        // we look it up here.
        if (notification.channel === 'telegram') {
          let tgChatId = notification.metadata?.telegram_chat_id;
          if (!tgChatId && notification.user_id) {
            const { data: prof } = await supabase
              .from('profiles')
              .select('telegram_chat_id, notification_channel')
              .eq('id', notification.user_id)
              .maybeSingle();
            if (prof?.notification_channel === 'telegram' && prof?.telegram_chat_id) {
              tgChatId = prof.telegram_chat_id;
            }
          }
          if (tgChatId) {
            const tgText = [notification.title, notification.message].filter(Boolean).join('\n').slice(0, 4000) || 'HOTMESS';
            const tgResult = await sendTelegramMessage(tgChatId, tgText);
            if (!tgResult?.ok) {
              console.warn('[notif-process] telegram send failed:', tgResult?.error);
              // Don't throw — outbox is marked sent for in-app at the bottom.
              // The audit row covers the failure below if we want to mark it delivery_failed.
            }
          } else {
            console.warn('[notif-process] telegram channel set but no chat_id for user', notification.user_id);
          }
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
        
        // Mark as failed (per delivery-failure policy from Phil brief 2026-05-26).
        // Cowork dispatch T7: CRITICAL gets a retry loop with 5-minute backoff
        // via re-queue (retry_count + retry_after columns). On the third
        // failure we escalate to delivery_failed and preserve the audit row.
        const sigType2 = notification.signal_type ?? notification.notification_type ?? '';
        const isCritical2 = isCriticalType(sigType2);
        const errDetail2 = `${notification.channel || 'unknown'}: ${error?.message || 'unknown_error'} at ${new Date().toISOString()}`;
        const currentRetry = Number(notification.retry_count || 0);
        let nextUpdate;
        if (isCritical2 && currentRetry < 2) {
          // Retry path: schedule next attempt 5min from now, keep status pending.
          const nextRetryAfter = new Date(Date.now() + 5 * 60 * 1000).toISOString();
          nextUpdate = {
            status: 'pending',
            retry_count: currentRetry + 1,
            retry_after: nextRetryAfter,
            error_detail: errDetail2,
            updated_at: new Date().toISOString(),
          };
        } else {
          // Terminal failure. CRITICAL on its 3rd strike → delivery_failed for
          // operator visibility; non-critical stays generic failed.
          nextUpdate = {
            status: isCritical2 ? 'delivery_failed' : 'failed',
            error_detail: errDetail2,
            updated_at: new Date().toISOString(),
          };
        }
        await supabase
          .from('notification_outbox')
          .update(nextUpdate)
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


/**
 * Send WhatsApp message via Meta Cloud API for safety alerts.
 * Uses template 'safety_alert_v1' (must be approved in Meta Business Manager).
 * Falls back to free-form text for 24h conversation window if template unavailable.
 */
async function sendWhatsAppAlert(notification) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn('[WhatsApp] Missing credentials — skipping alert');
    return;
  }

  const to = notification.metadata?.contact_phone;
  if (!to) return;

  // Normalise phone: strip non-digits, ensure international format
  const normPhone = to.replace(/\D/g, '');
  if (normPhone.length < 7) return;

  const alertType  = notification.metadata?.type || 'sos';
  const userName   = notification.metadata?.user_name || 'Your friend';
  const locationStr = notification.metadata?.location_str || 'Location unavailable';
  const overdueMins = notification.metadata?.overdue_minutes;

  let bodyText;
  if (alertType === 'sos') {
    bodyText = `🆘 HOTMESS Safety Alert\n\n${userName} has triggered an emergency. Last known location: ${locationStr}\n\nPlease check on them immediately.`;
  } else if (alertType === 'checkin_missed') {
    bodyText = `⏰ HOTMESS Check-in Missed\n\n${userName} was supposed to check in${overdueMins ? ` ${overdueMins} minute(s) ago` : ''} and hasn't responded.\n\nPlease check on them.`;
  } else {
    bodyText = notification.message || '⚠️ Safety alert from HOTMESS';
  }

  try {
    // Try template first (required for cold-start conversations)
    const templateRes = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normPhone,
          type: 'template',
          template: {
            name: 'safety_alert_v1',
            language: { code: 'en_GB' },
            components: [{
              type: 'body',
              parameters: [
                { type: 'text', text: userName },
                { type: 'text', text: locationStr },
              ],
            }],
          },
        }),
      }
    );

    if (templateRes.ok) {
      console.log('[WhatsApp] Template alert sent to', normPhone);
      return;
    }

    // Template not approved yet — fall back to plain text (only works if 24h window open)
    const textRes = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normPhone,
          type: 'text',
          text: { body: bodyText },
        }),
      }
    );

    const result = await textRes.json();
    if (textRes.ok) {
      console.log('[WhatsApp] Text alert sent to', normPhone);
    } else {
      console.error('[WhatsApp] Send failed:', JSON.stringify(result));
    }
  } catch (err) {
    console.error('[WhatsApp] Error:', err.message);
  }
}

// Vercel config for cron
export const config = {
  maxDuration: 30, // 30 second timeout
};


