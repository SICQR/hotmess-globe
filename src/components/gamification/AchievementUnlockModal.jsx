import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

const RARITY_CONFIG = {
  common: {
    color: '#9CA3AF',
    gradient: 'from-gray-400 to-gray-600',
    label: 'Common',
    particles: 50,
  },
  rare: {
    color: '#3B82F6',
    gradient: 'from-blue-400 to-blue-600',
    label: 'Rare',
    particles: 100,
  },
  epic: {
    color: '#A855F7',
    gradient: 'from-purple-400 to-purple-600',
    label: 'Epic',
    particles: 150,
  },
  legendary: {
    color: '#F59E0B',
    gradient: 'from-amber-400 to-orange-500',
    label: 'Legendary',
    particles: 200,
  },
};

const FloatingParticle = ({ delay, color }) => (
  <motion.div
    className="absolute w-2 h-2 rounded-full"
    style={{ backgroundColor: color }}
    initial={{ 
      opacity: 0, 
      scale: 0,
      x: 0,
      y: 0,
    }}
    animate={{ 
      opacity: [0, 1, 1, 0],
      scale: [0, 1, 1, 0],
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
    }}
    transition={{
      duration: 2,
      delay: delay,
      ease: "easeOut",
    }}
  />
);

export default function AchievementUnlockModal({ 
  isOpen, 
  onClose, 
  achievement,
  autoClose = true,
  autoCloseDelay = 5000 
}) {
  const [showParticles, setShowParticles] = useState(false);
  
  const rarity = achievement?.rarity || 'common';
  const config = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;

  useEffect(() => {
    if (isOpen && achievement) {
      // Trigger confetti
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = config.particles * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: [config.color, '#FF1493', '#FFEB3B', '#00D9FF'],
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: [config.color, '#FF1493', '#FFEB3B', '#00D9FF'],
        });
      }, 250);

      setShowParticles(true);

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
    }
  }, [isOpen, achievement, config.color, config.particles, autoClose, autoCloseDelay, onClose]);

  if (!achievement) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
            className="relative max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Floating particles */}
            {showParticles && (
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
                {Array.from({ length: 20 }).map((_, i) => (
                  <FloatingParticle 
                    key={i} 
                    delay={i * 0.1} 
                    color={config.color} 
                  />
                ))}
              </div>
            )}

            {/* Main card */}
            <div className="relative bg-black border-4 border-white p-8 text-center overflow-hidden">
              {/* Animated background glow */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-20`}
                animate={{
                  opacity: [0.1, 0.3, 0.1],
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
                  transition={{ delay: 0.2 }}
                  className="mb-6"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-[#FFEB3B]" />
                    <span className="text-xs uppercase tracking-widest text-[#FFEB3B] font-black">
                      Achievement Unlocked!
                    </span>
                    <Sparkles className="w-5 h-5 text-[#FFEB3B]" />
                  </div>
                </motion.div>

                {/* Achievement Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    type: "spring", 
                    damping: 10, 
                    stiffness: 200,
                    delay: 0.3 
                  }}
                  className="relative mx-auto mb-6 w-32 h-32"
                >
                  {/* Pulsing ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-4"
                    style={{ borderColor: config.color }}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.2, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  
                  {/* Main badge */}
                  <div 
                    className={`w-full h-full rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center border-4 border-white shadow-2xl`}
                  >
                    {achievement.icon ? (
                      <img 
                        src={achievement.icon} 
                        alt={achievement.title}
                        className="w-16 h-16 object-contain"
                      />
                    ) : (
                      <Trophy className="w-16 h-16 text-white" />
                    )}
                  </div>

                  {/* Stars */}
                  <motion.div
                    className="absolute -top-2 -right-2"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  >
                    <Star className="w-8 h-8 fill-[#FFEB3B] text-[#FFEB3B]" />
                  </motion.div>
                </motion.div>

                {/* Achievement Details */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {/* Rarity Badge */}
                  <div 
                    className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-3"
                    style={{ 
                      backgroundColor: `${config.color}20`,
                      color: config.color,
                      border: `1px solid ${config.color}`,
                    }}
                  >
                    {config.label}
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl font-black uppercase tracking-tight mb-2 text-white">
                    {achievement.title}
                  </h2>

                  {/* Description */}
                  <p className="text-white/60 text-sm mb-4">
                    {achievement.description}
                  </p>

                  {/* XP Reward */}
                  {achievement.xp_reward && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.7 }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFEB3B]/20 border border-[#FFEB3B] rounded-full"
                    >
                      <span className="text-[#FFEB3B] font-black">
                        +{achievement.xp_reward} XP
                      </span>
                    </motion.div>
                  )}
                </motion.div>

                {/* Action Button */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-6"
                >
                  <Button
                    onClick={onClose}
                    variant="hot"
                    className="w-full font-black uppercase tracking-wider"
                  >
                    Awesome!
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
