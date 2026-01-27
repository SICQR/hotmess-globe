import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET/POST /api/cron/check-notifications
 * Scheduled job to send notifications for:
 * - Expiring advertising campaigns
 * - Pending ticket verifications
 * - Seller payouts ready
 * - Weekly performance summaries
 * 
 * This should be called by a cron job (e.g., Vercel Cron)
 */
export default async function handler(req, res) {
  // Verify cron secret for security
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow in development without secret
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const results = {
    expiringCampaigns: 0,
    expiredCampaigns: 0,
    pendingVerifications: 0,
    payoutsReady: 0,
    errors: []
  };

  try {
    // ============================
    // 1. Check for expiring campaigns (3 days warning)
    // ============================
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { data: expiringCampaigns } = await supabase
      .from('sponsored_placements')
      .select('id, business_email, name, end_date')
      .eq('status', 'active')
      .gt('end_date', now)
      .lt('end_date', threeDaysFromNow);

    for (const campaign of expiringCampaigns || []) {
      // Check if we already sent this notification
      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_email', campaign.business_email)
        .eq('type', 'ad_expiring')
        .eq('data->>campaign_id', campaign.id)
        .single();

      if (!existingNotif) {
        const daysLeft = Math.ceil((new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24));
        
        await supabase.from('notifications').insert({
          user_email: campaign.business_email,
          type: 'ad_expiring',
          title: 'Campaign Expiring Soon',
          message: `Your campaign "${campaign.name || 'Advertising'}" expires in ${daysLeft} days. Renew now to maintain visibility.`,
          link: 'BusinessAdvertising',
          data: { campaign_id: campaign.id, days_left: daysLeft }
        });
        results.expiringCampaigns++;
      }
    }

    // ============================
    // 2. Check for expired campaigns (mark as expired)
    // ============================
    const { data: expiredCampaigns } = await supabase
      .from('sponsored_placements')
      .select('id, business_email, name')
      .eq('status', 'active')
      .lt('end_date', now);

    for (const campaign of expiredCampaigns || []) {
      // Update status to expired
      await supabase
        .from('sponsored_placements')
        .update({ status: 'expired' })
        .eq('id', campaign.id);

      // Send expiration notification
      await supabase.from('notifications').insert({
        user_email: campaign.business_email,
        type: 'ad_expired',
        title: 'Campaign Expired',
        message: `Your campaign "${campaign.name || 'Advertising'}" has expired. Create a new campaign to stay visible on the Globe.`,
        link: 'BusinessAdvertising'
      });

      // Deactivate associated beacon if exists
      await supabase
        .from('Beacon')
        .update({ active: false, status: 'expired' })
        .eq('sponsorship_id', campaign.id);

      results.expiredCampaigns++;
    }

    // ============================
    // 3. Check for stale pending verifications (reminder after 24h)
    // ============================
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: staleVerifications } = await supabase
      .from('ticket_verification_requests')
      .select('id, seller_email, listing:listing_id(event_name)')
      .eq('status', 'pending')
      .lt('submitted_at', oneDayAgo);

    // Send admin reminder for stale verifications
    if (staleVerifications?.length > 0) {
      await supabase.from('admin_notifications').insert({
        type: 'verification_backlog',
        title: 'Verification Queue Backlog',
        message: `${staleVerifications.length} verification requests have been pending for more than 24 hours.`,
        priority: 'high',
        data: { count: staleVerifications.length }
      });
      results.pendingVerifications = staleVerifications.length;
    }

    // ============================
    // 4. Check for payouts ready (escrow releases)
    // ============================
    const { data: releasableEscrows } = await supabase
      .from('ticket_orders')
      .select('id, seller_email, amount_gbp, listing:listing_id(event_name)')
      .eq('status', 'completed')
      .eq('escrow_released', false)
      .lt('completed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // 24h after completion

    for (const order of releasableEscrows || []) {
      // Check if payout notification already sent
      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_email', order.seller_email)
        .eq('type', 'seller_payout')
        .eq('data->>order_id', order.id)
        .single();

      if (!existingNotif) {
        await supabase.from('notifications').insert({
          user_email: order.seller_email,
          type: 'seller_payout',
          title: 'Payout Ready',
          message: `£${order.amount_gbp?.toFixed(2)} is ready to be released for "${order.listing?.event_name}". Funds will be sent to your account.`,
          link: 'SellerDashboard?tab=payouts',
          data: { order_id: order.id, amount: order.amount_gbp }
        });
        results.payoutsReady++;
      }
    }

    // ============================
    // 5. Campaign milestone checks (1000, 5000, 10000 impressions)
    // ============================
    const milestones = [1000, 5000, 10000, 25000, 50000];
    
    const { data: activeCampaigns } = await supabase
      .from('sponsored_placements')
      .select('id, business_email, name, impressions, metadata')
      .eq('status', 'active');

    for (const campaign of activeCampaigns || []) {
      const impressions = campaign.impressions || 0;
      const lastMilestone = campaign.metadata?.last_milestone || 0;
      
      for (const milestone of milestones) {
        if (impressions >= milestone && lastMilestone < milestone) {
          // Send milestone notification
          await supabase.from('notifications').insert({
            user_email: campaign.business_email,
            type: 'campaign_milestone',
            title: 'Campaign Milestone!',
            message: `Your campaign "${campaign.name || 'Advertising'}" has reached ${milestone.toLocaleString()} impressions!`,
            link: 'BusinessAdvertising?tab=analytics',
            data: { campaign_id: campaign.id, milestone, impressions }
          });

          // Update last milestone
          await supabase
            .from('sponsored_placements')
            .update({ 
              metadata: { 
                ...campaign.metadata, 
                last_milestone: milestone 
              } 
            })
            .eq('id', campaign.id);

          break; // Only send one milestone notification per check
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Notification check completed',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cron notification check error:', error);
    results.errors.push(error.message);
    return res.status(500).json({
      success: false,
      error: 'Notification check failed',
      results
    });
  }
}
