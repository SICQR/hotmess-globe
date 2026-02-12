import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      packageId, 
      adType, 
      script, 
      audioUrl,
      userId,
      amount, // In pence
      metadata
    } = req.body;

    // 1. Create DB Record (Pending)
    const { data: adOrder, error: dbError } = await supabase
      .from('radio_ads')
      .insert({
        user_id: userId,
        package_id: packageId,
        ad_type: adType,
        script_content: script,
        audio_url: audioUrl,
        status: 'pending_payment'
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 2. Create Stripe Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Radio Ad: ${packageId.toUpperCase()}`,
              description: adType === 'script' ? 'Includes Production Fee' : 'Ad Slot only',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}/business/success?session_id={CHECKOUT_SESSION_ID}&order_id=${adOrder.id}`,
      cancel_url: `${req.headers.origin}/business/radio-ads`,
      customer_email: metadata.email,
      metadata: {
        orderId: adOrder.id,
        type: 'radio_ad'
      },
    });

    // 3. Update DB with Session ID
    await supabase
      .from('radio_ads')
      .update({ stripe_session_id: session.id })
      .eq('id', adOrder.id);

    res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('Radio Order Error:', error);
    res.status(500).json({ error: error.message });
  }
}
