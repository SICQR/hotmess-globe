/**
 * Vercel Cron: Dormant User Reactivation
 * 
 * Sends re-engagement notifications to users who haven't been active.
 * 
 * Tiers:
 * - 3 days: "Miss you! X new matches waiting"
 * - 7 days: "Someone viewed your profile - see who"
 * - 14 days: "Event this weekend: [Event Name]"
 * - 30 days: "Your streak was reset, but come back to start a new one"
 * 
 * Schedule: 0 10 * * * (10am daily)
 */

import { createClient } from '@supabase/supabase-js';
import { json, getEnv } from '../shopify/_utils.js';

const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

// Reactivation tiers (in days)
const REACTIVATION_TIERS = [
  { 
    days: 3, 
    type: 'reactivation_3d',
    titleFn: (data) => 'Miss you!',
    messageFn: (data) => `${data.newMatches || 'New'} potential matches are waiting for you`,
  },
  { 
    days: 7, 
    type: 'reactivation_7d',
    titleFn: (data) => 'Someone viewed your profile',
    messageFn: (data) => `${data.profileViews || 'Multiple people'} checked out your profile this week`,
  },
  { 
    days: 14, 
    type: 'reactivation_14d',
    titleFn: (data) => data.eventName ? `Event this weekend: ${data.eventName}` : 'Events happening near you',
    messageFn: (data) => data.eventName 
      ? `Don't miss ${data.eventName}!`
      : 'Check out what\'s happening in your area',
  },
  { 
    days: 30, 
    type: 'reactivation_30d',
    titleFn: (data) => 'We miss you',
    messageFn: (data) => 'Your streak was reset, but come back to start a new one and earn XP!',
  },
];

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  // Verify cron secret in production
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const auth = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (cronSecret && auth !== `Bearer ${cronSecret}` && process.env.NODE_ENV === 'production') {
    return json(res, 401, { error: 'Unauthorized' });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return json(res, 200, { success: true, message: 'Skipped (missing env)', processed: 0 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = new Date();
    const results = { total: 0, byTier: {} };

    for (const tier of REACTIVATION_TIERS) {
      const tierStart = new Date(now.getTime() - (tier.days + 1) * 24 * 60 * 60 * 1000);
      const tierEnd = new Date(now.getTime() - tier.days * 24 * 60 * 60 * 1000);
      
      // Find users who were last seen in this tier's window
      const { data: dormantUsers, error: fetchError } = await supabase
        .from('User')
        .select('email, full_name, last_seen')
        .gte('last_seen', tierStart.toISOString())
        .lt('last_seen', tierEnd.toISOString())
        .limit(100);

      if (fetchError) {
        console.error(`[Reactivation] Tier ${tier.days}d fetch error:`, fetchError);
        continue;
      }

      if (!dormantUsers?.length) {
        results.byTier[tier.days] = 0;
        continue;
      }

      // Check who we've already notified with this tier recently (within 7 days)
      const recentNotifCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { data: recentNotifs } = await supabase
        .from('notifications')
        .select('user_email')
        .eq('type', tier.type)
        .gte('created_at', recentNotifCutoff.toISOString())
        .in('user_email', dormantUsers.map(u => u.email));

      const alreadyNotified = new Set((recentNotifs || []).map(n => n.user_email));
      const toNotify = dormantUsers.filter(u => !alreadyNotified.has(u.email));

      if (!toNotify.length) {
        results.byTier[tier.days] = 0;
        continue;
      }

      // Gather personalization data for each user
      const notifications = [];
      
      for (const user of toNotify) {
        const data = await gatherUserData(supabase, user.email, tier.days);
        
        notifications.push({
          user_email: user.email,
          type: tier.type,
          title: tier.titleFn(data),
          message: tier.messageFn(data),
          link: tier.days === 14 && data.eventId ? `Events/${data.eventId}` : 'Social',
          metadata: { 
            tier: tier.days,
            ...data,
          },
          read: false,
          created_at: now.toISOString(),
          created_date: now.toISOString(),
        });
      }

      // Insert notifications
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) {
        console.error(`[Reactivation] Tier ${tier.days}d insert error:`, insertError);
        results.byTier[tier.days] = 0;
        continue;
      }

      // Also queue for push notification
      const outboxItems = notifications.map(n => ({
        user_email: n.user_email,
        notification_type: n.type,
        title: n.title,
        message: n.message,
        metadata: { ...n.metadata, link: n.link },
        status: 'queued',
        created_at: now.toISOString(),
      }));

      await supabase.from('notification_outbox').insert(outboxItems);

      results.byTier[tier.days] = notifications.length;
      results.total += notifications.length;
      
      console.log(`[Reactivation] Tier ${tier.days}d: notified ${notifications.length} users`);
    }

    return json(res, 200, { success: true, ...results });

  } catch (error) {
    console.error('[Reactivation] Error:', error);
    return json(res, 500, { error: error.message });
  }
}

/**
 * Gather personalization data for a dormant user
 */
async function gatherUserData(supabase, userEmail, tierDays) {
  const data = {};
  
  try {
    // Get profile view count
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { count: viewCount } = await supabase
      .from('profile_views')
      .select('*', { count: 'exact', head: true })
      .eq('viewed_email', userEmail)
      .gte('viewed_at', weekAgo.toISOString());
    
    data.profileViews = viewCount || 0;

    // Get new potential matches (active users in discovery)
    const { count: matchCount } = await supabase
      .from('User')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', weekAgo.toISOString())
      .limit(50);
    
    data.newMatches = matchCount || 0;

    // For 14-day tier, get upcoming event
    if (tierDays === 14) {
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const { data: events } = await supabase
        .from('Beacon')
        .select('id, title, event_date')
        .eq('kind', 'event')
        .eq('active', true)
        .eq('status', 'published')
        .gte('event_date', new Date().toISOString())
        .lte('event_date', nextWeek.toISOString())
        .order('event_date', { ascending: true })
        .limit(1);
      
      if (events?.[0]) {
        data.eventId = events[0].id;
        data.eventName = events[0].title;
      }
    }

  } catch (err) {
    console.warn('[Reactivation] Error gathering user data:', err.message);
  }

  return data;
}

export const config = {
  maxDuration: 60,
};
