import Stripe from 'stripe';
import { getSupabaseServerClients, getAuthedUser, getBearerToken, json, getEnv } from '../routing/_utils.js';

const stripeSecret = getEnv('STRIPE_SECRET_KEY');
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  if (!stripe) {
    return json(res, 500, { error: 'Stripe not configured' });
  }

  const { 
    packageId, 
    adType, 
    script, 
    audioUrl,
    amount, // In pence
    metadata
  } = req.body;

  if (!packageId || !adType || !amount) {
    return json(res, 400, { error: 'Missing required fields: packageId, adType, amount' });
  }

  // Authentication: Extract and validate bearer token
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return json(res, 401, { error: 'Missing bearer token' });
  }

  const { serviceClient, anonClient } = getSupabaseServerClients();
  const { user, error: userError } = await getAuthedUser({ anonClient, accessToken });

  if (userError || !user) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  // Use authenticated user ID, not from request body
  const userId = user.id;

  try {
    // 1. Create DB Record (Pending)
    const { data: adOrder, error: dbError } = await serviceClient
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

    if (dbError) {
      return json(res, 400, { error: 'Failed to create ad order', details: dbError.message });
    }

    // 2. Create Stripe Session
    let session;
    try {
      session = await stripe.checkout.sessions.create({
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
        customer_email: metadata?.email,
        metadata: {
          orderId: adOrder.id,
          userId: userId,
          type: 'radio_ad'
        },
      });
    } catch (stripeError) {
      return json(res, 402, { error: 'Failed to create payment session', details: stripeError.message });
    }

    // 3. Update DB with Session ID
    const { error: updateError } = await serviceClient
      .from('radio_ads')
      .update({ stripe_session_id: session.id })
      .eq('id', adOrder.id);

    if (updateError) {
      return json(res, 500, { error: 'Failed to store payment session', details: updateError.message });
    }

    return json(res, 200, { url: session.url });

  } catch (error) {
    console.error('Radio Order Error:', error);
    return json(res, 500, { error: 'Internal server error', details: error.message });
  }
}
