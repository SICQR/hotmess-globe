/**
 * API Route: Ticket Orders
 * 
 * GET - Get user's orders (as buyer or seller)
 */

import { withRateLimit } from '../middleware/rateLimiter.js';
import { validateUser, getServiceClient } from './_utils.js';

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
    const {
      role = 'all', // 'buyer', 'seller', 'all'
      status,
      page = 1,
      limit = 20,
    } = req.query;

    // Build query
    let query = supabase
      .from('ticket_orders')
      .select(`
        *,
        listing:ticket_listings!listing_id(
          id,
          event_name,
          event_venue,
          event_date,
          event_city,
          ticket_type,
          ticket_proof_url
        ),
        transfer:ticket_transfers!order_id(
          id,
          status,
          transfer_method,
          seller_proof_urls,
          buyer_confirmed_at,
          transfer_deadline,
          confirmation_deadline
        ),
        dispute:ticket_disputes!order_id(
          id,
          status,
          reason
        )
      `, { count: 'exact' });

    // Filter by role
    if (role === 'buyer') {
      query = query.eq('buyer_id', user.id);
    } else if (role === 'seller') {
      query = query.eq('seller_id', user.id);
    } else {
      query = query.or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    // Order by date
    query = query.order('created_at', { ascending: false });

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;
    query = query.range(offset, offset + limitNum - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('[Orders] Query error:', error);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }

    // Add role indicator to each order
    const ordersWithRole = orders?.map(order => ({
      ...order,
      userRole: order.buyer_id === user.id ? 'buyer' : 'seller',
    })) || [];

    return res.status(200).json({
      orders: ordersWithRole,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
    });

  } catch (error) {
    console.error('[Orders] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

export default withRateLimit(handler, { tier: 'auth' });
