import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

export default function XPGainAnimation({ amount, targetSelector = '.xp-counter', onComplete }) {
  const [isVisible, setIsVisible] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Get trigger position from cursor or center of viewport
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;
    setPosition({ x, y });

    // Auto-hide after animation
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Color based on XP amount
  const getColor = (xp) => {
    if (xp >= 100) return '#B026FF'; // Purple for large amounts
    if (xp >= 50) return '#FFEB3B'; // Yellow for medium
    return '#39FF14'; // Green for small
  };

  const color = getColor(amount);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ 
            opacity: 1, 
            scale: 1,
            x: position.x - 50,
            y: position.y 
          }}
          animate={{ 
            opacity: 0, 
            scale: 1.5,
            y: position.y - 100 
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2, ease: 'easeOut' }}
          className="fixed pointer-events-none z-[100] flex items-center gap-2"
          style={{ left: 0, top: 0 }}
        >
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ 
              duration: 0.5,
              repeat: Infinity,
              repeatDelay: 0.5
            }}
          >
            <Zap 
              className="w-6 h-6" 
              style={{ color, fill: color }} 
            />
          </motion.div>
          <motion.span 
            className="font-black text-3xl"
            style={{ color, textShadow: `0 0 20px ${color}` }}
          >
            +{amount} XP
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
