import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Star, Gift, ChevronUp, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

const LEVEL_REWARDS = {
  5: { name: 'Chrome Tier', description: 'See who viewed your profile', color: '#C0C0C0' },
  10: { name: 'Gold Status', description: 'Exclusive badge + priority matching', color: '#FFD700' },
  15: { name: 'Platinum Access', description: 'Early event access + VIP features', color: '#E5E4E2' },
  20: { name: 'Diamond Elite', description: 'All premium features unlocked', color: '#B9F2FF' },
  25: { name: 'Night King', description: 'Legendary status + custom profile', color: '#FF1493' },
};

const CircularProgress = ({ progress, level }) => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-48 h-48">
      {/* Background circle */}
      <svg className="w-full h-full -rotate-90">
        <circle
          cx="96"
          cy="96"
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="12"
          fill="none"
        />
        <motion.circle
          cx="96"
          cy="96"
          r={radius}
          stroke="url(#gradient)"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
          style={{
            strokeDasharray: circumference,
          }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF1493" />
            <stop offset="50%" stopColor="#FFEB3B" />
            <stop offset="100%" stopColor="#00D9FF" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Level number in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.3 }}
          className="text-center"
        >
          <div className="text-xs text-white/40 uppercase tracking-wider font-bold">Level</div>
          <div className="text-5xl font-black bg-gradient-to-r from-[#FF1493] via-[#FFEB3B] to-[#00D9FF] text-transparent bg-clip-text">
            {level}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default function LevelUpModal({ 
  isOpen, 
  onClose, 
  newLevel, 
  previousLevel,
  currentXP,
  xpForNextLevel = 1000,
  autoClose = true,
  autoCloseDelay = 8000 
}) {
  const [showRewards, setShowRewards] = useState(false);
  
  const levelReward = LEVEL_REWARDS[newLevel];
  const progress = ((currentXP % 1000) / xpForNextLevel) * 100;

  useEffect(() => {
    if (isOpen) {
      // Massive celebration confetti
      const duration = 5000;
      const animationEnd = Date.now() + duration;
      
      const colors = ['#FF1493', '#FFEB3B', '#00D9FF', '#B026FF', '#39FF14'];

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        // Confetti from both sides
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
          zIndex: 9999,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
          zIndex: 9999,
        });
      }, 50);

      // Show rewards section after animation
      setTimeout(() => {
        setShowRewards(true);
      }, 1500);

      // Auto-close
      let timeout;
      if (autoClose) {
        timeout = setTimeout(() => {
          onClose?.();
        }, autoCloseDelay);
      }

      return () => {
        clearInterval(interval);
        if (timeout) clearTimeout(timeout);
      };
    } else {
      setShowRewards(false);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: 100 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="relative max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Main card */}
            <div className="relative bg-black border-4 border-[#FFEB3B] p-8 overflow-hidden">
              {/* Animated background */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-[#FF1493]/20 via-transparent to-[#00D9FF]/20"
                animate={{
                  backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />

              {/* Floating stars background */}
              {Array.from({ length: 10 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    opacity: [0.2, 0.8, 0.2],
                    scale: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                >
                  <Star className="w-3 h-3 text-[#FFEB3B]/40 fill-[#FFEB3B]/40" />
                </motion.div>
              ))}

              {/* Content */}
              <div className="relative z-10">
                {/* Header */}
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-center mb-6"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      <ChevronUp className="w-6 h-6 text-[#FFEB3B]" />
                    </motion.div>
                    <span className="text-sm uppercase tracking-widest text-[#FFEB3B] font-black">
                      Level Up!
                    </span>
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      <ChevronUp className="w-6 h-6 text-[#FFEB3B]" />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Level Progress Circle */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.3 }}
                  className="flex justify-center mb-6"
                >
                  <CircularProgress progress={progress} level={newLevel} />
                </motion.div>

                {/* Level transition */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center justify-center gap-4 mb-6"
                >
                  <div className="text-center">
                    <div className="text-xs text-white/40 uppercase">From</div>
                    <div className="text-2xl font-black text-white/60">LVL {previousLevel}</div>
                  </div>
                  <motion.div
                    animate={{ x: [0, 10, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <Zap className="w-8 h-8 text-[#FFEB3B] fill-[#FFEB3B]" />
                  </motion.div>
                  <div className="text-center">
                    <div className="text-xs text-[#FFEB3B] uppercase font-bold">To</div>
                    <div className="text-2xl font-black text-[#FFEB3B]">LVL {newLevel}</div>
                  </div>
                </motion.div>

                {/* Rewards Section */}
                <AnimatePresence>
                  {showRewards && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      {/* Special tier reward */}
                      {levelReward && (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="bg-gradient-to-r from-[#FF1493]/20 via-[#FFEB3B]/20 to-[#00D9FF]/20 border-2 border-[#FFEB3B] p-4 text-center"
                        >
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Trophy className="w-6 h-6" style={{ color: levelReward.color }} />
                            <span className="text-lg font-black uppercase" style={{ color: levelReward.color }}>
                              {levelReward.name} Unlocked!
                            </span>
                          </div>
                          <p className="text-sm text-white/60">{levelReward.description}</p>
                        </motion.div>
                      )}

                      {/* XP to next level */}
                      <div className="bg-white/5 border border-white/10 p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-[#00D9FF]" />
                          <span className="text-xs uppercase tracking-wider text-white/60">Next Level</span>
                        </div>
                        <div className="text-lg font-black">
                          <span className="text-[#FFEB3B]">{currentXP % 1000}</span>
                          <span className="text-white/40"> / {xpForNextLevel} XP</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="h-full bg-gradient-to-r from-[#FF1493] to-[#FFEB3B] rounded-full"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Button */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="mt-6"
                >
                  <Button
                    onClick={onClose}
                    variant="hot"
                    className="w-full font-black uppercase tracking-wider text-lg py-6"
                  >
                    <Gift className="w-5 h-5 mr-2" />
                    Continue the Grind
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
