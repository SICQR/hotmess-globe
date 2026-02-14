/**
 * Vercel API Route: Cancel Stripe Subscription
 * 
 * Cancels a user's subscription at period end.
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe || !STRIPE_SECRET_KEY) {
    // console.error('[Stripe Cancel] Missing STRIPE_SECRET_KEY');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  // Get user from auth token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get user's subscription ID
    const { data: userData } = await supabase
      .from('User')
      .select('stripe_subscription_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData?.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Cancel subscription at period end
    const subscription = await stripe.subscriptions.update(
      userData.stripe_subscription_id,
      { cancel_at_period_end: true }
    );

    // Update user record
    await supabase
      .from('User')
      .update({
        subscription_status: 'canceling',
        subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('auth_user_id', user.id);

    return res.status(200).json({
      success: true,
      endsAt: new Date(subscription.current_period_end * 1000).toISOString(),
    });
  } catch (error) {
    // console.error('[Stripe Cancel] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
