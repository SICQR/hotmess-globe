/**
 * API Route: Ticket Listings
 * 
 * GET - Browse/search listings
 * POST - Create a new listing
 */

import { withRateLimit } from '../middleware/rateLimiter.js';
import {
  validateUser,
  getServiceClient,
  validatePricing,
  validateEventDate,
  getSellerVerification,
  calculateFraudScore,
  TICKET_TYPES,
  TICKET_SOURCES,
  TRANSFER_METHODS,
} from './_utils.js';

async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGetListings(req, res);
  } else if (req.method === 'POST') {
    return handleCreateListing(req, res);
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET /api/ticket-reseller/listings
 * Browse and search ticket listings
 */
async function handleGetListings(req, res) {
  const supabase = getServiceClient();

  try {
    const {
      event_id,
      event_name,
      city,
      date_from,
      date_to,
      min_price,
      max_price,
      ticket_type,
      sort = 'event_date',
      order = 'asc',
      page = 1,
      limit = 20,
    } = req.query;

    // Build query
    let query = supabase
      .from('ticket_listings')
      .select(`
        *,
        seller:seller_ticket_verification!seller_id(
          trust_score,
          badges,
          average_rating,
          total_sales,
          id_verified
        )
      `, { count: 'exact' })
      .eq('status', 'active')
      .gt('event_date', new Date().toISOString());

    // Apply filters
    if (event_id) {
      query = query.eq('event_id', event_id);
    }
    if (event_name) {
      query = query.ilike('event_name', `%${event_name}%`);
    }
    if (city) {
      query = query.ilike('event_city', `%${city}%`);
    }
    if (date_from) {
      query = query.gte('event_date', date_from);
    }
    if (date_to) {
      query = query.lte('event_date', date_to);
    }
    if (min_price) {
      query = query.gte('asking_price_gbp', parseFloat(min_price));
    }
    if (max_price) {
      query = query.lte('asking_price_gbp', parseFloat(max_price));
    }
    if (ticket_type) {
      query = query.eq('ticket_type', ticket_type);
    }

    // Sorting
    const validSorts = ['event_date', 'asking_price_gbp', 'created_at', 'view_count'];
    const sortField = validSorts.includes(sort) ? sort : 'event_date';
    const ascending = order !== 'desc';
    query = query.order(sortField, { ascending });

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;
    query = query.range(offset, offset + limitNum - 1);

    const { data: listings, error, count } = await query;

    if (error) {
      console.error('[Listings] Query error:', error);
      return res.status(500).json({ error: 'Failed to fetch listings' });
    }

    // Increment view count for returned listings
    if (listings?.length > 0) {
      const listingIds = listings.map(l => l.id);
      await supabase.rpc('increment_listing_views', { listing_ids: listingIds }).catch(() => {});
    }

    return res.status(200).json({
      listings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (error) {
    console.error('[Listings] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch listings' });
  }
}

/**
 * POST /api/ticket-reseller/listings
 * Create a new ticket listing
 */
async function handleCreateListing(req, res) {
  const { user, error: authError } = await validateUser(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }

  const supabase = getServiceClient();

  try {
    const {
      event_id,
      event_name,
      event_venue,
      event_date,
      event_city,
      event_address,
      ticket_type,
      ticket_quantity = 1,
      original_price_gbp,
      asking_price_gbp,
      ticket_proof_url,
      ticket_confirmation_code,
      ticket_source,
      original_purchaser_name,
      description,
      reason_for_selling,
      transfer_method,
      transfer_instructions,
    } = req.body;

    // Validate required fields
    if (!event_name || !event_venue || !event_date || !ticket_type || 
        original_price_gbp === undefined || asking_price_gbp === undefined || !transfer_method) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['event_name', 'event_venue', 'event_date', 'ticket_type', 'original_price_gbp', 'asking_price_gbp', 'transfer_method'],
      });
    }

    // Validate ticket type
    if (!TICKET_TYPES.includes(ticket_type)) {
      return res.status(400).json({
        error: `Invalid ticket type. Must be one of: ${TICKET_TYPES.join(', ')}`,
      });
    }

    // Validate transfer method
    if (!TRANSFER_METHODS.includes(transfer_method)) {
      return res.status(400).json({
        error: `Invalid transfer method. Must be one of: ${TRANSFER_METHODS.join(', ')}`,
      });
    }

    // Validate ticket source if provided
    if (ticket_source && !TICKET_SOURCES.includes(ticket_source)) {
      return res.status(400).json({
        error: `Invalid ticket source. Must be one of: ${TICKET_SOURCES.join(', ')}`,
      });
    }

    // Validate event date
    const eventDateValidation = validateEventDate(event_date);
    if (!eventDateValidation.valid) {
      return res.status(400).json({ error: eventDateValidation.error });
    }

    // Validate pricing
    const pricingValidation = validatePricing(parseFloat(original_price_gbp), parseFloat(asking_price_gbp));
    if (!pricingValidation.valid) {
      return res.status(400).json({ error: pricingValidation.error });
    }

    // Check seller verification and limits
    const sellerVerification = await getSellerVerification(supabase, user.id);
    
    if (!sellerVerification.canList) {
      return res.status(403).json({
        error: `Your account is ${sellerVerification.status}. You cannot create new listings.`,
      });
    }

    // Check ticket value limit
    if (parseFloat(asking_price_gbp) > sellerVerification.maxTicketValue) {
      return res.status(403).json({
        error: `Your current verification level limits tickets to £${sellerVerification.maxTicketValue}. Please verify your account for higher limits.`,
        maxValue: sellerVerification.maxTicketValue,
      });
    }

    // Check active listings limit
    const { count: activeListings } = await supabase
      .from('ticket_listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .in('status', ['active', 'pending_verification', 'reserved']);

    if (activeListings >= sellerVerification.maxActiveListings) {
      return res.status(403).json({
        error: `You have reached your limit of ${sellerVerification.maxActiveListings} active listings. Please complete or cancel existing listings first.`,
        maxListings: sellerVerification.maxActiveListings,
        currentListings: activeListings,
      });
    }

    // Get user email
    const { data: userData } = await supabase
      .from('User')
      .select('email')
      .eq('auth_user_id', user.id)
      .single();

    const sellerEmail = userData?.email || user.email;

    // Create the listing
    const listingData = {
      seller_id: user.id,
      seller_email: sellerEmail,
      event_id: event_id || null,
      event_name,
      event_venue,
      event_date,
      event_city: event_city || null,
      event_address: event_address || null,
      ticket_type,
      ticket_quantity: Math.min(10, Math.max(1, parseInt(ticket_quantity))),
      original_price_gbp: parseFloat(original_price_gbp),
      asking_price_gbp: parseFloat(asking_price_gbp),
      ticket_proof_url: ticket_proof_url || null,
      ticket_confirmation_code: ticket_confirmation_code || null,
      ticket_source: ticket_source || 'other',
      original_purchaser_name: original_purchaser_name || null,
      description: description || null,
      reason_for_selling: reason_for_selling || null,
      transfer_method,
      transfer_instructions: transfer_instructions || null,
      status: ticket_proof_url ? 'active' : 'pending_verification',
      expires_at: new Date(new Date(event_date).getTime() - 2 * 60 * 60 * 1000).toISOString(),
    };

    // Calculate fraud score
    const fraudResult = await calculateFraudScore(supabase, listingData, sellerVerification);
    listingData.fraud_score = fraudResult.score;
    listingData.is_suspicious = fraudResult.isSuspicious;

    // If highly suspicious, require manual verification
    if (fraudResult.score >= 70) {
      listingData.status = 'pending_verification';
    }

    const { data: listing, error: insertError } = await supabase
      .from('ticket_listings')
      .insert(listingData)
      .select()
      .single();

    if (insertError) {
      console.error('[Listings] Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create listing' });
    }

    // Log initial price
    await supabase.from('ticket_price_history').insert({
      listing_id: listing.id,
      new_price_gbp: listing.asking_price_gbp,
      change_reason: 'initial',
    });

    // Create or update seller verification record
    await supabase
      .from('seller_ticket_verification')
      .upsert({
        user_id: user.id,
        user_email: sellerEmail,
        status: 'unverified',
      }, { onConflict: 'user_id' });

    console.log(`[Listings] Created listing ${listing.id} for ${sellerEmail}`);

    return res.status(201).json({
      listing,
      message: listing.status === 'active' 
        ? 'Listing created and is now live!'
        : 'Listing created and pending verification. Please upload proof of ticket ownership.',
      sellerVerification: {
        verified: sellerVerification.verified,
        trustScore: sellerVerification.trustScore,
        badges: sellerVerification.badges,
      },
    });

  } catch (error) {
    console.error('[Listings] Error:', error);
    return res.status(500).json({ error: 'Failed to create listing' });
  }
}

export default withRateLimit(handler, { tier: 'auth' });
