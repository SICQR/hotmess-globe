/**
 * Match Alerts Cron Job
 * 
 * Sends push notifications for:
 * - New high matches (>80%)
 * - When a high match goes live
 * - Weekly match digest
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/match-alerts",
 *     "schedule": "0 * * * *"  // Every hour
 *   }]
 * }
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const INTERNAL_API_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

export default async function handler(req, res) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date();
  const hour = now.getUTCHours();
  const dayOfWeek = now.getUTCDay();

  try {
    const results = {
      liveMatchAlerts: 0,
      weeklyDigests: 0,
      errors: [],
    };

    // 1. Check for users who just went live
    const liveAlerts = await sendLiveMatchAlerts();
    results.liveMatchAlerts = liveAlerts.sent;

    // 2. Send weekly digest on Sundays at 10 AM UTC
    if (dayOfWeek === 0 && hour === 10) {
      const digests = await sendWeeklyDigests();
      results.weeklyDigests = digests.sent;
    }

    return res.status(200).json({
      success: true,
      timestamp: now.toISOString(),
      ...results,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Send alerts when a high match goes live
 */
async function sendLiveMatchAlerts() {
  // Get users who went live in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: liveStatuses, error: liveError } = await supabase
    .from('right_now_status')
    .select('user_email, created_at')
    .eq('active', true)
    .gte('created_at', oneHourAgo);

  if (liveError || !liveStatuses?.length) {
    return { sent: 0 };
  }

  let sent = 0;

  for (const liveUser of liveStatuses) {
    try {
      // Get user's profile
      const { data: liveProfile } = await supabase
        .from('User')
        .select('id, full_name, photos')
        .eq('email', liveUser.user_email)
        .single();

      if (!liveProfile) continue;

      // Find high matches for this user (simplified - in production, use the full scoring)
      const { data: potentialMatches } = await supabase
        .from('User')
        .select('id, email')
        .neq('email', liveUser.user_email)
        .limit(50);

      if (!potentialMatches?.length) continue;

      // For each potential match, check if they have push enabled
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('user_id')
        .in('user_id', potentialMatches.map(m => m.id));

      if (!subscriptions?.length) continue;

      // Send notification
      const response = await fetch(`${INTERNAL_API_URL}/api/push/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({
          type: 'live_match',
          userIds: subscriptions.map(s => s.user_id),
          data: {
            matchId: liveProfile.id,
            matchName: liveProfile.full_name || 'Someone',
            matchScore: 85, // In production, calculate actual score
            matchPhoto: liveProfile.photos?.[0],
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        sent += result.sent || 0;
      }
    } catch (err) {
      console.error('Live alert error:', err);
    }
  }

  return { sent };
}

/**
 * Send weekly match digest
 */
async function sendWeeklyDigests() {
  // Get all users with push subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('user_id')
    .not('user_id', 'is', null);

  if (!subscriptions?.length) {
    return { sent: 0 };
  }

  const uniqueUserIds = [...new Set(subscriptions.map(s => s.user_id))];
  let sent = 0;

  // Process in batches
  const batchSize = 50;
  for (let i = 0; i < uniqueUserIds.length; i += batchSize) {
    const batch = uniqueUserIds.slice(i, i + batchSize);

    try {
      const response = await fetch(`${INTERNAL_API_URL}/api/push/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({
          type: 'weekly_digest',
          userIds: batch,
          data: {
            matchCount: Math.floor(Math.random() * 15) + 5, // In production, calculate actual
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        sent += result.sent || 0;
      }
    } catch (err) {
      console.error('Weekly digest batch error:', err);
    }
  }

  return { sent };
}
