import { verifyAdmin, adminErrorStatus } from './_verify.js';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/admin/revenue
 *
 * Aggregates revenue, membership, and platform health data for the
 * /admin/revenue dashboard. Admin-only.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://hotmessldn.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { error: authError } = await verifyAdmin(req);
  if (authError) return res.status(adminErrorStatus(authError)).json({ error: authError });

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const [
      { data: revenueData },
      { data: healthData },
      { data: memberTiers },
      { data: aiUsage },
      { data: recentMembers },
      { data: imageScans },
    ] = await Promise.all([
      supabase.rpc('get_revenue_dashboard'),
      supabase.rpc('get_platform_health'),
      supabase
        .from('memberships')
        .select('tier, status, payment_provider, started_at')
        .neq('tier', 'free')
        .neq('tier', 'mess'),
      supabase
        .from('ai_usage')
        .select('feature, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 86400 * 1000).toISOString()),
      supabase
        .from('memberships')
        .select('user_id, tier, status, payment_provider, started_at')
        .neq('tier', 'free')
        .neq('tier', 'mess')
        .order('started_at', { ascending: false })
        .limit(10),
      supabase
        .from('profiles')
        .select('avatar_scan_status')
        .in('avatar_scan_status', ['review', 'blocked']),
    ]);

    // Tier breakdown for paying members
    const tierCounts = { hotmess: 0, connected: 0, promoter: 0, venue: 0 };
    const providerCounts = { stripe: 0, revenuecat: 0, manual: 0 };
    for (const m of memberTiers || []) {
      if (m.tier in tierCounts) tierCounts[m.tier]++;
      const p = m.payment_provider || 'stripe';
      if (p in providerCounts) providerCounts[p]++;
    }

    // AI usage breakdown (last 30 days)
    const aiBreakdown = {};
    for (const row of aiUsage || []) {
      aiBreakdown[row.feature] = (aiBreakdown[row.feature] || 0) + 1;
    }

    // Image moderation counts
    const moderationCounts = { review: 0, blocked: 0 };
    for (const row of imageScans || []) {
      if (row.avatar_scan_status in moderationCounts) {
        moderationCounts[row.avatar_scan_status]++;
      }
    }

    return res.status(200).json({
      revenue: revenueData,
      health: healthData,
      paying: {
        total: (memberTiers || []).filter(m => m.status === 'active').length,
        by_tier: tierCounts,
        by_provider: providerCounts,
        recent: recentMembers || [],
      },
      ai: {
        total_30d: (aiUsage || []).length,
        by_feature: aiBreakdown,
      },
      moderation: moderationCounts,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[admin/revenue] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
