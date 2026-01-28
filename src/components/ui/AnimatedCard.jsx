import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

/**
 * AnimatedCard - A card component with hover animations and lift effects
 */
export function AnimatedCard({ 
  children, 
  className = '',
  hover = true,
  delay = 0,
  ...props 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={hover ? { 
        y: -5,
        transition: { duration: 0.2 }
      } : undefined}
    >
      <Card 
        className={`transition-all duration-200 ${hover ? 'hover:shadow-[0_10px_40px_rgba(255,20,147,0.2)] hover:border-[#FF1493]' : ''} ${className}`}
        {...props}
      >
        {children}
      </Card>
    </motion.div>
  );
}

/**
 * GlowCard - A card with glowing border effect
 */
export function GlowCard({ 
  children, 
  glowColor = '#FF1493',
  className = '',
  ...props 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ 
        boxShadow: `0 0 30px ${glowColor}`,
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className={`rounded-lg border-2 transition-all ${className}`}
      style={{ borderColor: glowColor + '40' }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * PulseCard - A card with subtle pulse animation
 */
export function PulseCard({ 
  children, 
  className = '',
  ...props 
}) {
  return (
    <motion.div
      animate={{ 
        scale: [1, 1.02, 1],
        opacity: [1, 0.9, 1]
      }}
      transition={{ 
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * FlipCard - A card that flips on hover to show back content
 */
export function FlipCard({ 
  front, 
  back, 
  className = '' 
}) {
  const [isFlipped, setIsFlipped] = React.useState(false);

  return (
    <div 
      className={`relative w-full h-full cursor-pointer ${className}`}
      style={{ perspective: '1000px' }}
      onClick={() => setIsFlipped(!isFlipped)}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <motion.div
        className="w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        {/* Front */}
        <div
          className="absolute w-full h-full"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {front}
        </div>
        
        {/* Back */}
        <div
          className="absolute w-full h-full"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * InteractiveCard - Card with ripple effect on click
 */
export function InteractiveCard({ 
  children, 
  onClick,
  className = '',
  ...props 
}) {
  const [ripples, setRipples] = React.useState([]);

  const createRipple = (event) => {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const ripple = { x, y, id: Date.now() };
    setRipples((prev) => [...prev, ripple]);
    
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
    }, 600);
    
    onClick?.(event);
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className={`relative overflow-hidden cursor-pointer ${className}`}
      onClick={createRipple}
      {...props}
    >
      {children}
      
      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
          }}
          initial={{ width: 0, height: 0, opacity: 1 }}
          animate={{ 
            width: 300, 
            height: 300, 
            opacity: 0,
            x: -150,
            y: -150
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}
    </motion.div>
  );
}

export default AnimatedCard;
