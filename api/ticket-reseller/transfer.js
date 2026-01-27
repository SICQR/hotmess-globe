/**
 * API Route: Ticket Transfer Operations
 * 
 * Handles the ticket transfer process between seller and buyer
 */

import { withRateLimit } from '../middleware/rateLimiter.js';
import {
  validateUser,
  getServiceClient,
  sendNotification,
  logFraudAlert,
  ESCROW_AUTO_RELEASE_HOURS,
} from './_utils.js';

async function handler(req, res) {
  if (req.method === 'POST') {
    return handleTransferAction(req, res);
  } else if (req.method === 'GET') {
    return handleGetTransfer(req, res);
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * POST /api/ticket-reseller/transfer
 * Perform transfer actions (seller submits proof, buyer confirms receipt)
 */
async function handleTransferAction(req, res) {
  const { user, error: authError } = await validateUser(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }

  const supabase = getServiceClient();

  try {
    const { order_id, action, proof_urls, notes, transfer_reference } = req.body;

    if (!order_id || !action) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['order_id', 'action'],
      });
    }

    // Get the order and transfer
    const { data: order, error: orderError } = await supabase
      .from('ticket_orders')
      .select(`
        *,
        transfer:ticket_transfers!order_id(*),
        listing:ticket_listings!listing_id(*)
      `)
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const transfer = order.transfer?.[0];
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer record not found' });
    }

    // Determine if user is buyer or seller
    const isSeller = order.seller_id === user.id;
    const isBuyer = order.buyer_id === user.id;

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ error: 'You are not part of this transaction' });
    }

    switch (action) {
      case 'submit_proof':
        return await handleSellerSubmitProof(
          supabase, user, order, transfer, proof_urls, notes, transfer_reference, isSeller, res
        );

      case 'confirm_receipt':
        return await handleBuyerConfirmReceipt(
          supabase, user, order, transfer, proof_urls, notes, isBuyer, res
        );

      case 'report_issue':
        return await handleReportIssue(
          supabase, user, order, transfer, notes, res
        );

      default:
        return res.status(400).json({
          error: 'Invalid action',
          validActions: ['submit_proof', 'confirm_receipt', 'report_issue'],
        });
    }

  } catch (error) {
    console.error('[Transfer] Error:', error);
    return res.status(500).json({ error: 'Failed to process transfer action' });
  }
}

/**
 * Seller submits proof of transfer
 */
