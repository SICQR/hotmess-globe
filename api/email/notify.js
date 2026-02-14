/**
 * Vercel API Route: Send Support Ticket Notifications
 * 
 * Sends email notifications when support tickets are created or updated.
 */

import { json, readJsonBody } from '../shopify/_utils.js';
import * as templates from './templates.js';

async function sendEmail(to, subject, html) {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    // console.log('[Support Email] Would send email (no RESEND_API_KEY):');
    // console.log(`  To: ${to}`);
    // console.log(`  Subject: ${subject}`);
    return { success: true, id: `dev_${Date.now()}`, dev: true };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'HOTMESS Support <support@hotmess.london>',
      to: [to],
      subject,
      html,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to send email');
  }

  return { success: true, id: data.id };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : await readJsonBody(req);
    const { type, data } = body || {};

    if (!type || !data) {
      json(res, 400, { error: 'Missing required fields: type, data' });
      return;
    }

    let emailResult;

    switch (type) {
      case 'ticket_created_user': {
        // Send confirmation to user
        const { userEmail, ticketNumber, subject, category } = data;
        if (!userEmail || !ticketNumber || !subject) {
          json(res, 400, { error: 'Missing required data for ticket_created_user' });
          return;
        }

        const html = templates.supportTicketCreated(ticketNumber, subject, category || 'general');
        emailResult = await sendEmail(
          userEmail,
          `Support Ticket #${ticketNumber} - We're on it!`,
          html
        );
        break;
      }

      case 'ticket_created_admin': {
        // Notify admin about new ticket
        const { adminEmail, ticketNumber, userEmail, subject, category, priority, message } = data;
        const supportEmail = adminEmail || process.env.SUPPORT_EMAIL || 'support@hotmess.london';
        
        if (!ticketNumber || !userEmail || !subject) {
          json(res, 400, { error: 'Missing required data for ticket_created_admin' });
          return;
        }

        const html = templates.adminNewTicketNotification(
          ticketNumber,
          userEmail,
          subject,
          category || 'general',
          priority || 'normal',
          message
        );
        emailResult = await sendEmail(
          supportEmail,
          `[${(priority || 'normal').toUpperCase()}] New Support Ticket #${ticketNumber}`,
          html
        );
        break;
      }

      case 'ticket_response': {
        // Notify user about admin response
        const { userEmail, ticketNumber, subject, adminName, responsePreview } = data;
        if (!userEmail || !ticketNumber || !subject) {
          json(res, 400, { error: 'Missing required data for ticket_response' });
          return;
        }

        const html = templates.supportTicketResponse(
          ticketNumber,
          subject,
          adminName || 'HOTMESS Support',
          responsePreview
        );
        emailResult = await sendEmail(
          userEmail,
          `Response to Support Ticket #${ticketNumber}`,
          html
        );
        break;
      }

      case 'welcome': {
        // Send welcome email
        const { userEmail, userName } = data;
        if (!userEmail) {
          json(res, 400, { error: 'Missing userEmail for welcome email' });
          return;
        }

        const html = templates.welcomeEmail(userName);
        emailResult = await sendEmail(
          userEmail,
          'Welcome to HOTMESS! 🎉',
          html
        );
        break;
      }

      case 'subscription_confirmation': {
        // Send subscription confirmation
        const { userEmail, tierName, price, billingCycle } = data;
        if (!userEmail || !tierName) {
          json(res, 400, { error: 'Missing required data for subscription_confirmation' });
          return;
        }

        const html = templates.subscriptionConfirmation(tierName, price, billingCycle || 'month');
        emailResult = await sendEmail(
          userEmail,
          `Welcome to ${tierName} Membership!`,
          html
        );
        break;
      }

      case 'payment_receipt': {
        // Send payment receipt
        const { userEmail, orderNumber, items, total, date } = data;
        if (!userEmail || !orderNumber || !items || !total) {
          json(res, 400, { error: 'Missing required data for payment_receipt' });
          return;
        }

        const html = templates.paymentReceipt(orderNumber, items, total, date);
        emailResult = await sendEmail(
          userEmail,
          `Receipt for Order #${orderNumber}`,
          html
        );
        break;
      }

      case 'safety_checkin_reminder': {
        // Send safety check-in reminder
        const { userEmail, userName, checkInTime, meetingDetails } = data;
        if (!userEmail || !checkInTime) {
          json(res, 400, { error: 'Missing required data for safety_checkin_reminder' });
          return;
        }

        const html = templates.safetyCheckInReminder(userName, checkInTime, meetingDetails);
        emailResult = await sendEmail(
          userEmail,
          'Safety Check-in Reminder',
          html
        );
        break;
      }

      case 'event_rsvp': {
        // Send event RSVP confirmation
        const { userEmail, eventName, eventDate, eventLocation, eventUrl } = data;
        if (!userEmail || !eventName || !eventDate) {
          json(res, 400, { error: 'Missing required data for event_rsvp' });
          return;
        }

        const html = templates.eventRSVPConfirmation(eventName, eventDate, eventLocation, eventUrl);
        emailResult = await sendEmail(
          userEmail,
          `RSVP Confirmed: ${eventName}`,
          html
        );
        break;
      }

      case 'password_reset': {
        // Send password reset email
        const { userEmail, resetLink, userName } = data;
        if (!userEmail || !resetLink) {
          json(res, 400, { error: 'Missing required data for password_reset' });
          return;
        }

        const html = templates.passwordResetEmail(resetLink, userName);
        emailResult = await sendEmail(
          userEmail,
          'Reset Your HOTMESS Password',
          html
        );
        break;
      }

      default:
        json(res, 400, { error: `Unknown email type: ${type}` });
        return;
    }

    // console.log(`[Support Email] Sent ${type} email:`, emailResult);
    json(res, 200, emailResult);
  } catch (error) {
    // console.error('[Support Email] Error:', error);
    json(res, 500, { error: 'Failed to send email', message: error.message });
  }
}
