import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Star, Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

const RARITY_CONFIG = {
  common: {
    color: '#9CA3AF',
    label: 'Common',
    icon: Award,
    borderColor: '#9CA3AF'
  },
  rare: {
    color: '#00D9FF',
    label: 'Rare',
    icon: Star,
    borderColor: '#00D9FF'
  },
  epic: {
    color: '#B026FF',
    label: 'Epic',
    icon: Sparkles,
    borderColor: '#B026FF'
  },
  legendary: {
    color: '#FFEB3B',
    label: 'Legendary',
    icon: Trophy,
    borderColor: '#FFEB3B'
  }
};

export default function AchievementUnlockModal({ 
  isOpen, 
  onClose, 
  achievement,
  rarity = 'common'
}) {
  useEffect(() => {
    if (isOpen) {
      // Enhanced confetti based on rarity
      const particleCount = {
        common: 50,
        rare: 100,
        epic: 200,
        legendary: 300
      }[rarity] || 50;

      const colors = {
        common: ['#9CA3AF', '#D1D5DB'],
        rare: ['#00D9FF', '#0EA5E9'],
        epic: ['#B026FF', '#A855F7'],
        legendary: ['#FFEB3B', '#FCD34D', '#C8962C']
      }[rarity] || ['#9CA3AF'];

      confetti({
        particleCount,
        spread: 100,
        origin: { y: 0.6 },
        colors,
        startVelocity: 45,
        gravity: 1.2,
        drift: 0,
        ticks: 200,
        zIndex: 110
      });

      // Extra burst for legendary
      let legendaryTimeout;
      if (rarity === 'legendary') {
        legendaryTimeout = setTimeout(() => {
          confetti({
            particleCount: 100,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors,
            zIndex: 110
          });
          confetti({
            particleCount: 100,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors,
            zIndex: 110
          });
        }, 250);
      }

      return () => {
        if (legendaryTimeout) {
          clearTimeout(legendaryTimeout);
        }
      };
    }
  }, [isOpen, rarity]);

  if (!achievement) return null;

  const config = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="achievement-title"
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotateY: -90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.3, opacity: 0, rotateY: 90 }}
            transition={{ type: 'spring', duration: 0.7, bounce: 0.3 }}
            className="relative bg-gradient-to-br from-black to-gray-900 border-4 p-8 md:p-12 max-w-md w-full mx-4 text-center"
            style={{ borderColor: config.borderColor }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(15)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{ color: config.color }}
                  initial={{ 
                    opacity: 0,
                    scale: 0,
                    x: '50%',
                    y: '50%'
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                    x: `${50 + (Math.random() - 0.5) * 100}%`,
                    y: `${50 + (Math.random() - 0.5) * 100}%`
                  }}
                  transition={{
                    duration: 2,
                    delay: Math.random() * 1,
                    repeat: Infinity,
                    repeatDelay: Math.random() * 2
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                </motion.div>
              ))}
            </div>

            {/* Content */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: 'spring', duration: 1 }}
              className="relative z-10 mb-4"
            >
              <div 
                className="inline-flex p-6 rounded-full border-4"
                style={{ 
                  borderColor: config.borderColor,
                  backgroundColor: `${config.color}20`
                }}
              >
                <Icon 
                  className="w-16 h-16" 
                  style={{ color: config.color }}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-2"
            >
              <span 
                className="inline-block px-4 py-1 text-xs font-black uppercase tracking-wider border-2 rounded-full"
                style={{ 
                  color: config.color,
                  borderColor: config.color 
                }}
              >
                {config.label}
              </span>
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              id="achievement-title"
              className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-4"
              style={{ color: config.color }}
            >
              ACHIEVEMENT UNLOCKED!
            </motion.h2>

            <motion.h3
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-xl font-bold text-white mb-4"
            >
              {achievement.title || achievement.name}
            </motion.h3>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-white/60 mb-6 text-sm"
            >
              {achievement.description}
            </motion.p>


            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <Button
                onClick={onClose}
                className="font-black uppercase tracking-wider px-8 py-6"
                style={{ 
                  backgroundColor: config.color,
                  color: rarity === 'legendary' ? '#000' : '#fff'
                }}
              >
                CLAIM
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
