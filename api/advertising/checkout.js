import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/advertising/checkout
 * Create a Stripe checkout session for advertising purchases
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      planId,
      businessEmail,
      businessName,
      amount,
      duration,
      planName,
      metadata = {}
    } = req.body;

    if (!planId || !businessEmail || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Determine placement type from plan ID
    const placementType = planId.startsWith('banner_') ? 'banner' :
                         planId.startsWith('event_') ? 'event_sponsor' :
                         'globe_pin';

    // Calculate dates based on duration
    const startDate = new Date();
    let endDate = new Date();
    
    if (duration.includes('day')) {
      const days = parseInt(duration) || 30;
      endDate.setDate(endDate.getDate() + days);
    } else if (duration === 'Per event') {
      endDate.setDate(endDate.getDate() + 90); // 90 day validity for event sponsorships
    }

    // Create pending sponsorship record
    const { data: sponsorship, error: dbError } = await supabase
      .from('sponsored_placements')
      .insert({
        business_email: businessEmail,
        business_name: businessName || null,
        plan_id: planId,
        plan_name: planName,
        placement_type: placementType,
        amount_paid: amount,
        currency: 'gbp',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'pending',
        impressions: 0,
        clicks: 0,
        metadata: {
          ...metadata,
          duration,
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('Failed to create sponsorship record:', dbError);
      return res.status(500).json({ error: 'Failed to create sponsorship record' });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: planName || `HotMess ${placementType.replace('_', ' ')} Advertising`,
              description: `${duration} advertising placement on HotMess Globe`,
              images: ['https://hotmess.london/images/logo.png'],
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://hotmess.london'}/biz/advertising?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://hotmess.london'}/biz/advertising?canceled=true`,
      customer_email: businessEmail,
      metadata: {
        sponsorship_id: sponsorship.id,
        plan_id: planId,
        placement_type: placementType,
        business_email: businessEmail,
      },
    });

    // Update sponsorship with Stripe session ID
    await supabase
      .from('sponsored_placements')
      .update({ stripe_session_id: session.id })
      .eq('id', sponsorship.id);

    return res.status(200).json({
      checkoutUrl: session.url,
      sessionId: session.id,
      sponsorshipId: sponsorship.id,
    });
  } catch (error) {
    console.error('Advertising checkout error:', error);
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    });
  }
}
