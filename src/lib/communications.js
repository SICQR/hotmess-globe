/**
 * HOTMESS Communications System
 * 
 * Comprehensive system for:
 * - Email templates and sending
 * - Push notifications
 * - In-app notifications
 * - SMS (future)
 * - Promotional campaigns
 * - User tagging and segmentation
 */

import { supabase } from '@/components/utils/supabaseClient';
import logger from '@/utils/logger';

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

export const EMAIL_TEMPLATES = {
  // Transactional
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
  ACCOUNT_DELETED: 'account_deleted',
  
  // Subscription
  SUBSCRIPTION_CONFIRMED: 'subscription_confirmed',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_DOWNGRADED: 'subscription_downgraded',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SUBSCRIPTION_EXPIRING: 'subscription_expiring',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_SUCCEEDED: 'payment_succeeded',
  
  // Social
  NEW_MESSAGE: 'new_message',
  NEW_MATCH: 'new_match',
  PROFILE_VIEWED: 'profile_viewed',
  NEW_FOLLOWER: 'new_follower',
  MENTION: 'mention',
  
  // Events
  EVENT_REMINDER: 'event_reminder',
  EVENT_CANCELLED: 'event_cancelled',
  EVENT_UPDATED: 'event_updated',
  RSVP_CONFIRMED: 'rsvp_confirmed',
  TICKET_PURCHASED: 'ticket_purchased',
  TICKET_TRANSFERRED: 'ticket_transferred',
  
  // Marketplace
  ORDER_CONFIRMED: 'order_confirmed',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  ITEM_SOLD: 'item_sold',
  OFFER_RECEIVED: 'offer_received',
  OFFER_ACCEPTED: 'offer_accepted',
  PAYOUT_SENT: 'payout_sent',
  
  // Safety
  SAFETY_ALERT: 'safety_alert',
  CHECK_IN_REMINDER: 'check_in_reminder',
  EMERGENCY_CONTACT_ALERT: 'emergency_contact_alert',
  REPORT_RECEIVED: 'report_received',
  ACCOUNT_WARNING: 'account_warning',
  ACCOUNT_SUSPENDED: 'account_suspended',
  
  // Support
  SUPPORT_TICKET_CREATED: 'support_ticket_created',
  SUPPORT_TICKET_REPLY: 'support_ticket_reply',
  SUPPORT_TICKET_RESOLVED: 'support_ticket_resolved',
  
  // Marketing
  PROMO_ANNOUNCEMENT: 'promo_announcement',
  NEWSLETTER: 'newsletter',
  FEATURE_ANNOUNCEMENT: 'feature_announcement',
  REACTIVATION: 'reactivation',
  REFERRAL_REWARD: 'referral_reward',
  
  // Admin
  ADMIN_ALERT: 'admin_alert',
  MODERATION_ACTION: 'moderation_action',
  VERIFICATION_APPROVED: 'verification_approved',
  VERIFICATION_REJECTED: 'verification_rejected',
};

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export const NOTIFICATION_TYPES = {
  // Messages
  MESSAGE: 'message',
  MESSAGE_REQUEST: 'message_request',
  
  // Social
  MATCH: 'match',
  LIKE: 'like',
  SUPER_LIKE: 'super_like',
  FOLLOW: 'follow',
  PROFILE_VIEW: 'profile_view',
  MENTION: 'mention',
  
  // Events
  EVENT_REMINDER: 'event_reminder',
  EVENT_NEARBY: 'event_nearby',
  EVENT_CANCELLED: 'event_cancelled',
  RSVP_CONFIRMED: 'rsvp_confirmed',
  
  // Right Now
  RIGHT_NOW_NEARBY: 'right_now_nearby',
  RIGHT_NOW_MATCH: 'right_now_match',
  RIGHT_NOW_EXPIRING: 'right_now_expiring',
  
  // Marketplace
  ORDER_UPDATE: 'order_update',
  ITEM_SOLD: 'item_sold',
  OFFER_RECEIVED: 'offer_received',
  PRICE_DROP: 'price_drop',
  
  // Gamification
  XP_EARNED: 'xp_earned',
  LEVEL_UP: 'level_up',
  BADGE_EARNED: 'badge_earned',
  CHALLENGE_COMPLETE: 'challenge_complete',
  STREAK_MILESTONE: 'streak_milestone',
  NIGHT_KING: 'night_king',
  
  // Safety
  SAFETY_CHECK_IN: 'safety_check_in',
  SAFETY_ALERT: 'safety_alert',
  TRUSTED_CONTACT_REQUEST: 'trusted_contact_request',
  
  // System
  SYSTEM_ALERT: 'system_alert',
  MAINTENANCE: 'maintenance',
  FEATURE_UPDATE: 'feature_update',
  
  // Admin
  MODERATION_ACTION: 'moderation_action',
  VERIFICATION_UPDATE: 'verification_update',
  ACCOUNT_WARNING: 'account_warning',
};

