/**
 * Re-engagement & Reactivation Cron Job
 * 
 * Runs periodically to:
 * 1. Send streak_expiring notifications (users who haven't checked in and streak is at risk)
 * 2. Send re-engagement notifications (inactive users)
 * 3. Send match_online notifications (high-match users who just came online)
 * 
 * Schedule: Every 30 minutes via Vercel Cron
 * Endpoint: /api/cron/reactivation
 */

import { createClient } from '@supabase/supabase-js';
import { json, getEnv } from '../shopify/_utils.js';

const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const isRunningOnVercel = () => {
  const flag = process.env.VERCEL || process.env.VERCEL_ENV;
  return !!flag;
};

const isVercelCronRequest = (req) => {
  const cronHeader = req.headers?.['x-vercel-cron'];
  return cronHeader === '1' || cronHeader === 1 || cronHeader === true;
};

const isAuthorized = (req) => {
  const secret = getEnv('CRON_SECRET');
  const onVercel = isRunningOnVercel();
  const allowVercelCron = onVercel && isVercelCronRequest(req);

  if (allowVercelCron) return true;

  if (secret) {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const match = authHeader && String(authHeader).match(/^Bearer\s+(.+)$/i);
    const headerToken = match?.[1] || null;
    const queryToken = req.query?.secret || req.query?.cron_secret;
    return headerToken === secret || queryToken === secret;
  }

  // Allow in dev without secret
  if (!onVercel) return true;
  return false;
};

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[Reactivation] Missing Supabase config');
    return json(res, 200, { success: true, message: 'Skipped (no Supabase config)', stats: {} });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const now = new Date();
  const stats = {
    streakExpiringNotifications: 0,
    reactivationNotifications: 0,
    matchOnlineNotifications: 0,
    errors: [],
  };

  try {
    // =========================================
    // 1. STREAK EXPIRING NOTIFICATIONS
    // Users with streaks who haven't checked in for 42-48 hours (6 hour warning window)
    // =========================================
    await processStreakExpiring(supabase, now, stats);

    // =========================================
    // 2. RE-ENGAGEMENT NOTIFICATIONS
    // Users inactive for 3, 7, 14, or 30 days
    // =========================================
    await processReactivation(supabase, now, stats);

    // =========================================
    // 3. MATCH ONLINE NOTIFICATIONS
    // High-match users who came online in the last 30 mins
    // =========================================
    await processMatchOnline(supabase, now, stats);

    return json(res, 200, {
      success: true,
      message: 'Reactivation cron completed',
      stats,
    });

  } catch (error) {
    console.error('[Reactivation] Fatal error:', error);
    stats.errors.push(error.message);
    return json(res, 500, { error: 'Internal error', stats });
  }
}

/**
 * Process streak expiring notifications
 * Target users with active streaks who haven't checked in for 42-48 hours
 */