async function handleSellerSubmitProof(
  supabase, user, order, transfer, proofUrls, notes, transferReference, isSeller, res
) {
  if (!isSeller) {
    return res.status(403).json({ error: 'Only the seller can submit transfer proof' });
  }

  if (!proofUrls || proofUrls.length === 0) {
    return res.status(400).json({ error: 'Please upload proof of ticket transfer' });
  }

  if (!['pending', 'initiated'].includes(transfer.status)) {
    return res.status(400).json({
      error: `Transfer is ${transfer.status}. Cannot submit proof at this stage.`,
    });
  }

  const now = new Date();
  const confirmationDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Update transfer record
  const { error: transferError } = await supabase
    .from('ticket_transfers')
    .update({
      status: 'proof_submitted',
      seller_proof_urls: proofUrls,
      seller_proof_submitted_at: now.toISOString(),
      seller_notes: notes || null,
      transfer_reference: transferReference || null,
      confirmation_deadline: confirmationDeadline.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', transfer.id);

  if (transferError) {
    console.error('[Transfer] Update error:', transferError);
    return res.status(500).json({ error: 'Failed to submit proof' });
  }

  // Update order status
  await supabase
    .from('ticket_orders')
    .update({
      status: 'transferred',
      escrow_status: 'buyer_confirmation_pending',
      transfer_started_at: now.toISOString(),
      transfer_proof_url: proofUrls[0],
      transfer_reference: transferReference || null,
      auto_release_scheduled_at: confirmationDeadline.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', order.id);

  // Notify buyer
  await sendNotification(
    supabase,
    order.buyer_email,
    'ticket_transferred',
    'Ticket Transfer Submitted',
    `The seller has transferred your ${order.listing?.event_name} ticket. Please confirm receipt within 48 hours.`,
    `/ticket-reseller/orders/${order.id}`
  );

  console.log(`[Transfer] Seller submitted proof for order ${order.id}`);

  return res.status(200).json({
    success: true,
    message: 'Transfer proof submitted. Waiting for buyer confirmation.',
    confirmationDeadline: confirmationDeadline.toISOString(),
  });
}

/**
 * Buyer confirms receipt of ticket
 */
async function handleBuyerConfirmReceipt(supabase, user, order, transfer, proofUrls, notes, isBuyer, res) {
  if (!isBuyer) {
    return res.status(403).json({ error: 'Only the buyer can confirm receipt' });
  }

  if (transfer.status !== 'proof_submitted') {
    return res.status(400).json({
      error: `Cannot confirm receipt. Transfer status is: ${transfer.status}`,
    });
  }

  const now = new Date();

  // Update transfer record
  const { error: transferError } = await supabase
    .from('ticket_transfers')
    .update({
      status: 'confirmed',
      buyer_proof_urls: proofUrls || [],
      buyer_confirmed_at: now.toISOString(),
      buyer_notes: notes || null,
      ticket_validated: true,
      validated_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', transfer.id);

  if (transferError) {
    console.error('[Transfer] Confirm error:', transferError);
    return res.status(500).json({ error: 'Failed to confirm receipt' });
  }

  // Update order status
  await supabase
    .from('ticket_orders')
    .update({
      status: 'completed',
      escrow_status: 'release_pending',
      buyer_confirmed_receipt: true,
      buyer_confirmed_at: now.toISOString(),
      buyer_ticket_received_proof: proofUrls?.[0] || null,
      updated_at: now.toISOString(),
    })
    .eq('id', order.id);

  // Trigger escrow release
  await releaseEscrow(supabase, order);

  // Notify seller
  await sendNotification(
    supabase,
    order.seller_email,
    'ticket_confirmed',
    'Ticket Confirmed!',
    `The buyer has confirmed receipt of the ticket. Your payment is being processed.`,
    `/ticket-reseller/orders/${order.id}`
  );

  console.log(`[Transfer] Buyer confirmed receipt for order ${order.id}`);

  return res.status(200).json({
    success: true,
    message: 'Receipt confirmed! Payment will be released to the seller.',
  });
}

/**
 * Report an issue with the transfer
 */
async function handleReportIssue(supabase, user, order, transfer, notes, res) {
  if (!notes) {
    return res.status(400).json({ error: 'Please describe the issue' });
  }

  // Create a dispute
  const { data: dispute, error: disputeError } = await supabase
    .from('ticket_disputes')
    .insert({
      order_id: order.id,
      opened_by: user.id,
      opened_by_email: user.email,
      buyer_id: order.buyer_id,
      buyer_email: order.buyer_email,
      seller_id: order.seller_id,
      seller_email: order.seller_email,
      reason: order.buyer_id === user.id ? 'ticket_not_received' : 'buyer_unresponsive',
      description: notes,
      status: 'open',
      response_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (disputeError) {
    console.error('[Transfer] Dispute creation error:', disputeError);
    return res.status(500).json({ error: 'Failed to report issue' });
  }

  // Update order status
  await supabase
    .from('ticket_orders')
    .update({
      status: 'disputed',
      escrow_status: 'disputed',
      dispute_id: dispute.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id);

  // Notify other party
  const otherPartyEmail = order.buyer_id === user.id ? order.seller_email : order.buyer_email;
  await sendNotification(
    supabase,
    otherPartyEmail,
    'dispute_opened',
    'Dispute Opened',
    `A dispute has been opened for your ticket transaction. Please respond within 48 hours.`,
    `/ticket-reseller/disputes/${dispute.id}`
  );

  console.log(`[Transfer] Dispute created for order ${order.id}`);

  return res.status(200).json({
    success: true,
    dispute_id: dispute.id,
    message: 'Issue reported. Our team will review and contact both parties.',
  });
}

/**
 * Release escrow funds to seller
 */
async function releaseEscrow(supabase, order) {
  const now = new Date();

  // Update escrow
  await supabase
    .from('ticket_escrow')
    .update({
      status: 'released',
      funds_released_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('order_id', order.id);

  // Update order
  await supabase
    .from('ticket_orders')
    .update({
      escrow_status: 'released',
      escrow_released_at: now.toISOString(),
      seller_payout_status: 'completed',
      seller_paid_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', order.id);

  // Update seller stats
  await supabase
    .from('seller_ticket_verification')
    .update({
      total_sales: supabase.rpc('increment', 1),
      successful_sales: supabase.rpc('increment', 1),
      updated_at: now.toISOString(),
    })
    .eq('user_id', order.seller_id);

  console.log(`[Escrow] Released funds for order ${order.id}`);
}

/**
 * GET /api/ticket-reseller/transfer?order_id=xxx
 * Get transfer status
 */
async function handleGetTransfer(req, res) {
  const { user, error: authError } = await validateUser(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }

  const supabase = getServiceClient();
  const { order_id } = req.query;

  if (!order_id) {
    return res.status(400).json({ error: 'order_id is required' });
  }

  const { data: transfer, error } = await supabase
    .from('ticket_transfers')
    .select('*')
    .eq('order_id', order_id)
    .single();

  if (error || !transfer) {
    return res.status(404).json({ error: 'Transfer not found' });
  }

  // Verify user is part of transaction
  if (transfer.seller_id !== user.id && transfer.buyer_id !== user.id) {
    return res.status(403).json({ error: 'You are not part of this transaction' });
  }

  return res.status(200).json({ transfer });
}

export default withRateLimit(handler, { tier: 'auth' });
