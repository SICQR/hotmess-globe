/**
 * Email Templates for HOTMESS Platform
 * 
 * Provides HTML email templates for various transactional emails.
 * All templates follow HOTMESS brand guidelines with dark theme.
 */

const BRAND_COLORS = {
  primary: '#FF1493',
  secondary: '#00D9FF',
  accent: '#39FF14',
  dark: '#000000',
  lightText: '#FFFFFF',
  mutedText: '#999999',
};

/**
 * Base email template wrapper
 */
function emailWrapper(content, preheader = '') {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HOTMESS</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #000000;
      color: #FFFFFF;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 40px 0 20px;
      border-bottom: 2px solid ${BRAND_COLORS.primary};
    }
    .logo {
      font-size: 32px;
      font-weight: 900;
      letter-spacing: 2px;
      color: ${BRAND_COLORS.primary};
    }
    .content {
      padding: 40px 20px;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background-color: ${BRAND_COLORS.primary};
      color: #FFFFFF;
      text-decoration: none;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-radius: 0;
    }
    .footer {
      text-align: center;
      padding: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 12px;
      color: ${BRAND_COLORS.mutedText};
    }
    .info-box {
      background-color: rgba(255, 255, 255, 0.05);
      border-left: 4px solid ${BRAND_COLORS.primary};
      padding: 16px;
      margin: 20px 0;
    }
    a {
      color: ${BRAND_COLORS.primary};
    }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:${BRAND_COLORS.dark};line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </div>
  <div class="container">
    <div class="header">
      <div class="logo">HOTMESS</div>
      <div style="font-size: 10px; letter-spacing: 2px; color: ${BRAND_COLORS.mutedText};">LONDON OS</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} HOTMESS London OS Limited</p>
      <p>18+ • Consent-first • Care always</p>
      <p>
        <a href="https://hotmess.london/privacy" style="color: ${BRAND_COLORS.mutedText};">Privacy Policy</a> •
        <a href="https://hotmess.london/terms" style="color: ${BRAND_COLORS.mutedText};">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Welcome Email - Sent when user signs up
 */
export function welcomeEmail(userName) {
  const content = `
    <h1 style="color: ${BRAND_COLORS.primary}; text-transform: uppercase; font-size: 28px;">Welcome to HOTMESS!</h1>
    <p>Hey ${userName || 'there'},</p>
    <p>Welcome to the global nightlife OS. You're now part of a community that prioritizes consent, safety, and authentic connections.</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0; text-transform: uppercase; font-size: 14px; letter-spacing: 1px;">Quick Start Guide:</h3>
      <ul style="margin: 0; padding-left: 20px;">
        <li>Complete your profile to connect with others</li>
        <li>Explore events happening near you</li>
        <li>Check out the marketplace for tickets and merch</li>
        <li>Set up safety check-ins before meeting people</li>
      </ul>
    </div>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="https://hotmess.london/profile/setup" class="button">Complete Your Profile</a>
    </p>
    
    <p>Questions? Check out our <a href="https://hotmess.london/help">Help Center</a> or reach out to <a href="mailto:support@hotmess.london">support@hotmess.london</a>.</p>
    
    <p>See you out there,<br><strong>The HOTMESS Team</strong></p>
  `;
  return emailWrapper(content, 'Welcome to HOTMESS - Complete your profile and start exploring');
}

/**
 * Support Ticket Created - Confirmation for user
 */
export function supportTicketCreated(ticketNumber, subject, category) {
  const content = `
    <h1 style="color: ${BRAND_COLORS.primary}; text-transform: uppercase; font-size: 28px;">Support Ticket Created</h1>
    <p>We've received your support request and our team is on it.</p>
    
    <div class="info-box">
      <p style="margin: 5px 0;"><strong>Ticket #:</strong> ${ticketNumber}</p>
      <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
      <p style="margin: 5px 0;"><strong>Category:</strong> ${category}</p>
    </div>
    
    <p><strong>What happens next?</strong></p>
    <ul>
      <li>Our team will review your ticket within 24-48 hours</li>
      <li>Safety concerns are prioritized and addressed within 24 hours</li>
      <li>You'll receive an email when we respond</li>
    </ul>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="https://hotmess.london/contact" class="button">View Ticket</a>
    </p>
    
    <p>Need urgent help? Email us at <a href="mailto:support@hotmess.london">support@hotmess.london</a> or for safety issues: <a href="mailto:safety@hotmess.london">safety@hotmess.london</a></p>
  `;
  return emailWrapper(content, `Support ticket #${ticketNumber} received`);
}

/**
 * Support Ticket Response - Admin responded to ticket
 */
