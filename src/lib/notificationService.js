/**
 * Notification Service - Helper functions to create and send notifications
 * Used across the app for ticket verification, business advertising, and other features
 */

import { supabase } from '@/components/utils/supabaseClient';

/**
 * Create a notification in the database
 */
export async function createNotification({
  userEmail,
  type,
  title,
  message,
  link = null,
  data = {},
  priority = 'normal'
}) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_email: userEmail,
        type,
        title,
        message,
        link,
        data,
        priority,
        read: false,
        created_date: new Date().toISOString()
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to create notification:', error);
    return { success: false, error };
  }
}

/**
 * Create admin notification (for moderation queue)
 */
export async function createAdminNotification({
  type,
  title,
  message,
  data = {},
  priority = 'normal',
  targetRole = 'admin' // 'admin' or 'moderator'
}) {
  try {
    const { error } = await supabase
      .from('admin_notifications')
      .insert({
        type,
        title,
        message,
        data,
        priority,
        target_role: targetRole,
        read: false,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to create admin notification:', error);
    return { success: false, error };
  }
}

// ============================
// TICKET VERIFICATION NOTIFICATIONS
// ============================

export const TicketNotifications = {
  /**
   * Notify seller that verification was submitted
   */
  verificationSubmitted: (userEmail, eventName) => createNotification({
    userEmail,
    type: 'ticket_pending',
    title: 'Verification Submitted',
    message: `Your ticket for "${eventName}" is being reviewed. We'll notify you when it's approved.`,
    link: 'TicketReseller?tab=selling',
    data: { eventName }
  }),

  /**
   * Notify seller that ticket was verified
   */
  ticketVerified: (userEmail, eventName, verificationLevel) => createNotification({
    userEmail,
    type: 'ticket_verified',
    title: 'Ticket Verified!',
    message: `Your ticket for "${eventName}" is now verified (${verificationLevel}) and live on the marketplace.`,
    link: 'TicketReseller?tab=selling',
    data: { eventName, verificationLevel }
  }),

  /**
   * Notify seller that verification was rejected
   */
  ticketRejected: (userEmail, eventName, reason) => createNotification({
    userEmail,
    type: 'ticket_rejected',
    title: 'Verification Unsuccessful',
    message: `We couldn't verify your ticket for "${eventName}". Reason: ${reason}`,
    link: 'TicketReseller?tab=selling',
    data: { eventName, reason }
  }),

  /**
   * Notify seller that ticket was sold
   */
  ticketSold: (userEmail, eventName, amount) => createNotification({
    userEmail,
    type: 'ticket_sold',
    title: 'Ticket Sold!',
    message: `Your ticket for "${eventName}" was sold for £${amount}. Transfer the ticket to complete the sale.`,
    link: 'TicketReseller?tab=selling',
    data: { eventName, amount }
  }),

  /**
   * Notify buyer that purchase was successful
   */
  ticketPurchased: (userEmail, eventName, sellerEmail) => createNotification({
    userEmail,
    type: 'ticket_purchased',
    title: 'Ticket Purchased!',
    message: `You've purchased a ticket for "${eventName}". The seller will transfer it shortly.`,
    link: 'TicketReseller?tab=purchases',
    data: { eventName }
  }),

  /**
   * Notify buyer that ticket was transferred
   */
  ticketTransferred: (userEmail, eventName) => createNotification({
    userEmail,
    type: 'ticket_transfer',
    title: 'Ticket Received',
    message: `Your ticket for "${eventName}" has been transferred. Please confirm receipt to release payment.`,
    link: 'TicketReseller?tab=purchases',
    data: { eventName }
  }),

  /**
   * Notify about dispute
   */
  disputeOpened: (userEmail, eventName, disputeId) => createNotification({
    userEmail,
    type: 'ticket_dispute',
    title: 'Dispute Opened',
    message: `A dispute has been opened for the ticket to "${eventName}". Please respond within 48 hours.`,
    link: 'TicketReseller?tab=disputes',
    data: { eventName, disputeId }
  }),

  /**
   * Admin notification for new verification request
   */
  newVerificationRequest: (eventName, sellerEmail, riskScore) => createAdminNotification({
    type: 'verification_request',
    title: 'New Ticket Verification',
    message: `${sellerEmail} submitted verification for "${eventName}"`,
    data: { eventName, sellerEmail, riskScore },
    priority: riskScore > 30 ? 'high' : 'normal'
  })
};

// ============================
// BUSINESS ADVERTISING NOTIFICATIONS
// ============================

export const AdvertisingNotifications = {
  /**
   * Notify business that campaign was approved
   */
  campaignApproved: (userEmail, campaignName, placementType) => createNotification({
    userEmail,
    type: 'ad_approved',
    title: 'Campaign Approved!',
    message: `Your ${placementType} campaign "${campaignName}" has been approved and is now processing.`,
    link: 'BusinessAdvertising',
    data: { campaignName, placementType }
  }),

  /**
   * Notify business that campaign is live
   */
  campaignLive: (userEmail, campaignName) => createNotification({
    userEmail,
    type: 'ad_live',
    title: 'Campaign Live!',
    message: `Your campaign "${campaignName}" is now live on the HotMess Globe!`,
    link: 'BusinessAdvertising',
    data: { campaignName }
  }),

  /**
   * Notify business that campaign is expiring soon
   */
  campaignExpiringSoon: (userEmail, campaignName, daysLeft) => createNotification({
    userEmail,
    type: 'ad_expiring',
    title: 'Campaign Expiring Soon',
    message: `Your campaign "${campaignName}" expires in ${daysLeft} days. Renew now to keep your visibility.`,
    link: 'BusinessAdvertising',
    data: { campaignName, daysLeft }
  }),

  /**
   * Notify business that campaign has expired
   */
  campaignExpired: (userEmail, campaignName) => createNotification({
    userEmail,
    type: 'ad_expired',
    title: 'Campaign Expired',
    message: `Your campaign "${campaignName}" has expired. Create a new campaign to stay visible.`,
    link: 'BusinessAdvertising',
    data: { campaignName }
  }),

  /**
   * Notify business about performance milestone
   */
  performanceMilestone: (userEmail, campaignName, milestone, value) => createNotification({
    userEmail,
    type: 'campaign_milestone',
    title: 'Campaign Milestone!',
    message: `Your campaign "${campaignName}" reached ${value.toLocaleString()} ${milestone}!`,
    link: 'BusinessAdvertising?tab=analytics',
    data: { campaignName, milestone, value }
  }),

  /**
   * Weekly performance summary
   */
  weeklyPerformance: (userEmail, impressions, clicks, ctr) => createNotification({
    userEmail,
    type: 'ad_performance',
    title: 'Weekly Performance Report',
    message: `This week: ${impressions.toLocaleString()} impressions, ${clicks.toLocaleString()} clicks (${ctr}% CTR)`,
    link: 'BusinessAdvertising?tab=analytics',
    data: { impressions, clicks, ctr }
  })
};

// ============================
// SELLER NOTIFICATIONS
// ============================

export const SellerNotifications = {
  /**
   * Notify seller they've been verified
   */
  sellerVerified: (userEmail, verificationLevel) => createNotification({
    userEmail,
    type: 'seller_verified',
    title: 'Seller Verified!',
    message: `Congratulations! You're now a ${verificationLevel} verified seller. Enjoy higher limits and trust badges.`,
    link: 'SellerDashboard',
    data: { verificationLevel }
  }),

  /**
   * Notify seller about payout
   */
  payoutProcessed: (userEmail, amount) => createNotification({
    userEmail,
    type: 'seller_payout',
    title: 'Payout Processed!',
    message: `£${amount.toFixed(2)} has been sent to your bank account. Usually arrives in 1-2 business days.`,
    link: 'SellerDashboard?tab=payouts',
    data: { amount }
  }),

  /**
   * Notify seller about new review
   */
  newReview: (userEmail, rating, buyerName) => createNotification({
    userEmail,
    type: 'seller_review',
    title: 'New Review Received',
    message: `${buyerName} left you a ${rating}-star review. Check your seller dashboard to see it.`,
    link: 'SellerDashboard?tab=reviews',
    data: { rating, buyerName }
  })
};

// ============================
// PROMOTIONAL NOTIFICATIONS
// ============================

export const PromoNotifications = {
  /**
   * Feature unlock notification
   */
  featureUnlocked: (userEmail, featureName, description) => createNotification({
    userEmail,
    type: 'feature_unlock',
    title: `New Feature Unlocked: ${featureName}`,
    message: description,
    data: { featureName }
  }),

  /**
   * Generic promotional notification
   */
  promo: (userEmail, title, message, link = null) => createNotification({
    userEmail,
    type: 'promo',
    title,
    message,
    link,
    data: {}
  })
};

export default {
  createNotification,
  createAdminNotification,
  TicketNotifications,
  AdvertisingNotifications,
  SellerNotifications,
  PromoNotifications
};
