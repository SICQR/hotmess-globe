/**
 * Premium Content Notification Helpers
 * 
 * Creates notification outbox entries for premium content events:
 * - Content unlocked
 * - New subscriber
 * - Subscription renewed
 * - Product purchased
 * - Event RSVP (for organizers)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSupabase = () => {
  if (!supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
};

/**
 * Queue a notification to the outbox
 */
const queueNotification = async ({
  userEmail,
  notificationType,
  channel = 'in_app',
  title,
  message,
  metadata = {},
  sendAt = null,
}) => {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[notifications/premium] Supabase not configured, skipping notification');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('notification_outbox')
      .insert({
        user_email: userEmail,
        notification_type: notificationType,
        channel,
        title,
        message,
        metadata,
        send_at: sendAt,
        status: 'queued',
        created_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[notifications/premium] Failed to queue notification:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[notifications/premium] Error queuing notification:', err);
    return null;
  }
};

/**
 * Notify creator when their content is unlocked
 */
export const notifyContentUnlocked = async ({
  creatorEmail,
  buyerName,
  buyerEmail,
  unlockType,
  itemId,
  priceXp,
}) => {
  const typeLabels = {
    photo: 'photo',
    video: 'video',
    post: 'post',
    subscription: 'subscription',
  };

  const typeLabel = typeLabels[unlockType] || 'content';

  return queueNotification({
    userEmail: creatorEmail,
    notificationType: 'content_unlocked',
    title: 'Content Unlocked! 🔓',
    message: `${buyerName || 'Someone'} unlocked your ${typeLabel} for ${priceXp} XP`,
    metadata: {
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      unlock_type: unlockType,
      item_id: itemId,
      price_xp: priceXp,
      link: `/Profile?email=${encodeURIComponent(buyerEmail)}`,
    },
  });
};

/**
 * Notify creator when they get a new subscriber
 */
export const notifyNewSubscriber = async ({
  creatorEmail,
  subscriberName,
  subscriberEmail,
  tier,
  priceXp,
}) => {
  return queueNotification({
    userEmail: creatorEmail,
    notificationType: 'new_subscriber',
    title: 'New Subscriber! 🎉',
    message: `${subscriberName || 'Someone'} subscribed to your premium content${tier !== 'basic' ? ` (${tier} tier)` : ''}`,
    metadata: {
      subscriber_email: subscriberEmail,
      subscriber_name: subscriberName,
      tier,
      price_xp: priceXp,
      link: `/Profile?email=${encodeURIComponent(subscriberEmail)}`,
    },
  });
};

/**
 * Notify creator when a subscription is renewed
 */
export const notifySubscriptionRenewed = async ({
  creatorEmail,
  subscriberName,
  subscriberEmail,
  priceXp,
}) => {
  return queueNotification({
    userEmail: creatorEmail,
    notificationType: 'subscription_renewed',
    title: 'Subscription Renewed 💫',
    message: `${subscriberName || 'Someone'} renewed their subscription for ${priceXp} XP`,
    metadata: {
      subscriber_email: subscriberEmail,
      subscriber_name: subscriberName,
      price_xp: priceXp,
      link: `/Profile?email=${encodeURIComponent(subscriberEmail)}`,
    },
  });
};

/**
 * Notify seller when a product is purchased
 */
export const notifyProductPurchased = async ({
  sellerEmail,
  buyerName,
  buyerEmail,
  productName,
  productId,
  priceXp,
  quantity,
}) => {
  return queueNotification({
    userEmail: sellerEmail,
    notificationType: 'product_purchased',
    title: 'Product Sold! 🛍️',
    message: `${buyerName || 'Someone'} purchased ${quantity > 1 ? `${quantity}x ` : ''}${productName} for ${priceXp} XP`,
    metadata: {
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      product_id: productId,
      product_name: productName,
      price_xp: priceXp,
      quantity,
      link: `/market/product/${productId}`,
    },
  });
};

/**
 * Notify organizer when someone RSVPs to their event
 */
export const notifyEventRsvp = async ({
  organizerEmail,
  attendeeName,
  attendeeEmail,
  eventName,
  eventId,
  rsvpType = 'going',
}) => {
  const rsvpLabels = {
    going: 'is going to',
    interested: 'is interested in',
    maybe: 'might attend',
  };

  const rsvpLabel = rsvpLabels[rsvpType] || 'RSVP\'d to';

  return queueNotification({
    userEmail: organizerEmail,
    notificationType: 'event_rsvp',
    title: 'New RSVP! 📅',
    message: `${attendeeName || 'Someone'} ${rsvpLabel} ${eventName}`,
    metadata: {
      attendee_email: attendeeEmail,
      attendee_name: attendeeName,
      event_id: eventId,
      event_name: eventName,
      rsvp_type: rsvpType,
      link: `/beacons/${eventId}`,
    },
  });
};

/**
 * Notify creator when they receive a collaboration request
 */
export const notifyCollaborationRequest = async ({
  creatorEmail,
  requesterName,
  requesterEmail,
  eventName,
  eventId,
  message,
}) => {
  return queueNotification({
    userEmail: creatorEmail,
    notificationType: 'collaboration_request',
    title: 'Collaboration Request 🎵',
    message: `${requesterName || 'Someone'} wants to collaborate${eventName ? ` on "${eventName}"` : ''}`,
    metadata: {
      requester_email: requesterEmail,
      requester_name: requesterName,
      event_id: eventId,
      event_name: eventName,
      request_message: message,
      link: `/Profile?email=${encodeURIComponent(requesterEmail)}`,
    },
  });
};

/**
 * Notify buyer when their content is unlocked (confirmation)
 */
export const notifyUnlockConfirmation = async ({
  buyerEmail,
  creatorName,
  creatorEmail,
  unlockType,
  priceXp,
}) => {
  const typeLabels = {
    photo: 'photo',
    video: 'video',
    post: 'post',
    subscription: 'full access',
  };

  const typeLabel = typeLabels[unlockType] || 'content';

  return queueNotification({
    userEmail: buyerEmail,
    notificationType: 'unlock_confirmed',
    title: 'Content Unlocked ✨',
    message: `You unlocked ${creatorName || 'a creator'}'s ${typeLabel} for ${priceXp} XP`,
    metadata: {
      creator_email: creatorEmail,
      creator_name: creatorName,
      unlock_type: unlockType,
      price_xp: priceXp,
      link: `/Profile?email=${encodeURIComponent(creatorEmail)}`,
    },
  });
};

/**
 * Notify XP credit after Stripe purchase
 */
export const notifyXpCredited = async ({
  userEmail,
  amount,
  packageName,
}) => {
  return queueNotification({
    userEmail,
    notificationType: 'xp_credited',
    title: 'XP Credited! 💰',
    message: `${amount.toLocaleString()} XP has been added to your account`,
    metadata: {
      amount,
      package_name: packageName,
      link: '/market',
    },
  });
};

export default {
  notifyContentUnlocked,
  notifyNewSubscriber,
  notifySubscriptionRenewed,
  notifyProductPurchased,
  notifyEventRsvp,
  notifyCollaborationRequest,
  notifyUnlockConfirmation,
  notifyXpCredited,
};
