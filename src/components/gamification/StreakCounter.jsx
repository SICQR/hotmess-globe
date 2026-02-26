import React, { useEffect, useState } from 'react';
import { Flame, Zap } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';

/**
 * Fetch user's current streak from user_streaks table
 */
async function fetchUserStreak(userId) {
  if (!userId) return null;
  
  try {
    const { data, error } = await supabase
      .from('user_streaks')
      .select('current_streak, longest_streak, last_activity_date')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    
    // Check if streak is still valid (activity within last 24-48 hours depending on grace period)
    const lastActivity = new Date(data.last_activity_date);
    const hoursSince = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
    
    // Grace period: 48 hours
    if (hoursSince > 48) {
      return { current: 0, longest: data.longest_streak, isExpiring: false };
    }
    
    // Warning if about to expire (last 6 hours of grace period)
    const isExpiring = hoursSince > 42;
    
    return {
      current: data.current_streak || 0,
      longest: data.longest_streak || 0,
      isExpiring,
    };
  } catch (error) {
    console.warn('Failed to fetch streak:', error);
    return null;
  }
}

/**
 * Get streak tier for styling
 */
function getStreakTier(streak) {
  if (streak >= 100) return { label: 'Legend', color: '#FFD700', icon: '👑' };
  if (streak >= 30) return { label: 'Fire', color: '#FF1493', icon: '🔥' };
  if (streak >= 7) return { label: 'Hot', color: '#f97316', icon: '⚡' };
  if (streak >= 3) return { label: 'Warming', color: '#00D9FF', icon: '✨' };
  return { label: 'Start', color: '#64748b', icon: '💫' };
}

/**
 * Compact streak counter for header
 */
export function StreakBadge({ userId, className = '' }) {
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchUserStreak(userId).then(setStreak);
    }
  }, [userId]);

  if (!streak || streak.current === 0) return null;

  const tier = getStreakTier(streak.current);

  return (
    <div
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
        ${streak.isExpiring ? 'animate-pulse' : ''}
        ${className}
      `}
      style={{
        backgroundColor: `${tier.color}20`,
        color: tier.color,
        border: `1px solid ${tier.color}40`,
      }}
      title={streak.isExpiring ? 'Streak expiring soon! Open the app to keep it' : `${streak.current} day streak`}
    >
      <Flame className="w-3 h-3" />
      <span>{streak.current}</span>
      {streak.isExpiring && <span className="text-[8px] opacity-75">!</span>}
    </div>
  );
}

/**
 * Detailed streak display for profile/settings
 */
export function StreakDisplay({ userId, className = '' }) {
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      setLoading(true);
      fetchUserStreak(userId)
        .then(setStreak)
        .finally(() => setLoading(false));
    }
  }, [userId]);

  if (loading) {
    return (
      <div className={`animate-pulse bg-white/5 rounded-lg p-4 ${className}`}>
        <div className="h-4 bg-white/10 rounded w-24 mb-2" />
        <div className="h-8 bg-white/10 rounded w-16" />
      </div>
    );
  }

  const current = streak?.current || 0;
  const longest = streak?.longest || 0;
  const tier = getStreakTier(current);

  return (
    <div className={`bg-white/5 border border-white/10 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5" style={{ color: tier.color }} />
          <span className="text-xs font-bold uppercase tracking-wider text-white/60">
            Daily Streak
          </span>
        </div>
        {current > 0 && (
          <span 
            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
          >
            {tier.label}
          </span>
        )}
      </div>

      <div className="flex items-end gap-4">
        <div>
          <div 
            className="text-4xl font-black"
            style={{ color: tier.color }}
          >
            {current}
          </div>
          <div className="text-[10px] text-white/50 uppercase tracking-wider">
            {current === 1 ? 'Day' : 'Days'}
          </div>
        </div>

        {longest > 0 && (
          <div className="text-white/40">
            <div className="text-sm font-bold">{longest}</div>
            <div className="text-[9px] uppercase tracking-wider">Best</div>
          </div>
        )}
      </div>

      {streak?.isExpiring && (
        <div className="mt-3 p-2 bg-orange-500/20 border border-orange-500/30 rounded text-[10px] text-orange-300">
          <Zap className="w-3 h-3 inline mr-1" />
          Your streak is about to expire! Stay active to keep it.
        </div>
      )}

      {current === 0 && (
        <div className="mt-3 text-[11px] text-white/50">
          Check in daily to build your streak and earn XP bonuses!
        </div>
      )}

      {/* Streak milestones */}
      {current > 0 && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="text-[9px] uppercase tracking-wider text-white/40 mb-2">
            Next Milestone
          </div>
          <div className="flex items-center gap-2">
            {[3, 7, 30, 100].map((milestone) => {
              const achieved = current >= milestone;
              const isNext = !achieved && current < milestone;
              return (
                <div
                  key={milestone}
                  className={`
                    flex-1 text-center py-1.5 rounded text-[10px] font-bold
                    ${achieved ? 'bg-green-500/20 text-green-400' : ''}
                    ${isNext ? 'bg-white/10 text-white border border-white/20' : ''}
                    ${!achieved && !isNext ? 'bg-white/5 text-white/30' : ''}
                  `}
                >
                  {milestone}d
                  {achieved && <span className="ml-1">✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default StreakBadge;
