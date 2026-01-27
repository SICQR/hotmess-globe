/**
 * Notification Utilities
 * 
 * Helper functions for sending notifications that work with RLS policies.
 * Uses the send_notification RPC function to bypass RLS for cross-user notifications.
 */

import { supabase } from '@/components/utils/supabaseClient';

/**
 * Send a notification to any user (bypasses RLS via secure RPC function)
 * 
 * @param {Object} params
 * @param {string} params.userEmail - The recipient's email
 * @param {string} params.type - Notification type (message, follow, like, etc.)
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message (max 500 chars)
 * @param {string} [params.link] - Optional link to navigate to
 * @param {Object} [params.metadata] - Optional metadata object
 * @returns {Promise<string|null>} - The notification ID or null on failure
 */
export async function sendNotification({ userEmail, type, title, message, link, metadata = {} }) {
  try {
    const { data, error } = await supabase.rpc('send_notification', {
      p_user_email: userEmail,
      p_type: type,
      p_title: title,
      p_message: message,
      p_link: link || null,
      p_metadata: metadata
    });

    if (error) {
      // Only log in development
      if (import.meta.env.DEV) {
        console.warn('[Notification] RPC failed, falling back:', error.message);
      }
      return null;
    }

    return data;
  } catch {
    // Silently fail - notifications are non-critical
    return null;
  }
}

/**
 * Send a notification to self (works with standard RLS)
 * Use this when the notification is for the current user
 * 
 * @param {Object} params - Same as sendNotification
 * @returns {Promise<boolean>} - Success status
 */
export async function sendSelfNotification({ userEmail, type, title, message, link, metadata = {} }) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_email: userEmail,
        type,
        title,
        message: message.substring(0, 500),
        link,
        metadata,
        read: false,
        created_at: new Date().toISOString(),
        created_date: new Date().toISOString()
      });

    return !error;
  } catch {
    return false;
  }
}

/**
 * Notification types (for reference)
 */
export const NotificationTypes = {
  MESSAGE: 'message',
  FOLLOW: 'follow',
  NEW_FOLLOWER: 'new_follower',
  LIKE: 'like',
  COMMENT: 'comment',
  MENTION: 'mention',
  EVENT: 'event',
  BEACON: 'beacon',
  HANDSHAKE: 'handshake',
  SYSTEM: 'system',
  WELCOME: 'welcome',
  ACHIEVEMENT: 'achievement',
  PREMIUM_SALE: 'premium_sale',
  FEATURE_UNLOCKED: 'feature_unlocked',
  XP_EARNED: 'xp_earned',
  LEVEL_UP: 'level_up',
  ORDER: 'order',
  ESCROW_RELEASE: 'escrow_release',
  POST_COMMENT: 'post_comment',
  POST_LIKE: 'post_like',
  EVENT_REMINDER: 'event_reminder',
  ADMIN_ALERT: 'admin_alert',
  VERIFICATION: 'verification',
  FLAGGED_POST: 'flagged_post',
  SHADOW_BEACON: 'shadow_beacon'
};
