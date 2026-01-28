/**
 * EngagementWidgets - Retention & Gamification Components
 * 
 * Widgets to drive user engagement and retention.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Gift, Trophy, Star, Zap, Crown, 
  Calendar, Target, TrendingUp, Award, Users, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RETENTION_MECHANICS, MEMBERSHIP_TIERS } from '@/lib/revenue';

/**
 * Daily Check-in Widget
 */
export function DailyCheckIn({ 
  currentStreak = 0, 
  lastCheckIn,
  onCheckIn,
  className = '' 
}) {
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [claimed, setClaimed] = useState(false);
  
  // Calculate if user can check in
  useEffect(() => {
    if (!lastCheckIn) {
      setCanCheckIn(true);
      return;
    }
    
    const lastDate = new Date(lastCheckIn).toDateString();
    const today = new Date().toDateString();
    setCanCheckIn(lastDate !== today);
  }, [lastCheckIn]);
  
  // Get XP reward for current streak
  const getReward = () => {
    const rewards = RETENTION_MECHANICS.dailyCheckIn.xpRewards;
    const day = currentStreak + 1;
    
    if (rewards[`day${day}`]) return rewards[`day${day}`];
    if (day >= 365) return rewards.day365;
    if (day >= 90) return rewards.day90;
    if (day >= 30) return rewards.day30;
    if (day >= 14) return rewards.day14;
    if (day >= 7) return Math.floor(day / 7) * rewards.day7;
    
    return 10 + (day * 5); // Default: 10 + 5 per day
  };
  
  const handleCheckIn = () => {
    setClaimed(true);
    onCheckIn?.();
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-[#FF1493]/20 to-[#B026FF]/20 border border-[#FF1493]/30 rounded-2xl p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF1493] flex items-center justify-center">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm text-white/60 uppercase tracking-wider">Daily Streak</div>
            <div className="text-2xl font-black text-white">{currentStreak} Days</div>
          </div>
        </div>
        
        {/* Streak badge */}
        {currentStreak >= 7 && (
          <div className="px-3 py-1 bg-[#FFD700] text-black text-xs font-black rounded-full">
            🔥 ON FIRE
          </div>
        )}
      </div>
      
      {/* Check-in button */}
      <AnimatePresence mode="wait">
        {canCheckIn && !claimed ? (
          <motion.div
            key="can-claim"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Button
              onClick={handleCheckIn}
              className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-white font-black text-lg py-6"
            >
              <Gift className="w-5 h-5 mr-2" />
              CLAIM +{getReward()} XP
            </Button>
          </motion.div>
        ) : claimed ? (
          <motion.div
            key="claimed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <div className="text-4xl mb-2">🎉</div>
            <div className="text-[#39FF14] font-black">+{getReward()} XP CLAIMED!</div>
            <div className="text-white/60 text-sm mt-1">Come back tomorrow</div>
          </motion.div>
        ) : (
          <motion.div
            key="already-claimed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4"
          >
            <div className="text-white/40 text-sm">Already claimed today</div>
            <div className="text-white/60 text-xs mt-1">Next check-in available tomorrow</div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Next milestone */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Next bonus:</span>
          <span className="text-[#FFD700] font-bold">Day 7 → +100 XP</span>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * XP Progress Widget
 */
export function XPProgress({ 
  currentXP = 0, 
  membershipTier = 'free',
  className = '' 
}) {
  const xpPerLevel = RETENTION_MECHANICS.xpSystem.xpPerLevel;
  const currentLevel = Math.floor(currentXP / xpPerLevel);
  const xpInLevel = currentXP % xpPerLevel;
  const progress = (xpInLevel / xpPerLevel) * 100;
  const multiplier = MEMBERSHIP_TIERS[membershipTier.toUpperCase()]?.limits?.xpMultiplier || 1;
  
  // Find next unlock
  const levelUnlocks = RETENTION_MECHANICS.xpSystem.levelUnlocks;
  const nextUnlockLevel = Object.keys(levelUnlocks)
    .map(Number)
    .find(level => level > currentLevel);
  const nextUnlock = nextUnlockLevel ? levelUnlocks[nextUnlockLevel] : null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/5 border border-white/10 rounded-2xl p-6 ${className}`}
    >
      {/* Level display */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFD700] to-[#FF6B35] flex items-center justify-center">
            <span className="text-xl font-black text-black">{currentLevel}</span>
          </div>
          <div>
            <div className="text-sm text-white/60 uppercase tracking-wider">Level</div>
            <div className="text-xl font-black text-white">{currentXP.toLocaleString()} XP</div>
          </div>
        </div>
        
        {/* Multiplier badge */}
        {multiplier > 1 && (
          <div className="px-3 py-1 bg-[#FF1493] text-white text-xs font-black rounded-full">
            {multiplier}x XP
          </div>
        )}
      </div>
      
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-white/60 mb-2">
          <span>Level {currentLevel}</span>
          <span>Level {currentLevel + 1}</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-[#FFD700] to-[#FF6B35]"
          />
        </div>
        <div className="text-right text-xs text-white/40 mt-1">
          {xpInLevel.toLocaleString()} / {xpPerLevel.toLocaleString()} XP
        </div>
      </div>
      
      {/* Next unlock */}
      {nextUnlock && (
        <div className="p-3 bg-white/5 rounded-xl">
          <div className="text-xs text-white/60 uppercase tracking-wider mb-1">
            Level {nextUnlockLevel} Unlocks:
          </div>
          <div className="flex flex-wrap gap-2">
            {nextUnlock.map((unlock, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-[#B026FF]/20 text-[#B026FF] text-xs font-bold rounded"
              >
                {unlock}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Active Challenges Widget
 */
export function ActiveChallenges({ 
  challenges = [],
  className = '' 
}) {
  const sampleChallenges = challenges.length > 0 ? challenges : [
    { id: 1, title: 'Social Butterfly', description: 'Message 10 people', progress: 7, target: 10, xp: 250, type: 'weekly' },
    { id: 2, title: 'Explorer', description: 'Scan 5 beacons', progress: 2, target: 5, xp: 150, type: 'weekly' },
    { id: 3, title: 'Night Owl', description: 'Go Live 3 times', progress: 1, target: 3, xp: 200, type: 'weekly' },
  ];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/5 border border-white/10 rounded-2xl p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#FFD700]" />
          <span className="font-black uppercase text-white">Active Challenges</span>
        </div>
        <span className="text-xs text-white/40">Resets Monday</span>
      </div>
      
      <div className="space-y-4">
        {sampleChallenges.map((challenge) => {
          const progress = (challenge.progress / challenge.target) * 100;
          const isComplete = challenge.progress >= challenge.target;
          
          return (
            <div key={challenge.id} className="relative">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold text-white">{challenge.title}</div>
                  <div className="text-xs text-white/60">{challenge.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-[#FFD700] font-black">+{challenge.xp} XP</div>
                  <div className="text-xs text-white/40">
                    {challenge.progress}/{challenge.target}
                  </div>
                </div>
              </div>
              
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className={`h-full ${isComplete ? 'bg-[#39FF14]' : 'bg-[#B026FF]'}`}
                />
              </div>
              
              {isComplete && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -right-2 -top-2 w-6 h-6 bg-[#39FF14] rounded-full flex items-center justify-center"
                >
                  <span className="text-xs">✓</span>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
      
      <Button
        variant="outline"
        className="w-full mt-4 border-white/20 text-white"
      >
        View All Challenges
      </Button>
    </motion.div>
  );
}

/**
 * Referral Progress Widget
 */
export function ReferralProgress({ 
  referralCount = 0,
  referralCode = 'HOTMESS123',
  className = '' 
}) {
  const tiers = RETENTION_MECHANICS.referrals.tiers;
  
  // Find current and next tier
  const tierEntries = Object.entries(tiers);
  const currentTierIdx = tierEntries.findIndex(([_, t]) => referralCount < t.referrals);
  const currentTier = currentTierIdx > 0 ? tierEntries[currentTierIdx - 1] : null;
  const nextTier = tierEntries[currentTierIdx] || tierEntries[tierEntries.length - 1];
  
  const progress = nextTier ? (referralCount / nextTier[1].referrals) * 100 : 100;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-[#B026FF]/20 to-[#FF1493]/20 border border-[#B026FF]/30 rounded-2xl p-6 ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-[#B026FF]" />
        <span className="font-black uppercase text-white">Referral Program</span>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-white/5 rounded-xl">
          <div className="text-2xl font-black text-white">{referralCount}</div>
          <div className="text-xs text-white/60">Friends Invited</div>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-xl">
          <div className="text-2xl font-black text-[#FFD700]">{referralCount * 500}</div>
          <div className="text-xs text-white/60">XP Earned</div>
        </div>
      </div>
      
      {/* Progress to next tier */}
      {nextTier && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-white/60 mb-2">
            <span>{currentTier?.[0]?.toUpperCase() || 'START'}</span>
            <span>{nextTier[0].toUpperCase()}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              className="h-full bg-gradient-to-r from-[#B026FF] to-[#FF1493]"
            />
          </div>
          <div className="text-center text-xs text-white/40 mt-2">
            {nextTier[1].referrals - referralCount} more for {nextTier[1].reward}
          </div>
        </div>
      )}
      
      {/* Referral code */}
      <div className="p-3 bg-white/5 rounded-xl">
        <div className="text-xs text-white/60 mb-1">Your Code:</div>
        <div className="flex items-center justify-between">
          <code className="text-lg font-mono font-bold text-white">{referralCode}</code>
          <Button size="sm" className="bg-[#B026FF] hover:bg-[#B026FF]/90 text-white">
            Copy
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Upgrade Prompt Widget
 */
export function UpgradePrompt({ 
  trigger,
  currentTier = 'free',
  targetTier = 'plus',
  className = '' 
}) {
  const tier = MEMBERSHIP_TIERS[targetTier.toUpperCase()];
  if (!tier) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-[${tier.color}]/20 to-black border border-[${tier.color}]/30 rounded-2xl p-6 ${className}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: tier.color }}
        >
          <Crown className="w-5 h-5 text-black" />
        </div>
        <div>
          <div className="font-black uppercase text-white">{tier.name}</div>
          <div className="text-sm text-white/60">{tier.priceDisplay}</div>
        </div>
      </div>
      
      {trigger && (
        <p className="text-white/80 mb-4">{trigger}</p>
      )}
      
      <div className="space-y-2 mb-4">
        {tier.features.slice(0, 4).map((feature, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <span style={{ color: tier.color }}>✓</span>
            <span className="text-white/80">{feature}</span>
          </div>
        ))}
      </div>
      
      <Button
        className="w-full font-black"
        style={{ backgroundColor: tier.color, color: tier.color === '#FFD700' ? '#000' : '#FFF' }}
      >
        UPGRADE TO {tier.name}
      </Button>
    </motion.div>
  );
}

export default {
  DailyCheckIn,
  XPProgress,
  ActiveChallenges,
  ReferralProgress,
  UpgradePrompt,
};
