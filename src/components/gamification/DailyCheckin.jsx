/**
 * Daily Check-in Component
 * 
 * Gamification feature that rewards users for daily engagement.
 * Includes streak tracking, XP rewards, and milestone bonuses.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, 
  Gift, 
  Calendar, 
  Star, 
  Zap, 
  Trophy,
  CheckCircle2,
  Lock,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
import confetti from 'canvas-confetti';

// ============================================================================
// Configuration
// ============================================================================

const STREAK_REWARDS = [
  { day: 1, xp: 10, label: 'Day 1', icon: Zap },
  { day: 2, xp: 15, label: 'Day 2', icon: Zap },
  { day: 3, xp: 20, label: 'Day 3', icon: Star },
  { day: 4, xp: 25, label: 'Day 4', icon: Zap },
  { day: 5, xp: 30, label: 'Day 5', icon: Star },
  { day: 6, xp: 35, label: 'Day 6', icon: Zap },
  { day: 7, xp: 100, label: 'Week!', icon: Trophy, milestone: true },
];

const MILESTONE_BONUSES = {
  7: { xp: 100, badge: '7-Day Streak', color: '#E62020' },
  14: { xp: 250, badge: '2-Week Warrior', color: '#00D9FF' },
  30: { xp: 500, badge: 'Monthly Legend', color: '#39FF14' },
  90: { xp: 1000, badge: 'Quarterly Champion', color: '#B026FF' },
  365: { xp: 5000, badge: 'Year-Round Player', color: '#FFD700' },
};

// ============================================================================
// Hooks
// ============================================================================

function useCheckinData() {
  const queryClient = useQueryClient();

  const { data: checkinData, isLoading, isError } = useQuery({
    queryKey: ['daily-checkin'],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // Get checkin record - use maybeSingle() to handle no rows gracefully
        const { data: checkin, error: checkinError } = await supabase
          .from('user_checkins')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        // If table doesn't exist (42P01) or other critical error, hide the feature
        if (checkinError?.code === '42P01' || checkinError?.code === 'PGRST116') {
          console.warn('[DailyCheckin] Table not found, hiding feature');
          return null;
        }

        // Get XP balance - use maybeSingle() to handle no rows gracefully
        const { data: xp, error: xpError } = await supabase
          .from('xp_balances')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();

        // Ignore XP table errors - just use 0
        const xpBalance = xpError ? 0 : (xp?.balance || 0);

        return {
          checkin: checkin || { streak: 0, last_checkin: null, total_checkins: 0 },
          xpBalance,
          userId: user.id,
        };
      } catch (err) {
        // Any fetch error - return null to hide feature
        console.warn('[DailyCheckin] Fetch error:', err?.message);
        return null;
      }
    },
    staleTime: 60000,
    retry: false, // Don't retry on table not found
  });

  const checkinMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];
      const lastCheckin = checkinData?.checkin?.last_checkin?.split('T')[0];
      
      // Already checked in today
      if (lastCheckin === today) {
        throw new Error('Already checked in today');
      }

      // Calculate streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const isConsecutive = lastCheckin === yesterdayStr;
      const newStreak = isConsecutive ? (checkinData?.checkin?.streak || 0) + 1 : 1;
      const totalCheckins = (checkinData?.checkin?.total_checkins || 0) + 1;

      // Calculate XP reward
      const dayInCycle = ((newStreak - 1) % 7) + 1;
      const baseXp = STREAK_REWARDS[dayInCycle - 1]?.xp || 10;
      const milestoneBonus = MILESTONE_BONUSES[newStreak]?.xp || 0;
      const totalXp = baseXp + milestoneBonus;

      // Upsert checkin record
      const { error: checkinError } = await supabase
        .from('user_checkins')
        .upsert({
          user_id: user.id,
          streak: newStreak,
          last_checkin: new Date().toISOString(),
          total_checkins: totalCheckins,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (checkinError) throw checkinError;

      // Award XP
      const { error: xpError } = await supabase.rpc('add_xp', {
        p_user_id: user.id,
        p_amount: totalXp,
        p_source: 'daily_checkin',
        p_description: `Day ${newStreak} check-in reward`,
      });

      // If RPC doesn't exist, try direct update
      if (xpError?.code === 'PGRST202') {
        await supabase
          .from('xp_balances')
          .upsert({
            user_id: user.id,
            balance: (checkinData?.xpBalance || 0) + totalXp,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });
      }

      return {
        streak: newStreak,
        xpEarned: totalXp,
        milestone: MILESTONE_BONUSES[newStreak] || null,
        dayInCycle,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['daily-checkin']);
      queryClient.invalidateQueries(['user-xp']);
      
      trackEvent('daily_checkin', {
        streak: result.streak,
        xp_earned: result.xpEarned,
        is_milestone: !!result.milestone,
      });
    },
  });

  const canCheckin = useMemo(() => {
    if (!checkinData?.checkin?.last_checkin) return true;
    const today = new Date().toISOString().split('T')[0];
    const lastCheckin = checkinData.checkin.last_checkin.split('T')[0];
    return lastCheckin !== today;
  }, [checkinData]);

  return {
    checkinData,
    isLoading,
    isError,
    canCheckin,
    checkin: checkinMutation.mutate,
    isCheckingIn: checkinMutation.isPending,
    checkinResult: checkinMutation.data,
    checkinError: checkinMutation.error,
  };
}

// ============================================================================
// Main Component
// ============================================================================

export default function DailyCheckin() {
  const checkinHook = useCheckinData();
  const {
    checkinData,
    isLoading,
    canCheckin,
    checkin,
    isCheckingIn,
    checkinResult,
  } = checkinHook;
  // Extract isError with fallback to prevent reference errors
  const isError = checkinHook.isError || false;

  const [showReward, setShowReward] = useState(false);

  const currentStreak = checkinData?.checkin?.streak || 0;
  const dayInCycle = ((currentStreak) % 7) + 1;

  // Handle checkin success
  useEffect(() => {
    if (checkinResult) {
      setShowReward(true);
      
      // Trigger confetti for milestones
      if (checkinResult.milestone) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#E62020', '#00D9FF', '#39FF14', '#B026FF'],
        });
      }

      toast.success(`+${checkinResult.xpEarned} XP earned!`);
    }
  }, [checkinResult]);

  const handleCheckin = () => {
    if (canCheckin && !isCheckingIn) {
      checkin();
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 p-6 animate-pulse">
        <div className="h-8 bg-white/10 rounded w-1/2 mb-4" />
        <div className="flex gap-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="w-10 h-10 bg-white/10 rounded" />
          ))}
        </div>
      </div>
    );
  }

  // Hide component if tables don't exist (feature not enabled)
  if (!checkinData || isError) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-6 relative overflow-hidden"
      >
        {/* Background glow */}
        {currentStreak > 0 && (
          <div 
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30"
            style={{ 
              background: currentStreak >= 7 
                ? 'linear-gradient(135deg, #E62020, #B026FF)' 
                : '#E62020' 
            }}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E62020]/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-[#E62020]" />
            </div>
            <div>
              <h3 className="font-bold">Daily Check-in</h3>
              <p className="text-xs text-white/50">
                {currentStreak > 0 
                  ? `${currentStreak} day streak! 🔥` 
                  : 'Start your streak today'}
              </p>
            </div>
          </div>

          {/* XP Balance */}
          <div className="text-right">
            <p className="text-xs text-white/50 uppercase">XP Balance</p>
            <p className="text-lg font-black text-[#39FF14]">
              {(checkinData?.xpBalance || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Streak Calendar */}
        <div className="flex gap-2 mb-6">
          {STREAK_REWARDS.map((reward, idx) => {
            const isPast = idx < dayInCycle - 1;
            const isCurrent = idx === dayInCycle - 1;
            const isLocked = idx > dayInCycle - 1;
            const Icon = reward.icon;

            return (
              <div
                key={reward.day}
                className={`relative flex-1 aspect-square flex flex-col items-center justify-center border transition-all ${
                  isPast
                    ? 'bg-[#39FF14]/20 border-[#39FF14]/50'
                    : isCurrent
                      ? canCheckin 
                        ? 'bg-[#E62020]/20 border-[#E62020] animate-pulse' 
                        : 'bg-[#39FF14]/20 border-[#39FF14]'
                      : 'bg-white/5 border-white/10'
                }`}
              >
                {isPast && (
                  <CheckCircle2 className="w-4 h-4 text-[#39FF14] absolute top-1 right-1" />
                )}
                
                {isLocked ? (
                  <Lock className="w-4 h-4 text-white/30" />
                ) : (
                  <Icon 
                    className={`w-4 h-4 ${
                      isPast || (!canCheckin && isCurrent)
                        ? 'text-[#39FF14]' 
                        : isCurrent 
                          ? 'text-[#E62020]' 
                          : 'text-white/50'
                    }`} 
                  />
                )}
                
                <span className={`text-[10px] mt-1 ${
                  isLocked ? 'text-white/30' : isPast ? 'text-[#39FF14]' : 'text-white/60'
                }`}>
                  +{reward.xp}
                </span>

                {reward.milestone && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#FFD700] rounded-full" />
                )}
              </div>
            );
          })}
        </div>

        {/* Check-in Button */}
        <Button
          onClick={handleCheckin}
          disabled={!canCheckin || isCheckingIn}
          className={`w-full font-black uppercase py-5 transition-all ${
            canCheckin
              ? 'bg-[#E62020] hover:bg-[#E62020]/80 text-black'
              : 'bg-white/10 text-white/40'
          }`}
        >
          {isCheckingIn ? (
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 animate-spin" />
              Claiming...
            </span>
          ) : canCheckin ? (
            <span className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Claim Today's Reward
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Come Back Tomorrow
            </span>
          )}
        </Button>

        {/* Next milestone */}
        {currentStreak > 0 && currentStreak < 365 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-white/40">
              {(() => {
                const milestones = Object.keys(MILESTONE_BONUSES).map(Number).sort((a, b) => a - b);
                const next = milestones.find(m => m > currentStreak);
                if (next) {
                  const daysLeft = next - currentStreak;
                  return `${daysLeft} day${daysLeft !== 1 ? 's' : ''} until ${MILESTONE_BONUSES[next].badge}`;
                }
                return 'Max streak achieved! 🏆';
              })()}
            </p>
          </div>
        )}
      </motion.div>

      {/* Reward Modal */}
      <AnimatePresence>
        {showReward && checkinResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowReward(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-black border-2 border-[#E62020] p-8 max-w-sm w-full text-center"
              onClick={e => e.stopPropagation()}
            >
              <motion.div
                initial={{ rotate: -10, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
              >
                {checkinResult.milestone ? (
                  <Trophy className="w-16 h-16 mx-auto text-[#FFD700] mb-4" />
                ) : (
                  <Flame className="w-16 h-16 mx-auto text-[#E62020] mb-4" />
                )}
              </motion.div>

              <h2 className="text-2xl font-black uppercase mb-2">
                {checkinResult.milestone ? 'Milestone!' : 'Check-in Complete!'}
              </h2>

              <p className="text-4xl font-black text-[#39FF14] mb-4">
                +{checkinResult.xpEarned} XP
              </p>

              <p className="text-white/60 mb-6">
                {checkinResult.streak} day streak! Keep it up!
              </p>

              {checkinResult.milestone && (
                <div 
                  className="inline-block px-4 py-2 mb-6 font-bold text-sm"
                  style={{ 
                    backgroundColor: `${checkinResult.milestone.color}20`,
                    color: checkinResult.milestone.color,
                    border: `1px solid ${checkinResult.milestone.color}`,
                  }}
                >
                  🏆 {checkinResult.milestone.badge} Unlocked!
                </div>
              )}

              <Button
                onClick={() => setShowReward(false)}
                className="w-full bg-[#E62020] text-black font-black uppercase"
              >
                Awesome!
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
