import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Zap, Star, Trophy, Sparkles, X, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';

// Reward types and their configurations
const REWARD_TYPES = {
  xp_bonus: {
    icon: Zap,
    title: 'Lucky Bonus!',
    color: '#FFEB3B',
    gradient: 'from-yellow-400 to-orange-500',
    getMessage: (amount) => `You found ${amount} bonus XP!`,
    confettiColors: ['#FFEB3B', '#FF1493', '#FFD700'],
  },
  streak_bonus: {
    icon: Star,
    title: 'Streak Reward!',
    color: '#FF1493',
    gradient: 'from-pink-500 to-purple-500',
    getMessage: (amount) => `Your streak earned you ${amount} XP!`,
    confettiColors: ['#FF1493', '#B026FF', '#00D9FF'],
  },
  achievement_teaser: {
    icon: Trophy,
    title: 'Almost There!',
    color: '#B026FF',
    gradient: 'from-purple-500 to-blue-500',
    getMessage: (name) => `You're close to unlocking: ${name}`,
    confettiColors: ['#B026FF', '#00D9FF', '#FFEB3B'],
  },
  mystery_gift: {
    icon: Gift,
    title: 'Mystery Gift!',
    color: '#00D9FF',
    gradient: 'from-cyan-400 to-blue-500',
    getMessage: () => 'You received a mysterious reward!',
    confettiColors: ['#00D9FF', '#FF1493', '#39FF14'],
  },
  daily_login: {
    icon: PartyPopper,
    title: 'Welcome Back!',
    color: '#39FF14',
    gradient: 'from-green-400 to-emerald-500',
    getMessage: (day) => `Day ${day} login bonus unlocked!`,
    confettiColors: ['#39FF14', '#FFEB3B', '#FF1493'],
  },
};

// Floating gift particles
const FloatingGift = ({ delay, color }) => (
  <motion.div
    className="absolute"
    style={{
      left: `${20 + Math.random() * 60}%`,
      top: `${20 + Math.random() * 60}%`,
    }}
    initial={{ opacity: 0, scale: 0, y: 50 }}
    animate={{
      opacity: [0, 1, 1, 0],
      scale: [0, 1.2, 1, 0.5],
      y: [50, 0, -30, -80],
      rotate: [0, 10, -10, 0],
    }}
    transition={{
      duration: 2.5,
      delay,
      ease: "easeOut",
    }}
  >
    <Gift className="w-6 h-6" style={{ color }} />
  </motion.div>
);

