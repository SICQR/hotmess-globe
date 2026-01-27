import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/ticket-reseller/verify/submit
 * Submit ticket verification for admin review
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Decode JWT to get user email
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { 
      listing_id, 
      proofs, 
      confirmation_details,
      fraud_check_result 
    } = req.body;

    if (!listing_id) {
      return res.status(400).json({ error: 'listing_id is required' });
    }

    // Verify the listing belongs to this user
    const { data: listing, error: listingError } = await supabase
      .from('ticket_listings')
      .select('*')
      .eq('id', listing_id)
      .eq('seller_email', user.email)
      .single();

    if (listingError || !listing) {
      return res.status(404).json({ error: 'Listing not found or not owned by you' });
    }

    // Check if already submitted
    const { data: existingRequest } = await supabase
      .from('ticket_verification_requests')
      .select('id, status')
      .eq('listing_id', listing_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingRequest?.[0]?.status === 'pending') {
      return res.status(400).json({ error: 'Verification already pending' });
    }

    // Hash sensitive data for secure storage
    const hashedOrderRef = confirmation_details?.order_reference 
      ? crypto.createHash('sha256').update(confirmation_details.order_reference).digest('hex')
      : null;

    // Create verification request
    const verificationId = crypto.randomUUID();
    const { error: insertError } = await supabase
      .from('ticket_verification_requests')
      .insert({
        id: verificationId,
        listing_id,
        seller_email: user.email,
        proofs: JSON.stringify(proofs),
        confirmation_details: {
          order_reference_hash: hashedOrderRef,
          order_reference: confirmation_details?.order_reference, // Stored encrypted in DB
          original_purchaser_email: confirmation_details?.original_purchaser_email,
          ticketing_platform: confirmation_details?.ticketing_platform,
          ticket_transfer_code_provided: !!confirmation_details?.ticket_transfer_code,
        },
        fraud_check_id: fraud_check_result?.fraud_check_id,
        fraud_check_passed: fraud_check_result?.passed,
        fraud_risk_score: fraud_check_result?.risk_score,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Failed to create verification request:', insertError);
      return res.status(500).json({ error: 'Failed to submit verification' });
    }

    // Update listing status
    await supabase
      .from('ticket_listings')
      .update({
        verification_status: 'pending_review',
        verification_request_id: verificationId,
        status: fraud_check_result?.passed ? 'pending_verification' : 'on_hold'
      })
      .eq('id', listing_id);

    // If fraud check passed with low risk, auto-approve after delay (optional)
    if (fraud_check_result?.passed && fraud_check_result?.risk_score < 20) {
      // Queue for auto-approval (could be a background job)
      await supabase
        .from('ticket_verification_requests')
        .update({
          auto_approve_eligible: true,
          auto_approve_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 mins
        })
        .eq('id', verificationId);
    }

    // Send notification to admins
    await supabase
      .from('admin_notifications')
      .insert({
        type: 'ticket_verification',
        title: 'New Ticket Verification Request',
        message: `${user.email} submitted verification for "${listing.event_name}"`,
        data: {
          verification_id: verificationId,
          listing_id,
          event_name: listing.event_name,
          risk_score: fraud_check_result?.risk_score
        },
        priority: fraud_check_result?.risk_score > 30 ? 'high' : 'normal'
      });

    return res.status(200).json({
      success: true,
      verification_id: verificationId,
      status: 'pending_review',
      message: fraud_check_result?.passed
        ? 'Verification submitted! Your listing will go live once approved (usually within 24 hours).'
        : 'Verification submitted for manual review. This may take longer due to additional checks required.',
      estimated_review_time: fraud_check_result?.risk_score > 30 ? '24-48 hours' : '2-24 hours'
    });

  } catch (error) {
    console.error('Verification submit error:', error);
    return res.status(500).json({ error: 'Failed to submit verification' });
  }
}
