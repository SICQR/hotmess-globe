/**
 * Vercel Cron: Streak Reminder
 * 
 * GET/POST /api/cron/streak-reminder
 * 
 * Reminds users with active streaks to check in before their streak breaks
 * Sends notifications 12 hours before streak expiration
 */

import { createClient } from '@supabase/supabase-js';
import { json, getEnv } from '../shopify/_utils.js';

const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

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
    console.warn('[StreakReminder] Missing SUPABASE credentials');
    return json(res, 200, { success: true, message: 'Skipped (missing credentials)', processed: 0 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // Find users who checked in yesterday but haven't checked in today
    // These users have an active streak at risk
    const { data: yesterdayCheckins, error: fetchError } = await supabase
      .from('daily_checkins')
      .select('user_email, streak_day')
      .gte('checked_in_at', yesterday.toISOString())
      .lte('checked_in_at', yesterdayEnd.toISOString())
      .order('checked_in_at', { ascending: false });

    if (fetchError) {
      console.error('[StreakReminder] Error fetching yesterday checkins:', fetchError);
      return json(res, 500, { error: 'Failed to fetch checkins' });
    }

    if (!yesterdayCheckins || yesterdayCheckins.length === 0) {
      return json(res, 200, { 
        success: true, 
        message: 'No users with active streaks',
        processed: 0 
      });
    }

    // Deduplicate by user_email (take highest streak)
    const userStreaks = new Map();
    for (const checkin of yesterdayCheckins) {
      const existing = userStreaks.get(checkin.user_email);
      if (!existing || checkin.streak_day > existing.streak_day) {
        userStreaks.set(checkin.user_email, checkin);
      }
    }

    console.log(`[StreakReminder] Found ${userStreaks.size} users with active streaks`);

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    let notificationsQueued = 0;

    for (const [userEmail, checkin] of userStreaks) {
      try {
        // Check if user already checked in today
        const { data: todayCheckin } = await supabase
          .from('daily_checkins')
          .select('id')
          .eq('user_email', userEmail)
          .gte('checked_in_at', today.toISOString())
          .maybeSingle();

        if (todayCheckin) {
          continue; // Already checked in today, skip
        }

        // Check if we already sent a reminder today
        const { data: existingReminder } = await supabase
          .from('notification_outbox')
          .select('id')
          .eq('user_email', userEmail)
          .eq('notification_type', 'streak_reminder')
          .gte('created_at', today.toISOString())
          .maybeSingle();

        if (existingReminder) {
          continue; // Already sent reminder today
        }

        const streakDay = checkin.streak_day || 1;

        // Queue streak reminder notification
        const { error: notifError } = await supabase
          .from('notification_outbox')
          .insert({
            user_email: userEmail,
            notification_type: 'streak_reminder',
            title: 'Your streak is about to end!',
            message: `Your ${streakDay}-day check-in streak is about to break. Open the app to keep it alive! 🔥`,
            metadata: {
              link: '/',
              streak_day: streakDay,
            },
            status: 'queued',
            created_at: new Date().toISOString(),
            created_date: new Date().toISOString(),
          });

        if (notifError) {
          console.error(`[StreakReminder] Error queuing notification for ${userEmail}:`, notifError);
        } else {
          notificationsQueued++;
        }
      } catch (err) {
        console.error(`[StreakReminder] Error processing user ${userEmail}:`, err);
      }
    }

    return json(res, 200, {
      success: true,
      message: 'Streak reminders queued',
      notificationsQueued,
      usersProcessed: userStreaks.size,
    });
  } catch (error) {
    console.error('[StreakReminder] Unexpected error:', error);
    return json(res, 500, { error: 'Internal server error' });
  }
}

export const config = {
  maxDuration: 60,
};