// Surprise reward modal
export default function SurpriseReward({
  isOpen,
  onClose,
  type = 'xp_bonus',
  value,
  details,
  onClaim,
}) {
  const [isClaimed, setIsClaimed] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  
  const config = REWARD_TYPES[type] || REWARD_TYPES.mystery_gift;
  const Icon = config.icon;

  useEffect(() => {
    if (isOpen && !isClaimed) {
      // Initial confetti burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: config.confettiColors,
        zIndex: 9999,
      });
    }
  }, [isOpen, isClaimed, config.confettiColors]);

  const handleClaim = useCallback(() => {
    setIsRevealing(true);
    
    // Celebration confetti
    const duration = 2000;
    const animationEnd = Date.now() + duration;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: config.confettiColors,
        zIndex: 9999,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: config.confettiColors,
        zIndex: 9999,
      });
    }, 50);

    setTimeout(() => {
      setIsClaimed(true);
      setIsRevealing(false);
      onClaim?.();
    }, 1000);
  }, [config.confettiColors, onClaim]);

  const handleClose = useCallback(() => {
    setIsClaimed(false);
    setIsRevealing(false);
    onClose?.();
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
            className="relative max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Floating gift particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 8 }).map((_, i) => (
                <FloatingGift 
                  key={i} 
                  delay={i * 0.2} 
                  color={config.color} 
                />
              ))}
            </div>

            {/* Main card */}
            <div className="relative bg-black border-4 border-white p-8 text-center overflow-hidden">
              {/* Animated background */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-20`}
                animate={{
                  opacity: [0.1, 0.3, 0.1],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Content */}
              <div className="relative z-10">
                {/* Header */}
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="mb-6"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5" style={{ color: config.color }} />
                    <span 
                      className="text-xs uppercase tracking-widest font-black"
                      style={{ color: config.color }}
                    >
                      Surprise!
                    </span>
                    <Sparkles className="w-5 h-5" style={{ color: config.color }} />
                  </div>
                </motion.div>

                {/* Gift box / Reward icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="relative mx-auto mb-6 w-28 h-28"
                >
                  {!isClaimed ? (
                    // Gift box
                    <motion.div
                      animate={isRevealing ? { 
                        scale: [1, 1.2, 0],
                        rotate: [0, 10, -10, 0],
                      } : {
                        y: [0, -5, 0],
                      }}
                      transition={isRevealing ? {
                        duration: 0.5,
                      } : {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className={`w-full h-full rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center border-4 border-white`}
                    >
                      <Gift className="w-14 h-14 text-white" />
                    </motion.div>
                  ) : (
                    // Revealed reward
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring" }}
                      className="w-full h-full rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${config.color}20`, borderColor: config.color }}
                    >
                      <Icon className="w-14 h-14" style={{ color: config.color }} />
                    </motion.div>
                  )}

                  {/* Pulsing ring */}
                  <motion.div
                    className="absolute inset-0 rounded-xl border-2"
                    style={{ borderColor: config.color }}
                    animate={{
                      scale: [1, 1.15, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-black uppercase tracking-tight mb-2"
                  style={{ color: config.color }}
                >
                  {config.title}
                </motion.h2>

                {/* Message */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-white/60 text-sm mb-6"
                >
                  {isClaimed 
                    ? config.getMessage(value)
                    : 'Tap to reveal your surprise!'
                  }
                </motion.p>

                {/* Value display (after claimed) */}
                {isClaimed && value && typeof value === 'number' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                    style={{ 
                      backgroundColor: `${config.color}20`,
                      borderColor: config.color,
                    }}
                  >
                    <Zap className="w-5 h-5" style={{ color: config.color }} />
                    <span className="text-xl font-black" style={{ color: config.color }}>
                      +{value} XP
                    </span>
                  </motion.div>
                )}

                {/* Action button */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {!isClaimed ? (
                    <Button
                      onClick={handleClaim}
                      disabled={isRevealing}
                      className={cn(
                        "w-full font-black uppercase tracking-wider text-lg py-6",
                        `bg-gradient-to-r ${config.gradient} text-white border-2 border-white`
                      )}
                    >
                      {isRevealing ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          <Gift className="w-6 h-6" />
                        </motion.div>
                      ) : (
                        <>
                          <Gift className="w-5 h-5 mr-2" />
                          Open Gift
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleClose}
                      variant="hot"
                      className="w-full font-black uppercase tracking-wider"
                    >
                      Awesome!
                    </Button>
                  )}
                </motion.div>

                {/* Additional details */}
                {details && isClaimed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-4 text-xs text-white/40"
                  >
                    {details}
                  </motion.p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for managing surprise rewards
export function useSurpriseRewards(options = {}) {
  const { 
    xpBonusChance = 0.05, // 5% chance on actions
    minBonus = 10,
    maxBonus = 100,
  } = options;

  const [activeReward, setActiveReward] = useState(null);

  // Check if user should get a surprise reward
  const checkForReward = useCallback((action = 'default') => {
    const roll = Math.random();
    
    if (roll < xpBonusChance) {
      const bonus = Math.floor(Math.random() * (maxBonus - minBonus + 1)) + minBonus;
      setActiveReward({
        type: 'xp_bonus',
        value: bonus,
        details: `Lucky reward from: ${action}`,
      });
      return bonus;
    }
    
    return 0;
  }, [xpBonusChance, minBonus, maxBonus]);

  // Trigger specific reward
  const showReward = useCallback((type, value, details) => {
    setActiveReward({ type, value, details });
  }, []);

  // Close reward modal
  const closeReward = useCallback(() => {
    setActiveReward(null);
  }, []);

  // Show daily login reward
  const showDailyLoginReward = useCallback((day, bonus) => {
    setActiveReward({
      type: 'daily_login',
      value: bonus,
      details: `Keep the streak going for bigger rewards!`,
    });
    return bonus;
  }, []);

  // Show streak reward
  const showStreakReward = useCallback((streakDays, bonus) => {
    setActiveReward({
      type: 'streak_bonus',
      value: bonus,
      details: `${streakDays} day streak! Amazing commitment!`,
    });
    return bonus;
  }, []);

  return {
    activeReward,
    checkForReward,
    showReward,
    closeReward,
    showDailyLoginReward,
    showStreakReward,
    RewardModal: () => (
      <SurpriseReward
        isOpen={!!activeReward}
        onClose={closeReward}
        onClaim={closeReward}
        type={activeReward?.type}
        value={activeReward?.value}
        details={activeReward?.details}
      />
    ),
  };
}
