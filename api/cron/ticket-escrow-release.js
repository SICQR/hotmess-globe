/**
 * Cron Job: Ticket Escrow Auto-Release
 * 
 * Automatically releases escrow for orders where:
 * - Transfer proof has been submitted
 * - Buyer hasn't confirmed/disputed within 48 hours
 * 
 * Also handles:
 * - Expiring ticket listings before events
 * - Sending reminder notifications
 * - Flagging stale transactions
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // Verify cron secret for security
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!supabaseServiceKey) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const now = new Date();
  
  const results = {
    autoReleased: 0,
    expiredListings: 0,
    remindersSent: 0,
    errors: [],
  };

  try {
    // 1. Auto-release escrow for orders past confirmation deadline
    console.log('[Ticket Cron] Checking for auto-release orders...');
    
    const { data: ordersToRelease, error: ordersError } = await supabase
      .from('ticket_orders')
      .select('*, escrow:ticket_escrow!order_id(*), transfer:ticket_transfers!order_id(*)')
      .eq('escrow_status', 'buyer_confirmation_pending')
      .lt('auto_release_scheduled_at', now.toISOString())
      .is('dispute_id', null);

    if (ordersError) {
      console.error('[Ticket Cron] Orders query error:', ordersError);
      results.errors.push({ type: 'orders_query', error: ordersError.message });
    } else if (ordersToRelease?.length > 0) {
      for (const order of ordersToRelease) {
        try {
          // First, create the Stripe transfer to the seller's connected account
          let stripeTransferId = null;
          
          if (order.stripe_payment_intent_id && process.env.STRIPE_SECRET_KEY) {
            try {
              // Get seller's Stripe Connect ID
              const { data: seller } = await supabase
                .from('User')
                .select('stripe_connect_id, stripe_connect_status')
                .eq('email', order.seller_email)
                .single();
              
              if (seller?.stripe_connect_id && seller?.stripe_connect_status === 'active') {
                // Calculate the seller payout amount (from order record)
                const payoutAmountPence = Math.round((order.seller_payout_amount_gbp || 0) * 100);
                
                if (payoutAmountPence > 0) {
                  // Create the actual Stripe transfer now that escrow is released
                  const transfer = await stripe.transfers.create({
                    amount: payoutAmountPence,
                    currency: 'gbp',
                    destination: seller.stripe_connect_id,
                    source_transaction: order.stripe_payment_intent_id,
                    metadata: {
                      order_id: order.id,
                      type: 'ticket_escrow_release',
                      auto_released: 'true',
                    },
                  });
                  stripeTransferId = transfer.id;
                  console.log(`[Ticket Cron] Created Stripe transfer ${transfer.id} for order ${order.id}`);
                }
              } else {
                console.log(`[Ticket Cron] Seller ${order.seller_email} has no active Stripe Connect - funds held`);
              }
            } catch (stripeError) {
              console.error(`[Ticket Cron] Stripe transfer error for order ${order.id}:`, stripeError);
              results.errors.push({ type: 'stripe_transfer', orderId: order.id, error: stripeError.message });
              // Continue with database update even if Stripe transfer fails
            }
          }

          // Update order status to released
          await supabase
            .from('ticket_orders')
            .update({
              status: 'completed',
              escrow_status: 'released',
              buyer_confirmed_receipt: true,
              buyer_confirmed_at: now.toISOString(),
              escrow_released_at: now.toISOString(),
              seller_payout_status: stripeTransferId ? 'completed' : 'pending_connect',
              seller_paid_at: stripeTransferId ? now.toISOString() : null,
              stripe_transfer_id: stripeTransferId,
              updated_at: now.toISOString(),
            })
            .eq('id', order.id);

          await supabase
            .from('ticket_escrow')
            .update({
              status: 'released',
              funds_released_at: now.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq('order_id', order.id);

          await supabase
            .from('ticket_transfers')
            .update({
              status: 'confirmed',
              buyer_confirmed_at: now.toISOString(),
              buyer_notes: 'Auto-confirmed after deadline',
              updated_at: now.toISOString(),
            })
            .eq('order_id', order.id);

          // Update seller stats
          await supabase
            .from('seller_ticket_verification')
            .update({
              updated_at: now.toISOString(),
            })
            .eq('user_id', order.seller_id);

          // Notify both parties
          await supabase.from('notifications').insert([
            {
              user_email: order.seller_email,
              type: 'escrow_auto_released',
              title: 'Payment Released',
              message: `Payment for your ticket sale has been automatically released after the confirmation window expired.`,
              link: `/ticket-reseller?tab=selling`,
            },
            {
              user_email: order.buyer_email,
              type: 'order_auto_completed',
              title: 'Order Completed',
              message: `Your ticket order was automatically completed as you didn't confirm receipt within 48 hours.`,
              link: `/ticket-reseller?tab=purchases`,
            },
          ]);

          results.autoReleased++;
          console.log(`[Ticket Cron] Auto-released escrow for order ${order.id}`);

        } catch (err) {
          console.error(`[Ticket Cron] Error releasing order ${order.id}:`, err);
          results.errors.push({ type: 'auto_release', orderId: order.id, error: err.message });
        }
      }
    }

    // 2. Expire ticket listings for past/imminent events
    console.log('[Ticket Cron] Checking for listings to expire...');
    
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    const { data: expiredListings, error: expireError } = await supabase
      .from('ticket_listings')
      .update({
        status: 'expired',
        updated_at: now.toISOString(),
      })
      .in('status', ['active', 'pending_verification'])
      .lt('event_date', twoHoursFromNow.toISOString())
      .select();

    if (expireError) {
      console.error('[Ticket Cron] Expire listings error:', expireError);
      results.errors.push({ type: 'expire_listings', error: expireError.message });
    } else {
      results.expiredListings = expiredListings?.length || 0;
      console.log(`[Ticket Cron] Expired ${results.expiredListings} listings`);
    }

    // 3. Send reminder notifications for pending transfers
    console.log('[Ticket Cron] Checking for transfer reminders...');
    
    const in12Hours = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // 12-hour reminder
    const { data: transfers12h } = await supabase
      .from('ticket_transfers')
      .select('*, order:ticket_orders!order_id(*)')
      .eq('status', 'pending')
      .eq('reminder_12h_sent', false)
      .lt('transfer_deadline', in12Hours.toISOString())
      .gt('transfer_deadline', now.toISOString());

    for (const transfer of transfers12h || []) {
      try {
        await supabase
          .from('ticket_transfers')
          .update({ reminder_12h_sent: true })
          .eq('id', transfer.id);

        await supabase.from('notifications').insert({
          user_email: transfer.order?.seller_email,
          type: 'transfer_reminder',
          title: 'Transfer Reminder',
          message: `You have 12 hours left to transfer the ticket. Please complete the transfer soon.`,
          link: `/ticket-reseller?tab=selling&order=${transfer.order_id}`,
        });

        results.remindersSent++;
      } catch (err) {
        console.error(`[Ticket Cron] Error sending 12h reminder:`, err);
      }
    }

    // 2-hour urgent reminder
    const { data: transfers2h } = await supabase
      .from('ticket_transfers')
      .select('*, order:ticket_orders!order_id(*)')
      .eq('status', 'pending')
      .eq('reminder_2h_sent', false)
      .lt('transfer_deadline', in2Hours.toISOString())
      .gt('transfer_deadline', now.toISOString());

    for (const transfer of transfers2h || []) {
      try {
        await supabase
          .from('ticket_transfers')
          .update({ reminder_2h_sent: true })
          .eq('id', transfer.id);

        await supabase.from('notifications').insert({
          user_email: transfer.order?.seller_email,
          type: 'transfer_urgent',
          title: 'URGENT: Transfer Required',
          message: `Only 2 hours left to transfer the ticket! Failure to transfer may result in a refund to the buyer.`,
          link: `/ticket-reseller?tab=selling&order=${transfer.order_id}`,
        });

        results.remindersSent++;
      } catch (err) {
        console.error(`[Ticket Cron] Error sending 2h reminder:`, err);
      }
    }

    // 4. Flag overdue transfers for dispute
    console.log('[Ticket Cron] Checking for overdue transfers...');
    
    const { data: overdueTransfers } = await supabase
      .from('ticket_transfers')
      .select('*, order:ticket_orders!order_id(*)')
      .eq('status', 'pending')
      .lt('transfer_deadline', now.toISOString());

    for (const transfer of overdueTransfers || []) {
      try {
        // Auto-create dispute for overdue transfer
        const { data: dispute } = await supabase
          .from('ticket_disputes')
          .insert({
            order_id: transfer.order_id,
            opened_by: transfer.buyer_id,
            opened_by_email: transfer.order?.buyer_email,
            buyer_id: transfer.buyer_id,
            buyer_email: transfer.order?.buyer_email,
            seller_id: transfer.seller_id,
            seller_email: transfer.order?.seller_email,
            reason: 'ticket_not_received',
            description: 'Seller failed to transfer ticket within 24 hours.',
            status: 'open',
            response_deadline: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single();

        // Update order and transfer
        await supabase
          .from('ticket_orders')
          .update({
            status: 'disputed',
            escrow_status: 'disputed',
            dispute_id: dispute?.id,
            updated_at: now.toISOString(),
          })
          .eq('id', transfer.order_id);

        await supabase
          .from('ticket_transfers')
          .update({
            status: 'failed',
            updated_at: now.toISOString(),
          })
          .eq('id', transfer.id);

        // Issue strike to seller
        await supabase.rpc('increment_seller_strikes', {
          p_user_id: transfer.seller_id,
          p_reason: 'Failed to transfer ticket within deadline',
        }).catch(() => {});

        // Notify both parties
        await supabase.from('notifications').insert([
          {
            user_email: transfer.order?.buyer_email,
            type: 'auto_dispute_created',
            title: 'Dispute Created',
            message: `The seller failed to transfer the ticket within 24 hours. A dispute has been opened automatically.`,
            link: `/ticket-reseller?tab=disputes`,
          },
          {
            user_email: transfer.order?.seller_email,
            type: 'strike_issued',
            title: 'Strike Issued',
            message: `You failed to transfer a ticket within 24 hours. A strike has been added to your account.`,
            link: `/ticket-reseller?tab=selling`,
          },
        ]);

        console.log(`[Ticket Cron] Auto-created dispute for order ${transfer.order_id}`);

      } catch (err) {
        console.error(`[Ticket Cron] Error handling overdue transfer:`, err);
        results.errors.push({ type: 'overdue_transfer', transferId: transfer.id, error: err.message });
      }
    }

    console.log('[Ticket Cron] Completed:', results);

    return res.status(200).json({
      success: true,
      ...results,
    });

  } catch (error) {
    console.error('[Ticket Cron] Fatal error:', error);
    return res.status(500).json({
      error: 'Cron job failed',
      details: error.message,
    });
  }
}
