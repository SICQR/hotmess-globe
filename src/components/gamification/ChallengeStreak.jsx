import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Zap, Trophy, Calendar, Target, Star, TrendingUp, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Streak milestone configurations
const MILESTONES = [
  { days: 3, reward: 50, label: '3 Day', icon: Flame },
  { days: 7, reward: 150, label: 'Week', icon: Star },
  { days: 14, reward: 300, label: '2 Weeks', icon: Trophy },
  { days: 30, reward: 500, label: 'Month', icon: Gift },
  { days: 60, reward: 1000, label: '2 Months', icon: TrendingUp },
  { days: 100, reward: 2000, label: '100 Days', icon: Zap },
];

// Single day indicator
function DayIndicator({ day, isCompleted, isToday, isFuture }) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: day * 0.02, type: "spring" }}
      className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all",
        isCompleted && "bg-[#FF1493] text-black",
        isToday && !isCompleted && "bg-[#FFEB3B] text-black border-2 border-white",
        isFuture && "bg-white/5 text-white/30",
        !isCompleted && !isToday && !isFuture && "bg-white/10 text-white/50"
      )}
    >
      {isCompleted ? (
        <Flame className="w-4 h-4" />
      ) : (
        day
      )}
    </motion.div>
  );
}

// Streak calendar view
function StreakCalendar({ currentStreak, completedDays = [], daysToShow = 7 }) {
  const today = new Date();
  const days = [];
  
  for (let i = daysToShow - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: date.getDate(),
      isToday: i === 0,
      isCompleted: completedDays.includes(dateStr),
    });
  }

  return (
    <div className="flex justify-between gap-1">
      {days.map((day, idx) => (
        <div key={day.date} className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-white/40 uppercase">{day.dayOfWeek}</span>
          <DayIndicator
            day={day.dayNum}
            isCompleted={day.isCompleted}
            isToday={day.isToday}
            isFuture={false}
          />
        </div>
      ))}
    </div>
  );
}

// Streak progress bar
function StreakProgress({ currentStreak, nextMilestone }) {
  if (!nextMilestone) return null;
  
  const prevMilestone = MILESTONES.filter(m => m.days <= currentStreak).pop();
  const startDays = prevMilestone?.days || 0;
  const endDays = nextMilestone.days;
  const progress = ((currentStreak - startDays) / (endDays - startDays)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-white/60">Progress to {nextMilestone.label}</span>
        <span className="text-[#FFEB3B] font-bold">{currentStreak}/{nextMilestone.days} days</span>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-[#FF1493] via-[#FFEB3B] to-[#39FF14] rounded-full"
        />
      </div>
      <div className="flex justify-between text-xs text-white/40">
        <span>{currentStreak - startDays} days done</span>
        <span>{nextMilestone.days - currentStreak} days left</span>
      </div>
    </div>
  );
}

// Milestone badge
function MilestoneBadge({ milestone, isUnlocked, isNext }) {
  const Icon = milestone.icon;
  
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={cn(
        "relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
        isUnlocked && "bg-gradient-to-br from-[#FF1493]/20 to-[#FFEB3B]/20 border border-[#FFEB3B]",
        isNext && !isUnlocked && "bg-white/10 border-2 border-dashed border-[#FF1493]",
        !isUnlocked && !isNext && "bg-white/5 border border-white/10 opacity-50"
      )}
    >
      <div 
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          isUnlocked 
            ? "bg-gradient-to-br from-[#FF1493] to-[#FFEB3B]" 
            : "bg-white/10"
        )}
      >
        <Icon 
          className={cn(
            "w-6 h-6",
            isUnlocked ? "text-white" : "text-white/40"
          )} 
        />
      </div>
      <div className="text-center">
        <p className="font-bold text-xs">{milestone.label}</p>
        <p className="text-[10px] text-white/40">{milestone.days} days</p>
      </div>
      {isUnlocked && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-[#39FF14] rounded-full flex items-center justify-center"
        >
          <Zap className="w-3 h-3 text-black" />
        </motion.div>
      )}
      {isNext && !isUnlocked && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[#FF1493] text-black text-[8px] font-bold uppercase rounded">
          Next
        </div>
      )}
    </motion.div>
  );
}

