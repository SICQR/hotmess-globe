/**
 * Cron Job: Process Seller Payouts
 * Automatically processes pending payouts on a schedule
 * 
 * Runs: Daily at 2 AM UTC
 * Schedule in vercel.json: "0 2 * * *"
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  if (!supabaseServiceKey) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const results = {
    processed: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  try {
    console.log('[Cron/Payouts] Starting automatic payout processing...');

    // Get all pending payouts
    const { data: pendingPayouts, error: fetchError } = await supabase
      .from('seller_payouts')
      .select('*')
      .eq('status', 'pending')
      .order('created_date', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch payouts: ${fetchError.message}`);
    }

    if (!pendingPayouts || pendingPayouts.length === 0) {
      console.log('[Cron/Payouts] No pending payouts to process');
      return res.status(200).json({ message: 'No pending payouts', results });
    }

    console.log(`[Cron/Payouts] Found ${pendingPayouts.length} pending payouts`);

    // Check platform balance
    const balance = await stripe.balance.retrieve();
    const availableGbp = balance.available.find(b => b.currency === 'gbp')?.amount || 0;
    console.log(`[Cron/Payouts] Available platform balance: £${(availableGbp / 100).toFixed(2)}`);

    // Process each payout
    for (const payout of pendingPayouts) {
      try {
        // Get seller's Stripe Connect account
        const { data: seller, error: sellerError } = await supabase
          .from('User')
          .select('stripe_connect_id, stripe_connect_status, full_name')
          .eq('email', payout.seller_email)
          .single();

        if (sellerError || !seller) {
          results.skipped++;
          results.errors.push(`Seller not found: ${payout.seller_email}`);
          continue;
        }

        if (!seller.stripe_connect_id) {
          results.skipped++;
          continue; // Seller hasn't connected Stripe yet
        }

        if (seller.stripe_connect_status !== 'active') {
          results.skipped++;
          continue; // Stripe account not fully verified
        }

        const amountInPence = Math.round(payout.amount_gbp * 100);

        if (amountInPence < 100) {
          results.skipped++;
          continue; // Below minimum payout
        }

        if (availableGbp < amountInPence) {
          results.skipped++;
          continue; // Insufficient platform balance
        }

        // Create transfer to connected account
        const transfer = await stripe.transfers.create({
          amount: amountInPence,
          currency: 'gbp',
          destination: seller.stripe_connect_id,
          metadata: {
            payout_id: payout.id,
            seller_email: payout.seller_email,
            automated: 'true',
          },
        });

        // Update payout record with stripe_connect_account_id for webhook matching
        await supabase
          .from('seller_payouts')
          .update({
            status: 'in_transit',
            stripe_transfer_id: transfer.id,
            stripe_connect_account_id: seller.stripe_connect_id,
            processed_at: new Date().toISOString(),
          })
          .eq('id', payout.id);

        // Notify seller
        await supabase
          .from('notifications')
          .insert({
            user_email: payout.seller_email,
            type: 'payout',
            title: 'Payout Processing',
            message: `£${payout.amount_gbp.toFixed(2)} is on its way to your bank account`,
            link: 'SellerDashboard',
          });

        results.processed++;
        console.log(`[Cron/Payouts] Processed payout ${payout.id}: £${payout.amount_gbp} to ${payout.seller_email}`);

      } catch (payoutError) {
        results.failed++;
        results.errors.push(`Payout ${payout.id}: ${payoutError.message}`);
        
        // Mark as failed
        await supabase
          .from('seller_payouts')
          .update({ 
            status: 'failed',
            notes: payoutError.message,
          })
          .eq('id', payout.id);
      }
    }

    console.log(`[Cron/Payouts] Complete. Processed: ${results.processed}, Failed: ${results.failed}, Skipped: ${results.skipped}`);

    return res.status(200).json({
      success: true,
      results,
    });

  } catch (error) {
    console.error('[Cron/Payouts] Fatal error:', error);
    return res.status(500).json({ 
      error: 'Payout processing failed',
      details: error.message,
    });
  }
}
