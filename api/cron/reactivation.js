/**
 * Vercel Cron: Dormant User Reactivation
 * 
 * GET/POST /api/cron/reactivation
 * 
 * Sends re-engagement notifications to users who haven't been active
 * Tiers: 3, 7, 14, 30 days of inactivity
 */

import { createClient } from '@supabase/supabase-js';
import { json, getEnv } from '../shopify/_utils.js';

const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const REACTIVATION_TIERS = [
  {
    days: 3,
    type: 'dormant_3day',
    title: 'Miss you!',
    getMessage: (stats) => `${stats.newMatches || 0} new matches are waiting for you`,
  },
  {
    days: 7,
    type: 'dormant_7day',
    title: 'Still here?',
    getMessage: (stats) => `${stats.profileViews || 0} people viewed your profile this week`,
  },
  {
    days: 14,
    type: 'dormant_14day',
    title: "What's happening this weekend",
    getMessage: (stats) => stats.upcomingEvent 
      ? `Event this weekend: ${stats.upcomingEvent}` 
      : 'Check out what\'s happening in London',
  },
  {
    days: 30,
    type: 'dormant_30day',
    title: 'Your streak reset',
    getMessage: () => 'Come back to start a new check-in streak and earn XP',
  },
];

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const auth = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  
  if (cronSecret && auth !== `Bearer ${cronSecret}` && process.env.NODE_ENV === 'production') {
    return json(res, 401, { error: 'Unauthorized' });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[Reactivation] Missing SUPABASE credentials');
    return json(res, 200, { success: true, message: 'Skipped (missing credentials)', processed: 0 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    let totalNotificationsQueued = 0;
    const now = new Date();

    for (const tier of REACTIVATION_TIERS) {
      const inactiveDate = new Date(now);
      inactiveDate.setDate(inactiveDate.getDate() - tier.days);
      
      // Get users who were last active exactly around this tier (within 1 hour window)
      const windowStart = new Date(inactiveDate);
      windowStart.setHours(windowStart.getHours() - 1);
      const windowEnd = new Date(inactiveDate);
      windowEnd.setHours(windowEnd.getHours() + 1);

      const { data: dormantUsers, error: fetchError } = await supabase
        .from('User')
        .select('email, full_name, last_seen_at')
        .gte('last_seen_at', windowStart.toISOString())
        .lte('last_seen_at', windowEnd.toISOString())
        .limit(100);

      if (fetchError) {
        console.error(`[Reactivation] Error fetching ${tier.days}-day dormant users:`, fetchError);
        continue;
      }

      if (!dormantUsers || dormantUsers.length === 0) {
        console.log(`[Reactivation] No dormant users for ${tier.days}-day tier`);
        continue;
      }

      console.log(`[Reactivation] Processing ${dormantUsers.length} users for ${tier.days}-day tier`);

      for (const user of dormantUsers) {
        try {
          // Check if we already sent this tier notification
          const { data: existingNotif } = await supabase
            .from('notification_outbox')
            .select('id')
            .eq('user_email', user.email)
            .eq('notification_type', tier.type)
            .gte('created_at', windowStart.toISOString())
            .maybeSingle();

          if (existingNotif) {
            continue; // Already notified for this tier
          }

          // Gather personalized stats
          const stats = await gatherUserStats(supabase, user.email, tier.days);
          const message = tier.getMessage(stats);

          // Queue notification
          const { error: notifError } = await supabase
            .from('notification_outbox')
            .insert({
              user_email: user.email,
              notification_type: tier.type,
              title: tier.title,
              message,
              metadata: {
                link: '/',
                days_inactive: tier.days,
                stats,
              },
              status: 'queued',
              created_at: new Date().toISOString(),
              created_date: new Date().toISOString(),
            });

          if (notifError) {
            console.error(`[Reactivation] Error queuing notification for ${user.email}:`, notifError);
          } else {
            totalNotificationsQueued++;
          }
        } catch (err) {
          console.error(`[Reactivation] Error processing user ${user.email}:`, err);
        }
      }
    }

    return json(res, 200, {
      success: true,
      message: 'Reactivation notifications queued',
      notificationsQueued: totalNotificationsQueued,
    });
  } catch (error) {
    console.error('[Reactivation] Unexpected error:', error);
    return json(res, 500, { error: 'Internal server error' });
  }
}

/**
 * Gather personalized stats for reactivation message
 */
async function gatherUserStats(supabase, userEmail, daysInactive) {
  const stats = {
    newMatches: 0,
    profileViews: 0,
    upcomingEvent: null,
  };

  try {
    const inactiveSince = new Date();
    inactiveSince.setDate(inactiveSince.getDate() - daysInactive);

    // Count profile views since user went inactive
    const { count: viewsCount } = await supabase
      .from('profile_views')
      .select('*', { count: 'exact', head: true })
      .eq('viewed_email', userEmail)
      .gte('viewed_at', inactiveSince.toISOString());

    stats.profileViews = viewsCount || 0;

    // Get upcoming events (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const { data: events } = await supabase
      .from('Beacon')
      .select('name, event_date')
      .eq('kind', 'event')
      .gte('event_date', new Date().toISOString())
      .lte('event_date', nextWeek.toISOString())
      .order('event_date', { ascending: true })
      .limit(1);

    if (events && events.length > 0) {
      stats.upcomingEvent = events[0].name;
    }

    // Note: "new matches" would require a match scoring system
    // For now, use a placeholder or count recent active users
    const { count: activeUsers } = await supabase
      .from('User')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen_at', inactiveSince.toISOString());

    stats.newMatches = Math.min(activeUsers || 0, 10); // Cap at 10 for messaging
  } catch (err) {
    console.warn('[Reactivation] Error gathering stats:', err);
  }

  return stats;
}

export const config = {
  maxDuration: 60, // 60 second timeout for processing
};
