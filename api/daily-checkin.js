/**
 * Daily Check-in API
 *
 * POST /api/daily-checkin - Claim daily check-in
 * GET /api/daily-checkin - Get check-in status
 *
 * Rewards: streak milestone badges (no XP)
 */

import {
  getBearerToken,
  getAuthedUser,
  getSupabaseServerClients,
  json,
} from './routing/_utils.js';

// Check if two dates are the same day (UTC)
function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.toISOString().slice(0, 10) === d2.toISOString().slice(0, 10);
}

// Check if date2 is the day after date1
function isNextDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setUTCDate(d1.getUTCDate() + 1);
  return d1.toISOString().slice(0, 10) === d2.toISOString().slice(0, 10);
}

// Get next streak milestone label
function getNextReward(streakDay) {
  if (streakDay < 7)  return { day: 7,   label: 'Week Warrior badge' };
  if (streakDay < 30) return { day: 30,  label: 'Monthly Legend badge' };
  if (streakDay < 100) return { day: 100, label: 'Century Club badge' };
  return null;
}

export default async function handler(req, res) {
  try {
    const { error: supaErr, anonClient, serviceClient } = getSupabaseServerClients();
    if (supaErr || !serviceClient) {
      return json(res, 500, { error: supaErr || 'Supabase client unavailable' });
    }

    const accessToken = getBearerToken(req);
    if (!accessToken) {
      return json(res, 401, { error: 'Missing Authorization bearer token' });
    }

    const { user: authUser, error: authErr } = await getAuthedUser({ anonClient, accessToken });
    if (authErr || !authUser?.id) {
      return json(res, 401, { error: 'Invalid auth token' });
    }

    // Get user profile from profiles table (not dead User table)
    const { data: userProfile, error: profileErr } = await serviceClient
      .from('profiles')
      .select('id, email')
      .eq('id', authUser.id)
      .single();

    if (profileErr || !userProfile) {
      return json(res, 404, { error: 'User profile not found' });
    }

    // GET - Return check-in status
    if (req.method === 'GET') {
      const { data: streak } = await serviceClient
        .from('user_streaks')
        .select('*')
        .eq('user_id', userProfile.id)
        .maybeSingle();

      const today = new Date().toISOString().slice(0, 10);
      const lastCheckin = streak?.last_activity_date
        ? new Date(streak.last_activity_date).toISOString().slice(0, 10)
        : null;

      const canCheckIn = !lastCheckin || lastCheckin !== today;
      const currentStreak = streak?.current_streak || 0;
      const nextReward = getNextReward(currentStreak + 1);

      return json(res, 200, {
        canCheckIn,
        currentStreak,
        longestStreak: streak?.longest_streak || 0,
        lastCheckIn: streak?.last_activity_date || null,
        nextReward,
        todayCheckedIn: !canCheckIn,
      });
    }

    // POST - Claim daily check-in
    if (req.method === 'POST') {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);

      // Get current streak data
      const { data: streak } = await serviceClient
        .from('user_streaks')
        .select('*')
        .eq('user_id', userProfile.id)
        .maybeSingle();

      const lastCheckin = streak?.last_activity_date
        ? new Date(streak.last_activity_date)
        : null;

      // Check if already checked in today
      if (lastCheckin && isSameDay(lastCheckin, now)) {
        return json(res, 400, {
          error: 'Already checked in today',
          todayCheckedIn: true,
          currentStreak: streak.current_streak,
        });
      }

      // Calculate new streak
      let newStreak = 1;
      if (lastCheckin && isNextDay(lastCheckin, now)) {
        newStreak = (streak?.current_streak || 0) + 1;
      } else if (lastCheckin) {
        newStreak = 1;
      }

      const isMilestone = [7, 30, 100].includes(newStreak);

      // Update or create streak record
      const { error: streakErr } = await serviceClient
        .from('user_streaks')
        .upsert({
          user_id: userProfile.id,
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, streak?.longest_streak || 0),
          last_activity_date: now.toISOString(),
          updated_at: now.toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (streakErr) {
        return json(res, 500, { error: 'Failed to update streak' });
      }

      // Check for badge milestones
      let badgeAwarded = null;
      if (newStreak === 7) {
        badgeAwarded = { name: 'Week Warrior', icon: '🔥', streak_required: 7 };
      } else if (newStreak === 30) {
        badgeAwarded = { name: 'Monthly Legend', icon: '👑', streak_required: 30 };
      } else if (newStreak === 100) {
        badgeAwarded = { name: 'Century Club', icon: '💎', streak_required: 100 };
      }

      // Award badge if milestone reached (non-blocking — table may not exist yet)
      if (badgeAwarded) {
        try {
          await serviceClient
            .from('user_badges')
            .upsert({
              user_id: userProfile.id,
              badge_name: badgeAwarded.name,
              badge_icon: badgeAwarded.icon,
              streak_achieved: newStreak,
              awarded_at: new Date().toISOString(),
            }, { onConflict: 'user_id,badge_name' });
        } catch {
          // Non-blocking — silently fails until user_badges table is created
        }
      }

      return json(res, 200, {
        success: true,
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, streak?.longest_streak || 0),
        isMilestone,
        badgeAwarded,
        nextReward: getNextReward(newStreak),
      });
    }

    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Method not allowed' });

  } catch (error) {
    return json(res, 500, { error: error?.message || 'Internal server error' });
  }
}
