/**
 * API Route: Seller Statistics
 * 
 * GET - Get seller's ticket reselling stats and analytics
 */

import { withRateLimit } from '../../middleware/rateLimiter.js';
import { validateUser, getServiceClient } from '../_utils.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user, error: authError } = await validateUser(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }

  const supabase = getServiceClient();

  try {
    // Get seller verification record
    const { data: verification } = await supabase
      .from('seller_ticket_verification')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get listing stats
    const { data: listings } = await supabase
      .from('ticket_listings')
      .select('status, asking_price_gbp, view_count, created_at')
      .eq('seller_id', user.id);

    const listingStats = {
      total: listings?.length || 0,
      active: listings?.filter(l => l.status === 'active').length || 0,
      sold: listings?.filter(l => l.status === 'sold').length || 0,
      cancelled: listings?.filter(l => l.status === 'cancelled').length || 0,
      expired: listings?.filter(l => l.status === 'expired').length || 0,
      totalViews: listings?.reduce((sum, l) => sum + (l.view_count || 0), 0) || 0,
    };

    // Get order stats
    const { data: orders } = await supabase
      .from('ticket_orders')
      .select('status, total_gbp, seller_payout_amount_gbp, created_at')
      .eq('seller_id', user.id);

    const orderStats = {
      total: orders?.length || 0,
      completed: orders?.filter(o => o.status === 'completed').length || 0,
      disputed: orders?.filter(o => o.status === 'disputed').length || 0,
      pending: orders?.filter(o => ['pending', 'confirmed', 'transferred'].includes(o.status)).length || 0,
      totalRevenue: orders
        ?.filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.seller_payout_amount_gbp || 0), 0) || 0,
      pendingRevenue: orders
        ?.filter(o => ['confirmed', 'transferred'].includes(o.status))
        .reduce((sum, o) => sum + (o.seller_payout_amount_gbp || 0), 0) || 0,
    };

    // Get reviews
    const { data: reviews } = await supabase
      .from('ticket_seller_reviews')
      .select('overall_rating, created_at')
      .eq('seller_id', user.id)
      .eq('is_visible', true);

    const reviewStats = {
      total: reviews?.length || 0,
      averageRating: reviews?.length > 0
        ? reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length
        : 0,
      distribution: {
        5: reviews?.filter(r => r.overall_rating === 5).length || 0,
        4: reviews?.filter(r => r.overall_rating === 4).length || 0,
        3: reviews?.filter(r => r.overall_rating === 3).length || 0,
        2: reviews?.filter(r => r.overall_rating === 2).length || 0,
        1: reviews?.filter(r => r.overall_rating === 1).length || 0,
      },
    };

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const recentListings = listings?.filter(l => l.created_at >= thirtyDaysAgo).length || 0;
    const recentOrders = orders?.filter(o => o.created_at >= thirtyDaysAgo).length || 0;
    const recentRevenue = orders
      ?.filter(o => o.status === 'completed' && o.created_at >= thirtyDaysAgo)
      .reduce((sum, o) => sum + (o.seller_payout_amount_gbp || 0), 0) || 0;

    return res.status(200).json({
      verification: verification ? {
        status: verification.status,
        trustScore: verification.trust_score,
        badges: verification.badges,
        idVerified: verification.id_verified,
        phoneVerified: verification.phone_verified,
        stripeConnected: verification.stripe_connect_verified,
        strikeCount: verification.strike_count,
        maxActiveListings: verification.max_active_listings,
        maxTicketValue: verification.max_ticket_value_gbp,
      } : null,
      listings: listingStats,
      orders: orderStats,
      reviews: reviewStats,
      recent: {
        period: '30 days',
        listings: recentListings,
        orders: recentOrders,
        revenue: recentRevenue,
      },
    });

  } catch (error) {
    console.error('[Seller Stats] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch seller stats' });
  }
}

export default withRateLimit(handler, { tier: 'auth' });
