/**
 * EngagementWidgets - Retention & Gamification Components
 * 
 * Widgets to drive user engagement and retention.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Gift, Trophy, Crown, Users
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
      className={`bg-gradient-to-br from-[#C8962C]/20 to-[#B026FF]/20 border border-[#C8962C]/30 rounded-2xl p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C8962C] flex items-center justify-center">
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
              className="w-full bg-[#C8962C] hover:bg-[#C8962C]/90 text-white font-black text-lg py-6"
            >
              <Gift className="w-5 h-5 mr-2" />
              CHECK IN
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
            <div className="text-[#39FF14] font-black">CHECKED IN!</div>
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
          <span className="text-white/60">Keep your streak going!</span>
        </div>
      </div>
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
    { id: 1, title: 'Social Butterfly', description: 'Message 10 people', progress: 7, target: 10, type: 'weekly' },
    { id: 2, title: 'Explorer', description: 'Scan 5 beacons', progress: 2, target: 5, type: 'weekly' },
    { id: 3, title: 'Night Owl', description: 'Go Live 3 times', progress: 1, target: 3, type: 'weekly' },
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
      className={`bg-gradient-to-br from-[#B026FF]/20 to-[#C8962C]/20 border border-[#B026FF]/30 rounded-2xl p-6 ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-[#B026FF]" />
        <span className="font-black uppercase text-white">Referral Program</span>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div className="text-center p-3 bg-white/5 rounded-xl">
          <div className="text-2xl font-black text-white">{referralCount}</div>
          <div className="text-xs text-white/60">Friends Invited</div>
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
              className="h-full bg-gradient-to-r from-[#B026FF] to-[#C8962C]"
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
  ActiveChallenges,
  ReferralProgress,
  UpgradePrompt,
};