// =============================================================================
// NOTIFICATION CHANNELS
// =============================================================================

export const NOTIFICATION_CHANNELS = {
  IN_APP: 'in_app',
  PUSH: 'push',
  EMAIL: 'email',
  SMS: 'sms',
};

// =============================================================================
// DEFAULT NOTIFICATION PREFERENCES
// =============================================================================

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  // Messages - default all on
  [NOTIFICATION_TYPES.MESSAGE]: {
    in_app: true,
    push: true,
    email: false,
  },
  [NOTIFICATION_TYPES.MESSAGE_REQUEST]: {
    in_app: true,
    push: true,
    email: false,
  },
  
  // Social - default most on
  [NOTIFICATION_TYPES.MATCH]: {
    in_app: true,
    push: true,
    email: true,
  },
  [NOTIFICATION_TYPES.LIKE]: {
    in_app: true,
    push: false,
    email: false,
  },
  [NOTIFICATION_TYPES.SUPER_LIKE]: {
    in_app: true,
    push: true,
    email: false,
  },
  [NOTIFICATION_TYPES.FOLLOW]: {
    in_app: true,
    push: false,
    email: false,
  },
  [NOTIFICATION_TYPES.PROFILE_VIEW]: {
    in_app: true,
    push: false,
    email: false,
  },
  
  // Events
  [NOTIFICATION_TYPES.EVENT_REMINDER]: {
    in_app: true,
    push: true,
    email: true,
  },
  [NOTIFICATION_TYPES.EVENT_NEARBY]: {
    in_app: true,
    push: false,
    email: false,
  },
  
  // Right Now
  [NOTIFICATION_TYPES.RIGHT_NOW_NEARBY]: {
    in_app: true,
    push: true,
    email: false,
  },
  [NOTIFICATION_TYPES.RIGHT_NOW_MATCH]: {
    in_app: true,
    push: true,
    email: false,
  },
  
  // Marketplace
  [NOTIFICATION_TYPES.ORDER_UPDATE]: {
    in_app: true,
    push: true,
    email: true,
  },
  [NOTIFICATION_TYPES.ITEM_SOLD]: {
    in_app: true,
    push: true,
    email: true,
  },
  [NOTIFICATION_TYPES.OFFER_RECEIVED]: {
    in_app: true,
    push: true,
    email: false,
  },
  
  // Gamification
  [NOTIFICATION_TYPES.XP_EARNED]: {
    in_app: true,
    push: false,
    email: false,
  },
  [NOTIFICATION_TYPES.LEVEL_UP]: {
    in_app: true,
    push: true,
    email: false,
  },
  [NOTIFICATION_TYPES.BADGE_EARNED]: {
    in_app: true,
    push: true,
    email: false,
  },
  
  // Safety - always on
  [NOTIFICATION_TYPES.SAFETY_CHECK_IN]: {
    in_app: true,
    push: true,
    email: true,
    required: true, // Cannot be disabled
  },
  [NOTIFICATION_TYPES.SAFETY_ALERT]: {
    in_app: true,
    push: true,
    email: true,
    required: true,
  },
  
  // System
  [NOTIFICATION_TYPES.SYSTEM_ALERT]: {
    in_app: true,
    push: true,
    email: false,
  },
};

// =============================================================================
// EMAIL SENDING
// =============================================================================

/**
 * Send an email via the API
 */
export async function sendEmail({ to, template, subject, data, html, text }) {
  try {
    // Try Supabase Edge Function first
    const { data: result, error } = await supabase.functions.invoke('send-email', {
      body: { to, template, subject, data, html, text },
    });

    if (error) {
      // Fallback to API route
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject: subject || getEmailSubject(template, data),
          html: html || generateEmailHtml(template, data),
          body: text || generateEmailText(template, data),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to send email');
      }

      return await response.json();
    }

    return result;
  } catch (err) {
    logger.error('[Communications] Email send error:', err);
    throw err;
  }
}

