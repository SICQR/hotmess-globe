/**
 * Email Templates for HOTMESS Platform
 * 
 * Provides HTML email templates for various transactional emails.
 * All templates follow HOTMESS brand guidelines with dark theme.
 */

const BRAND_COLORS = {
  primary: '#FFFFFF',
  secondary: '#000000',
  accent: '#FFFFFF',
  dark: '#000000',
  lightText: '#FFFFFF',
  mutedText: '#8E8E93',
};

/**
 * Base email template wrapper - "Noir" Design
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
      padding: 60px 0 40px;
    }
    .logo {
      font-size: 32px;
      font-weight: 900;
      letter-spacing: 4px;
      color: #FFFFFF;
      text-transform: uppercase;
    }
    .content {
      padding: 0 20px 60px;
    }
    .button {
      display: inline-block;
      padding: 16px 40px;
      background-color: #FFFFFF;
      color: #000000;
      text-decoration: none;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      padding: 40px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 11px;
      color: #555555;
      letter-spacing: 1px;
    }
    .info-box {
      background-color: #0A0A0A;
      border: 1px solid #222;
      padding: 24px;
      margin: 32px 0;
    }
    a {
      color: #FFFFFF;
      text-decoration: underline;
    }
    h1, h2, h3 {
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 0;
    }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#000000;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </div>
  <div class="container">
    <div class="header">
      <div class="logo">HOTMESS</div>
      <div style="font-size: 9px; letter-spacing: 3px; color: #444; margin-top: 8px;">LONDON OS • SPRINT 2</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>HOTMESS LONDON OS LIMITED</p>
      <p>18+ • CONSENT-FIRST • NO CHAOS AT THE DOOR</p>
      <p style="margin-top: 20px;">
        <a href="https://hotmess.london/privacy" style="color: #444;">PRIVACY</a> •
        <a href="https://hotmess.london/terms" style="color: #444;">TERMS</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * EMAIL 1: Magic Link Email
 */
export function magicLinkEmail(link) {
  const content = `
    <h1>Sign in to HOTMESS</h1>
    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px; color: #CCCCCC;">
      Tap the button below to sign in to your account instantly. This link is valid for 15 minutes.
    </p>
    <div style="text-align: center; margin: 48px 0;">
      <a href="${link}" class="button">SIGN IN NOW</a>
    </div>
    <p style="color: #555555; font-size: 12px; line-height: 1.4; text-align: center;">
      If you didn't request this, you can safely ignore this email.
    </p>
  `;
  return emailWrapper(content, 'Your HOTMESS sign-in link');
}

/**
 * EMAIL 2: Membership Confirmation
 */
export function membershipConfirmation(tierName) {
  const content = `
    <h1>Welcome to ${tierName}</h1>
    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: #CCCCCC;">
      Your membership is now active. You have unlocked premium access to the HOTMESS ecosystem.
    </p>
    
    <div class="info-box">
      <h3 style="font-size: 12px; color: #666; margin-bottom: 16px;">UNLOCKED FEATURES:</h3>
      <ul style="padding-left: 20px; color: #FFFFFF; line-height: 2;">
        <li>Full Messaging & Ghosted Access</li>
        <li>Priority Event Discovery</li>
        <li>Unlimited Boos & Connections</li>
        <li>Exclusive ${tierName} Profile Badge</li>
      </ul>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px; color: #CCCCCC;">
      Your status has been updated across the OS. Open the app to start your session.
    </p>
    
    <div style="text-align: center; margin: 48px 0;">
      <a href="https://hotmess.london" class="button">OPEN THE APP</a>
    </div>
  `;
  return emailWrapper(content, `Welcome to HOTMESS ${tierName}`);
}

/**
 * EMAIL 3: Shopify Order Confirmation
 */
export function shopifyOrderConfirmation(orderId, items = [], total = 'N/A') {
  const itemsHtml = items.map(item => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #1A1A1A; padding-bottom: 12px;">
      <span style="color: #FFFFFF;">${item.title || item.name} x ${item.qty || item.quantity}</span>
      <span style="color: #FFFFFF; font-weight: bold;">${item.price}</span>
    </div>
  `).join('');

  const content = `
    <h1>Order Confirmed</h1>
    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px; color: #CCCCCC;">
      Your HOTMESS order is confirmed and is being processed for fulfillment.
    </p>
    
    <div class="info-box">
      <p style="font-size: 11px; color: #555; margin-bottom: 20px;">ORDER #${orderId.toUpperCase()}</p>
      ${itemsHtml}
      <div style="display: flex; justify-content: space-between; margin-top: 20px; border-top: 2px solid #FFFFFF; padding-top: 20px;">
        <span style="color: #FFFFFF; font-weight: 900;">TOTAL</span>
        <span style="color: #FFFFFF; font-weight: 900;">${total}</span>
      </div>
    </div>
    
    <div style="margin: 32px 0;">
      <h3 style="font-size: 12px; color: #666; margin-bottom: 8px;">FULFILLMENT:</h3>
      <p style="font-size: 14px; color: #FFFFFF;">3-5 Business Days (Tracked)</p>
    </div>
    
    <div style="text-align: center; margin: 48px 0;">
      <a href="https://hotmess.london/orders" class="button">TRACK ORDER</a>
    </div>
  `;
  return emailWrapper(content, 'Your HOTMESS order is confirmed');
}

/**
 * EMAIL 4: Preloved Sale Confirmation (Buyer)
 */
export function prelovedSaleConfirmation(itemName, price, sellerName) {
  const content = `
    <h1>You bought ${itemName}</h1>
    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px; color: #CCCCCC;">
      Successfully purchased from the Preloved Marketplace.
    </p>
    
    <div class="info-box">
      <div style="margin-bottom: 24px;">
        <p style="font-size: 11px; color: #555; margin: 0 0 4px 0;">ITEM</p>
        <p style="font-size: 18px; font-weight: 900; margin: 0;">${itemName}</p>
      </div>
      <div style="margin-bottom: 24px;">
        <p style="font-size: 11px; color: #555; margin: 0 0 4px 0;">PRICE</p>
        <p style="font-size: 18px; font-weight: 900; margin: 0;">${price}</p>
      </div>
      <div>
        <p style="font-size: 11px; color: #555; margin: 0 0 4px 0;">SELLER</p>
        <p style="font-size: 16px; margin: 0;">${sellerName}</p>
      </div>
    </div>
    
    <p style="font-size: 14px; line-height: 1.6; color: #888;">
      Arranging collection or shipping? Message the seller directly in the Ghosted tab.
    </p>
    
    <div style="text-align: center; margin: 48px 0;">
      <a href="https://hotmess.london/ghosted" class="button">MESSAGE SELLER</a>
    </div>
  `;
  return emailWrapper(content, `You bought ${itemName}`);
}
