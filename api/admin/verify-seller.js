/**
 * Admin API: Verify or Reject Seller
 * Allows admins to approve or reject seller verification requests
 */

import { requireAdmin } from '../_middleware/adminAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate admin via centralized middleware
  const authResult = await requireAdmin(req);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }
  
  const { user: adminUser, supabase } = authResult;

  try {
    const { verification_id, action, rejection_reason } = req.body;

    if (!verification_id || !action) {
      return res.status(400).json({ error: 'verification_id and action are required' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action must be "approve" or "reject"' });
    }

    // Get verification request
    const { data: verification, error: fetchError } = await supabase
      .from('seller_verifications')
      .select('*')
      .eq('id', verification_id)
      .single();

    if (fetchError || !verification) {
      return res.status(404).json({ error: 'Verification request not found' });
    }

    if (verification.status !== 'pending') {
      return res.status(400).json({ error: `Verification is already ${verification.status}` });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update verification request
    const { error: updateError } = await supabase
      .from('seller_verifications')
      .update({
        status: newStatus,
        reviewed_by: adminUser.email,
        reviewed_at: new Date().toISOString(),
        rejection_reason: action === 'reject' ? rejection_reason : null,
      })
      .eq('id', verification_id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update verification' });
    }

    // If approved, update user's verified_seller status
    if (action === 'approve') {
      const { error: userError } = await supabase
        .from('User')
        .update({
          verified_seller: true,
          verified_seller_at: new Date().toISOString(),
        })
        .eq('email', verification.seller_email);

      if (userError) {
        console.error('[Admin] Failed to update user verified status:', userError);
      }

      // Send approval notification
      await supabase.from('notifications').insert({
        user_email: verification.seller_email,
        type: 'verification',
        title: '✅ Verification Approved!',
        message: 'Congratulations! Your seller account is now verified. Your profile displays a verified badge.',
        link: 'SellerDashboard',
      });
    } else {
      // Send rejection notification
      await supabase.from('notifications').insert({
        user_email: verification.seller_email,
        type: 'verification',
        title: '❌ Verification Not Approved',
        message: rejection_reason || 'Your verification was not approved. Please review and resubmit.',
        link: 'SellerDashboard',
      });
    }

    console.log(`[Admin] Seller verification ${verification_id} ${newStatus} by ${adminUser.email}`);

    return res.status(200).json({
      success: true,
      status: newStatus,
      seller_email: verification.seller_email,
    });

  } catch (error) {
    console.error('[Admin] Verification error:', error);
    return res.status(500).json({ 
      error: 'Failed to process verification',
      details: error.message,
    });
  }
}
