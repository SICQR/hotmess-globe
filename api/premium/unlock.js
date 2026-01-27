/**
 * Premium Content Unlock API
 * Allows users to unlock premium photos/content with XP
 */

import { createClient } from '@supabase/supabase-js';
import { withRateLimit } from '../middleware/rateLimiter.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get user from auth header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  
  if (!supabaseServiceKey) {
    return res.status(500).json({ error: 'Service not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Verify the user's token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { profile_email, xp_cost } = req.body;

    if (!profile_email || !xp_cost) {
      return res.status(400).json({ error: 'Missing profile_email or xp_cost' });
    }

    if (typeof xp_cost !== 'number' || xp_cost <= 0) {
      return res.status(400).json({ error: 'Invalid XP cost' });
    }

    // Can't unlock own content
    if (profile_email === user.email) {
      return res.status(400).json({ error: 'Cannot unlock your own content' });
    }

    // Check if already unlocked
    const { data: existingUnlock } = await supabase
      .from('premium_unlocks')
      .select('id')
      .eq('unlocked_by_email', user.email)
      .eq('profile_email', profile_email)
      .single();

    if (existingUnlock) {
      return res.status(400).json({ error: 'Already unlocked' });
    }

    // Get buyer's XP balance
    const { data: buyerData, error: buyerError } = await supabase
      .from('User')
      .select('xp')
      .eq('email', user.email)
      .single();

    if (buyerError || !buyerData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentXp = buyerData.xp || 0;
    if (currentXp < xp_cost) {
      return res.status(400).json({ 
        error: 'Insufficient XP',
        required: xp_cost,
        available: currentXp,
      });
    }

    // Get seller info
    const { data: sellerData, error: sellerError } = await supabase
      .from('User')
      .select('xp, display_name, full_name')
      .eq('email', profile_email)
      .single();

    if (sellerError || !sellerData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Calculate fee split (creator gets 80%, platform gets 20%)
    const creatorAmount = Math.floor(xp_cost * 0.8);
    const platformFee = xp_cost - creatorAmount;

    // Deduct XP from buyer
    const { error: deductError } = await supabase
      .from('User')
      .update({ xp: currentXp - xp_cost })
      .eq('email', user.email);

    if (deductError) {
      throw new Error('Failed to deduct XP');
    }

    // Credit XP to seller
    const { error: creditError } = await supabase
      .from('User')
      .update({ xp: (sellerData.xp || 0) + creatorAmount })
      .eq('email', profile_email);

    if (creditError) {
      // Rollback buyer deduction
      await supabase
        .from('User')
        .update({ xp: currentXp })
        .eq('email', user.email);
      throw new Error('Failed to credit seller');
    }

    // Record the unlock
    const { error: unlockError } = await supabase
      .from('premium_unlocks')
      .insert({
        unlocked_by_email: user.email,
        profile_email: profile_email,
        xp_paid: xp_cost,
        creator_received: creatorAmount,
        platform_fee: platformFee,
      });

    if (unlockError) {
      console.error('[Premium] Failed to record unlock:', unlockError);
      // Transaction already complete, just log
    }

    // Record in XP ledger
    await supabase.from('xp_ledger').insert([
      {
        user_email: user.email,
        type: 'premium_unlock',
        amount: -xp_cost,
        description: `Unlocked premium content from ${sellerData.display_name || profile_email}`,
        reference_email: profile_email,
      },
      {
        user_email: profile_email,
        type: 'premium_sale',
        amount: creatorAmount,
        description: `Premium content unlocked by ${user.email}`,
        reference_email: user.email,
      },
    ]);

    // Send notification to seller
    try {
      await supabase.from('notifications').insert({
        user_email: profile_email,
        type: 'premium_sale',
        title: 'Premium Content Sold!',
        body: `Someone unlocked your premium photos for ${creatorAmount} XP`,
        data: { buyer_email: user.email, amount: creatorAmount },
      });
    } catch {
      // Ignore notification errors
    }

    return res.status(200).json({
      success: true,
      xp_paid: xp_cost,
      creator_received: creatorAmount,
      platform_fee: platformFee,
      new_balance: currentXp - xp_cost,
    });

  } catch (error) {
    console.error('[Premium] Unlock error:', error);
    return res.status(500).json({
      error: 'Failed to unlock content',
      details: error.message,
    });
  }
}

export default withRateLimit(handler, { tier: 'create' });
