import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/premium/unlock
 * Unlock premium content by spending XP
 * 
 * Body: { owner_email, unlock_type, item_id, price_xp }
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

    const { owner_email, unlock_type, item_id, price_xp } = req.body;

    if (!owner_email || !unlock_type || !item_id || !price_xp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validUnlockTypes = ['photo', 'video', 'post', 'subscription'];
    if (!validUnlockTypes.includes(unlock_type)) {
      return res.status(400).json({ error: 'Invalid unlock type' });
    }

    if (typeof price_xp !== 'number' || price_xp < 0) {
      return res.status(400).json({ error: 'Invalid price' });
    }

    const buyerEmail = user.email;

    // Can't buy from yourself
    if (buyerEmail.toLowerCase() === owner_email.toLowerCase()) {
      return res.status(400).json({ error: 'Cannot unlock your own content' });
    }

    // Get buyer's current XP
    const { data: buyer, error: buyerError } = await supabase
      .from('User')
      .select('email, xp')
      .eq('email', buyerEmail)
      .single();

    if (buyerError || !buyer) {
      return res.status(404).json({ error: 'User not found' });
    }

    if ((buyer.xp || 0) < price_xp) {
      return res.status(400).json({ 
        error: 'Insufficient XP',
        required: price_xp,
        available: buyer.xp || 0
      });
    }

    // Check if already unlocked
    const { data: existingUnlock } = await supabase
      .from('premium_unlocks')
      .select('id')
      .eq('user_email', buyerEmail)
      .eq('owner_email', owner_email)
      .eq('unlock_type', unlock_type)
      .eq('item_id', item_id)
      .single();

    if (existingUnlock) {
      return res.status(400).json({ error: 'Content already unlocked' });
    }

    // Calculate platform fee (20%)
    const platformFeePercent = parseInt(process.env.PLATFORM_FEE_PERCENT || '20', 10);
    const platformFee = Math.floor(price_xp * (platformFeePercent / 100));
    const creatorEarnings = price_xp - platformFee;

    // Store original balances for rollback
    const originalBuyerXp = buyer.xp || 0;
    
    // Start transaction: deduct XP from buyer
    const { error: deductError } = await supabase
      .from('User')
      .update({ xp: originalBuyerXp - price_xp })
      .eq('email', buyerEmail);

    if (deductError) {
      return res.status(500).json({ error: 'Failed to process transaction' });
    }

    // Credit XP to content owner
    const { data: owner, error: ownerError } = await supabase
      .from('User')
      .select('email, xp')
      .eq('email', owner_email)
      .single();

    const originalOwnerXp = owner?.xp || 0;
    let ownerCredited = false;
    
    if (!ownerError && owner) {
      const { error: creditError } = await supabase
        .from('User')
        .update({ xp: originalOwnerXp + creatorEarnings })
        .eq('email', owner_email);
      
      if (!creditError) {
        ownerCredited = true;
      }
    }

    // Create unlock record
    const { data: unlock, error: unlockError } = await supabase
      .from('premium_unlocks')
      .insert({
        user_email: buyerEmail,
        owner_email: owner_email,
        unlock_type: unlock_type,
        item_id: item_id,
        price_xp: price_xp,
        purchased_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (unlockError) {
      // ROLLBACK: Refund buyer XP
      await supabase
        .from('User')
        .update({ xp: originalBuyerXp })
        .eq('email', buyerEmail);
      
      // ROLLBACK: Remove owner credit if applied
      if (ownerCredited) {
        await supabase
          .from('User')
          .update({ xp: originalOwnerXp })
          .eq('email', owner_email);
      }
      
      return res.status(500).json({ error: 'Failed to create unlock record, transaction rolled back' });
    }

    return res.status(200).json({
      success: true,
      unlock: {
        id: unlock.id,
        unlock_type,
        item_id,
        purchased_at: unlock.purchased_at,
      },
      transaction: {
        xp_spent: price_xp,
        platform_fee: platformFee,
        creator_earnings: creatorEarnings,
        new_balance: (buyer.xp || 0) - price_xp,
      },
    });
  } catch (error) {
    // console.error('Premium unlock error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
