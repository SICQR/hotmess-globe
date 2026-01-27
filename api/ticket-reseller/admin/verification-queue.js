import { requireAdmin } from '../../_middleware/adminAuth.js';

/**
 * GET /api/ticket-reseller/admin/verification-queue
 * Fetch verification requests for admin review
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate admin via centralized middleware
  const authResult = await requireAdmin(req);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }
  
  const { supabase } = authResult;

  try {
    const { status = 'pending', limit = 50, offset = 0 } = req.query;

    // Build query
    let query = supabase
      .from('ticket_verification_requests')
      .select(`
        *,
        listing:listing_id (
          id,
          event_name,
          event_venue,
          event_date,
          ticket_type,
          ticket_quantity,
          original_price_gbp,
          asking_price_gbp
        ),
        seller:seller_email (
          email,
          full_name,
          avatar_url,
          trust_score,
          total_sales,
          average_rating,
          id_verified
        ),
        fraud_check:fraud_check_id (
          risk_score,
          passed,
          checks,
          warnings
        )
      `)
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Failed to fetch verification queue:', error);
      return res.status(500).json({ error: 'Failed to fetch queue' });
    }

    // Parse JSON fields
    const processedRequests = requests.map(req => ({
      ...req,
      proofs: typeof req.proofs === 'string' ? JSON.parse(req.proofs) : req.proofs,
      fraud_check_result: req.fraud_check ? {
        ...req.fraud_check,
        checks: typeof req.fraud_check.checks === 'string' 
          ? JSON.parse(req.fraud_check.checks) 
          : req.fraud_check.checks
      } : null
    }));

    return res.status(200).json(processedRequests);

  } catch (error) {
    console.error('Verification queue error:', error);
    return res.status(500).json({ error: 'Failed to fetch verification queue' });
  }
}
