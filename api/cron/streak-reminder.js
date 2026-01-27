/**
 * Vercel Cron: Streak Reminder
 * 
 * Sends notifications to users whose streak is about to expire.
 * Runs at 8pm to remind users to check in before midnight.
 * 
 * Schedule: 0 20 * * * (8pm daily)
 */

import { createClient } from '@supabase/supabase-js';
import { json, getEnv } from '../shopify/_utils.js';

const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

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
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Find users with active streaks (3+ days) who haven't checked in today
    const { data: atRiskStreaks, error: fetchError } = await supabase
      .from('user_streaks')
      .select('id, user_email, current_streak, longest_streak, last_activity_date')
      .eq('streak_type', 'daily_checkin')
      .eq('last_activity_date', yesterday) // Last check-in was yesterday
      .gte('current_streak', 3); // Only remind if they have a meaningful streak

    if (fetchError) {
      console.error('[StreakReminder] Fetch error:', fetchError);
      return json(res, 500, { error: 'Failed to fetch streaks' });
    }

    if (!atRiskStreaks?.length) {
      return json(res, 200, { success: true, message: 'No at-risk streaks', processed: 0 });
    }

    // Check who we've already reminded today
    const { data: alreadyReminded } = await supabase
      .from('notifications')
      .select('user_email')
      .eq('type', 'streak_reminder')
      .gte('created_at', `${today}T00:00:00Z`)
      .in('user_email', atRiskStreaks.map(s => s.user_email));

    const remindedSet = new Set((alreadyReminded || []).map(n => n.user_email));
    const toRemind = atRiskStreaks.filter(s => !remindedSet.has(s.user_email));

    if (!toRemind.length) {
      return json(res, 200, { success: true, message: 'All users already reminded', processed: 0 });
    }

    // Create notifications
    const notifications = toRemind.map(streak => ({
      user_email: streak.user_email,
      type: 'streak_reminder',
      title: `Your ${streak.current_streak}-day streak is at risk!`,
      message: 'Open the app before midnight to keep your streak alive',
      link: 'Home',
      metadata: { 
        current_streak: streak.current_streak,
        longest_streak: streak.longest_streak,
      },
      read: false,
      created_at: now.toISOString(),
      created_date: now.toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('[StreakReminder] Insert error:', insertError);
      return json(res, 500, { error: 'Failed to create notifications' });
    }

    // Also queue for push notification (high priority)
    const outboxItems = notifications.map(n => ({
      user_email: n.user_email,
      notification_type: 'streak_reminder',
      title: n.title,
      message: n.message,
      metadata: { ...n.metadata, link: 'Home' },
      status: 'queued',
      created_at: now.toISOString(),
    }));

    await supabase.from('notification_outbox').insert(outboxItems);

    console.log(`[StreakReminder] Reminded ${notifications.length} users about expiring streaks`);
    return json(res, 200, { 
      success: true, 
      processed: notifications.length,
      totalAtRisk: atRiskStreaks.length,
    });

  } catch (error) {
    console.error('[StreakReminder] Error:', error);
    return json(res, 500, { error: error.message });
  }
}

export const config = {
  maxDuration: 30,
};
