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
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  if (!stripe || !STRIPE_SECRET_KEY) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Stripe not configured' }));
  }

  // Get user from auth token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'Unauthorized' }));
  }

  const token = authHeader.split(' ')[1];
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'Unauthorized' }));
  }

  try {
    // Get current subscription info to preserve date if needed
    const { data: userData } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, subscription_ends_at')
      .eq('id', user.id)
      .single();

    if (!userData?.stripe_subscription_id) {
      // Local development fallback
      console.warn('[Stripe Cancel] No subscription ID found. Proceeding with database-only cancellation for local testing.');
      
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const endsAt = nextMonth.toISOString();

      await supabase
        .from('profiles')
        .update({
          subscription_status: 'canceling',
          subscription_ends_at: endsAt,
        })
        .eq('id', user.id);

      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, endsAt }));
    }

    // Cancel subscription at period end
    const subscription = await stripe.subscriptions.update(
      userData.stripe_subscription_id,
      { cancel_at_period_end: true }
    );

    // Prioritize the date from Stripe, fallback to existing DB date, final fallback to +30 days
    const endsAt = subscription.current_period_end 
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : userData.subscription_ends_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Update user record
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'canceling',
        subscription_ends_at: endsAt,
      })
      .eq('id', user.id);

    res.statusCode = 200;
    return res.end(JSON.stringify({
      success: true,
      endsAt: endsAt,
    }));
  } catch (error) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: error.message }));
  }
}
