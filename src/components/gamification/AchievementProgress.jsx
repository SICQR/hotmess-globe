import React from 'react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Lock, Check } from 'lucide-react';

export default function AchievementProgress({ 
  achievement, 
  currentProgress = 0, 
  maxProgress = 100,
  isCompleted = false,
  isLocked = false
}) {
  const progressPercentage = Math.min((currentProgress / maxProgress) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`
        relative p-4 border-2 transition-all
        ${isCompleted ? 'border-[#39FF14] bg-[#39FF14]/10' : 'border-white/20 bg-black/40'}
        ${isLocked ? 'opacity-50' : 'hover:border-[#FF1493]'}
      `}
    >
      {isLocked && (
        <div className="absolute top-4 right-4">
          <Lock className="w-5 h-5 text-white/40" />
        </div>
      )}

      {isCompleted && (
        <div className="absolute top-4 right-4">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.6 }}
          >
            <Check className="w-6 h-6 text-[#39FF14]" />
          </motion.div>
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-white mb-1">
            {achievement.title || achievement.name}
          </h3>
          <p className="text-sm text-white/60 mb-3">
            {achievement.description}
          </p>
          
          {!isCompleted && !isLocked && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/80">
                  Progress: {currentProgress} / {maxProgress}
                </span>
                <span className="text-[#00D9FF] font-bold">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress 
                value={progressPercentage} 
                className="h-2"
              />
            </div>
          )}

          {isCompleted && (
            <div className="flex items-center gap-2 text-sm text-[#39FF14] font-bold">
              <Check className="w-4 h-4" />
              <span>COMPLETED</span>
            </div>
          )}

          {isLocked && (
            <div className="flex items-center gap-2 text-sm text-white/40 font-bold">
              <Lock className="w-4 h-4" />
              <span>LOCKED</span>
            </div>
          )}

          {achievement.reward_xp && (
            <div className="mt-2 text-xs text-[#FFEB3B] font-bold">
              +{achievement.reward_xp} XP
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
