import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Sparkles, Flame, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const STREAK_MILESTONES = {
  7: { label: '7 Days', color: '#FFEB3B', bonus: 50 },
  14: { label: '2 Weeks', color: '#FF6B35', bonus: 100 },
  30: { label: '1 Month', color: '#B026FF', bonus: 200 },
  60: { label: '2 Months', color: '#FF1493', bonus: 500 },
  100: { label: '100 Days!', color: '#00D9FF', bonus: 1000 },
};

export default function DailyCheckin({ currentUser, onCheckinComplete }) {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkinData, setCheckinData] = useState(null);

  const handleCheckin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/daily-checkin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser?.session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.alreadyCheckedIn) {
        toast.info('Already checked in today!');
        setIsCheckedIn(true);
        setCheckinData(data.checkin);
        return;
      }

      if (data.success && data.checkin) {
        setIsCheckedIn(true);
        setCheckinData(data.checkin);
        
        // Trigger confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FF1493', '#00D9FF', '#FFEB3B', '#B026FF'],
        });

        // Show success message
        const message = data.checkin.milestone 
          ? `🎉 ${data.checkin.milestone} day streak! +${data.checkin.xp_reward} XP`
          : `+${data.checkin.xp_reward} XP earned!`;
        
        toast.success(message, {
          description: `Streak: ${data.checkin.streak} days`,
        });

        // Callback to update parent
        if (onCheckinComplete) {
          onCheckinComplete(data.checkin);
        }
      } else {
        toast.error(data.message || 'Failed to check in. Please try again.');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error('Failed to check in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getNextMilestone = (currentStreak) => {
    const milestones = Object.keys(STREAK_MILESTONES).map(Number).sort((a, b) => a - b);
    return milestones.find(m => m > (currentStreak || 0));
  };

  const nextMilestone = getNextMilestone(checkinData?.streak);

  if (isCheckedIn) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-[#00D9FF]/20 to-[#B026FF]/20 border-2 border-[#00D9FF] rounded-xl p-6 mb-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#00D9FF] rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase">Checked In!</h3>
              <p className="text-xs text-white/60">Come back tomorrow</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full">
            <Flame className="w-4 h-4 text-[#FF6B35]" />
            <span className="font-black text-sm">{checkinData?.streak || 1} Day Streak</span>
          </div>
        </div>
        
        {checkinData && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/40 border border-white/10 rounded-lg p-3 text-center">
              <Sparkles className="w-5 h-5 text-[#FFEB3B] mx-auto mb-1" />
              <div className="text-2xl font-black text-[#FFEB3B]">+{checkinData.xp_reward}</div>
              <div className="text-[10px] text-white/60 uppercase tracking-wider">XP Earned</div>
            </div>
            {nextMilestone && (
              <div className="bg-black/40 border border-white/10 rounded-lg p-3 text-center">
                <Gift className="w-5 h-5 text-[#FF1493] mx-auto mb-1" />
                <div className="text-xl font-black text-[#FF1493]">{nextMilestone - (checkinData.streak || 1)}</div>
                <div className="text-[10px] text-white/60 uppercase tracking-wider">Days to Bonus</div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#FF1493]/20 to-[#FFEB3B]/20 border-2 border-[#FF1493] rounded-xl p-6 mb-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#FF1493] to-[#FFEB3B] rounded-full flex items-center justify-center">
            <Gift className="w-6 h-6 text-black" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase">Daily Check-in</h3>
            <p className="text-xs text-white/60">Claim your daily XP reward</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="bg-black/40 border border-white/10 rounded-lg p-3">
          <div className="text-xs text-white/60 uppercase tracking-wider mb-2">Rewards</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Day 1-3</span>
              <span className="font-black text-[#FFEB3B]">10-20 XP</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">7-Day Streak</span>
              <span className="font-black text-[#FF6B35]">+50 XP Bonus</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">30-Day Streak</span>
              <span className="font-black text-[#B026FF]">+200 XP Bonus</span>
            </div>
          </div>
        </div>
      </div>

      <Button
        onClick={handleCheckin}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-[#FF1493] to-[#FFEB3B] hover:opacity-90 text-black font-black uppercase tracking-wider"
      >
        {isLoading ? (
          'Checking in...'
        ) : (
          <>
            <Gift className="w-4 h-4 mr-2" />
            Claim Daily Reward
          </>
        )}
      </Button>
    </motion.div>
  );
}
