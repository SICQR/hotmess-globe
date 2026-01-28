/**
 * Vercel API Route: Daily Check-in
 * 
 * POST /api/daily-checkin
 * 
 * Records daily check-in and awards progressive XP
 * Day 1: 10 XP, Day 2: 15 XP, Day 3: 20 XP, Day 7: 50 XP bonus, Day 30: 200 XP bonus
 */

import { getBearerToken, json } from './shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from './routing/_utils.js';
import { bestEffortRateLimit, minuteBucket } from './_rateLimit.js';
import { getRequestIp } from './routing/_utils.js';

const BASE_XP = 10;
const XP_INCREMENT = 5;
const MILESTONE_BONUSES = {
  7: 50,
  14: 100,
  30: 200,
  60: 500,
  100: 1000,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { error, anonClient, serviceClient } = getSupabaseServerClients();
  if (error) return json(res, 500, { error });

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing bearer token' });

  const { user, error: userError } = await getAuthedUser({ anonClient, accessToken });
  if (userError || !user?.email) return json(res, 401, { error: 'Invalid auth token' });

  // Rate limit: prevent spam check-ins
  const ip = getRequestIp(req);
  const rl = await bestEffortRateLimit({
    serviceClient,
    bucketKey: `checkin:${user.id || user.email}:${ip || 'noip'}:${minuteBucket()}`,
    userId: user.id || null,
    ip,
    windowSeconds: 60,
    maxRequests: 5,
  });

  if (rl.allowed === false) {
    return json(res, 429, { error: 'Rate limit exceeded', remaining: rl.remaining ?? 0 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    // Check if user already checked in today
    const { data: existingCheckin } = await serviceClient
      .from('daily_checkins')
      .select('*')
      .eq('user_email', user.email)
      .gte('checked_in_at', todayStr)
      .maybeSingle();

    if (existingCheckin) {
      return json(res, 200, { 
        success: false, 
        message: 'Already checked in today',
        alreadyCheckedIn: true,
        checkin: existingCheckin,
      });
    }

    // Get check-in history to calculate streak
    const { data: recentCheckins } = await serviceClient
      .from('daily_checkins')
      .select('checked_in_at')
      .eq('user_email', user.email)
      .order('checked_in_at', { ascending: false })
      .limit(100);

    let currentStreak = 1; // Today counts as 1
    if (recentCheckins && recentCheckins.length > 0) {
      // Check if there's a check-in from yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let checkDate = yesterday;
      for (const checkin of recentCheckins) {
        const checkinDate = new Date(checkin.checked_in_at);
        checkinDate.setHours(0, 0, 0, 0);
        
        if (checkinDate.getTime() === checkDate.getTime()) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Calculate XP reward based on streak
    let xpReward = BASE_XP + (Math.min(currentStreak - 1, 10) * XP_INCREMENT);
    let bonusXp = 0;
    let milestone = null;

    // Check for milestone bonuses
    if (MILESTONE_BONUSES[currentStreak]) {
      bonusXp = MILESTONE_BONUSES[currentStreak];
      xpReward += bonusXp;
      milestone = currentStreak;
    }

    // Record check-in
    const { data: checkin, error: checkinError } = await serviceClient
      .from('daily_checkins')
      .insert({
        user_email: user.email,
        checked_in_at: new Date().toISOString(),
        streak_day: currentStreak,
        xp_earned: xpReward,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (checkinError) {
      console.error('[DailyCheckin] Error recording check-in:', checkinError);
      return json(res, 500, { error: 'Failed to record check-in' });
    }

    // Award XP to user
    const { data: userData } = await serviceClient
      .from('User')
      .select('xp')
      .eq('email', user.email)
      .single();

    const currentXp = userData?.xp || 0;
    const newXp = currentXp + xpReward;

    const { error: xpError } = await serviceClient
      .from('User')
      .update({ xp: newXp, updated_at: new Date().toISOString() })
      .eq('email', user.email);

    if (xpError) {
      console.error('[DailyCheckin] Error updating XP:', xpError);
    }

    // Record XP transaction in ledger
    await serviceClient
      .from('xp_ledger')
      .insert({
        user_email: user.email,
        amount: xpReward,
        transaction_type: 'daily_checkin',
        reference_id: checkin.id,
        balance_after: newXp,
        created_at: new Date().toISOString(),
      });

    // Create badge for milestone
    if (milestone) {
      await serviceClient
        .from('notification_outbox')
        .insert({
          user_email: user.email,
          notification_type: 'daily_challenge',
          title: 'Milestone Reached!',
          message: `Amazing! ${milestone} day check-in streak! +${bonusXp} bonus XP`,
          metadata: {
            link: '/challenges',
            milestone,
            bonus_xp: bonusXp,
          },
          status: 'queued',
          created_at: new Date().toISOString(),
          created_date: new Date().toISOString(),
        });
    }

    return json(res, 200, {
      success: true,
      message: 'Check-in successful',
      checkin: {
        ...checkin,
        xp_reward: xpReward,
        bonus_xp: bonusXp,
        streak: currentStreak,
        milestone,
      },
    });
  } catch (error) {
    console.error('[DailyCheckin] Unexpected error:', error);
    return json(res, 500, { error: 'Internal server error' });
  }
}