/**
 * Get email subject based on template
 */
function getEmailSubject(template, data = {}) {
  const subjects = {
    [EMAIL_TEMPLATES.WELCOME]: `Welcome to HOTMESS, ${data.name || 'there'}!`,
    [EMAIL_TEMPLATES.PASSWORD_RESET]: 'Reset your HOTMESS password',
    [EMAIL_TEMPLATES.SUBSCRIPTION_CONFIRMED]: `Welcome to HOTMESS ${data.tier || 'Premium'}!`,
    [EMAIL_TEMPLATES.NEW_MESSAGE]: `New message from ${data.senderName || 'someone'}`,
    [EMAIL_TEMPLATES.NEW_MATCH]: `You have a new match on HOTMESS!`,
    [EMAIL_TEMPLATES.EVENT_REMINDER]: `Reminder: ${data.eventName || 'Event'} is coming up`,
    [EMAIL_TEMPLATES.ORDER_CONFIRMED]: `Order #${data.orderId || ''} confirmed`,
    [EMAIL_TEMPLATES.ITEM_SOLD]: `Your item "${data.itemName || ''}" has sold!`,
    [EMAIL_TEMPLATES.SAFETY_ALERT]: '🚨 HOTMESS Safety Alert',
    [EMAIL_TEMPLATES.PROMO_ANNOUNCEMENT]: data.subject || 'Special offer from HOTMESS',
  };

  return subjects[template] || 'Notification from HOTMESS';
}

/**
 * Generate email HTML from template
 */
