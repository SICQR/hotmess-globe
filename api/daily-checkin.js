/**
 * API: Daily Check-in
 * 
 * Rewards users for daily app visits with escalating XP.
 * 
 * GET: Returns check-in status (last check-in, current streak, today's reward)
 * POST: Claims today's check-in reward
 */

import { json, getBearerToken } from './shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from './routing/_utils.js';

// XP rewards by consecutive days (resets after day 7, then repeats)
const DAILY_REWARDS = [
  { day: 1, xp: 10, label: 'Day 1' },
  { day: 2, xp: 15, label: 'Day 2' },
  { day: 3, xp: 20, label: 'Day 3' },
  { day: 4, xp: 25, label: 'Day 4' },
  { day: 5, xp: 30, label: 'Day 5' },
  { day: 6, xp: 40, label: 'Day 6' },
  { day: 7, xp: 50, label: 'Week Bonus', bonus: true },
];

// Milestone bonuses
const MILESTONE_BONUSES = {
  30: { xp: 200, badge: 'streak_30', label: '30-Day Streak' },
  100: { xp: 500, badge: 'streak_100', label: '100-Day Streak' },
  365: { xp: 1000, badge: 'streak_365', label: '1-Year Streak' },
};

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { error: clientError, serviceClient, anonClient } = getSupabaseServerClients();
  if (clientError) return json(res, 500, { error: clientError });

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing bearer token' });

  const { user, error: userError } = await getAuthedUser({ anonClient, accessToken });
  if (userError || !user?.email) return json(res, 401, { error: 'Invalid auth token' });

  const userEmail = user.email;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // Get or create user's check-in streak record
    let { data: streakRecord, error: fetchError } = await serviceClient
      .from('user_streaks')
      .select('*')
      .eq('user_email', userEmail)
      .eq('streak_type', 'daily_checkin')
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[DailyCheckin] Fetch error:', fetchError);
      return json(res, 500, { error: 'Failed to fetch streak data' });
    }

    // Initialize streak record if doesn't exist
    if (!streakRecord) {
      const { data: newRecord, error: createError } = await serviceClient
        .from('user_streaks')
        .insert({
          user_email: userEmail,
          streak_type: 'daily_checkin',
          current_streak: 0,
          longest_streak: 0,
          last_activity_date: null,
        })
        .select()
        .single();

      if (createError) {
        console.error('[DailyCheckin] Create error:', createError);
        return json(res, 500, { error: 'Failed to create streak record' });
      }
      streakRecord = newRecord;
    }

    const lastCheckIn = streakRecord.last_activity_date;
    const alreadyClaimedToday = lastCheckIn === today;
    
    // Calculate streak status
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const isConsecutive = lastCheckIn === yesterdayStr;
    const currentStreak = alreadyClaimedToday 
      ? streakRecord.current_streak 
      : (isConsecutive ? streakRecord.current_streak : 0);

    // Calculate today's reward
    const streakDay = ((currentStreak) % 7) + 1; // 1-7 cycle
    const todayReward = DAILY_REWARDS[streakDay - 1];

    // Check for milestone bonus
    const nextStreak = currentStreak + 1;
    const milestoneBonus = MILESTONE_BONUSES[nextStreak] || null;

    if (method === 'GET') {
      return json(res, 200, {
        alreadyClaimedToday,
        currentStreak,
        longestStreak: streakRecord.longest_streak,
        lastCheckIn,
        todayReward: alreadyClaimedToday ? null : todayReward,
        milestoneBonus: alreadyClaimedToday ? null : milestoneBonus,
        rewards: DAILY_REWARDS,
        streakDay: alreadyClaimedToday ? ((currentStreak - 1) % 7) + 1 : streakDay,
      });
    }

    // POST - Claim check-in
    if (alreadyClaimedToday) {
      return json(res, 400, { error: 'Already claimed today', alreadyClaimedToday: true });
    }

    // Calculate total XP to award
    let totalXp = todayReward.xp;
    let earnedBadge = null;

    if (milestoneBonus) {
      totalXp += milestoneBonus.xp;
      earnedBadge = milestoneBonus.badge;
    }

    const newStreak = isConsecutive ? streakRecord.current_streak + 1 : 1;
    const newLongest = Math.max(newStreak, streakRecord.longest_streak);

    // Update streak record
    const { error: updateError } = await serviceClient
      .from('user_streaks')
      .update({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_activity_date: today,
      })
      .eq('id', streakRecord.id);

    if (updateError) {
      console.error('[DailyCheckin] Update streak error:', updateError);
      return json(res, 500, { error: 'Failed to update streak' });
    }

    // Award XP to user
    const { data: userData, error: userFetchError } = await serviceClient
      .from('User')
      .select('xp')
      .eq('email', userEmail)
      .single();

    if (userFetchError) {
      console.error('[DailyCheckin] User fetch error:', userFetchError);
      return json(res, 500, { error: 'Failed to fetch user' });
    }

    const newXp = (userData?.xp || 0) + totalXp;

    const { error: xpError } = await serviceClient
      .from('User')
      .update({ xp: newXp })
      .eq('email', userEmail);

    if (xpError) {
      console.error('[DailyCheckin] XP update error:', xpError);
      return json(res, 500, { error: 'Failed to award XP' });
    }

    // Log to XP ledger
    await serviceClient
      .from('xp_ledger')
      .insert({
        user_email: userEmail,
        amount: totalXp,
        transaction_type: 'daily_checkin',
        reference_type: 'streak',
        reference_id: streakRecord.id,
        balance_after: newXp,
      });

    // Award milestone badge if earned
    if (earnedBadge) {
      await serviceClient
        .from('user_achievements')
        .upsert({
          user_email: userEmail,
          achievement_id: earnedBadge,
          unlocked_date: new Date().toISOString(),
        }, { onConflict: 'user_email,achievement_id' });
    }

    return json(res, 200, {
      success: true,
      xpAwarded: totalXp,
      newXpTotal: newXp,
      currentStreak: newStreak,
      longestStreak: newLongest,
      streakDay: ((newStreak - 1) % 7) + 1,
      todayReward,
      milestoneBonus: milestoneBonus ? { ...milestoneBonus, earned: true } : null,
      earnedBadge,
    });

  } catch (error) {
    console.error('[DailyCheckin] Error:', error);
    return json(res, 500, { error: error.message });
  }
}

export const config = {
  maxDuration: 10,
};
