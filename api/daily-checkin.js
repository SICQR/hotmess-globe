/**
 * Daily Check-in API
 * 
 * POST /api/daily-checkin - Claim daily check-in
 * GET /api/daily-checkin - Get check-in status
 * 
 * Rewards:
 * - Day 1: 10 XP
 * - Day 2: 15 XP
 * - Day 3: 20 XP
 * - Day 7: 50 XP bonus
 * - Day 30: 200 XP bonus + badge
 */

import {
  getBearerToken,
  getAuthedUser,
  getSupabaseServerClients,
  json,
} from './routing/_utils.js';

// XP rewards by streak day
const XP_REWARDS = {
  1: 10,
  2: 15,
  3: 20,
  4: 25,
  5: 30,
  6: 35,
  7: 50,  // Week bonus
  14: 75,
  21: 100,
  30: 200, // Month bonus
};

// Get XP for a given streak day
function getXpReward(streakDay) {
  // Check for milestone rewards first
  if (XP_REWARDS[streakDay]) {
    return XP_REWARDS[streakDay];
  }
  // Base progression: 10 + (day * 2), capped at 50
  return Math.min(10 + (streakDay * 2), 50);
}

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

    // Get user profile
    const { data: userProfile, error: profileErr } = await serviceClient
      .from('User')
      .select('id, email, xp')
      .eq('auth_user_id', authUser.id)
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
      const nextReward = getXpReward(currentStreak + 1);

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
        // Consecutive day - increment streak
        newStreak = (streak?.current_streak || 0) + 1;
      } else if (lastCheckin) {
        // Streak broken - reset to 1
        newStreak = 1;
      }

      // Calculate XP reward
      const xpReward = getXpReward(newStreak);
      const isMilestone = XP_REWARDS[newStreak] !== undefined;

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

      // Award XP
      const newXp = (userProfile.xp || 0) + xpReward;
      await serviceClient
        .from('User')
        .update({ xp: newXp })
        .eq('id', userProfile.id);

      // Check for badge milestones
      let badgeAwarded = null;
      if (newStreak === 7) {
        badgeAwarded = { name: 'Week Warrior', icon: '🔥', streak_required: 7 };
      } else if (newStreak === 30) {
        badgeAwarded = { name: 'Monthly Legend', icon: '👑', streak_required: 30 };
      } else if (newStreak === 100) {
        badgeAwarded = { name: 'Century Club', icon: '💎', streak_required: 100 };
      }

      // Award badge if milestone reached
      if (badgeAwarded) {
        const { error: badgeError } = await adminSupabase
          .from('user_badges')
          .upsert({
            user_email: user.email,
            badge_name: badgeAwarded.name,
            badge_icon: badgeAwarded.icon,
            streak_achieved: newStreak,
            awarded_at: new Date().toISOString(),
          }, { onConflict: 'user_email,badge_name' });
        
        if (badgeError) {
          // Non-blocking - continue even if badge fails
        }
      }

      return json(res, 200, {
        success: true,
        xpAwarded: xpReward,
        newXpTotal: newXp,
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, streak?.longest_streak || 0),
        isMilestone,
        badgeAwarded,
        nextReward: getXpReward(newStreak + 1),
      });
    }

    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Method not allowed' });

  } catch (error) {
    return json(res, 500, { error: error?.message || 'Internal server error' });
  }
}
