/**
 * API Route: Single Ticket Listing Operations
 * 
 * GET - Get listing details
 * PATCH - Update listing
 * DELETE - Cancel/delete listing
 */

import { withRateLimit } from '../middleware/rateLimiter.js';
import { validateUser, getServiceClient, validatePricing, calculatePricing } from './_utils.js';

async function handler(req, res) {
  const { listingId } = req.query;

  if (!listingId) {
    return res.status(400).json({ error: 'Listing ID is required' });
  }

  if (req.method === 'GET') {
    return handleGetListing(req, res, listingId);
  } else if (req.method === 'PATCH') {
    return handleUpdateListing(req, res, listingId);
  } else if (req.method === 'DELETE') {
    return handleDeleteListing(req, res, listingId);
  } else {
    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET /api/ticket-reseller/[listingId]
 * Get detailed listing information
 */
async function handleGetListing(req, res, listingId) {
  const supabase = getServiceClient();

  try {
    const { data: listing, error } = await supabase
      .from('ticket_listings')
      .select(`
        *,
        seller:seller_ticket_verification!seller_id(
          trust_score,
          badges,
          average_rating,
          total_ratings,
          total_sales,
          id_verified,
          phone_verified
        )
      `)
      .eq('id', listingId)
      .single();

    if (error || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Increment view count
    await supabase
      .from('ticket_listings')
      .update({ view_count: (listing.view_count || 0) + 1 })
      .eq('id', listingId);

    // Get price history
    const { data: priceHistory } = await supabase
      .from('ticket_price_history')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: true });

    // Get recent reviews for this seller
    const { data: sellerReviews } = await supabase
      .from('ticket_seller_reviews')
      .select('*')
      .eq('seller_id', listing.seller_id)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(5);

    // Calculate what buyer will pay
    const pricing = calculatePricing(listing.asking_price_gbp, listing.ticket_quantity);

    return res.status(200).json({
      listing,
      pricing,
      priceHistory,
      sellerReviews,
    });

  } catch (error) {
    console.error('[Listing] Get error:', error);
    return res.status(500).json({ error: 'Failed to fetch listing' });
  }
}

/**
 * PATCH /api/ticket-reseller/[listingId]
 * Update listing (price, description, proof, etc.)
 */
async function handleUpdateListing(req, res, listingId) {
  const { user, error: authError } = await validateUser(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }

  const supabase = getServiceClient();

  try {
    // Get existing listing
    const { data: listing, error: fetchError } = await supabase
      .from('ticket_listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Check ownership
    if (listing.seller_id !== user.id) {
      return res.status(403).json({ error: 'You can only update your own listings' });
    }

    // Check if listing can be updated
    if (['sold', 'reserved', 'expired'].includes(listing.status)) {
      return res.status(400).json({ error: `Cannot update a ${listing.status} listing` });
    }

    const {
      asking_price_gbp,
      description,
      reason_for_selling,
      ticket_proof_url,
      ticket_confirmation_code,
      transfer_instructions,
    } = req.body;

    const updates = {
      updated_at: new Date().toISOString(),
    };

    // Handle price update with validation
    if (asking_price_gbp !== undefined) {
      const pricingValidation = validatePricing(listing.original_price_gbp, parseFloat(asking_price_gbp));
      if (!pricingValidation.valid) {
        return res.status(400).json({ error: pricingValidation.error });
      }
      updates.asking_price_gbp = parseFloat(asking_price_gbp);
    }

    // Update other fields
    if (description !== undefined) updates.description = description;
    if (reason_for_selling !== undefined) updates.reason_for_selling = reason_for_selling;
    if (transfer_instructions !== undefined) updates.transfer_instructions = transfer_instructions;
    
    // Handle proof upload - may activate listing
    if (ticket_proof_url) {
      updates.ticket_proof_url = ticket_proof_url;
      
      // If listing was pending verification and now has proof, activate it
      if (listing.status === 'pending_verification' && listing.fraud_score < 70) {
        updates.status = 'active';
        updates.verified_at = new Date().toISOString();
      }
    }
    
    if (ticket_confirmation_code !== undefined) {
      updates.ticket_confirmation_code = ticket_confirmation_code;
    }

    const { data: updatedListing, error: updateError } = await supabase
      .from('ticket_listings')
      .update(updates)
      .eq('id', listingId)
      .select()
      .single();

    if (updateError) {
      console.error('[Listing] Update error:', updateError);
      return res.status(500).json({ error: 'Failed to update listing' });
    }

    console.log(`[Listing] Updated listing ${listingId}`);

    return res.status(200).json({
      listing: updatedListing,
      message: 'Listing updated successfully',
    });

  } catch (error) {
    console.error('[Listing] Update error:', error);
    return res.status(500).json({ error: 'Failed to update listing' });
  }
}

/**
 * DELETE /api/ticket-reseller/[listingId]
 * Cancel/delete a listing
 */
async function handleDeleteListing(req, res, listingId) {
  const { user, error: authError } = await validateUser(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }

  const supabase = getServiceClient();

  try {
    // Get existing listing
    const { data: listing, error: fetchError } = await supabase
      .from('ticket_listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Check ownership
    if (listing.seller_id !== user.id) {
      return res.status(403).json({ error: 'You can only cancel your own listings' });
    }

    // Check if listing can be cancelled
    if (['sold', 'reserved'].includes(listing.status)) {
      return res.status(400).json({
        error: `Cannot cancel a ${listing.status} listing. If there's an issue, please open a dispute.`,
      });
    }

    // Cancel the listing (soft delete)
    const { error: updateError } = await supabase
      .from('ticket_listings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId);

    if (updateError) {
      console.error('[Listing] Cancel error:', updateError);
      return res.status(500).json({ error: 'Failed to cancel listing' });
    }

    // Notify anyone watching this listing
    const { data: watchers } = await supabase
      .from('ticket_watchlist')
      .select('user_id')
      .eq('listing_id', listingId);

    if (watchers?.length > 0) {
      // Send notifications to watchers about cancellation
      // This would be handled by a background job in production
    }

    console.log(`[Listing] Cancelled listing ${listingId}`);

    return res.status(200).json({
      success: true,
      message: 'Listing cancelled successfully',
    });

  } catch (error) {
    console.error('[Listing] Cancel error:', error);
    return res.status(500).json({ error: 'Failed to cancel listing' });
  }
}

export default withRateLimit(handler, { tier: 'auth' });
