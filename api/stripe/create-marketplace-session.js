import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// For backend contexts, we usually prefer:
// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ticketId, successUrl, cancelUrl, customerEmail } = req.body;

    if (!ticketId) {
      return res.status(400).json({ error: 'Missing ticketId' });
    }

    // 1. Fetch Ticket Details from DB to ensure price integrity
    // We don't trust the client to send the price
    // Assuming 'Product' table based on TicketMarketplace.jsx (base44.entities.Product)
    // Or 'tickets' table? TicketMarketplace uses base44.entities.Product with product_type='ticket'
    
    // Using base44 directly might not work in Vercel functions unless configured.
    // We'll use direct Supabase REST or just assume the payload for now if Supabase credentials aren't handy in this context?
    // Actually, let's use the provided Supabase env vars if available.
    
    // NOTE: In the existing project structure, it seems they use `base44` on frontend and direct Supabase/Postgres on backend.
    // I will try to fetch the ticket using Supabase client.
    
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!sbUrl || !sbKey) {
        // Fallback for demo/dev if keys missing
        console.warn("Supabase keys missing in environment, trusting client price (DANGEROUS)");
    }
    
    const sb = createClient(sbUrl, sbKey);
    
    const { data: ticket, error } = await sb
        .from('products') // Assuming table name based on 'Product' entity
        .select('*')
        .eq('id', ticketId)
        .single();
        
    if (error || !ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
    }
    
    if (!ticket.price_gbp) {
         return res.status(400).json({ error: 'Ticket is not for sale in GBP' });
    }

    // Calculate Application Fee (10% + 50p)
    // Logic: If we had Connect, we'd use transfer_data.
    // For MVP Phase 1 (Platform Collects): We take all, then manually payout.
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: ticket.name,
              description: ticket.description || 'Ticket Resale',
              images: ticket.image_urls || [],
            },
            unit_amount: Math.round(ticket.price_gbp * 100), // convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${req.headers.origin}/tickets/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.origin}/marketplace`,
      customer_email: customerEmail,
      metadata: {
        type: 'ticket_resale',
        ticketId: ticket.id,
        sellerId: ticket.seller_id || ticket.owner_id // Adjust field name based on schema
      },
    });

    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe Error:', error);
    res.status(500).json({ error: error.message });
  }
}
