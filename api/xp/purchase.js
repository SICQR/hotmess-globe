import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { withRateLimit } from '../middleware/rateLimiter.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const supabase = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// XP to USD conversion rate: 1 USD = 100 XP (1 cent = 1 XP)
const XP_PER_USD = Number(process.env.XP_PER_USD || 100);

// Available XP packages
const XP_PACKAGES = [
  { id: 'xp_500', xp: 500, price_usd: 5.00, name: '500 XP' },
  { id: 'xp_1000', xp: 1000, price_usd: 9.00, name: '1,000 XP', bonus: '10% bonus' },
  { id: 'xp_2500', xp: 2500, price_usd: 20.00, name: '2,500 XP', bonus: '25% bonus' },
  { id: 'xp_5000', xp: 5000, price_usd: 35.00, name: '5,000 XP', bonus: '43% bonus' },
  { id: 'xp_10000', xp: 10000, price_usd: 60.00, name: '10,000 XP', bonus: '67% bonus' },
];

async function handler(req, res) {
  // GET: Return available XP packages
  if (req.method === 'GET') {
    return res.status(200).json({
      packages: XP_PACKAGES,
      xp_per_usd: XP_PER_USD,
    });
  }

  // POST: Create Stripe checkout session for XP purchase
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  // Get authenticated user
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { package_id, success_url, cancel_url } = req.body;

  if (!package_id) {
    return res.status(400).json({ error: 'Missing required field: package_id' });
  }

  const xpPackage = XP_PACKAGES.find(p => p.id === package_id);
  if (!xpPackage) {
    return res.status(400).json({ error: 'Invalid package_id' });
  }

  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('User')
      .select('email, full_name')
      .eq('email', user.email)
      .single();

    if (profileError) {
      console.error('[xp/purchase] Profile lookup failed:', profileError);
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: xpPackage.name,
              description: `Purchase ${xpPackage.xp} XP for HOTMESS${xpPackage.bonus ? ` (${xpPackage.bonus})` : ''}`,
              metadata: {
                xp_amount: xpPackage.xp.toString(),
                package_id: xpPackage.id,
              },
            },
            unit_amount: Math.round(xpPackage.price_usd * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: success_url || `${process.env.NEXT_PUBLIC_APP_URL || 'https://hotmess.london'}/xp-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${process.env.NEXT_PUBLIC_APP_URL || 'https://hotmess.london'}/market`,
      customer_email: user.email,
      metadata: {
        user_email: user.email,
        xp_amount: xpPackage.xp.toString(),
        package_id: xpPackage.id,
        type: 'xp_purchase',
      },
    });

    // Store pending transaction
    await supabase.from('xp_transactions').insert({
      to_email: user.email,
      amount: xpPackage.xp,
      transaction_type: 'purchase',
      reference_type: 'stripe_checkout',
      reference_id: session.id,
      description: `Pending: ${xpPackage.name} purchase`,
    });

    return res.status(200).json({
      session_id: session.id,
      checkout_url: session.url,
      package: xpPackage,
    });
  } catch (error) {
    console.error('[xp/purchase] Error:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

export default withRateLimit(handler, { tier: 'auth' });
