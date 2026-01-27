import { createClient } from '@supabase/supabase-js';
import { notifyNewSubscriber, notifySubscriptionRenewed } from '../notifications/premium.js';
import { withRateLimit } from '../middleware/rateLimiter.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT || 20);

// Subscription duration in days
const SUBSCRIPTION_DURATION_DAYS = 30;

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
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

  const { creator_email, price_xp, tier = 'basic' } = req.body;

  if (!creator_email) {
    return res.status(400).json({ error: 'Missing required field: creator_email' });
  }

  if (creator_email === user.email) {
    return res.status(400).json({ error: 'Cannot subscribe to yourself' });
  }

  try {
    // Get creator's subscription price (from their profile or use provided price)
    const { data: creator, error: creatorError } = await supabase
      .from('User')
      .select('email, xp, full_name, subscription_price_xp, subscription_tier_prices')
      .eq('email', creator_email)
      .single();

    if (creatorError || !creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    // Get tier-specific pricing
    const tierPrices = creator.subscription_tier_prices || { basic: 500, premium: 1000, vip: 2500 };
    const tierPrice = tierPrices[tier];
    const subscriptionPrice = price_xp || tierPrice || creator.subscription_price_xp || 500;

    // Get subscriber's current XP
    const { data: subscriber, error: subscriberError } = await supabase
      .from('User')
      .select('email, xp, full_name')
      .eq('email', user.email)
      .single();

    if (subscriberError || !subscriber) {
      return res.status(404).json({ error: 'Subscriber profile not found' });
    }

    const subscriberXp = subscriber.xp || 0;
    if (subscriberXp < subscriptionPrice) {
      return res.status(400).json({ 
        error: 'Insufficient XP', 
        required: subscriptionPrice, 
        available: subscriberXp 
      });
    }

    // Check for existing subscription
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('subscriber_email', user.email)
      .eq('creator_email', creator_email)
      .maybeSingle();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SUBSCRIPTION_DURATION_DAYS * 24 * 60 * 60 * 1000);

    // If already subscribed and active, extend the subscription
    if (existingSubscription && existingSubscription.status === 'active') {
      const currentExpiry = new Date(existingSubscription.expires_at);
      const newExpiry = currentExpiry > now 
        ? new Date(currentExpiry.getTime() + SUBSCRIPTION_DURATION_DAYS * 24 * 60 * 60 * 1000)
        : expiresAt;

      // Deduct XP from subscriber
      const { error: deductError } = await supabase
        .from('User')
        .update({ xp: subscriberXp - subscriptionPrice })
        .eq('email', user.email);

      if (deductError) {
        console.error('[premium/subscribe] Failed to deduct XP:', deductError);
        return res.status(500).json({ error: 'Failed to process payment' });
      }

      // Credit creator
      const platformFee = Math.floor(subscriptionPrice * (PLATFORM_FEE_PERCENT / 100));
      const netAmount = subscriptionPrice - platformFee;
      const creatorXp = creator.xp || 0;

      await supabase
        .from('User')
        .update({ xp: creatorXp + netAmount })
        .eq('email', creator_email);

      // Update subscription
      const { data: updatedSubscription, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          expires_at: newExpiry.toISOString(),
          renewed_at: now.toISOString(),
          price_xp_monthly: subscriptionPrice,
        })
        .eq('id', existingSubscription.id)
        .select()
        .single();

      if (updateError) {
        console.error('[premium/subscribe] Failed to update subscription:', updateError);
      }

      // Record transaction
      await supabase.from('xp_transactions').insert({
        from_email: user.email,
        to_email: creator_email,
        amount: subscriptionPrice,
        transaction_type: 'subscription',
        reference_type: 'renewal',
        reference_id: existingSubscription.id,
        platform_fee: platformFee,
        net_amount: netAmount,
        description: `Renewed subscription to ${creator_email}`,
      });

      // Send renewal notification (non-blocking)
      notifySubscriptionRenewed({
        creatorEmail: creator_email,
        subscriberName: subscriber.full_name || user.email,
        subscriberEmail: user.email,
        priceXp: subscriptionPrice,
      }).catch((err) => {
        console.error('[premium/subscribe] Notification error:', err);
      });

      return res.status(200).json({
        success: true,
        message: 'Subscription renewed',
        subscription: updatedSubscription || existingSubscription,
        transaction: {
          amount: subscriptionPrice,
          platform_fee: platformFee,
          net_amount: netAmount,
          subscriber_new_balance: subscriberXp - subscriptionPrice,
        },
      });
    }

    // Create new subscription
    const platformFee = Math.floor(subscriptionPrice * (PLATFORM_FEE_PERCENT / 100));
    const netAmount = subscriptionPrice - platformFee;

    // Deduct XP from subscriber
    const { error: deductError } = await supabase
      .from('User')
      .update({ xp: subscriberXp - subscriptionPrice })
      .eq('email', user.email);

    if (deductError) {
      console.error('[premium/subscribe] Failed to deduct XP:', deductError);
      return res.status(500).json({ error: 'Failed to process payment' });
    }

    // Credit creator (minus platform fee)
    const creatorXp = creator.xp || 0;
    const { error: creditError } = await supabase
      .from('User')
      .update({ xp: creatorXp + netAmount })
      .eq('email', creator_email);

    if (creditError) {
      // Attempt to refund subscriber
      await supabase
        .from('User')
        .update({ xp: subscriberXp })
        .eq('email', user.email);
      
      console.error('[premium/subscribe] Failed to credit creator:', creditError);
      return res.status(500).json({ error: 'Failed to process payment, refunded' });
    }

    // Create or reactivate subscription
    let subscription;
    if (existingSubscription) {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          renewed_at: now.toISOString(),
          price_xp_monthly: subscriptionPrice,
          tier,
        })
        .eq('id', existingSubscription.id)
        .select()
        .single();

      if (error) {
        console.error('[premium/subscribe] Failed to reactivate subscription:', error);
      }
      subscription = data;
    } else {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          subscriber_email: user.email,
          creator_email,
          tier,
          status: 'active',
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          price_xp_monthly: subscriptionPrice,
          auto_renew: true,
        })
        .select()
        .single();

      if (error) {
        console.error('[premium/subscribe] Failed to create subscription:', error);
      }
      subscription = data;
    }

    // Record transaction
    await supabase.from('xp_transactions').insert({
      from_email: user.email,
      to_email: creator_email,
      amount: subscriptionPrice,
      transaction_type: 'subscription',
      reference_type: 'new',
      reference_id: subscription?.id,
      platform_fee: platformFee,
      net_amount: netAmount,
      description: `New subscription to ${creator_email}`,
    });

    // Send new subscriber notification (non-blocking)
    notifyNewSubscriber({
      creatorEmail: creator_email,
      subscriberName: subscriber.full_name || user.email,
      subscriberEmail: user.email,
      tier,
      priceXp: subscriptionPrice,
    }).catch((err) => {
      console.error('[premium/subscribe] Notification error:', err);
    });

    return res.status(200).json({
      success: true,
      message: 'Subscribed successfully',
      subscription,
      transaction: {
        amount: subscriptionPrice,
        platform_fee: platformFee,
        net_amount: netAmount,
        subscriber_new_balance: subscriberXp - subscriptionPrice,
      },
    });
  } catch (error) {
    console.error('[premium/subscribe] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withRateLimit(handler, { tier: 'create' });
