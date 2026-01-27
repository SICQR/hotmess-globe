import { requireAdmin } from '../../_middleware/adminAuth.js';

/**
 * POST /api/ticket-reseller/admin/verify
 * Admin endpoint to approve, reject, or flag verification requests
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate admin via centralized middleware
  const authResult = await requireAdmin(req);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }
  
  const { user: adminUser, supabase } = authResult;

  try {
    const { 
      request_id, 
      action, // 'approve', 'reject', 'flag'
      verification_level,
      reject_reason,
      flag_reason,
      notes 
    } = req.body;

    if (!request_id || !action) {
      return res.status(400).json({ error: 'request_id and action are required' });
    }

    // Get the verification request
    const { data: request, error: requestError } = await supabase
      .from('ticket_verification_requests')
      .select('*, listing:listing_id(*)')
      .eq('id', request_id)
      .single();

    if (requestError || !request) {
      return res.status(404).json({ error: 'Verification request not found' });
    }

    const now = new Date().toISOString();

    switch (action) {
      case 'approve': {
        const level = verification_level || 'verified';
        
        // Update verification request
        await supabase
          .from('ticket_verification_requests')
          .update({
            status: 'approved',
            verification_level: level,
            reviewed_by: adminUser.email,
            reviewed_at: now,
            review_notes: notes
          })
          .eq('id', request_id);

        // Update listing to be live
        await supabase
          .from('ticket_listings')
          .update({
            status: 'active',
            verification_status: level,
            verified_at: now,
            verified_by: adminUser.email
          })
          .eq('id', request.listing_id);

        // Update seller trust score (positive action)
        await updateSellerTrustScore(request.seller_email, 'verified', supabase);

        // Notify seller
        await supabase
          .from('notifications')
          .insert({
            user_email: request.seller_email,
            type: 'ticket_verified',
            title: 'Ticket Verified!',
            message: `Your ticket for "${request.listing?.event_name}" has been verified and is now live.`,
            data: {
              listing_id: request.listing_id,
              verification_level: level
            }
          });

        return res.status(200).json({
          success: true,
          message: 'Ticket approved and listing is now live',
          verification_level: level
        });
      }

      case 'reject': {
        if (!reject_reason) {
          return res.status(400).json({ error: 'reject_reason is required' });
        }

        // Update verification request
        await supabase
          .from('ticket_verification_requests')
          .update({
            status: 'rejected',
            reject_reason,
            reviewed_by: adminUser.email,
            reviewed_at: now,
            review_notes: notes
          })
          .eq('id', request_id);

        // Update listing status
        await supabase
          .from('ticket_listings')
          .update({
            status: 'verification_failed',
            verification_status: 'rejected',
            rejection_reason: reject_reason
          })
          .eq('id', request.listing_id);

        // Update seller trust score (negative action)
        await updateSellerTrustScore(request.seller_email, 'rejected', supabase);

        // Notify seller with rejection reason
        const rejectionMessages = {
          invalid_proof: 'The proof documents provided were invalid or unclear. Please re-upload clearer images.',
          mismatched_info: 'The information provided doesn\'t match the ticket details. Please verify your details.',
          duplicate_listing: 'This ticket appears to have been listed elsewhere. Each ticket can only be listed once.',
          suspected_fraud: 'We were unable to verify the authenticity of this ticket. If you believe this is an error, please contact support.',
          invalid_ticket: 'The ticket could not be verified as genuine. Please ensure you have a valid ticket.',
          other: notes || 'Your verification was not approved. Please contact support for more information.'
        };

        await supabase
          .from('notifications')
          .insert({
            user_email: request.seller_email,
            type: 'ticket_rejected',
            title: 'Verification Unsuccessful',
            message: rejectionMessages[reject_reason] || rejectionMessages.other,
            data: {
              listing_id: request.listing_id,
              reason: reject_reason,
              can_resubmit: ['invalid_proof', 'mismatched_info'].includes(reject_reason)
            }
          });

        // Log for fraud monitoring
        if (reject_reason === 'suspected_fraud' || reject_reason === 'duplicate_listing') {
          await supabase
            .from('fraud_log')
            .insert({
              type: 'verification_rejected',
              user_email: request.seller_email,
              listing_id: request.listing_id,
              reason: reject_reason,
              reviewer: adminUser.email,
              details: {
                request_id,
                notes
              }
            });
        }

        return res.status(200).json({
          success: true,
          message: 'Verification rejected',
          reason: reject_reason
        });
      }

      case 'flag': {
        // Flag for additional review (escalate)
        await supabase
          .from('ticket_verification_requests')
          .update({
            status: 'flagged',
            flag_reason: flag_reason || 'needs_review',
            flagged_by: adminUser.email,
            flagged_at: now,
            review_notes: notes
          })
          .eq('id', request_id);

        // Update listing to on_hold
        await supabase
          .from('ticket_listings')
          .update({
            status: 'on_hold',
            verification_status: 'flagged'
          })
          .eq('id', request.listing_id);

        // Create escalation notification for senior admins
        await supabase
          .from('admin_notifications')
          .insert({
            type: 'verification_escalation',
            title: 'Flagged Verification Request',
            message: `${adminUser.email} flagged verification for "${request.listing?.event_name}" - needs senior review`,
            data: {
              request_id,
              listing_id: request.listing_id,
              flag_reason,
              flagged_by: adminUser.email
            },
            priority: 'high',
            target_role: 'admin' // Only show to senior admins
          });

        return res.status(200).json({
          success: true,
          message: 'Request flagged for additional review',
          flag_reason
        });
      }

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Admin verify error:', error);
    return res.status(500).json({ error: 'Failed to process verification action' });
  }
}

/**
 * Update seller's trust score based on verification outcome
 */
async function updateSellerTrustScore(sellerEmail, outcome, supabase) {
  const { data: seller } = await supabase
    .from('ticket_sellers')
    .select('trust_score, total_verifications, successful_verifications')
    .eq('email', sellerEmail)
    .single();

  if (!seller) {
    // Create new seller record
    await supabase
      .from('ticket_sellers')
      .insert({
        email: sellerEmail,
        trust_score: outcome === 'verified' ? 70 : 40,
        total_verifications: 1,
        successful_verifications: outcome === 'verified' ? 1 : 0
      });
    return;
  }

  const totalVerifications = (seller.total_verifications || 0) + 1;
  const successfulVerifications = (seller.successful_verifications || 0) + (outcome === 'verified' ? 1 : 0);
  
  // Calculate new trust score
  // Base: success rate * 60 + baseline 40, capped at 100
  let newTrustScore = Math.min(100, Math.floor((successfulVerifications / totalVerifications) * 60 + 40));
  
  // Penalty for rejections due to fraud
  if (outcome === 'rejected') {
    newTrustScore = Math.max(0, seller.trust_score - 10);
  }

  await supabase
    .from('ticket_sellers')
    .update({
      trust_score: newTrustScore,
      total_verifications: totalVerifications,
      successful_verifications: successfulVerifications,
      last_verification_at: new Date().toISOString()
    })
    .eq('email', sellerEmail);
}
