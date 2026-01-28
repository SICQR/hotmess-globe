import { useMotionValue, useSpring, motion } from 'framer-motion';
import { useCallback, ReactNode } from 'react';
import { motionEnabled } from '@/lib/animations';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  strength?: number; // 0-1, how much tilt
}

/**
 * TiltCard - 3D perspective tilt on mouse move
 * LED Brutalist styling: Zero radius, snappy springs, sharp edges
 */
export function TiltCard({ 
  children, 
  className = '',
  strength = 0.8,
}: TiltCardProps) {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  
  // Snappy springs for LED Brutalist feel
  const springX = useSpring(rotateX, { stiffness: 300, damping: 20 });
  const springY = useSpring(rotateY, { stiffness: 300, damping: 20 });

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!motionEnabled) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    const maxTilt = 12 * strength;
    rotateY.set((x / rect.width) * maxTilt);
    rotateX.set(-(y / rect.height) * maxTilt);
  }, [rotateX, rotateY, strength]);

  const reset = useCallback(() => {
    if (!motionEnabled) return;
    rotateX.set(0);
    rotateY.set(0);
  }, [rotateX, rotateY]);

  if (!motionEnabled) {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ 
        rotateX: springX, 
        rotateY: springY, 
        transformPerspective: 1000,
        transformStyle: 'preserve-3d',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
