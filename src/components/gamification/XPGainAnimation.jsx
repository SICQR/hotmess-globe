import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

// Individual floating XP notification
const XPNotification = ({ id, amount, position, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete(id);
    }, 2000);
    return () => clearTimeout(timer);
  }, [id, onComplete]);

  const isLarge = amount >= 100;
  const isMega = amount >= 500;

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        y: 20, 
        scale: 0.5,
        x: position?.x || 0,
      }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        y: [20, 0, -20, -60],
        scale: [0.5, 1.2, 1, 0.8],
        x: position?.x || 0,
      }}
      transition={{ 
        duration: 2,
        ease: "easeOut",
        times: [0, 0.2, 0.7, 1],
      }}
      className="fixed z-[200] pointer-events-none"
      style={{
        top: position?.y || '50%',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      <div className={`
        flex items-center gap-2 px-4 py-2 rounded-full
        ${isMega 
          ? 'bg-gradient-to-r from-[#FF1493] via-[#FFEB3B] to-[#00D9FF] text-black' 
          : isLarge 
            ? 'bg-[#FFEB3B] text-black' 
            : 'bg-[#FFEB3B]/90 text-black'
        }
        shadow-lg shadow-[#FFEB3B]/30
        border-2 border-white
      `}>
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 0.5, repeat: 2 }}
        >
          <Zap className={`${isMega ? 'w-6 h-6' : isLarge ? 'w-5 h-5' : 'w-4 h-4'} fill-current`} />
        </motion.div>
        <span className={`font-black ${isMega ? 'text-xl' : isLarge ? 'text-lg' : 'text-sm'}`}>
          +{amount} XP
        </span>
        {isMega && (
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="text-xs uppercase tracking-wider font-black"
          >
            MEGA!
          </motion.span>
        )}
      </div>
    </motion.div>
  );
};

// Container component that manages multiple XP notifications
export function XPGainContainer({ notifications, onRemove }) {
  return (
    <AnimatePresence>
      {notifications.map((notification) => (
        <XPNotification
          key={notification.id}
          id={notification.id}
          amount={notification.amount}
          position={notification.position}
          onComplete={onRemove}
        />
      ))}
    </AnimatePresence>
  );
}

// Hook for managing XP gain animations
export function useXPGain() {
  const [notifications, setNotifications] = useState([]);

  const showXPGain = (amount, position = null) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, amount, position }]);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return {
    notifications,
    showXPGain,
    removeNotification,
  };
}

// Standalone floating XP gain component (for use without context)
export default function XPGainAnimation({ 
  amount, 
  show, 
  onComplete,
  position = null 
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show && amount > 0) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, amount, onComplete]);

  if (!isVisible || !amount) return null;

  const isLarge = amount >= 100;
  const isMega = amount >= 500;

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        y: 20, 
        scale: 0.5,
      }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        y: [20, 0, -20, -60],
        scale: [0.5, 1.2, 1, 0.8],
      }}
      transition={{ 
        duration: 2,
        ease: "easeOut",
        times: [0, 0.2, 0.7, 1],
      }}
      className="fixed z-[200] pointer-events-none top-1/3 left-1/2 -translate-x-1/2"
      style={position ? { top: position.y, left: position.x, transform: 'translate(-50%, -50%)' } : undefined}
    >
      <div className={`
        flex items-center gap-2 px-4 py-2 rounded-full
        ${isMega 
          ? 'bg-gradient-to-r from-[#FF1493] via-[#FFEB3B] to-[#00D9FF] text-black' 
          : isLarge 
            ? 'bg-[#FFEB3B] text-black' 
            : 'bg-[#FFEB3B]/90 text-black'
        }
        shadow-lg shadow-[#FFEB3B]/30
        border-2 border-white
      `}>
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 0.5, repeat: 2 }}
        >
          <Zap className={`${isMega ? 'w-6 h-6' : isLarge ? 'w-5 h-5' : 'w-4 h-4'} fill-current`} />
        </motion.div>
        <span className={`font-black ${isMega ? 'text-xl' : isLarge ? 'text-lg' : 'text-sm'}`}>
          +{amount} XP
        </span>
        {isMega && (
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="text-xs uppercase tracking-wider font-black"
          >
            MEGA!
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
