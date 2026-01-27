/**
 * Stripe Connect Payout API
 * Creates a payout to a seller's connected Stripe account
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  if (!supabaseServiceKey) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { seller_email, payout_id } = req.body;

    if (!seller_email || !payout_id) {
      return res.status(400).json({ error: 'seller_email and payout_id are required' });
    }

    // Get seller's Stripe Connect account
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('stripe_connect_id, stripe_connect_status')
      .eq('email', seller_email)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    if (!user.stripe_connect_id) {
      return res.status(400).json({ error: 'Seller has not connected Stripe account' });
    }

    if (user.stripe_connect_status !== 'active') {
      return res.status(400).json({ error: 'Stripe account is not fully verified' });
    }

    // Get the payout record
    const { data: payout, error: payoutError } = await supabase
      .from('seller_payouts')
      .select('*')
      .eq('id', payout_id)
      .eq('seller_email', seller_email)
      .single();

    if (payoutError || !payout) {
      return res.status(404).json({ error: 'Payout request not found' });
    }

    if (payout.status !== 'pending') {
      return res.status(400).json({ error: `Payout is already ${payout.status}` });
    }

    // Calculate amount in pence (GBP smallest unit)
    const amountInPence = Math.round(payout.amount_gbp * 100);

    if (amountInPence < 100) {
      return res.status(400).json({ error: 'Minimum payout is £1.00' });
    }

    // Check platform balance
    const balance = await stripe.balance.retrieve();
    const availableGbp = balance.available.find(b => b.currency === 'gbp')?.amount || 0;

    if (availableGbp < amountInPence) {
      // Update payout status to indicate insufficient funds
      await supabase
        .from('seller_payouts')
        .update({ 
          status: 'pending',
          notes: 'Awaiting platform balance - will process automatically',
        })
        .eq('id', payout_id);

      return res.status(400).json({ 
        error: 'Insufficient platform balance. Payout will be processed when funds are available.',
        available_balance: availableGbp / 100,
        requested_amount: payout.amount_gbp,
      });
    }

    // Create transfer to connected account
    const transfer = await stripe.transfers.create({
      amount: amountInPence,
      currency: 'gbp',
      destination: user.stripe_connect_id,
      metadata: {
        payout_id: payout_id,
        seller_email: seller_email,
        order_ids: JSON.stringify(payout.order_ids || []),
      },
    });

    // Update payout record with stripe_connect_account_id for webhook matching
    const { error: updateError } = await supabase
      .from('seller_payouts')
      .update({
        status: 'in_transit',
        stripe_transfer_id: transfer.id,
        stripe_connect_account_id: user.stripe_connect_id,
        processed_at: new Date().toISOString(),
      })
      .eq('id', payout_id);

    if (updateError) {
      console.error('[Stripe Connect] Failed to update payout record:', updateError);
    }

    // Create notification for seller
    await supabase
      .from('notifications')
      .insert({
        user_email: seller_email,
        type: 'payout',
        title: 'Payout Processing',
        message: `£${payout.amount_gbp.toFixed(2)} is on its way to your bank account`,
        link: 'SellerDashboard',
      });

    console.log(`[Stripe Connect] Created transfer ${transfer.id} for £${payout.amount_gbp} to ${seller_email}`);

    return res.status(200).json({
      success: true,
      transfer_id: transfer.id,
      amount: payout.amount_gbp,
      status: 'in_transit',
    });

  } catch (error) {
    console.error('[Stripe Connect] Payout error:', error);

    // Update payout as failed
    if (req.body.payout_id) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase
        .from('seller_payouts')
        .update({ 
          status: 'failed',
          notes: error.message,
        })
        .eq('id', req.body.payout_id);
    }

    return res.status(500).json({ 
      error: 'Payout failed',
      details: error.message,
    });
  }
}
