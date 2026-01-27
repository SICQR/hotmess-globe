/**
 * Cron Job: Auto-Release Escrow
 * Automatically releases escrow for orders that have been delivered
 * and buyer hasn't released manually within the grace period
 * 
 * Runs: Every 6 hours
 * Schedule in vercel.json: "0 */6 * * *"
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Grace period in days before auto-release
const ESCROW_GRACE_PERIOD_DAYS = 7;

export default async function handler(req, res) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!supabaseServiceKey) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const results = {
    released: 0,
    skipped: 0,
    errors: [],
  };

  try {
    console.log('[Cron/Escrow] Starting automatic escrow release...');

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ESCROW_GRACE_PERIOD_DAYS);

    // Find orders in escrow that have been delivered and past grace period
    const { data: escrowOrders, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'escrow')
      .eq('payment_method', 'xp')
      .not('delivered_at', 'is', null)
      .lt('delivered_at', cutoffDate.toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch escrow orders: ${fetchError.message}`);
    }

    if (!escrowOrders || escrowOrders.length === 0) {
      console.log('[Cron/Escrow] No escrow orders ready for auto-release');
      return res.status(200).json({ message: 'No escrow orders to release', results });
    }

    console.log(`[Cron/Escrow] Found ${escrowOrders.length} orders for auto-release`);

    // Process each order
    for (const order of escrowOrders) {
      try {
        // Check for active disputes
        const { data: disputes } = await supabase
          .from('order_disputes')
          .select('id, status')
          .eq('order_id', order.id)
          .in('status', ['open', 'investigating']);

        if (disputes && disputes.length > 0) {
          results.skipped++;
          console.log(`[Cron/Escrow] Skipping order ${order.id} - has active dispute`);
          continue;
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
          results.errors.push(`Seller not found for order ${order.id}`);
          results.skipped++;
          continue;
        }

        // Credit seller's XP (minus platform fee)
        const { error: creditError } = await supabase
          .from('User')
          .update({ xp: (seller.xp || 0) + sellerAmount })
          .eq('email', order.seller_email);

        if (creditError) {
          throw new Error(`Failed to credit seller: ${creditError.message}`);
        }

        // Update order status
        await supabase
          .from('orders')
          .update({
            status: 'completed',
            escrow_released_at: new Date().toISOString(),
            escrow_released_by: 'auto',
            platform_fee_xp: platformFee,
            seller_received_xp: sellerAmount,
          })
          .eq('id', order.id);

        // Record in XP ledger
        await supabase.from('xp_ledger').insert([
          {
            user_email: order.seller_email,
            amount: sellerAmount,
            transaction_type: 'escrow_release',
            reference_id: order.id,
            reference_type: 'order',
            balance_after: (seller.xp || 0) + sellerAmount,
          },
          {
            user_email: 'platform@hotmess.london',
            amount: platformFee,
            transaction_type: 'platform_fee',
            reference_id: order.id,
            reference_type: 'order',
          },
        ]);

        // Notify seller
        await supabase.from('notifications').insert({
          user_email: order.seller_email,
          type: 'escrow_released',
          title: 'Payment Released!',
          message: `${sellerAmount.toLocaleString()} XP has been released for order #${order.id.slice(0, 8)}`,
          link: 'SellerDashboard',
        });

        // Notify buyer
        await supabase.from('notifications').insert({
          user_email: order.buyer_email,
          type: 'escrow_released',
          title: 'Escrow Auto-Released',
          message: `Payment was automatically released for order #${order.id.slice(0, 8)}`,
          link: 'OrderHistory',
        });

        results.released++;
        console.log(`[Cron/Escrow] Released escrow for order ${order.id}: ${sellerAmount} XP to ${order.seller_email}`);

      } catch (orderError) {
        results.errors.push(`Order ${order.id}: ${orderError.message}`);
        console.error(`[Cron/Escrow] Error processing order ${order.id}:`, orderError);
      }
    }

    console.log(`[Cron/Escrow] Complete. Released: ${results.released}, Skipped: ${results.skipped}`);

    return res.status(200).json({
      success: true,
      results,
    });

  } catch (error) {
    console.error('[Cron/Escrow] Fatal error:', error);
    return res.status(500).json({ 
      error: 'Escrow release failed',
      details: error.message,
    });
  }
}
