/**
 * API Route: Ticket Order Messages
 * 
 * GET - Get messages for an order
 * POST - Send a message
 */

import { withRateLimit } from '../middleware/rateLimiter.js';
import { validateUser, getServiceClient, sendNotification } from './_utils.js';

async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGetMessages(req, res);
  } else if (req.method === 'POST') {
    return handleSendMessage(req, res);
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET /api/ticket-reseller/messages?order_id=xxx
 * Get messages for an order
 */
async function handleGetMessages(req, res) {
  const { user, error: authError } = await validateUser(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }

  const supabase = getServiceClient();
  const { order_id } = req.query;

  if (!order_id) {
    return res.status(400).json({ error: 'order_id is required' });
  }

  try {
    // Verify user is part of the order
    const { data: order, error: orderError } = await supabase
      .from('ticket_orders')
      .select('buyer_id, seller_id')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.buyer_id !== user.id && order.seller_id !== user.id) {
      return res.status(403).json({ error: 'You are not part of this transaction' });
    }

    // Get messages
    const { data: messages, error } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('order_id', order_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Messages] Query error:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    // Mark unread messages as read
    const unreadIds = messages
      ?.filter(m => !m.read_at && m.sender_id !== user.id)
      .map(m => m.id) || [];

    if (unreadIds.length > 0) {
      await supabase
        .from('ticket_messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);
    }

    return res.status(200).json({ messages: messages || [] });

  } catch (error) {
    console.error('[Messages] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
}

/**
 * POST /api/ticket-reseller/messages
 * Send a message
 */
async function handleSendMessage(req, res) {
  const { user, error: authError } = await validateUser(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }

  const supabase = getServiceClient();

  try {
    const { order_id, message, attachments = [] } = req.body;

    if (!order_id || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['order_id', 'message'],
      });
    }

    // Validate message length
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
    }

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('ticket_orders')
      .select('*')
      .eq('id', order_id)
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

    // Get sender email
    const { data: userData } = await supabase
      .from('User')
      .select('email')
      .eq('auth_user_id', user.id)
      .single();

    const senderEmail = userData?.email || user.email;

    // Create message
    const { data: newMessage, error: insertError } = await supabase
      .from('ticket_messages')
      .insert({
        order_id,
        sender_id: user.id,
        sender_email: senderEmail,
        message,
        attachments: attachments.slice(0, 5), // Max 5 attachments
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Messages] Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    // Update order message count and timestamp
    await supabase
      .from('ticket_orders')
      .update({
        message_count: (order.message_count || 0) + 1,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id);

    // Notify recipient
    const recipientEmail = isBuyer ? order.seller_email : order.buyer_email;
    await sendNotification(
      supabase,
      recipientEmail,
      'ticket_message',
      'New Message',
      `You have a new message regarding your ticket transaction.`,
      `/ticket-reseller/orders/${order_id}`
    );

    console.log(`[Messages] Sent message for order ${order_id}`);

    return res.status(201).json({
      message: newMessage,
    });

  } catch (error) {
    console.error('[Messages] Error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}

export default withRateLimit(handler, { tier: 'auth' });