export function supportTicketResponse(ticketNumber, subject, adminName, responsePreview) {
  const content = `
    <h1 style="color: ${BRAND_COLORS.primary}; text-transform: uppercase; font-size: 28px;">New Response to Your Ticket</h1>
    <p>Our support team has responded to your ticket.</p>
    
    <div class="info-box">
      <p style="margin: 5px 0;"><strong>Ticket #:</strong> ${ticketNumber}</p>
      <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
      <p style="margin: 5px 0;"><strong>From:</strong> ${adminName || 'HOTMESS Support'}</p>
    </div>
    
    <div style="background-color: rgba(255, 255, 255, 0.03); padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: ${BRAND_COLORS.mutedText}; font-style: italic;">
        ${responsePreview?.substring(0, 200)}${responsePreview?.length > 200 ? '...' : ''}
      </p>
    </div>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="https://hotmess.london/contact" class="button">View Full Response</a>
    </p>
  `;
  return emailWrapper(content, `New response to ticket #${ticketNumber}`);
}

/**
 * Subscription Confirmation - User upgraded membership
 */
export function subscriptionConfirmation(tierName, price, billingCycle) {
  const content = `
    <h1 style="color: ${BRAND_COLORS.primary}; text-transform: uppercase; font-size: 28px;">Subscription Confirmed!</h1>
    <p>Thank you for upgrading to <strong>${tierName}</strong>. Your premium features are now active.</p>
    
    <div class="info-box">
      <p style="margin: 5px 0;"><strong>Plan:</strong> ${tierName}</p>
      <p style="margin: 5px 0;"><strong>Price:</strong> ${price}/${billingCycle}</p>
      <p style="margin: 5px 0;"><strong>Next billing date:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
    </div>
    
    <p><strong>Your ${tierName} benefits:</strong></p>
    ${tierName.toUpperCase() === 'PLUS' ? `
      <ul>
        <li>2x XP Multiplier on all actions</li>
        <li>Stealth Mode (browse anonymously)</li>
        <li>Blurred profile viewers</li>
        <li>Priority in Right Now feed</li>
        <li>Exclusive PLUS badge</li>
      </ul>
    ` : tierName.toUpperCase() === 'CHROME' ? `
      <ul>
        <li>Everything in PLUS</li>
        <li>5x XP Multiplier</li>
        <li>See who viewed your profile (unmasked)</li>
        <li>Premium support</li>
        <li>Early access to new features</li>
        <li>Exclusive CHROME badge</li>
      </ul>
    ` : ''}
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="https://hotmess.london/membership" class="button">Manage Subscription</a>
    </p>
    
    <p style="font-size: 12px; color: ${BRAND_COLORS.mutedText};">
      You can cancel your subscription at any time from your account settings. 
      Your access will continue until the end of your billing period.
    </p>
  `;
  return emailWrapper(content, `Welcome to ${tierName} membership!`);
}

/**
 * Payment Receipt - Successful payment
 */
export function paymentReceipt(orderNumber, items, total, date) {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: right;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: right;">${item.price}</td>
    </tr>
  `).join('');

  const content = `
    <h1 style="color: ${BRAND_COLORS.primary}; text-transform: uppercase; font-size: 28px;">Payment Receipt</h1>
    <p>Thank you for your purchase!</p>
    
    <div class="info-box">
      <p style="margin: 5px 0;"><strong>Order #:</strong> ${orderNumber}</p>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${date || new Date().toLocaleDateString()}</p>
    </div>
    
    <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
      <thead>
        <tr style="border-bottom: 2px solid ${BRAND_COLORS.primary};">
          <th style="padding: 12px; text-align: left; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Item</th>
          <th style="padding: 12px; text-align: right; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Qty</th>
          <th style="padding: 12px; text-align: right; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        <tr>
          <td colspan="2" style="padding: 12px; font-weight: bold; text-transform: uppercase;">Total</td>
          <td style="padding: 12px; text-align: right; font-weight: bold; color: ${BRAND_COLORS.primary};">${total}</td>
        </tr>
      </tbody>
    </table>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="https://hotmess.london/orders" class="button">View Order Details</a>
    </p>
    
    <p style="font-size: 12px; color: ${BRAND_COLORS.mutedText};">
      Questions about your order? Contact us at <a href="mailto:support@hotmess.london">support@hotmess.london</a>
    </p>
  `;
  return emailWrapper(content, `Receipt for order #${orderNumber}`);
}

/**
 * Safety Check-in Reminder - Remind user about safety check-in
 */
