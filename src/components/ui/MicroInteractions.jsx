/**
 * MicroInteractions - Reusable animation components
 * 
 * Small details that make the app feel polished
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Fade in on scroll
export function FadeInView({ 
  children, 
  delay = 0, 
  duration = 0.4,
  direction = 'up', // 'up' | 'down' | 'left' | 'right' | 'none'
  className = '' 
}) {
  const offsets = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
    none: {},
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...offsets[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale on tap
export function TapScale({ 
  children, 
  scale = 0.97, 
  className = '',
  as: Component = 'div',
  ...props 
}) {
  return (
    <motion.div
      whileTap={{ scale }}
      transition={{ duration: 0.1 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Hover lift
export function HoverLift({ 
  children, 
  lift = -4, 
  className = '' 
}) {
  return (
    <motion.div
      whileHover={{ y: lift, transition: { duration: 0.2 } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger children animation
export function StaggerContainer({ 
  children, 
  staggerDelay = 0.05, 
  className = '' 
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Pulse animation
export function PulseRing({ color = '#FF1493', size = 40, className = '' }) {
  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: color }}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

// Shimmer effect
export function Shimmer({ className = '' }) {
  return (
    <motion.div
      className={cn(
        'absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent',
        className
      )}
      animate={{
        x: ['-100%', '100%'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        repeatDelay: 1,
        ease: 'easeInOut',
      }}
    />
  );
}

// Success checkmark animation
export function SuccessCheck({ size = 24, className = '' }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn('text-[#39FF14]', className)}
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3 }}
      />
      <motion.path
        d="M7 12l3 3 7-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      />
    </motion.svg>
  );
}

// Loading spinner
export function Spinner({ size = 24, color = '#FF1493', className = '' }) {
  return (
    <motion.div
      className={className}
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <svg viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="3"
          strokeOpacity="0.2"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
}

// Count up animation
export function CountUp({ 
  value, 
  duration = 1, 
  className = '' 
}) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        key={value}
      >
        {value}
      </motion.span>
    </motion.span>
  );
}

// Notification badge bounce
export function BadgeBounce({ count, className = '' }) {
  if (!count) return null;

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        'absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#FF1493] text-white text-[10px] font-black flex items-center justify-center',
        className
      )}
    >
      <motion.span
        key={count}
        initial={{ scale: 1.5 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      >
        {count > 99 ? '99+' : count}
      </motion.span>
    </motion.span>
  );
}

// Page transition wrapper
export function PageTransition({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Skeleton pulse
export function SkeletonPulse({ className = '' }) {
  return (
    <motion.div
      className={cn('bg-white/10 rounded', className)}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export default {
  FadeInView,
  TapScale,
  HoverLift,
  StaggerContainer,
  StaggerItem,
  PulseRing,
  Shimmer,
  SuccessCheck,
  Spinner,
  CountUp,
  BadgeBounce,
  PageTransition,
  SkeletonPulse,
};
