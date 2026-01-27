/**
 * API Route: Ticket Disputes
 * 
 * GET - Get user's disputes
 * POST - Create/respond to dispute
 */

import { withRateLimit } from '../middleware/rateLimiter.js';
import { validateUser, getServiceClient, sendNotification, logFraudAlert } from './_utils.js';

async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGetDisputes(req, res);
  } else if (req.method === 'POST') {
    return handleDisputeAction(req, res);
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET /api/ticket-reseller/disputes
 * Get user's disputes
 */
async function handleGetDisputes(req, res) {
  const { user, error: authError } = await validateUser(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }

  const supabase = getServiceClient();

  try {
    const { status, page = 1, limit = 20 } = req.query;

    let query = supabase
      .from('ticket_disputes')
      .select(`
        *,
        order:ticket_orders!order_id(
          id,
          total_gbp,
          listing:ticket_listings!listing_id(
            event_name,
            event_date,
            ticket_type
          )
        )
      `, { count: 'exact' })
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;
    query = query.range(offset, offset + limitNum - 1);

    const { data: disputes, error, count } = await query;

    if (error) {
      console.error('[Disputes] Query error:', error);
      return res.status(500).json({ error: 'Failed to fetch disputes' });
    }

    const disputesWithRole = disputes?.map(d => ({
      ...d,
      userRole: d.buyer_id === user.id ? 'buyer' : 'seller',
    })) || [];

    return res.status(200).json({
      disputes: disputesWithRole,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
    });

  } catch (error) {
    console.error('[Disputes] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch disputes' });
  }
}

/**
 * POST /api/ticket-reseller/disputes
 * Create or respond to a dispute
 */
async function handleDisputeAction(req, res) {
  const { user, error: authError } = await validateUser(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }

  const supabase = getServiceClient();

  try {
    const { action, dispute_id, order_id, reason, description, evidence, statement } = req.body;

    switch (action) {
      case 'create':
        return await handleCreateDispute(supabase, user, order_id, reason, description, res);

      case 'respond':
        return await handleRespondDispute(supabase, user, dispute_id, statement, evidence, res);

      case 'add_evidence':
        return await handleAddEvidence(supabase, user, dispute_id, evidence, res);

      default:
        return res.status(400).json({
          error: 'Invalid action',
          validActions: ['create', 'respond', 'add_evidence'],
        });
    }

  } catch (error) {
    console.error('[Disputes] Error:', error);
    return res.status(500).json({ error: 'Failed to process dispute action' });
  }
}

/**
 * Create a new dispute
 */