async function processStreakExpiring(supabase, now, stats) {
  try {
    // Calculate time window: 42-48 hours ago
    const hoursAgoMin = 42;
    const hoursAgoMax = 48;
    const minDate = new Date(now.getTime() - hoursAgoMax * 60 * 60 * 1000);
    const maxDate = new Date(now.getTime() - hoursAgoMin * 60 * 60 * 1000);

    // Find users with streaks in the warning window
    const { data: expiringStreaks, error } = await supabase
      .from('user_streaks')
      .select(`
        id,
        user_id,
        current_streak,
        last_activity_date,
        user:profiles!user_streaks_user_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .gte('current_streak', 3) // Only warn for streaks >= 3 days
      .gte('last_activity_date', minDate.toISOString())
      .lte('last_activity_date', maxDate.toISOString())
      .limit(50);

    if (error) {
      console.error('[Reactivation] Streak query error:', error);
      stats.errors.push(`streak_query: ${error.message}`);
      return;
    }

    if (!expiringStreaks?.length) {
      console.log('[Reactivation] No expiring streaks found');
      return;
    }

    console.log(`[Reactivation] Found ${expiringStreaks.length} expiring streaks`);

    for (const streak of expiringStreaks) {
      const userEmail = streak.user?.email;
      if (!userEmail) continue;

      // Check if we already sent this notification today
      const notificationKey = `streak_expiring:${streak.user_id}:${now.toISOString().slice(0, 10)}`;
      const { data: existing } = await supabase
        .from('notification_outbox')
        .select('id')
        .eq('user_email', userEmail)
        .eq('notification_type', 'streak_expiring')
        .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existing) continue; // Already notified today

      // Queue the notification
      const { error: insertError } = await supabase
        .from('notification_outbox')
        .insert({
          user_email: userEmail,
          notification_type: 'streak_expiring',
          title: '🔥 Your streak is about to end!',
          message: `Your ${streak.current_streak}-day streak expires in ${Math.ceil((48 - ((now - new Date(streak.last_activity_date)) / (60 * 60 * 1000))))} hours! Check in now to keep it.`,
          channel: 'in_app',
          status: 'queued',
          metadata: {
            link: '/',
            current_streak: streak.current_streak,
          },
        });

      if (insertError) {
        stats.errors.push(`streak_insert: ${insertError.message}`);
      } else {
        stats.streakExpiringNotifications++;
      }
    }
  } catch (error) {
    console.error('[Reactivation] Streak processing error:', error);
    stats.errors.push(`streak_processing: ${error.message}`);
  }
}

/**
 * Process re-engagement notifications for inactive users
 * Target: 3 days, 7 days, 14 days, 30 days
 */
async function processReactivation(supabase, now, stats) {
  try {
    const reactivationTiers = [
      { days: 3, title: 'We miss you!', message: "It's been a few days. Come check what's happening tonight!" },
      { days: 7, title: "A week without you", message: "Events and new matches are waiting for you. Come back and explore!" },
      { days: 14, title: "Miss the MESS?", message: "We've added new features. Your profile is still getting views - come see who!" },
      { days: 30, title: "It's been a while", message: "The community misses you. Get a 50% XP bonus when you return today!" },
    ];

    for (const tier of reactivationTiers) {
      const targetDate = new Date(now.getTime() - tier.days * 24 * 60 * 60 * 1000);
      const rangeStart = new Date(targetDate.getTime() - 12 * 60 * 60 * 1000); // -12h
      const rangeEnd = new Date(targetDate.getTime() + 12 * 60 * 60 * 1000); // +12h

      // Find users whose last activity was around the target date
      const { data: inactiveUsers, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, updated_at')
        .gte('updated_at', rangeStart.toISOString())
        .lte('updated_at', rangeEnd.toISOString())
        .limit(25);

      if (error) {
        stats.errors.push(`reactivation_query_${tier.days}d: ${error.message}`);
        continue;
      }

      if (!inactiveUsers?.length) continue;

      for (const user of inactiveUsers) {
        if (!user.email) continue;

        // Check if we already sent reactivation for this tier
        const { data: existing } = await supabase
          .from('notification_outbox')
          .select('id')
          .eq('user_email', user.email)
          .eq('notification_type', 'reactivation')
          .ilike('metadata->>tier', `${tier.days}d`)
          .maybeSingle();

        if (existing) continue;

        // Check notification preferences
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('marketing_enabled')
          .eq('user_email', user.email)
          .maybeSingle();

        // Default to sending if no preferences set (opt-out model)
        if (prefs?.marketing_enabled === false) continue;

        const { error: insertError } = await supabase
          .from('notification_outbox')
          .insert({
            user_email: user.email,
            notification_type: 'reactivation',
            title: tier.title,
            message: tier.message,
            channel: 'in_app',
            status: 'queued',
            metadata: {
              link: '/',
              tier: `${tier.days}d`,
              user_name: user.full_name,
            },
          });

        if (insertError) {
          stats.errors.push(`reactivation_insert: ${insertError.message}`);
        } else {
          stats.reactivationNotifications++;
        }
      }
    }
  } catch (error) {
    console.error('[Reactivation] Reactivation processing error:', error);
    stats.errors.push(`reactivation_processing: ${error.message}`);
  }
}

/**
 * Process match online notifications
 * Notify users when their high-match profiles come online
 */
async function processMatchOnline(supabase, now, stats) {
  try {
    // Find users who came online in the last 30 minutes
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    const { data: onlineUsers, error } = await supabase
      .from('presence')
      .select(`
        user_email,
        last_active,
        user:profiles (
          id,
          full_name,
          email
        )
      `)
      .gte('last_active', thirtyMinutesAgo.toISOString())
      .limit(50);

    if (error) {
      stats.errors.push(`match_online_query: ${error.message}`);
      return;
    }

    if (!onlineUsers?.length) return;

    // For each online user, find their high-match potential recipients
    // (This is a simplified version - a full implementation would use embeddings)
    for (const online of onlineUsers) {
      if (!online.user?.email) continue;

      // Check followers/follows who might want to know
      const { data: connections } = await supabase
        .from('follows')
        .select('follower_email')
        .eq('following_email', online.user_email)
        .limit(10);

      if (!connections?.length) continue;

      for (const conn of connections) {
        if (!conn.follower_email) continue;

        // Check if we notified this pair recently (max 1 per 6 hours)
        const { data: recent } = await supabase
          .from('notification_outbox')
          .select('id')
          .eq('user_email', conn.follower_email)
          .eq('notification_type', 'match_online')
          .ilike('metadata->>match_email', online.user_email)
          .gte('created_at', new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (recent) continue;

        const { error: insertError } = await supabase
          .from('notification_outbox')
          .insert({
            user_email: conn.follower_email,
            notification_type: 'match_online',
            title: `${online.user?.full_name || 'Someone you follow'} is online`,
            message: 'They just came online. Say hi!',
            channel: 'in_app',
            status: 'queued',
            metadata: {
              link: `/social/u/${encodeURIComponent(online.user_email)}`,
              match_email: online.user_email,
              match_name: online.user?.full_name,
            },
          });

        if (!insertError) {
          stats.matchOnlineNotifications++;
        }
      }
    }
  } catch (error) {
    console.error('[Reactivation] Match online processing error:', error);
    stats.errors.push(`match_online_processing: ${error.message}`);
  }
}

// Vercel config
export const config = {
  maxDuration: 60, // 60 second timeout for this job
};
