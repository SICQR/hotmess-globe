/**
 * Email Service
 * 
 * Client-side wrapper for sending transactional emails via Supabase Edge Functions
 */

import { supabase } from '@/components/utils/supabaseClient';
import logger from '@/utils/logger';

// Email template types
export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  SUBSCRIPTION_CONFIRMED: 'subscription_confirmed',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SUPPORT_TICKET_CREATED: 'support_ticket_created',
  EVENT_REMINDER: 'event_reminder',
  SAFETY_ALERT: 'safety_alert',
};

/**
 * Send an email using Supabase Edge Function
 * 
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.template - Template name from EMAIL_TEMPLATES
 * @param {Object} options.data - Template data
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function sendEmail({ to, template, data }) {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-email', {
      body: { to, template, data },
    });

    if (error) {
      logger.error('[EmailService] Failed to send email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: result?.id };
  } catch (err) {
    logger.error('[EmailService] Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(email, name) {
  return sendEmail({
    to: email,
    template: EMAIL_TEMPLATES.WELCOME,
    data: { name },
  });
}

/**
 * Send subscription confirmation email
 */
export async function sendSubscriptionConfirmedEmail(email, name, tier) {
  return sendEmail({
    to: email,
    template: EMAIL_TEMPLATES.SUBSCRIPTION_CONFIRMED,
    data: { name, tier },
  });
}

/**
 * Send subscription cancellation email
 */
export async function sendSubscriptionCancelledEmail(email, name, endsAt) {
  return sendEmail({
    to: email,
    template: EMAIL_TEMPLATES.SUBSCRIPTION_CANCELLED,
    data: { name, endsAt },
  });
}

/**
 * Send support ticket confirmation email
 */
export async function sendSupportTicketEmail(email, name, ticketId, subject) {
  return sendEmail({
    to: email,
    template: EMAIL_TEMPLATES.SUPPORT_TICKET_CREATED,
    data: { name, ticketId, subject },
  });
}

/**
 * Send event reminder email
 */
export async function sendEventReminderEmail(email, name, eventName, eventDate, eventLocation) {
  return sendEmail({
    to: email,
    template: EMAIL_TEMPLATES.EVENT_REMINDER,
    data: { name, eventName, eventDate, eventLocation },
  });
}

/**
 * Send safety alert email
 */
export async function sendSafetyAlertEmail(email, name, alertType, message) {
  return sendEmail({
    to: email,
    template: EMAIL_TEMPLATES.SAFETY_ALERT,
    data: { name, alertType, message },
  });
}

export default {
  sendEmail,
  sendWelcomeEmail,
  sendSubscriptionConfirmedEmail,
  sendSubscriptionCancelledEmail,
  sendSupportTicketEmail,
  sendEventReminderEmail,
  sendSafetyAlertEmail,
  EMAIL_TEMPLATES,
};
