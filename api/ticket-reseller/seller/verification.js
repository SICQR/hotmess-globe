/**
 * API Route: Seller Verification
 * 
 * GET - Get seller verification status
 * POST - Submit verification request
 */

import { withRateLimit } from '../../middleware/rateLimiter.js';
import { validateUser, getServiceClient, getSellerVerification } from '../_utils.js';

async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGetVerification(req, res);
  } else if (req.method === 'POST') {
    return handleSubmitVerification(req, res);
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET /api/ticket-reseller/seller/verification
 * Get current verification status and limits
 */
async function handleGetVerification(req, res) {
  const { user, error: authError } = await validateUser(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }

  const supabase = getServiceClient();

  try {
    const verification = await getSellerVerification(supabase, user.id);

    // Get active listings count
    const { count: activeListings } = await supabase
      .from('ticket_listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .in('status', ['active', 'pending_verification', 'reserved']);

    return res.status(200).json({
      ...verification,
      activeListings: activeListings || 0,
      remainingListings: verification.maxActiveListings - (activeListings || 0),
    });

  } catch (error) {
    console.error('[Verification] Error:', error);
    return res.status(500).json({ error: 'Failed to get verification status' });
  }
}

/**
 * POST /api/ticket-reseller/seller/verification
 * Submit verification request
 */
async function handleSubmitVerification(req, res) {
  const { user, error: authError } = await validateUser(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }

  const supabase = getServiceClient();

  try {
    const { phone_number, social_links } = req.body;

    // Get user email
    const { data: userData } = await supabase
      .from('User')
      .select('email')
      .eq('auth_user_id', user.id)
      .single();

    const userEmail = userData?.email || user.email;

    // Get or create verification record
    const { data: existing } = await supabase
      .from('seller_ticket_verification')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const updates = {
      user_id: user.id,
      user_email: userEmail,
      updated_at: new Date().toISOString(),
    };

    if (phone_number) {
      updates.phone_number = phone_number;
      updates.phone_verified = false; // Would need actual verification
    }

    if (social_links) {
      updates.social_links = social_links;
      updates.social_verified = Object.keys(social_links).length > 0;
    }

    // If new record or pending, set to pending verification
    if (!existing || existing.status === 'unverified') {
      updates.status = 'pending';
    }

    const { data: verification, error: upsertError } = await supabase
      .from('seller_ticket_verification')
      .upsert(updates, { onConflict: 'user_id' })
      .select()
      .single();

    if (upsertError) {
      console.error('[Verification] Upsert error:', upsertError);
      return res.status(500).json({ error: 'Failed to submit verification' });
    }

    // Calculate updated limits based on verification level
    let newLimits = {
      maxActiveListings: 3,
      maxTicketValue: 200,
    };

    if (verification.phone_verified) {
      newLimits.maxActiveListings += 2;
      newLimits.maxTicketValue += 100;
    }

    if (verification.social_verified) {
      newLimits.maxActiveListings += 2;
      newLimits.maxTicketValue += 100;
    }

    if (verification.id_verified) {
      newLimits.maxActiveListings += 5;
      newLimits.maxTicketValue += 300;
    }

    if (verification.stripe_connect_verified) {
      newLimits.maxActiveListings += 5;
      newLimits.maxTicketValue += 500;
    }

    // Update limits
    await supabase
      .from('seller_ticket_verification')
      .update({
        max_active_listings: newLimits.maxActiveListings,
        max_ticket_value_gbp: newLimits.maxTicketValue,
      })
      .eq('user_id', user.id);

    console.log(`[Verification] Updated for user ${user.id}`);

    return res.status(200).json({
      verification: {
        ...verification,
        max_active_listings: newLimits.maxActiveListings,
        max_ticket_value_gbp: newLimits.maxTicketValue,
      },
      message: 'Verification information updated',
    });

  } catch (error) {
    console.error('[Verification] Error:', error);
    return res.status(500).json({ error: 'Failed to update verification' });
  }
}

export default withRateLimit(handler, { tier: 'auth' });
