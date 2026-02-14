import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/premium/subscribe
 * Subscribe to a creator's premium content
 * 
 * Body: { creator_email, price_xp }
 */

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://hotmess-globe-fix.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for authorization
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Verify the user's token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { creator_email, price_xp, tier = 'basic' } = req.body;

    if (!creator_email || !price_xp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (typeof price_xp !== 'number' || price_xp < 0) {
      return res.status(400).json({ error: 'Invalid price' });
    }

    const subscriberEmail = user.email;

    // Can't subscribe to yourself
    if (subscriberEmail.toLowerCase() === creator_email.toLowerCase()) {
      return res.status(400).json({ error: 'Cannot subscribe to yourself' });
    }

    // Check if creator exists
    const { data: creator, error: creatorError } = await supabase
      .from('User')
      .select('email, xp, full_name')
      .eq('email', creator_email)
      .single();

    if (creatorError || !creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    // Get subscriber's current XP
    const { data: subscriber, error: subscriberError } = await supabase
      .from('User')
      .select('email, xp')
      .eq('email', subscriberEmail)
      .single();

    if (subscriberError || !subscriber) {
      return res.status(404).json({ error: 'User not found' });
    }

    if ((subscriber.xp || 0) < price_xp) {
      return res.status(400).json({ 
        error: 'Insufficient XP',
        required: price_xp,
        available: subscriber.xp || 0
      });
    }

    // Check for existing subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('subscriber_email', subscriberEmail)
      .eq('creator_email', creator_email)
      .single();

    if (existingSub && existingSub.status === 'active') {
      return res.status(400).json({ error: 'Already subscribed' });
    }

    // Calculate platform fee (20%)
    const platformFeePercent = parseInt(process.env.PLATFORM_FEE_PERCENT || '20', 10);
    const platformFee = Math.floor(price_xp * (platformFeePercent / 100));
    const creatorEarnings = price_xp - platformFee;

    // Deduct XP from subscriber
    const { error: deductError } = await supabase
      .from('User')
      .update({ xp: (subscriber.xp || 0) - price_xp })
      .eq('email', subscriberEmail);

    if (deductError) {
      return res.status(500).json({ error: 'Failed to process transaction' });
    }

    // Credit XP to creator
    await supabase
      .from('User')
      .update({ xp: (creator.xp || 0) + creatorEarnings })
      .eq('email', creator_email);

    // Calculate expiration (1 month from now)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    // Create or update subscription
    let subscription;
    if (existingSub) {
      // Reactivate existing subscription
      const { data: updatedSub, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          tier: tier,
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          price_xp_monthly: price_xp,
        })
        .eq('id', existingSub.id)
        .select()
        .single();

      if (updateError) {
        // Refund XP
        await supabase
          .from('User')
          .update({ xp: subscriber.xp })
          .eq('email', subscriberEmail);
        return res.status(500).json({ error: 'Failed to create subscription' });
      }
      subscription = updatedSub;
    } else {
      // Create new subscription
      const { data: newSub, error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          subscriber_email: subscriberEmail,
          creator_email: creator_email,
          tier: tier,
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          price_xp_monthly: price_xp,
        })
        .select()
        .single();

      if (insertError) {
        // Refund XP
        await supabase
          .from('User')
          .update({ xp: subscriber.xp })
          .eq('email', subscriberEmail);
        return res.status(500).json({ error: 'Failed to create subscription' });
      }
      subscription = newSub;
    }

    return res.status(200).json({
      success: true,
      subscription: {
        id: subscription.id,
        creator_email: creator_email,
        creator_name: creator.full_name,
        tier: subscription.tier,
        status: subscription.status,
        started_at: subscription.started_at,
        expires_at: subscription.expires_at,
      },
      transaction: {
        xp_spent: price_xp,
        platform_fee: platformFee,
        creator_earnings: creatorEarnings,
        new_balance: (subscriber.xp || 0) - price_xp,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