function generateEmailHtml(template, data = {}) {
  const baseStyles = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #000; color: #fff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #111; border: 2px solid #333; padding: 30px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 32px; font-weight: 900; }
    .logo span { color: #FF1493; }
    .content { line-height: 1.6; }
    .button { display: inline-block; background: #FF1493; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; font-size: 12px; color: #666; text-align: center; }
  `;

  const header = `
    <div class="header">
      <div class="logo">HOT<span>MESS</span></div>
      <p style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">London OS</p>
    </div>
  `;

  const footer = `
    <div class="footer">
      <p>© ${new Date().getFullYear()} HOTMESS London Ltd. All rights reserved.</p>
      <p><a href="https://hotmess.london/settings/notifications" style="color: #FF1493;">Manage notification preferences</a></p>
    </div>
  `;

  // Template-specific content
  const content = getTemplateContent(template, data);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        ${header}
        <div class="content">
          ${content}
        </div>
        ${footer}
      </div>
    </body>
    </html>
  `;
}

function getTemplateContent(template, data) {
  switch (template) {
    case EMAIL_TEMPLATES.WELCOME:
      return `
        <h2>Welcome to the mess, ${data.name || 'there'}!</h2>
        <p>You're now part of the global operating system for gay men.</p>
        <p>Here's what you can do:</p>
        <ul>
          <li>🔥 Go <strong>Right Now</strong> to show availability</li>
          <li>🌍 Explore the <strong>Globe</strong> for worldwide activity</li>
          <li>🛍️ Browse the <strong>Marketplace</strong></li>
          <li>📻 Listen to <strong>HOTMESS Radio</strong></li>
        </ul>
        <a href="https://hotmess.london/Profile" class="button">Complete Your Profile</a>
      `;

    case EMAIL_TEMPLATES.NEW_MATCH:
      return `
        <h2>You've got a match! 🔥</h2>
        <p>You and <strong>${data.matchName || 'someone'}</strong> are a ${data.matchScore || '87'}% match.</p>
        <p>Why not break the ice?</p>
        <a href="https://hotmess.london/social/inbox?to=${data.matchId || ''}" class="button">Send a Message</a>
      `;

    case EMAIL_TEMPLATES.EVENT_REMINDER:
      return `
        <h2>📅 Event Reminder</h2>
        <p><strong>${data.eventName || 'Event'}</strong></p>
        <p>📍 ${data.eventLocation || 'Location TBA'}</p>
        <p>🕐 ${data.eventDate || 'Date TBA'}</p>
        <a href="https://hotmess.london/events/${data.eventId || ''}" class="button">View Event</a>
      `;

    case EMAIL_TEMPLATES.SAFETY_ALERT:
      return `
        <h2 style="color: #FF4444;">🚨 Safety Alert</h2>
        <p>${data.message || 'A safety alert has been triggered.'}</p>
        <p>If this was you, you can dismiss this alert in the app.</p>
        <p>If this wasn't you, please secure your account immediately.</p>
        <a href="https://hotmess.london/settings/security" class="button" style="background: #FF4444;">Secure Account</a>
      `;

    case EMAIL_TEMPLATES.ORDER_CONFIRMED:
      return `
        <h2>Order Confirmed ✓</h2>
        <p>Your order <strong>#${data.orderId || ''}</strong> has been confirmed.</p>
        <p>Total: <strong>£${data.total || '0.00'}</strong></p>
        <a href="https://hotmess.london/orders/${data.orderId || ''}" class="button">View Order</a>
      `;

    default:
      return `<p>${data.message || 'You have a notification from HOTMESS.'}</p>`;
  }
}

function generateEmailText(template, data) {
  // Plain text version
  return `HOTMESS - ${getEmailSubject(template, data)}\n\n${data.message || 'You have a notification.'}`;
}

// =============================================================================
// IN-APP NOTIFICATIONS
// =============================================================================

/**
 * Create an in-app notification
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  metadata = {},
  channels = ['in_app'],
}) {
  try {
    // Check user preferences
    const prefs = await getNotificationPreferences(userId);
    const typePrefs = prefs[type] || DEFAULT_NOTIFICATION_PREFERENCES[type] || {};

    // Create notification for each enabled channel
    const promises = [];

    if (channels.includes('in_app') && typePrefs.in_app !== false) {
      promises.push(
        supabase.from('notifications').insert({
          user_id: userId,
          type,
          title,
          message,
          link,
          metadata,
          read: false,
          created_at: new Date().toISOString(),
        })
      );
    }

    if (channels.includes('push') && typePrefs.push) {
      promises.push(sendPushNotification({ userId, title, message, link, metadata }));
    }

    if (channels.includes('email') && typePrefs.email) {
      const user = await getUserById(userId);
      if (user?.email) {
        promises.push(
          sendEmail({
            to: user.email,
            template: mapTypeToEmailTemplate(type),
            data: { name: user.display_name || user.full_name, ...metadata },
          })
        );
      }
    }

    await Promise.allSettled(promises);

    return { success: true };
  } catch (err) {
    logger.error('[Communications] Create notification error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(userId) {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }

    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...data.preferences };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(userId, preferences) {
  try {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        preferences,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Mark notifications as read
 */
export async function markNotificationsRead(userId, notificationIds) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', notificationIds);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(userId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// =============================================================================
// PUSH NOTIFICATIONS
// =============================================================================

/**
 * Send push notification via web push
 */
export async function sendPushNotification({ userId, title, message, link, metadata = {} }) {
  try {
    // Get user's push subscription
    const { data: subscription } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true);

    if (!subscription || subscription.length === 0) {
      return { success: false, error: 'No active push subscription' };
    }

    // Send via API route that handles web-push
    const response = await fetch('/api/notifications/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptions: subscription,
        payload: {
          title,
          body: message,
          icon: '/icons/icon-192.png',
          badge: '/icons/badge-72.png',
          data: { link, ...metadata },
        },
      }),
    });

    return await response.json();
  } catch (err) {
    logger.error('[Communications] Push notification error:', err);
    return { success: false, error: err.message };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getUserById(userId) {
  const { data } = await supabase
    .from('User')
    .select('id, email, display_name, full_name')
    .eq('id', userId)
    .single();
  return data;
}

function mapTypeToEmailTemplate(type) {
  const mapping = {
    [NOTIFICATION_TYPES.MESSAGE]: EMAIL_TEMPLATES.NEW_MESSAGE,
    [NOTIFICATION_TYPES.MATCH]: EMAIL_TEMPLATES.NEW_MATCH,
    [NOTIFICATION_TYPES.EVENT_REMINDER]: EMAIL_TEMPLATES.EVENT_REMINDER,
    [NOTIFICATION_TYPES.ORDER_UPDATE]: EMAIL_TEMPLATES.ORDER_CONFIRMED,
    [NOTIFICATION_TYPES.SAFETY_ALERT]: EMAIL_TEMPLATES.SAFETY_ALERT,
  };
  return mapping[type] || EMAIL_TEMPLATES.PROMO_ANNOUNCEMENT;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  EMAIL_TEMPLATES,
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  DEFAULT_NOTIFICATION_PREFERENCES,
  sendEmail,
  createNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  markNotificationsRead,
  markAllNotificationsRead,
  sendPushNotification,
};