export function safetyCheckInReminder(userName, checkInTime, meetingDetails) {
  const content = `
    <h1 style="color: ${BRAND_COLORS.accent}; text-transform: uppercase; font-size: 28px;">Safety Check-in Reminder</h1>
    <p>Hey ${userName},</p>
    <p>This is your friendly reminder about your upcoming safety check-in.</p>
    
    <div class="info-box" style="border-left-color: ${BRAND_COLORS.accent};">
      <p style="margin: 5px 0;"><strong>Check-in time:</strong> ${checkInTime}</p>
      ${meetingDetails ? `<p style="margin: 5px 0;"><strong>Meeting:</strong> ${meetingDetails}</p>` : ''}
    </div>
    
    <p><strong>How it works:</strong></p>
    <ul>
      <li>At the scheduled time, you'll receive a notification</li>
      <li>Confirm you're safe with a simple tap</li>
      <li>If you don't respond, your emergency contacts will be notified</li>
    </ul>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="https://hotmess.london/care" class="button">Manage Safety Settings</a>
    </p>
    
    <p style="color: ${BRAND_COLORS.accent};">Your safety is our priority. Always meet in public places and trust your instincts.</p>
  `;
  return emailWrapper(content, 'Safety check-in reminder');
}

/**
 * Event RSVP Confirmation - User RSVPed to event
 */
export function eventRSVPConfirmation(eventName, eventDate, eventLocation, eventUrl) {
  const content = `
    <h1 style="color: ${BRAND_COLORS.secondary}; text-transform: uppercase; font-size: 28px;">You're Going!</h1>
    <p>Your RSVP has been confirmed.</p>
    
    <div class="info-box" style="border-left-color: ${BRAND_COLORS.secondary};">
      <h3 style="margin: 0 0 10px 0; color: ${BRAND_COLORS.secondary}; text-transform: uppercase;">${eventName}</h3>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${eventDate}</p>
      <p style="margin: 5px 0;"><strong>Location:</strong> ${eventLocation}</p>
    </div>
    
    <p><strong>Before you go:</strong></p>
    <ul>
      <li>Set up a safety check-in for peace of mind</li>
      <li>Review the event details and dress code</li>
      <li>Invite friends to join you</li>
    </ul>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${eventUrl}" class="button">View Event Details</a>
    </p>
  `;
  return emailWrapper(content, `RSVP confirmed: ${eventName}`);
}

/**
 * Password Reset Email
 */
export function passwordResetEmail(resetLink, userName) {
  const content = `
    <h1 style="color: ${BRAND_COLORS.primary}; text-transform: uppercase; font-size: 28px;">Reset Your Password</h1>
    <p>Hey ${userName || 'there'},</p>
    <p>We received a request to reset your password. Click the button below to create a new password.</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" class="button">Reset Password</a>
    </p>
    
    <div class="info-box" style="border-left-color: #FFA500;">
      <p style="margin: 0; color: #FFA500;">
        <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. 
        If you didn't request this, please ignore this email and your password will remain unchanged.
      </p>
    </div>
    
    <p style="font-size: 12px; color: ${BRAND_COLORS.mutedText};">
      For security reasons, we cannot tell you what your current password is. 
      We can only help you reset it to a new one.
    </p>
  `;
  return emailWrapper(content, 'Reset your HOTMESS password');
}

/**
 * Admin notification for new support ticket
 */
export function adminNewTicketNotification(ticketNumber, userEmail, subject, category, priority, message) {
  const priorityColor = priority === 'urgent' ? '#FF0000' : priority === 'high' ? '#FFA500' : '#FFFFFF';
  
  const content = `
    <h1 style="color: ${BRAND_COLORS.primary}; text-transform: uppercase; font-size: 28px;">New Support Ticket</h1>
    
    <div class="info-box">
      <p style="margin: 5px 0;"><strong>Ticket #:</strong> ${ticketNumber}</p>
      <p style="margin: 5px 0;"><strong>From:</strong> ${userEmail}</p>
      <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
      <p style="margin: 5px 0;"><strong>Category:</strong> ${category}</p>
      <p style="margin: 5px 0;"><strong>Priority:</strong> <span style="color: ${priorityColor};">${priority.toUpperCase()}</span></p>
    </div>
    
    <div style="background-color: rgba(255, 255, 255, 0.03); padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; white-space: pre-wrap;">${message?.substring(0, 500)}${message?.length > 500 ? '...' : ''}</p>
    </div>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="https://hotmess.london/admin" class="button">View in Admin Dashboard</a>
    </p>
  `;
  return emailWrapper(content, `[${priority.toUpperCase()}] New support ticket #${ticketNumber}`);
}
