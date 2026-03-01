import React, { useState, useEffect } from 'react';
import { Flame, Gift, Sparkles, Check, Zap } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const getAccessToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

/**
 * Fetch check-in status
 */
async function fetchCheckinStatus() {
  try {
    const token = await getAccessToken();
    if (!token) return null;

    const res = await fetch('/api/daily-checkin', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Claim daily check-in
 */
async function claimCheckin() {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch('/api/daily-checkin', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Check-in failed');
  return data;
}

/**
 * Trigger celebration confetti
 */
function celebrate(isMilestone = false) {
  const count = isMilestone ? 200 : 100;
  const spread = isMilestone ? 100 : 70;
  
  confetti({
    particleCount: count,
    spread: spread,
    origin: { y: 0.6 },
    colors: ['#C8962C', '#C8962C', '#00D9FF', '#FFD700'],
  });
}

/**
 * Get streak tier styling
 */
function getStreakTier(streak) {
  if (streak >= 100) return { color: '#FFD700', bg: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-500/50' };
  if (streak >= 30) return { color: '#C8962C', bg: 'from-amber-500/20 to-rose-500/20', border: 'border-amber-500/50' };
  if (streak >= 7) return { color: '#f97316', bg: 'from-orange-500/20 to-red-500/20', border: 'border-orange-500/50' };
  return { color: '#00D9FF', bg: 'from-cyan-500/20 to-blue-500/20', border: 'border-cyan-500/50' };
}

/**
 * Daily Check-in Card Component
 */
export function DailyCheckinCard({ className = '', onCheckin }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);
  const [claimResult, setClaimResult] = useState(null);

  useEffect(() => {
    fetchCheckinStatus()
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  const handleClaim = async () => {
    if (claiming || !status?.canCheckIn) return;
    
    setClaiming(true);
    try {
      const result = await claimCheckin();
      setClaimResult(result);
      setJustClaimed(true);
      setStatus(prev => ({
        ...prev,
        canCheckIn: false,
        todayCheckedIn: true,
        currentStreak: result.currentStreak,
        longestStreak: result.longestStreak,
        nextReward: result.nextReward,
      }));
      
      celebrate(result.isMilestone);
      
      if (result.badgeAwarded) {
        toast.success(`${result.badgeAwarded.icon} Badge unlocked: ${result.badgeAwarded.name}!`);
      } else {
        toast.success(`+${result.xpAwarded} XP earned!`);
      }

      onCheckin?.(result);
    } catch (error) {
      toast.error(error.message || 'Check-in failed');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse bg-white/5 rounded-xl p-4 ${className}`}>
        <div className="h-4 bg-white/10 rounded w-32 mb-3" />
        <div className="h-12 bg-white/10 rounded mb-2" />
        <div className="h-8 bg-white/10 rounded w-24" />
      </div>
    );
  }

  if (!status) return null;

  const tier = getStreakTier(status.currentStreak);
  const canClaim = status.canCheckIn && !justClaimed;

  // Just claimed state - celebration UI
  if (justClaimed && claimResult) {
    return (
      <div className={`relative overflow-hidden rounded-xl border-2 ${tier.border} bg-gradient-to-br ${tier.bg} p-5 ${className}`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${tier.color}30` }}
            >
              <Check className="w-6 h-6" style={{ color: tier.color }} />
            </div>
            <div>
              <div className="text-lg font-black">Checked In!</div>
              <div className="text-sm text-white/60">
                +{claimResult.xpAwarded} XP earned
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5" style={{ color: tier.color }} />
              <span className="font-bold">{claimResult.currentStreak} Day Streak</span>
            </div>
            {claimResult.isMilestone && (
              <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-300 font-bold">
                🎉 MILESTONE!
              </span>
            )}
          </div>

          {claimResult.badgeAwarded && (
            <div className="mt-3 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-center">
              <span className="text-2xl">{claimResult.badgeAwarded.icon}</span>
              <div className="text-sm font-bold text-yellow-300 mt-1">
                {claimResult.badgeAwarded.name}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Already checked in today
  if (status.todayCheckedIn) {
    return (
      <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white/80">Checked in today</div>
              <div className="text-xs text-white/50">Come back tomorrow!</div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1" style={{ color: tier.color }}>
              <Flame className="w-4 h-4" />
              <span className="font-black">{status.currentStreak}</span>
            </div>
            <div className="text-[10px] text-white/40">day streak</div>
          </div>
        </div>
      </div>
    );
  }

  // Can check in - main CTA
  return (
    <div className={`relative overflow-hidden rounded-xl border-2 border-[#C8962C] bg-gradient-to-br from-[#C8962C]/20 to-[#C8962C]/20 p-5 ${className}`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#C8962C]/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#C8962C]/30 flex items-center justify-center animate-pulse">
            <Gift className="w-6 h-6 text-[#C8962C]" />
          </div>
          <div>
            <div className="text-lg font-black">Daily Check-in</div>
            <div className="text-sm text-white/60">
              Claim your daily reward!
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 p-3 bg-black/30 rounded-lg">
          <div>
            <div className="text-xs text-white/50 uppercase tracking-wider">Reward</div>
            <div className="flex items-center gap-1 text-yellow-400 font-black">
              <Sparkles className="w-4 h-4" />
              <span>+{status.nextReward} XP</span>
            </div>
          </div>
          {status.currentStreak > 0 && (
            <div className="text-right">
              <div className="text-xs text-white/50 uppercase tracking-wider">Streak</div>
              <div className="flex items-center gap-1 font-black" style={{ color: tier.color }}>
                <Flame className="w-4 h-4" />
                <span>{status.currentStreak} days</span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleClaim}
          disabled={claiming}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-[#C8962C] to-[#C8962C] text-white font-black uppercase tracking-wider text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {claiming ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Claiming...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Check In Now
            </>
          )}
        </button>

        {/* Streak preview */}
        {status.currentStreak > 0 && (
          <div className="mt-3 flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const isCompleted = day <= (status.currentStreak % 7 || 7);
              const isToday = day === ((status.currentStreak % 7) + 1) || (status.currentStreak % 7 === 0 && day === 1);
              return (
                <div
                  key={day}
                  className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
                    ${isCompleted ? 'bg-[#C8962C] text-white' : ''}
                    ${isToday && !status.todayCheckedIn ? 'bg-white/20 text-white border-2 border-[#C8962C] animate-pulse' : ''}
                    ${!isCompleted && !isToday ? 'bg-white/5 text-white/30' : ''}
                  `}
                >
                  {day}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact check-in button for header/nav
 */
export function DailyCheckinButton({ className = '' }) {
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    fetchCheckinStatus().then((status) => {
      if (status) {
        setCanCheckIn(status.canCheckIn);
        setStreak(status.currentStreak);
      }
    });
  }, []);

  if (!canCheckIn && streak === 0) return null;

  return (
    <button
      className={`
        relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider
        transition-all
        ${canCheckIn 
          ? 'bg-gradient-to-r from-[#C8962C] to-[#C8962C] text-white animate-pulse' 
          : 'bg-white/10 text-white/60'
        }
        ${className}
      `}
    >
      {canCheckIn ? (
        <>
          <Gift className="w-3 h-3" />
          <span>Claim</span>
        </>
      ) : (
        <>
          <Flame className="w-3 h-3 text-orange-400" />
          <span>{streak}</span>
        </>
      )}
    </button>
  );
}

export default DailyCheckinCard;
