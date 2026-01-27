/**
 * API Route: Release Escrow
 * Allows buyers to manually release escrow for delivered orders
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseServiceKey) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { order_id, buyer_email } = req.body;

    if (!order_id || !buyer_email) {
      return res.status(400).json({ error: 'order_id and buyer_email are required' });
    }

    // Get the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('buyer_email', buyer_email)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'escrow') {
      return res.status(400).json({ error: `Order is not in escrow (status: ${order.status})` });
    }

    // Check for active disputes
    const { data: disputes } = await supabase
      .from('order_disputes')
      .select('id, status')
      .eq('order_id', order_id)
      .in('status', ['open', 'investigating']);

    if (disputes && disputes.length > 0) {
      return res.status(400).json({ error: 'Cannot release escrow while dispute is active' });
    }

    // Calculate platform fee (10%)
    const platformFee = Math.round(order.total_xp * 0.10);
    const sellerAmount = order.total_xp - platformFee;

    // Get seller's current XP
    const { data: seller, error: sellerError } = await supabase
      .from('User')
      .select('xp')
      .eq('email', order.seller_email)
      .single();

    if (sellerError || !seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    // Credit seller's XP (minus platform fee)
    const { error: creditError } = await supabase
      .from('User')
      .update({ xp: (seller.xp || 0) + sellerAmount })
      .eq('email', order.seller_email);

    if (creditError) {
      return res.status(500).json({ error: 'Failed to credit seller' });
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        escrow_released_at: new Date().toISOString(),
        escrow_released_by: buyer_email,
        platform_fee_xp: platformFee,
        seller_received_xp: sellerAmount,
      })
      .eq('id', order_id);

    if (updateError) {
      // Rollback seller XP
      await supabase
        .from('User')
        .update({ xp: seller.xp || 0 })
        .eq('email', order.seller_email);
      
      return res.status(500).json({ error: 'Failed to update order' });
    }

    // Record in XP ledger
    await supabase.from('xp_ledger').insert([
      {
        user_email: order.seller_email,
        amount: sellerAmount,
        transaction_type: 'escrow_release',
        reference_id: order_id,
        reference_type: 'order',
        balance_after: (seller.xp || 0) + sellerAmount,
      },
      {
        user_email: 'platform@hotmess.london',
        amount: platformFee,
        transaction_type: 'platform_fee',
        reference_id: order_id,
        reference_type: 'order',
      },
    ]);

    // Notify seller
    await supabase.from('notifications').insert({
      user_email: order.seller_email,
      type: 'escrow_released',
      title: 'Payment Released!',
      message: `${sellerAmount.toLocaleString()} XP has been released for order #${order_id.slice(0, 8)}`,
      link: 'SellerDashboard',
    });

    console.log(`[Escrow] Released ${sellerAmount} XP to ${order.seller_email} for order ${order_id}`);

    return res.status(200).json({
      success: true,
      seller_received: sellerAmount,
      platform_fee: platformFee,
    });

  } catch (error) {
    console.error('[Escrow] Release error:', error);
    return res.status(500).json({ 
      error: 'Failed to release escrow',
      details: error.message,
    });
  }
}