async function handleCreateDispute(supabase, user, orderId, reason, description, res) {
  if (!orderId || !reason || !description) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['order_id', 'reason', 'description'],
    });
  }

  const validReasons = [
    'ticket_not_received',
    'ticket_invalid',
    'wrong_ticket',
    'event_cancelled',
    'seller_unresponsive',
    'buyer_unresponsive',
    'other',
  ];

  if (!validReasons.includes(reason)) {
    return res.status(400).json({
      error: `Invalid reason. Must be one of: ${validReasons.join(', ')}`,
    });
  }

  // Get order
  const { data: order, error: orderError } = await supabase
    .from('ticket_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Verify user is part of transaction
  const isBuyer = order.buyer_id === user.id;
  const isSeller = order.seller_id === user.id;

  if (!isBuyer && !isSeller) {
    return res.status(403).json({ error: 'You are not part of this transaction' });
  }

  // Check if dispute already exists
  const { data: existingDispute } = await supabase
    .from('ticket_disputes')
    .select('id')
    .eq('order_id', orderId)
    .not('status', 'eq', 'closed')
    .single();

  if (existingDispute) {
    return res.status(400).json({
      error: 'An active dispute already exists for this order',
      dispute_id: existingDispute.id,
    });
  }

  // Get user email
  const { data: userData } = await supabase
    .from('User')
    .select('email')
    .eq('auth_user_id', user.id)
    .single();

  const userEmail = userData?.email || user.email;

  // Create dispute
  const responseDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const { data: dispute, error: insertError } = await supabase
    .from('ticket_disputes')
    .insert({
      order_id: orderId,
      opened_by: user.id,
      opened_by_email: userEmail,
      buyer_id: order.buyer_id,
      buyer_email: order.buyer_email,
      seller_id: order.seller_id,
      seller_email: order.seller_email,
      reason,
      description,
      status: 'open',
      response_deadline: responseDeadline.toISOString(),
      [isBuyer ? 'buyer_statement' : 'seller_statement']: description,
      [isBuyer ? 'buyer_submitted_at' : 'seller_submitted_at']: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error('[Disputes] Create error:', insertError);
    return res.status(500).json({ error: 'Failed to create dispute' });
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
    .eq('id', orderId);

  // Log potential fraud if certain conditions
  if (['ticket_invalid', 'ticket_not_received', 'wrong_ticket'].includes(reason)) {
    await logFraudAlert(
      supabase,
      'order',
      orderId,
      order.seller_id,
      'disputed_transaction',
      `Dispute opened: ${reason}`,
      { reason, description, buyerInitiated: isBuyer }
    );
  }

  // Notify other party
  const otherPartyEmail = isBuyer ? order.seller_email : order.buyer_email;
  await sendNotification(
    supabase,
    otherPartyEmail,
    'dispute_opened',
    'Dispute Opened',
    `A dispute has been opened for your ticket transaction. Please respond within 48 hours.`,
    `/ticket-reseller/disputes/${dispute.id}`
  );

  console.log(`[Disputes] Created dispute ${dispute.id} for order ${orderId}`);

  return res.status(201).json({
    dispute,
    message: 'Dispute created. The other party has 48 hours to respond.',
    responseDeadline: responseDeadline.toISOString(),
  });
}

/**
 * Respond to a dispute
 */
async function handleRespondDispute(supabase, user, disputeId, statement, evidence, res) {
  if (!disputeId || !statement) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['dispute_id', 'statement'],
    });
  }

  // Get dispute
  const { data: dispute, error: disputeError } = await supabase
    .from('ticket_disputes')
    .select('*')
    .eq('id', disputeId)
    .single();

  if (disputeError || !dispute) {
    return res.status(404).json({ error: 'Dispute not found' });
  }

  // Verify user is part of dispute
  const isBuyer = dispute.buyer_id === user.id;
  const isSeller = dispute.seller_id === user.id;

  if (!isBuyer && !isSeller) {
    return res.status(403).json({ error: 'You are not part of this dispute' });
  }

  // Check if already responded
  const alreadyResponded = isBuyer ? dispute.buyer_submitted_at : dispute.seller_submitted_at;
  if (alreadyResponded) {
    return res.status(400).json({ error: 'You have already submitted a response' });
  }

  // Update dispute
  const updates = {
    status: 'under_review',
    [isBuyer ? 'buyer_statement' : 'seller_statement']: statement,
    [isBuyer ? 'buyer_submitted_at' : 'seller_submitted_at']: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (evidence && evidence.length > 0) {
    updates[isBuyer ? 'buyer_evidence' : 'seller_evidence'] = evidence;
  }

  const { error: updateError } = await supabase
    .from('ticket_disputes')
    .update(updates)
    .eq('id', disputeId);

  if (updateError) {
    console.error('[Disputes] Response error:', updateError);
    return res.status(500).json({ error: 'Failed to submit response' });
  }

  // Notify other party
  const otherPartyEmail = isBuyer ? dispute.seller_email : dispute.buyer_email;
  await sendNotification(
    supabase,
    otherPartyEmail,
    'dispute_response',
    'Dispute Response Received',
    'The other party has responded to the dispute. Our team is reviewing.',
    `/ticket-reseller/disputes/${disputeId}`
  );

  console.log(`[Disputes] Response submitted for dispute ${disputeId}`);

  return res.status(200).json({
    success: true,
    message: 'Response submitted. Our team will review and make a decision.',
  });
}

/**
 * Add additional evidence to a dispute
 */
async function handleAddEvidence(supabase, user, disputeId, evidence, res) {
  if (!disputeId || !evidence || evidence.length === 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['dispute_id', 'evidence (array of URLs)'],
    });
  }

  // Get dispute
  const { data: dispute, error: disputeError } = await supabase
    .from('ticket_disputes')
    .select('*')
    .eq('id', disputeId)
    .single();

  if (disputeError || !dispute) {
    return res.status(404).json({ error: 'Dispute not found' });
  }

  // Verify user is part of dispute
  const isBuyer = dispute.buyer_id === user.id;
  const isSeller = dispute.seller_id === user.id;

  if (!isBuyer && !isSeller) {
    return res.status(403).json({ error: 'You are not part of this dispute' });
  }

  // Check if dispute is still open for evidence
  if (['resolved_buyer_favor', 'resolved_seller_favor', 'resolved_partial', 'closed'].includes(dispute.status)) {
    return res.status(400).json({ error: 'Dispute is already resolved' });
  }

  // Add to existing evidence
  const existingEvidence = isBuyer ? (dispute.buyer_evidence || []) : (dispute.seller_evidence || []);
  const newEvidence = [...existingEvidence, ...evidence];

  const { error: updateError } = await supabase
    .from('ticket_disputes')
    .update({
      [isBuyer ? 'buyer_evidence' : 'seller_evidence']: newEvidence,
      updated_at: new Date().toISOString(),
    })
    .eq('id', disputeId);

  if (updateError) {
    console.error('[Disputes] Evidence error:', updateError);
    return res.status(500).json({ error: 'Failed to add evidence' });
  }

  console.log(`[Disputes] Added ${evidence.length} evidence items to dispute ${disputeId}`);

  return res.status(200).json({
    success: true,
    message: 'Evidence added successfully.',
    totalEvidence: newEvidence.length,
  });
}

export default withRateLimit(handler, { tier: 'auth' });
