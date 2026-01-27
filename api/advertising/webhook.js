import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/advertising/webhook
 * Handle Stripe webhooks for advertising payments
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_ADVERTISING_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Get raw body for webhook verification
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Check if this is an advertising payment
        const { sponsorship_id, placement_type, business_email } = session.metadata || {};
        
        if (sponsorship_id) {
          // Update sponsorship to active
          const { error } = await supabase
            .from('sponsored_placements')
            .update({
              status: 'active',
              stripe_payment_intent: session.payment_intent,
              paid_at: new Date().toISOString(),
            })
            .eq('id', sponsorship_id);

          if (error) {
            console.error('Failed to activate sponsorship:', error);
          } else {
            console.log(`Activated sponsorship ${sponsorship_id} for ${business_email}`);
            
            // If it's a globe pin, create the beacon
            if (placement_type === 'globe_pin') {
              await createSponsoredBeacon(sponsorship_id, business_email);
            }
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const sponsorshipId = paymentIntent.metadata?.sponsorship_id;
        
        if (sponsorshipId) {
          await supabase
            .from('sponsored_placements')
            .update({
              status: 'payment_failed',
              error_message: paymentIntent.last_payment_error?.message,
            })
            .eq('id', sponsorshipId);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const sessionId = charge.metadata?.checkout_session_id;
        
        if (sessionId) {
          // Find and deactivate the sponsorship
          const { data } = await supabase
            .from('sponsored_placements')
            .select('id')
            .eq('stripe_session_id', sessionId)
            .single();

          if (data) {
            await supabase
              .from('sponsored_placements')
              .update({ status: 'refunded' })
              .eq('id', data.id);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Create a beacon for sponsored globe pin placements
 */
async function createSponsoredBeacon(sponsorshipId, businessEmail) {
  try {
    // Get the sponsorship details
    const { data: sponsorship, error: fetchError } = await supabase
      .from('sponsored_placements')
      .select('*')
      .eq('id', sponsorshipId)
      .single();

    if (fetchError || !sponsorship) return;

    // Get business user details
    const { data: user } = await supabase
      .from('User')
      .select('*')
      .eq('email', businessEmail)
      .single();

    // Get city coordinates
    const { data: city } = await supabase
      .from('City')
      .select('lat, lng')
      .eq('name', user?.city || 'London')
      .single();

    // Create the sponsored beacon
    const { data: beacon, error: beaconError } = await supabase
      .from('Beacon')
      .insert({
        title: sponsorship.name || user?.business_name || 'Sponsored Venue',
        description: sponsorship.description || user?.business_description || 'Featured venue on HotMess',
        lat: city?.lat || 51.5074,
        lng: city?.lng || -0.1278,
        city: user?.city || 'London',
        kind: 'venue',
        mode: 'venue',
        active: true,
        status: 'published',
        is_sponsored: true,
        sponsorship_id: sponsorshipId,
        created_by: businessEmail,
        expires_at: sponsorship.end_date,
        image_url: user?.avatar_url || null,
        destination_url: sponsorship.destination_url || user?.website_url || null,
      })
      .select()
      .single();

    if (beaconError) {
      console.error('Failed to create sponsored beacon:', beaconError);
      return;
    }

    // Update sponsorship with beacon ID
    await supabase
      .from('sponsored_placements')
      .update({ beacon_id: beacon.id })
      .eq('id', sponsorshipId);

    console.log(`Created sponsored beacon ${beacon.id} for sponsorship ${sponsorshipId}`);
  } catch (error) {
    console.error('Error creating sponsored beacon:', error);
  }
}

/**
 * Get raw body from request for Stripe signature verification
 */
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', reject);
  });
}

// Disable body parsing for webhook
export const config = {
  api: {
    bodyParser: false,
  },
};