// Main challenge streak component
export default function ChallengeStreak({
  currentStreak = 0,
  longestStreak = 0,
  completedDays = [],
  totalXPEarned = 0,
  onClaimReward,
  className,
}) {
  const unlockedMilestones = MILESTONES.filter(m => currentStreak >= m.days);
  const nextMilestone = MILESTONES.find(m => m.days > currentStreak);
  const isMilestoneDay = MILESTONES.some(m => m.days === currentStreak);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main streak display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#FF1493]/20 via-transparent to-[#FFEB3B]/20 border-2 border-white p-6 text-center"
      >
        {/* Flame animation */}
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#FF1493] to-[#FFEB3B] mb-4"
        >
          <Flame className="w-10 h-10 text-white" />
        </motion.div>

        {/* Streak count */}
        <div className="mb-2">
          <motion.span
            key={currentStreak}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-5xl font-black bg-gradient-to-r from-[#FF1493] via-[#FFEB3B] to-[#FF1493] text-transparent bg-clip-text"
          >
            {currentStreak}
          </motion.span>
          <span className="text-2xl font-black text-white/60 ml-2">Day{currentStreak !== 1 ? 's' : ''}</span>
        </div>

        <p className="text-sm text-white/60 uppercase tracking-wider font-bold">
          Current Streak
        </p>

        {/* Milestone reached celebration */}
        {isMilestoneDay && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-[#FFEB3B]/20 border border-[#FFEB3B] rounded-lg"
          >
            <div className="flex items-center justify-center gap-2 text-[#FFEB3B]">
              <Trophy className="w-5 h-5" />
              <span className="font-bold">Milestone Reached!</span>
              <Trophy className="w-5 h-5" />
            </div>
            <p className="text-xs text-white/60 mt-1">
              You've unlocked a {MILESTONES.find(m => m.days === currentStreak)?.label} streak reward!
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 border border-white/10 p-4 text-center">
          <Trophy className="w-5 h-5 mx-auto mb-1 text-[#FFEB3B]" />
          <p className="text-xl font-black text-[#FFEB3B]">{longestStreak}</p>
          <p className="text-[10px] text-white/40 uppercase">Longest</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-4 text-center">
          <Calendar className="w-5 h-5 mx-auto mb-1 text-[#00D9FF]" />
          <p className="text-xl font-black text-[#00D9FF]">{completedDays.length}</p>
          <p className="text-[10px] text-white/40 uppercase">Total Days</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-4 text-center">
          <Zap className="w-5 h-5 mx-auto mb-1 text-[#39FF14]" />
          <p className="text-xl font-black text-[#39FF14]">{totalXPEarned}</p>
          <p className="text-[10px] text-white/40 uppercase">XP Earned</p>
        </div>
      </div>

      {/* Weekly calendar */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-[#00D9FF]" />
          <h3 className="font-bold text-sm uppercase">This Week</h3>
        </div>
        <StreakCalendar 
          currentStreak={currentStreak} 
          completedDays={completedDays}
          daysToShow={7}
        />
      </div>

      {/* Progress to next milestone */}
      {nextMilestone && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-[#FF1493]" />
            <h3 className="font-bold text-sm uppercase">Next Milestone</h3>
          </div>
          <StreakProgress currentStreak={currentStreak} nextMilestone={nextMilestone} />
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-white/40">Reward</span>
            <span className="text-[#FFEB3B] font-bold">+{nextMilestone.reward} XP</span>
          </div>
        </div>
      )}

      {/* Milestones */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-[#FFEB3B]" />
          <h3 className="font-bold text-sm uppercase">Milestones</h3>
          <span className="text-xs text-white/40">
            ({unlockedMilestones.length}/{MILESTONES.length})
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {MILESTONES.map((milestone) => (
            <MilestoneBadge
              key={milestone.days}
              milestone={milestone}
              isUnlocked={currentStreak >= milestone.days}
              isNext={milestone.days === nextMilestone?.days}
            />
          ))}
        </div>
      </div>

      {/* Claim reward button (if milestone reached) */}
      {isMilestoneDay && onClaimReward && (
        <Button
          onClick={onClaimReward}
          variant="hot"
          className="w-full font-black uppercase tracking-wider text-lg py-6"
        >
          <Gift className="w-5 h-5 mr-2" />
          Claim Streak Reward
        </Button>
      )}
    </div>
  );
}

// Compact streak display for headers/badges
export function StreakBadge({ streak, className }) {
  if (streak <= 0) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full",
        "bg-gradient-to-r from-[#FF1493]/20 to-[#FFEB3B]/20 border border-[#FF1493]/50",
        className
      )}
    >
      <Flame className="w-3 h-3 text-[#FF1493]" />
      <span className="text-xs font-bold text-[#FFEB3B]">{streak}</span>
    </motion.div>
  );
}
