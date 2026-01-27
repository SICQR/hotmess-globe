/**
 * Stripe Connect Status API
 * Returns the status of a seller's Stripe Connect account
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  if (!supabaseServiceKey) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get user's Stripe Connect ID
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('stripe_connect_id, stripe_connect_status')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.stripe_connect_id) {
      return res.status(200).json({
        connected: false,
        status: 'not_connected',
        can_accept_payments: false,
      });
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(user.stripe_connect_id);

    const status = {
      connected: true,
      account_id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      status: account.charges_enabled && account.payouts_enabled 
        ? 'active' 
        : account.details_submitted 
          ? 'pending_verification'
          : 'incomplete',
      can_accept_payments: account.charges_enabled,
      can_receive_payouts: account.payouts_enabled,
      requirements: account.requirements,
    };

    // Update user's status in database
    if (status.status !== user.stripe_connect_status) {
      await supabase
        .from('User')
        .update({ stripe_connect_status: status.status })
        .eq('email', email);
    }

    return res.status(200).json(status);

  } catch (error) {
    console.error('[Stripe Connect] Status check error:', error);
    return res.status(500).json({ 
      error: 'Failed to check account status',
      details: error.message,
    });
  }
}
