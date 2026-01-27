/**
 * API Route: Single Order Operations
 * 
 * GET - Get order details
 */

import { withRateLimit } from '../../middleware/rateLimiter.js';
import { validateUser, getServiceClient, calculatePricing } from '../_utils.js';

async function handler(req, res) {
  const { orderId } = req.query;

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user, error: authError } = await validateUser(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }

  const supabase = getServiceClient();

  try {
    // Get full order details
    const { data: order, error } = await supabase
      .from('ticket_orders')
      .select(`
        *,
        listing:ticket_listings!listing_id(*),
        transfer:ticket_transfers!order_id(*),
        dispute:ticket_disputes!order_id(*),
        escrow:ticket_escrow!order_id(*),
        messages:ticket_messages!order_id(
          id,
          sender_id,
          sender_email,
          message,
          attachments,
          is_system_message,
          read_at,
          created_at
        )
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify user is part of transaction
    const isBuyer = order.buyer_id === user.id;
    const isSeller = order.seller_id === user.id;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ error: 'You are not part of this transaction' });
    }

    // Get seller info (for buyer) or buyer info (for seller)
    let counterparty = null;
    if (isBuyer) {
      const { data: seller } = await supabase
        .from('seller_ticket_verification')
        .select('trust_score, badges, average_rating, total_sales, id_verified')
        .eq('user_id', order.seller_id)
        .single();
      counterparty = { role: 'seller', ...seller };
    } else {
      // Minimal buyer info for seller
      const { data: buyer } = await supabase
        .from('User')
        .select('full_name')
        .eq('auth_user_id', order.buyer_id)
        .single();
      counterparty = { role: 'buyer', name: buyer?.full_name };
    }

    // Calculate timeline
    const timeline = buildOrderTimeline(order);

    // Mark messages as read
    if (order.messages?.length > 0) {
      const unreadMessageIds = order.messages
        .filter(m => !m.read_at && m.sender_id !== user.id)
        .map(m => m.id);
      
      if (unreadMessageIds.length > 0) {
        await supabase
          .from('ticket_messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadMessageIds);
      }
    }

    return res.status(200).json({
      order,
      userRole: isBuyer ? 'buyer' : 'seller',
      counterparty,
      timeline,
      actions: getAvailableActions(order, isBuyer, isSeller),
    });

  } catch (error) {
    console.error('[Order] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch order' });
  }
}

/**
 * Build order timeline for UI display
 */
function buildOrderTimeline(order) {
  const timeline = [];

  timeline.push({
    status: 'created',
    label: 'Order Created',
    timestamp: order.created_at,
    completed: true,
  });

  timeline.push({
    status: 'paid',
    label: 'Payment Received',
    timestamp: order.paid_at,
    completed: !!order.paid_at,
  });

  timeline.push({
    status: 'transfer',
    label: 'Ticket Transferred',
    timestamp: order.transfer_started_at,
    completed: !!order.transfer_started_at,
    deadline: order.transfer?.[0]?.transfer_deadline,
  });

  timeline.push({
    status: 'confirmed',
    label: 'Buyer Confirmed',
    timestamp: order.buyer_confirmed_at,
    completed: !!order.buyer_confirmed_at,
    deadline: order.transfer?.[0]?.confirmation_deadline,
  });

  timeline.push({
    status: 'completed',
    label: 'Order Completed',
    timestamp: order.escrow_released_at || (order.status === 'completed' ? order.updated_at : null),
    completed: order.status === 'completed',
  });

  return timeline;
}

/**
 * Get available actions for the user
 */
function getAvailableActions(order, isBuyer, isSeller) {
  const actions = [];
  const transfer = order.transfer?.[0];

  if (order.status === 'disputed' || order.status === 'completed' || order.status === 'refunded') {
    return actions;
  }

  if (isSeller) {
    if (order.status === 'confirmed' && transfer?.status === 'pending') {
      actions.push({
        action: 'submit_proof',
        label: 'Submit Transfer Proof',
        description: 'Upload proof that you have transferred the ticket',
        deadline: transfer.transfer_deadline,
      });
    }
  }

  if (isBuyer) {
    if (transfer?.status === 'proof_submitted') {
      actions.push({
        action: 'confirm_receipt',
        label: 'Confirm Receipt',
        description: 'Confirm you received the ticket',
        deadline: transfer.confirmation_deadline,
      });
      actions.push({
        action: 'report_issue',
        label: 'Report Issue',
        description: 'Report a problem with the ticket or transfer',
      });
    }
  }

  // Both can message
  if (!['completed', 'refunded', 'cancelled'].includes(order.status)) {
    actions.push({
      action: 'send_message',
      label: 'Send Message',
      description: 'Contact the other party',
    });
  }

  return actions;
}

export default withRateLimit(handler, { tier: 'auth' });
