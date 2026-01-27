/**
 * Stripe Connect Onboarding API
 * Creates an account link for sellers to complete Stripe Connect onboarding
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
    const { email, return_url, refresh_url } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user already has a Stripe Connect account
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('stripe_connect_id, full_name')
      .eq('email', email)
      .single();

    if (userError) {
      console.error('[Stripe Connect] User lookup failed:', userError);
      return res.status(404).json({ error: 'User not found' });
    }

    let accountId = user.stripe_connect_id;

    // Create new Stripe Connect account if not exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          hotmess_email: email,
        },
      });

      accountId = account.id;

      // Save the account ID to the user record
      const { error: updateError } = await supabase
        .from('User')
        .update({ 
          stripe_connect_id: accountId,
          stripe_connect_status: 'pending',
        })
        .eq('email', email);

      if (updateError) {
        console.error('[Stripe Connect] Failed to save account ID:', updateError);
      }

      console.log(`[Stripe Connect] Created account ${accountId} for ${email}`);
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refresh_url || `${process.env.NEXT_PUBLIC_APP_URL || 'https://hotmess.london'}/seller-dashboard`,
      return_url: return_url || `${process.env.NEXT_PUBLIC_APP_URL || 'https://hotmess.london'}/seller-dashboard?stripe_connected=true`,
      type: 'account_onboarding',
    });

    return res.status(200).json({ 
      url: accountLink.url,
      account_id: accountId,
    });

  } catch (error) {
    console.error('[Stripe Connect] Onboarding error:', error);
    return res.status(500).json({ 
      error: 'Failed to create onboarding link',
      details: error.message,
    });
  }
}
