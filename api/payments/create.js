/**
 * Create Stripe Payment Intent
 * POST /api/payments/create
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe || !STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { type, referenceId } = req.body;

  try {
    let amount, description;
    let metadata = { type, reference_id: referenceId };

    switch (type) {
      case 'ticket': {
        const { data: purchase } = await supabase
          .from('ticket_purchases')
          .select('*, listing:ticket_listings(*)')
          .eq('id', referenceId)
          .eq('buyer_id', user.id)
          .single();

        if (!purchase || purchase.status !== 'pending' || !purchase.purchase_unlocked) {
          return res.status(400).json({ error: 'Cannot process this purchase' });
        }

        amount = Math.round(purchase.total_price * 100);
        description = `Ticket: ${purchase.listing?.event_name}`;
        metadata.type = 'ticket_purchase';
        break;
      }

      case 'product': {
        const { data: order } = await supabase
          .from('product_orders')
          .select('*, product:products(*)')
          .eq('id', referenceId)
          .eq('buyer_id', user.id)
          .single();

        if (!order || order.status !== 'pending') {
          return res.status(400).json({ error: 'Cannot process this order' });
        }

        amount = Math.round((order.price + order.shipping_cost) * 100);
        description = `MessMarket: ${order.product?.title}`;
        metadata.type = 'product_purchase';
        break;
      }

      case 'credits': {
        const { credits, businessId } = req.body;
        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('id', businessId)
          .or(`owner_id.eq.${user.id},team_members.cs.{${user.id}}`)
          .single();

        if (!business) return res.status(403).json({ error: 'Not authorized' });

        amount = Math.round((credits / 10) * 100);
        description = `${credits} HOTMESS Credits`;
        metadata.type = 'business_credits';
        metadata.credits = String(credits);
        metadata.reference_id = businessId;
        break;
      }

      default:
        return res.status(400).json({ error: 'Invalid payment type' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'gbp',
      description,
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret, amount: amount / 100 });
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
}
